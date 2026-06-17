/**
 * utils.js — Shared text builders + lookup tables for the WhatsApp listing flow
 *
 * ⚠️ TODO before going live: replace PAYMENT_NUMBER and SUPPORT_NUMBER below
 * with your real EcoCash number and support line. These are placeholders —
 * left as-is, sellers would be told to pay a fake number.
 */

const LISTING_FEE = 1.5;
const PAYMENT_NUMBER = "0XX XXX XXXX"; // TODO: your real EcoCash number
const SUPPORT_NUMBER = "+263 7X XXX XXXX"; // TODO: your real support line

// Used to guess a listing category from free-text descriptions (e.g. during
// registration or manual entry flows). Imported-but-unused in
// messageProcessor.js currently — kept here for use elsewhere.
export const CATEGORY_KEYWORDS = {
  cattle: ["cow", "cows", "bull", "bulls", "heifer", "heifers", "calf", "calves", "cattle", "ox", "oxen", "steer", "steers"],
  goats: ["goat", "goats", "buck", "bucks", "doe", "does", "kid", "kids"],
  sheep: ["sheep", "ram", "rams", "ewe", "ewes", "lamb", "lambs"],
  pigs: ["pig", "pigs", "boar", "boars", "sow", "sows", "piglet", "piglets"],
  poultry: ["chicken", "chickens", "hen", "hens", "rooster", "roosters", "broiler", "broilers", "layer", "layers", "duck", "ducks", "turkey", "turkeys"],
  other: [],
};

export function buildListingPreview(draft = {}, name = "Farmer") {
  const lines = [`📋 *Listing Preview*`, ""];
  lines.push(`👤 Seller: ${name}`);
  if (draft.title) lines.push(`🐾 Animal: ${draft.title}`);
  if (draft.category) lines.push(`📂 Category: ${draft.category}`);
  if (draft.breed) lines.push(`🧬 Breed: ${draft.breed}`);
  if (draft.quantity) lines.push(`🔢 Quantity: ${draft.quantity}`);
  if (draft.price) {
    lines.push(`💵 Price: USD $${draft.price}${draft.pricePerHead ? " per head" : ""}`);
  }
  if (draft.city) {
    lines.push(`📍 Location: ${draft.city}${draft.province ? `, ${draft.province}` : ""}`);
  }
  lines.push("", "Is everything correct?");
  return lines.join("\n");
}

export function buildPaymentMessage(draft = {}, listingId, listingUrl) {
  const title = draft.title || draft.category || "your animal";
  const lines = [
    `💳 *Payment Required*`,
    "",
    `Your listing for *${title}* is ready${listingId ? ` (ID: ${listingId})` : ""}.`,
    "",
    `To publish it on kraal.market, pay the *USD $${LISTING_FEE}* listing fee via EcoCash:`,
    "",
    `📱 EcoCash number: *${PAYMENT_NUMBER}*`,
  ];
  if (listingId) lines.push(`📝 Reference: ${listingId}`);
  if (listingUrl) lines.push("", `🔗 Preview: ${listingUrl}`);
  lines.push(
    "",
    `Once paid, reply *PAID* and we'll activate your listing within 1 hour.`,
    `Need help? Call ${SUPPORT_NUMBER}.`,
  );
  return lines.join("\n");
}