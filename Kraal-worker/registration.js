// registration.js

import {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
} from "./Webhook.js";
import { firestoreSet, firestoreGet } from "./firestore.js";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export async function isRegistered(phone, env) {
  const doc = await firestoreGet(env, `users/${phone}`);
  return !!doc;
}

export async function handleRegistration(message, senderName, env) {
  const phone   = message.from;
  const session = await loadRegSession(env, phone);

  // Global cancel
  if (message.type === "text") {
    const text = message.text?.body?.trim().toUpperCase();
    if (text === "CANCEL" || text === "STOP") {
      await clearRegSession(env, phone);
      await sendTextMessage(phone, "Registration cancelled. Send any message to start again.", env);
      return;
    }
  }

  switch (session.step) {
    case "idle":
    case "ask_role":
      await stepRole(phone, senderName, session, message, env);
      break;
    case "ask_business_name":
      await stepBusinessName(phone, session, message, env);
      break;
    case "ask_whatsapp":
      await stepWhatsapp(phone, session, message, env);
      break;
    case "ask_province":
      await stepProvince(phone, session, message, env);
      break;
    case "ask_city":
      await stepCity(phone, session, message, env);
      break;
    case "ask_livestock":
      await stepLivestock(phone, session, message, env);
      break;
    case "ask_vehicle":
      await stepVehicle(phone, session, message, env);
      break;
    case "ask_capacity":
      await stepCapacity(phone, session, message, env);
      break;
    default:
      await stepRole(phone, senderName, session, message, env);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEPS
// ─────────────────────────────────────────────────────────────────────────────

async function stepRole(phone, senderName, session, message, env) {
  // If they tapped a role button, advance
  if (message.type === "interactive") {
    const id = message.interactive?.button_reply?.id;
    if (ROLES.includes(id)) {
      session.data.role = id;
      session.step      = "ask_business_name";
      await saveRegSession(env, phone, session);
      await sendTextMessage(
        phone,
        `Perfect — *${ROLE_LABELS[id]}* ✅\n\nEnter your *business or farm name*:\n_(or your full name if you're an individual)_`,
        env
      );
      return;
    }
  }

  // Otherwise send the welcome + role picker
  session.step = "ask_role";
  await saveRegSession(env, phone, session);

  await sendButtonMessage(
    phone,
    `👋 Welcome to *Kraal*, ${senderName}!\n\nZimbabwe's livestock marketplace.\n\nBefore we start, tell us how you'll use Kraal:`,
    [
      { id: "buyer",       title: "🛒 Buyer" },
      { id: "seller",      title: "🌾 Seller / Farmer" },
      { id: "transporter", title: "🚚 Transporter" },
    ],
    env
  );

  // 4th role in second message (WhatsApp max 3 buttons)
  await sendButtonMessage(
    phone,
    "Are you a health professional?",
    [{ id: "vet", title: "🩺 Veterinarian" }],
    env
  );
}

async function stepBusinessName(phone, session, message, env) {
  if (message.type !== "text") {
    await sendTextMessage(phone, "Please type your business or farm name:", env);
    return;
  }
  const name = message.text?.body?.trim();
  if (!name || name.length < 2) {
    await sendTextMessage(phone, "Please enter a valid name (at least 2 characters).", env);
    return;
  }

  session.data.businessName = name;
  session.step = "ask_whatsapp";
  await saveRegSession(env, phone, session);
  await sendTextMessage(
    phone,
    `Got it — *${name}* ✅\n\nWhat's your *contact / WhatsApp number*?\n_(Type *0* to use this number: ${phone})_`,
    env
  );
}

async function stepWhatsapp(phone, session, message, env) {
  if (message.type !== "text") {
    await sendTextMessage(phone, "Please type your WhatsApp number, or *0* to use this one.", env);
    return;
  }
  const input    = message.text?.body?.trim();
  const whatsapp = input === "0" ? phone : input.replace(/\s+/g, "");

  session.data.whatsapp = whatsapp;
  session.step          = "ask_province";
  await saveRegSession(env, phone, session);
  await sendProvinceList(phone, env);
}

async function stepProvince(phone, session, message, env) {
  // Province comes from a list reply
  if (message.type === "interactive") {
    const id = message.interactive?.list_reply?.id;
    if (id?.startsWith("prov_")) {
      const province       = id.replace("prov_", "").replace(/_/g, " ");
      session.data.province = province;
      session.step          = "ask_city";
      await saveRegSession(env, phone, session);
      await sendTextMessage(phone, `Got it — *${province}* ✅\n\nNow enter your *city or town*:`, env);
      return;
    }
  }
  // Re-send if something unexpected arrived
  await sendProvinceList(phone, env);
}

async function stepCity(phone, session, message, env) {
  if (message.type !== "text") {
    await sendTextMessage(phone, "Please type your city or town name.", env);
    return;
  }
  const city = message.text?.body?.trim();
  if (!city || city.length < 2) {
    await sendTextMessage(phone, "Please enter a valid city or town name.", env);
    return;
  }

  session.data.city = city;

  if (session.data.role === "seller") {
    session.step = "ask_livestock";
    await saveRegSession(env, phone, session);
    await sendLivestockMenu(phone, [], env);

  } else if (session.data.role === "transporter") {
    session.step = "ask_vehicle";
    await saveRegSession(env, phone, session);
    await sendButtonMessage(
      phone,
      "What type of vehicle do you use for livestock transport?",
      [
        { id: "truck",   title: "🚛 Truck" },
        { id: "bakkie",  title: "🛻 Bakkie / Pickup" },
        { id: "trailer", title: "🚜 Trailer" },
      ],
      env
    );

  } else {
    // buyer / vet — no extra steps
    session.step = "done";
    await saveRegSession(env, phone, session);
    await finishRegistration(phone, session, env);
  }
}

async function stepLivestock(phone, session, message, env) {
  if (message.type !== "interactive") {
    await sendLivestockMenu(phone, session.data.livestockTypes || [], env);
    return;
  }

  const id = message.interactive?.list_reply?.id;

  if (id === "livestock_done") {
    const selected = session.data.livestockTypes || [];
    if (selected.length === 0) {
      await sendTextMessage(phone, "Please select at least one livestock type.", env);
      await sendLivestockMenu(phone, [], env);
      return;
    }
    session.step = "done";
    await saveRegSession(env, phone, session);
    await finishRegistration(phone, session, env);
    return;
  }

  if (id?.startsWith("ls_")) {
    const type    = id.replace("ls_", "");
    const current = session.data.livestockTypes || [];
    const next    = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];

    session.data.livestockTypes = next;
    await saveRegSession(env, phone, session);
    await sendLivestockMenu(phone, next, env);
  }
}

async function stepVehicle(phone, session, message, env) {
  if (message.type !== "interactive") {
    await sendButtonMessage(
      phone, "What type of vehicle do you use?",
      [
        { id: "truck",   title: "🚛 Truck" },
        { id: "bakkie",  title: "🛻 Bakkie / Pickup" },
        { id: "trailer", title: "🚜 Trailer" },
      ],
      env
    );
    return;
  }

  const id = message.interactive?.button_reply?.id;
  if (["truck", "bakkie", "trailer"].includes(id)) {
    session.data.vehicleType = id;
    session.step             = "ask_capacity";
    await saveRegSession(env, phone, session);
    await sendTextMessage(
      phone,
      `Got it — *${VEHICLE_LABELS[id]}* ✅\n\nHow many animals can your vehicle carry?\n_(e.g. "20 cattle" or "50 goats")_`,
      env
    );
  }
}

async function stepCapacity(phone, session, message, env) {
  if (message.type !== "text") {
    await sendTextMessage(phone, "Please type your vehicle capacity. Example: *20 cattle*", env);
    return;
  }
  session.data.capacity = message.text?.body?.trim();
  session.step          = "done";
  await saveRegSession(env, phone, session);
  await finishRegistration(phone, session, env);
}

// ─────────────────────────────────────────────────────────────────────────────
// FINISH — write to Firestore, clear reg session
// ─────────────────────────────────────────────────────────────────────────────

async function finishRegistration(phone, session, env) {
  const { data } = session;

  await firestoreSet(env, `users/${phone}`, {
    phone,
    whatsapp:              data.whatsapp       || phone,
    businessName:          data.businessName   || "",
    role:                  data.role           || "buyer",
    province:              data.province       || "",
    city:                  data.city           || "",
    country:               "Zimbabwe",
    livestockTypes:        data.livestockTypes || [],
    vehicleType:           data.vehicleType    || "",
    capacity:              data.capacity       || "",
    available:             data.role === "transporter",
    registeredViaWhatsApp: true,
    createdAt:             new Date().toISOString(),
  });

  await clearRegSession(env, phone);

  const roleLabel = ROLE_LABELS[data.role] || data.role;

  await sendTextMessage(
    phone,
    `✅ *You're registered on Kraal!*\n\n` +
    `Welcome, *${data.businessName}*! 🐄\n\n` +
    `*Role:* ${roleLabel}\n` +
    `*Province:* ${data.province}\n` +
    `*City:* ${data.city}\n\n` +
    `You can now ${data.role === "buyer"
      ? "browse and enquire about livestock."
      : "send a photo of an animal to create your first listing!"}`,
    env
  );

  // If seller — immediately nudge into listing flow
  if (data.role === "seller") {
    await sendButtonMessage(
      phone,
      "Ready to list your first animal?",
      [{ id: "start_listing", title: "📸 List an animal" }],
      env
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION  — separate KV namespace prefix from listing sessions
// ─────────────────────────────────────────────────────────────────────────────

async function loadRegSession(env, phone) {
  const raw = await env.KV.get(`kraal:reg:${phone}`);
  return raw ? JSON.parse(raw) : { step: "idle", data: {} };
}

async function saveRegSession(env, phone, session) {
  await env.KV.put(`kraal:reg:${phone}`, JSON.stringify(session), {
    expirationTtl: 3600, // 1 hour TTL for registration
  });
}

async function clearRegSession(env, phone) {
  await env.KV.delete(`kraal:reg:${phone}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function sendProvinceList(phone, env) {
  await sendListMessage(
    phone,
    "Select your *province*:",
    "Choose province",
    [{
      title: "Zimbabwe Provinces",
      rows: [
        { id: "prov_Harare",              title: "Harare" },
        { id: "prov_Bulawayo",            title: "Bulawayo" },
        { id: "prov_Manicaland",          title: "Manicaland" },
        { id: "prov_Mashonaland_Central", title: "Mashonaland Central" },
        { id: "prov_Mashonaland_East",    title: "Mashonaland East" },
        { id: "prov_Mashonaland_West",    title: "Mashonaland West" },
        { id: "prov_Masvingo",            title: "Masvingo" },
        { id: "prov_Matabeleland_North",  title: "Matabeleland North" },
        { id: "prov_Matabeleland_South",  title: "Matabeleland South" },
        { id: "prov_Midlands",            title: "Midlands" },
      ],
    }],
    env
  );
}

async function sendLivestockMenu(phone, selected, env) {
  const types = [
    "Cattle", "Goats", "Sheep", "Chickens",
    "Guinea Fowl", "Pigs", "Horses", "Other",
  ];
  await sendListMessage(
    phone,
    selected.length
      ? `Selected: *${selected.join(", ")}*\n\nTap to add/remove, then tap *Done*.`
      : "What livestock do you deal in?\n_(Select all that apply, then tap Done)_",
    "Select livestock",
    [
      {
        title: "Livestock types",
        rows: types.map((t) => ({
          id:          `ls_${t}`,
          title:       selected.includes(t) ? `✅ ${t}` : t,
          description: selected.includes(t) ? "Tap to remove" : "Tap to add",
        })),
      },
      {
        title: "Confirm",
        rows: [{ id: "livestock_done", title: "✅ Done", description: "Save and continue" }],
      },
    ],
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = ["buyer", "seller", "transporter", "vet"];

const ROLE_LABELS = {
  buyer:       "Buyer",
  seller:      "Seller / Farmer",
  transporter: "Transport Provider",
  vet:         "Veterinarian",
};

const VEHICLE_LABELS = {
  truck:   "Truck",
  bakkie:  "Bakkie / Pickup",
  trailer: "Trailer",
};