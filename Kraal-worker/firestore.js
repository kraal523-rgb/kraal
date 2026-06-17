/**
 * firestore.js — Firestore REST API helpers (Google service-account auth)
 *
 * Reuses the same FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL /
 * FIREBASE_PRIVATE_KEY secrets your worker.js already uses for the
 * verification flow — same JWT-signing approach, just exported here so
 * registration.js and messageProcessor.js can use it too.
 *
 * NOTE: worker.js currently has its OWN private copies of firestoreSet /
 * firestoreGet / getAdminToken / the field converters. That's fine — they
 * still work independently — but it means the same logic now lives in two
 * places. Once this deploy is working, consider having worker.js import
 * firestoreSet/firestoreGet from this file instead, to avoid the two
 * copies drifting apart over time. Not required for the deploy to succeed.
 */

// ── OAuth: mint a Google access token from the service account ───────────────
async function getAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/datastore",
  };

  const headerB64 = toB64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payloadB64 = toB64url(JSON.stringify(payload));
  const sigInput = `${headerB64}.${payloadB64}`;

  const pemKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const cryptoKey = await importPrivatePemKey(pemKey);

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    new TextEncoder().encode(sigInput),
  );

  const sigB64 = toB64url(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${sigInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await tokenRes.json();
  if (!data.access_token) {
    throw new Error(`Failed to get Firebase admin token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Write/merge fields onto a document at docPath ─────────────────────────────
export async function firestoreSet(env, docPath, data) {
  const token = await getAdminToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!res.ok) throw new Error(`Firestore write failed: ${await res.text()}`);
  return res.json();
}

// ── Read a document at docPath. Returns null if missing ──────────────────────
export async function firestoreGet(env, docPath) {
  const token = await getAdminToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const doc = await res.json();
  return doc.fields ? fromFirestoreFields(doc.fields) : null;
}

// ── Create a new listing from a WhatsApp assisted-listing session ────────────
// Returns the new listing's auto-generated document ID.
//
// ⚠️ ASSUMPTION: this writes to a top-level "listings" collection with field
// names guessed from how worker.js's other AI handlers read listings
// (status, price, categoryId). If your marketplace frontend expects a
// different collection path or field names, adjust listingData below to match.
export async function createAssistedListing(session, env) {
  const token = await getAdminToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/listings`;

  const draft = session.draft || {};
  const listingData = {
    sellerPhone: session.phone,
    sellerName: session.name || "Farmer",
    title: draft.title || draft.category || "Livestock for sale",
    categoryId: draft.category || "other",
    breed: draft.breed || "",
    quantity: draft.quantity || 1,
    price: draft.price || 0,
    pricePerHead: !!draft.pricePerHead,
    city: draft.city || "",
    province: draft.province || "Zimbabwe",
    locationLat: draft.locationLat ?? null,
    locationLng: draft.locationLng ?? null,
    photoUrls: session.photoUrls || [],
    voiceTranscript: draft.voiceTranscript || "",
    status: "pending_payment",
    views: 0,
    source: "whatsapp_assisted",
    createdAt: new Date().toISOString(),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toFirestoreFields(listingData) }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create listing: ${await res.text()}`);
  }

  const doc = await res.json();
  // doc.name looks like: projects/<id>/databases/(default)/documents/listings/<AUTO_ID>
  return doc.name.split("/").pop();
}

// ── Field converters (JS <-> Firestore REST format) ───────────────────────────
function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: { values: v.map((item) => valueToFirestore(item)) },
      };
    } else if (typeof v === "number" && Number.isInteger(v)) {
      fields[k] = { integerValue: String(v) };
    } else if (typeof v === "number") {
      fields[k] = { doubleValue: v };
    } else if (typeof v === "boolean") {
      fields[k] = { booleanValue: v };
    } else if (v === null) {
      fields[k] = { nullValue: null };
    } else if (typeof v === "object") {
      fields[k] = { mapValue: { fields: toFirestoreFields(v) } };
    }
  }
  return fields;
}

function valueToFirestore(v) {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number" && Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === "number") return { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (v === null) return { nullValue: null };
  if (typeof v === "object") return { mapValue: { fields: toFirestoreFields(v) } };
  return { nullValue: null };
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) {
    if ("stringValue" in v) obj[k] = v.stringValue;
    else if ("integerValue" in v) obj[k] = Number(v.integerValue);
    else if ("doubleValue" in v) obj[k] = v.doubleValue;
    else if ("booleanValue" in v) obj[k] = v.booleanValue;
    else if ("nullValue" in v) obj[k] = null;
    else if ("arrayValue" in v) {
      obj[k] = (v.arrayValue.values || []).map((item) =>
        fromFirestoreFields({ _: item })._,
      );
    } else if ("mapValue" in v) obj[k] = fromFirestoreFields(v.mapValue.fields || {});
  }
  return obj;
}

// ── Base64url + PEM helpers for signing the JWT (same as worker.js) ──────────
function toB64url(str) {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64Decode(str) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
}

function b64DecodeBytes(str) {
  return Uint8Array.from(b64Decode(str), (c) => c.charCodeAt(0));
}

function pemToBuffer(pem) {
  return b64DecodeBytes(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
}

async function importPrivatePemKey(pem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}