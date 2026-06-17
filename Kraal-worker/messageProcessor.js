/**
 * messageProcessor.js — Routes incoming WhatsApp messages by type + session step
 */
import { isRegistered, handleRegistration } from "./registration.js"
import {
  getSession,
  saveSession,
  clearSession,
  createFreshSession,
  STEPS,
} from "./session.js";
import {
  sendTextMessage,
  sendButtonMessage,
  downloadMedia,
} from "./Webhook.js";
import { extractListingFromImage, transcribeAudio } from "./ai.js";
import { uploadToR2, getPublicUrl } from "./storage.js";
import { createAssistedListing } from "./firestore.js";
// eslint-disable-next-line no-unused-vars
import { buildListingPreview, buildPaymentMessage, CATEGORY_KEYWORDS } from "./utils.js";

// ── Main router ───────────────────────────────────────────────────────────────
export async function processMessage(message, senderName, env) {
  const phone = message.from;
  const type = message.type;

  const registered = await isRegistered(phone, env);
  if (!registered) {
    await handleRegistration(message, senderName, env);
    return;                         // don't proceed to listing flow until done
  }
  // Load or create session
  let session = await getSession(phone, env);
  if (!session) {
    session = createFreshSession(phone, senderName);
  }
  // Always update name in case it changed
  session.name = senderName;

  console.log(`[${phone}] step=${session.step} type=${type}`);

  // ── Global commands (work from any step) ──────────────────────────────────
  if (type === "text") {
    const text = message.text.body.trim().toUpperCase();

    if (text === "STOP" || text === "CANCEL") {
      await clearSession(phone, env);
      await sendTextMessage(phone, "❌ Listing cancelled. Send *LIST* any time to start a new listing.", env);
      return;
    }

    if (text === "HELP") {
      await sendHelpMessage(phone, env);
      return;
    }

    if (text === "STATUS" && session.step === STEPS.AWAITING_PAYMENT) {
      await sendTextMessage(phone, `⏳ Your listing is waiting for payment. Once paid it will go live.\n\n${buildPaymentMessage(session.draft, session.listingId)}`, env);
      return;
    }
  }

  // ── Route by current step ─────────────────────────────────────────────────
  switch (session.step) {
    case STEPS.IDLE:
      await handleIdle(message, session, env);
      break;

    case STEPS.AWAITING_PHOTO:
      await handleAwaitingPhoto(message, session, env);
      break;

    case STEPS.AWAITING_PRICE:
      await handleAwaitingPrice(message, session, env);
      break;

    case STEPS.AWAITING_LOCATION:
      await handleAwaitingLocation(message, session, env);
      break;

    case STEPS.AWAITING_CONFIRM:
      await handleAwaitingConfirm(message, session, env);
      break;

    case STEPS.AWAITING_PAYMENT:
      await handleAwaitingPayment(message, session, env);
      break;

    default:
      await handleIdle(message, session, env);
  }
}

// ── IDLE: welcome + start flow ────────────────────────────────────────────────
async function handleIdle(message, session, env) {
  const phone = session.phone;

  // Any message when idle starts the flow
  await sendButtonMessage(
    phone,
    `👋 Welcome to *Kraal Marketplace*, ${session.name}!\n\nI can list your livestock for sale in minutes.\n\n📸 Send me a photo of your animal to get started.\n\n_Listing fee: USD $1.50 per listing_`,
    [
      { id: "start_listing", title: "📸 List an animal" },
      { id: "learn_more", title: "ℹ️ How it works" },
    ],
    env
  );

  // If they already sent a photo/image, process it immediately
  if (message.type === "image") {
    session.step = STEPS.AWAITING_PHOTO;
    await saveSession(phone, session, env);
    await handleAwaitingPhoto(message, session, env);
    return;
  }

  // If they tapped a button
  if (message.type === "interactive") {
    const buttonId = message.interactive?.button_reply?.id;
    if (buttonId === "start_listing") {
      session.step = STEPS.AWAITING_PHOTO;
      await saveSession(phone, session, env);
      await sendTextMessage(phone, "📸 Great! Send me a clear photo of the animal you want to sell.", env);
      return;
    }
    if (buttonId === "learn_more") {
      await sendHowItWorksMessage(phone, env);
      return;
    }
  }

  session.step = STEPS.AWAITING_PHOTO;
  await saveSession(phone, session, env);
  await sendTextMessage(phone, "📸 Send me a clear photo of the animal you want to sell.", env);
}

// ── AWAITING_PHOTO ────────────────────────────────────────────────────────────
async function handleAwaitingPhoto(message, session, env) {
  const phone = session.phone;

  // Handle voice note — transcribe first, then ask for photo
  if (message.type === "audio") {
    await sendTextMessage(phone, "🎤 Got your voice note! Let me transcribe it…", env);
    const { buffer, mimeType } = await downloadMedia(message.audio.id, env);
    const transcript = await transcribeAudio(buffer, mimeType, env);
    session.draft.voiceTranscript = transcript;
    await saveSession(phone, session, env);
    await sendTextMessage(phone, `📝 I heard: _"${transcript}"_\n\nNow please send me a *photo* of the animal.`, env);
    return;
  }

  if (message.type !== "image") {
    session.retries = (session.retries || 0) + 1;
    if (session.retries > 3) {
      await clearSession(phone, env);
      await sendTextMessage(phone, "I'm having trouble understanding. Type *HELP* for instructions or *LIST* to start over.", env);
      return;
    }
    await sendTextMessage(phone, "📸 Please send a *photo* of the animal you want to list.", env);
    await saveSession(phone, session, env);
    return;
  }

  // Download and upload to R2
  await sendTextMessage(phone, "📸 Got the photo! Analysing your animal…", env);

  const { buffer, mimeType } = await downloadMedia(message.image.id, env);
  const r2Key = `assisted-listings/${phone}/${Date.now()}.jpg`;
  await uploadToR2(r2Key, buffer, mimeType, env);
  const photoUrl = getPublicUrl(r2Key, env);

  session.photoKeys.push(r2Key);
  session.photoUrls.push(photoUrl);

  // AI extraction from image + any voice transcript
  const context = session.draft.voiceTranscript
    ? `Farmer also said: "${session.draft.voiceTranscript}"`
    : "";

  let extracted = {};
  try {
    extracted = await extractListingFromImage(photoUrl, context, env);
  } catch (err) {
    console.error("AI extraction failed:", err);
    // Continue without extraction — we'll ask manually
  }

  // Merge AI-extracted fields into draft
  session.draft = { ...session.draft, ...extracted };
  session.retries = 0;

  // Move to next step — ask for price if not extracted
  if (extracted.price && extracted.price > 0) {
    // AI got the price, confirm it
    session.step = STEPS.AWAITING_PRICE;
    await saveSession(phone, session, env);

    const animalDesc = extracted.title || extracted.category || "your animal";
    await sendButtonMessage(
      phone,
      `🤖 I can see: *${animalDesc}*${extracted.breed ? ` (${extracted.breed})` : ""}${extracted.quantity ? `, ${extracted.quantity} animals` : ""}\n\nIs the price *USD $${extracted.price}* correct?`,
      [
        { id: "price_yes", title: `✅ Yes, $${extracted.price}` },
        { id: "price_no", title: "❌ No, different price" },
      ],
      env
    );
  } else {
    session.step = STEPS.AWAITING_PRICE;
    await saveSession(phone, session, env);

    const animalDesc = extracted.title || extracted.category || "your animal";
    await sendTextMessage(
      phone,
      `🤖 I can see: *${animalDesc}*${extracted.breed ? ` (${extracted.breed})` : ""}\n\n💵 What is your asking price? (in USD)\n_Example: 1200 or 1200 per head_`,
      env
    );
  }
}

// ── AWAITING_PRICE ────────────────────────────────────────────────────────────
async function handleAwaitingPrice(message, session, env) {
  const phone = session.phone;

  // Handle button reply (price confirmed by AI)
  if (message.type === "interactive") {
    const buttonId = message.interactive?.button_reply?.id;
    if (buttonId === "price_yes") {
      // Price confirmed, move to location
      session.step = STEPS.AWAITING_LOCATION;
      await saveSession(phone, session, env);
      await askForLocation(phone, env);
      return;
    }
    if (buttonId === "price_no") {
      await sendTextMessage(phone, "💵 No problem! What is the correct price in USD?\n_Example: 850 or 850 per head_", env);
      return;
    }
  }

  if (message.type !== "text") {
    await sendTextMessage(phone, "💵 Please reply with the price in USD. Example: *1200*", env);
    return;
  }

  const text = message.text.body.trim();

  // Parse price — handle "1200", "$1200", "1,200", "1200 per head", etc.
  const priceMatch = text.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!priceMatch) {
    session.retries = (session.retries || 0) + 1;
    await saveSession(phone, session, env);
    await sendTextMessage(phone, "❓ I didn't catch that. Please send just the number, e.g. *1200*", env);
    return;
  }

  const price = parseFloat(priceMatch[0]);
  const perHead = /per head|each|apiece/i.test(text);

  session.draft.price = price;
  session.draft.pricePerHead = perHead;
  session.retries = 0;
  session.step = STEPS.AWAITING_LOCATION;
  await saveSession(phone, session, env);

  await askForLocation(phone, env);
}

// ── AWAITING_LOCATION ─────────────────────────────────────────────────────────
async function handleAwaitingLocation(message, session, env) {
  const phone = session.phone;

  // Handle shared location from WhatsApp
  if (message.type === "location") {
    const { latitude, longitude, name, address } = message.location;
    session.draft.locationLat = latitude;
    session.draft.locationLng = longitude;
    session.draft.city = name || address || "Zimbabwe";
    session.draft.province = detectProvinceFromCoords(latitude, longitude);
    session.step = STEPS.AWAITING_CONFIRM;
    await saveSession(phone, session, env);
    await showListingPreview(phone, session, env);
    return;
  }

  if (message.type !== "text") {
    await sendTextMessage(phone, "📍 Please type your town/farm name or share your location.", env);
    return;
  }

  const locationText = message.text.body.trim();
  session.draft.city = locationText;
  session.draft.province = detectProvinceFromText(locationText);
  session.retries = 0;
  session.step = STEPS.AWAITING_CONFIRM;
  await saveSession(phone, session, env);

  await showListingPreview(phone, session, env);
}

// ── AWAITING_CONFIRM ──────────────────────────────────────────────────────────
async function handleAwaitingConfirm(message, session, env) {
  const phone = session.phone;

  let confirmed = false;
  let rejected = false;
  let editField = null;

  if (message.type === "interactive") {
    const buttonId = message.interactive?.button_reply?.id ||
                     message.interactive?.list_reply?.id;
    if (buttonId === "confirm_yes") confirmed = true;
    if (buttonId === "confirm_no") rejected = true;
    if (buttonId?.startsWith("edit_")) editField = buttonId.replace("edit_", "");
  }

  if (message.type === "text") {
    const text = message.text.body.trim().toUpperCase();
    if (text === "YES" || text === "Y" || text === "CONFIRM") confirmed = true;
    if (text === "NO" || text === "N" || text === "CANCEL") rejected = true;
  }

  if (rejected) {
    await sendButtonMessage(
      phone,
      "What would you like to change?",
      [
        { id: "edit_price", title: "💵 Change price" },
        { id: "edit_location", title: "📍 Change location" },
        { id: "edit_photo", title: "📸 New photo" },
      ],
      env
    );
    return;
  }

  if (editField === "price") {
    session.step = STEPS.AWAITING_PRICE;
    await saveSession(phone, session, env);
    await sendTextMessage(phone, "💵 What should the new price be? (USD)", env);
    return;
  }

  if (editField === "location") {
    session.step = STEPS.AWAITING_LOCATION;
    await saveSession(phone, session, env);
    await askForLocation(phone, env);
    return;
  }

  if (editField === "photo") {
    session.step = STEPS.AWAITING_PHOTO;
    session.photoKeys = [];
    session.photoUrls = [];
    await saveSession(phone, session, env);
    await sendTextMessage(phone, "📸 Send me a new photo of the animal.", env);
    return;
  }

  if (!confirmed) {
    await sendButtonMessage(
      phone,
      "Please confirm your listing:",
      [
        { id: "confirm_yes", title: "✅ Publish listing" },
        { id: "confirm_no", title: "✏️ Edit details" },
      ],
      env
    );
    return;
  }

  // ── Create the listing ──
  await sendTextMessage(phone, "⏳ Creating your listing…", env);

  try {
    const listingId = await createAssistedListing(session, env);
    session.listingId = listingId;
    session.step = STEPS.AWAITING_PAYMENT;
    await saveSession(phone, session, env);

    const listingUrl = `https://kraal.market/listings/${listingId}`;
    const paymentMsg = buildPaymentMessage(session.draft, listingId, listingUrl);

    await sendTextMessage(phone, paymentMsg, env);
  } catch (err) {
    console.error("Failed to create listing:", err);
    await sendTextMessage(
      phone,
      "❌ Sorry, we couldn't create your listing right now. Please try again in a few minutes or contact support.",
      env
    );
  }
}

// ── AWAITING_PAYMENT ──────────────────────────────────────────────────────────
async function handleAwaitingPayment(message, session, env) {
  const phone = session.phone;

  // In a real integration you'd verify payment via EcoCash webhook
  // For now, acknowledge and give instructions
  if (message.type === "text") {
    const text = message.text.body.trim().toUpperCase();

    if (text === "PAID" || text === "I PAID" || text === "DONE") {
      await sendTextMessage(
        phone,
        "✅ Thanks! We'll verify your payment and activate your listing within 1 hour.\n\nYou'll receive a confirmation message when it's live.\n\nType *LIST* to add another animal.",
        env
      );
      // Mark session as complete but don't clear — keep for reference
      session.step = STEPS.IDLE;
      session.draft = {};
      session.photoKeys = [];
      session.photoUrls = [];
      await saveSession(phone, session, env);
      return;
    }
  }

  // Re-send payment instructions
  const listingUrl = session.listingId
    ? `https://kraal.market/listings/${session.listingId}`
    : "";
  await sendTextMessage(
    phone,
    buildPaymentMessage(session.draft, session.listingId, listingUrl),
    env
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function showListingPreview(phone, session, env) {
  const preview = buildListingPreview(session.draft, session.name);
  await sendButtonMessage(
    phone,
    preview,
    [
      { id: "confirm_yes", title: "✅ Publish listing" },
      { id: "confirm_no", title: "✏️ Edit details" },
    ],
    env
  );
}

async function askForLocation(phone, env) {
  await sendTextMessage(
    phone,
    "📍 Where is the animal located?\n\nType your town or farm name, or tap the 📎 attachment button and choose *Location* to share your GPS.\n\n_Example: Marondera, Harare, Chinhoyi_",
    env
  );
}

async function sendHelpMessage(phone, env) {
  await sendTextMessage(
    phone,
    `*Kraal Assisted Listings — Help*\n\n` +
    `📸 Send a photo to start listing an animal\n` +
    `💵 Tell me the price in USD\n` +
    `📍 Tell me where the animal is located\n` +
    `✅ Confirm and pay $1.50 to go live\n\n` +
    `*Commands:*\n` +
    `• *CANCEL* — cancel current listing\n` +
    `• *STATUS* — check listing status\n` +
    `• *HELP* — show this message\n\n` +
    `Need support? Call +263 77 123 4567`,
    env
  );
}

async function sendHowItWorksMessage(phone, env) {
  await sendTextMessage(
    phone,
    `*How Kraal Assisted Listings work:*\n\n` +
    `1️⃣ Send a photo of your animal\n` +
    `2️⃣ I'll identify the breed and details\n` +
    `3️⃣ Confirm the price and location\n` +
    `4️⃣ Pay $1.50 via EcoCash\n` +
    `5️⃣ Your listing goes live on kraal.market\n\n` +
    `Buyers across Zimbabwe and Southern Africa will see your listing immediately.\n\n` +
    `📸 Send a photo to get started!`,
    env
  );
}

// ── Province detection ────────────────────────────────────────────────────────
function detectProvinceFromText(text) {
  const lower = text.toLowerCase();
  const map = {
    "harare": "Harare",
    "bulawayo": "Bulawayo",
    "mutare": "Manicaland",
    "marondera": "Mashonaland East",
    "chinhoyi": "Mashonaland West",
    "bindura": "Mashonaland Central",
    "masvingo": "Masvingo",
    "gweru": "Midlands",
    "kwekwe": "Midlands",
    "victoria falls": "Matabeleland North",
    "beitbridge": "Matabeleland South",
  };
  for (const [city, province] of Object.entries(map)) {
    if (lower.includes(city)) return province;
  }
  return "Zimbabwe";
}

function detectProvinceFromCoords(lat, lng) {
  // Rough bounding boxes for Zimbabwe provinces
  if (lat >= -18.5 && lat <= -17.5 && lng >= 30.5 && lng <= 31.5) return "Harare";
  if (lat >= -20.5 && lat <= -19.5 && lng >= 28.0 && lng <= 29.0) return "Bulawayo";
  return "Zimbabwe";
}