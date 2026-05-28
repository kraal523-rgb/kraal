/**
 * session.js — Conversation state stored in Cloudflare KV
 *
 * Session shape:
 * {
 *   phone: string,
 *   name: string,
 *   step: SessionStep,
 *   draft: DraftListing,
 *   photoKeys: string[],      // R2 keys of uploaded photos
 *   photoUrls: string[],      // public URLs for AI vision
 *   startedAt: ISO string,
 *   lastActivity: ISO string,
 *   retries: number,
 * }
 *
 * Steps:
 *   idle           → no active listing in progress
 *   awaiting_photo → asked for photo, waiting
 *   awaiting_price → have photo, need price
 *   awaiting_location → have price, need location
 *   awaiting_confirm → have all details, showing preview
 *   awaiting_payment → listing created, waiting for payment
 */

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export const STEPS = {
  IDLE: "idle",
  AWAITING_PHOTO: "awaiting_photo",
  AWAITING_PRICE: "awaiting_price",
  AWAITING_LOCATION: "awaiting_location",
  AWAITING_CONFIRM: "awaiting_confirm",
  AWAITING_PAYMENT: "awaiting_payment",
};

// ── Get session (returns null if not found) ───────────────────────────────────
export async function getSession(phone, env) {
  const raw = await env.SESSIONS.get(`session:${phone}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Save session ──────────────────────────────────────────────────────────────
export async function saveSession(phone, data, env) {
  const session = {
    ...data,
    phone,
    lastActivity: new Date().toISOString(),
  };
  await env.SESSIONS.put(
    `session:${phone}`,
    JSON.stringify(session),
    { expirationTtl: SESSION_TTL_SECONDS }
  );
  return session;
}

// ── Clear session ─────────────────────────────────────────────────────────────
export async function clearSession(phone, env) {
  await env.SESSIONS.delete(`session:${phone}`);
}

// ── Create a fresh session ────────────────────────────────────────────────────
export function createFreshSession(phone, name) {
  return {
    phone,
    name,
    step: STEPS.IDLE,
    draft: {},
    photoKeys: [],
    photoUrls: [],
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    retries: 0,
  };
}

// ── Update draft fields ───────────────────────────────────────────────────────
export async function updateDraft(phone, fields, env) {
  const session = await getSession(phone, env) || createFreshSession(phone, "");
  session.draft = { ...session.draft, ...fields };
  return saveSession(phone, session, env);
}