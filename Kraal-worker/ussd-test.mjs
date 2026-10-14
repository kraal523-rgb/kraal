import { generateKeyPairSync } from "node:crypto";
import worker from "./worker.js";

// ── fake Google backend ───────────────────────────────────────────────────
const docs = new Map(); // path -> typed fields
const authUsers = new Map(); // phone -> uid
let uidCounter = 0;

const toPlain = (v) => {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(toPlain);
  if ("mapValue" in v) return plain(v.mapValue.fields || {});
};
const plain = (f) =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, toPlain(v)]));
const get = (path) => (docs.has(path) ? plain(docs.get(path)) : undefined);

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "Content-Type": "application/json" },
  });

globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  const method = (init.method || "GET").toUpperCase();
  if (url.startsWith("https://oauth2.googleapis.com/token"))
    return json({ access_token: "tok", expires_in: 3600 });

  if (url.includes("identitytoolkit.googleapis.com")) {
    const body = JSON.parse(init.body);
    if (url.endsWith(":lookup")) {
      const uid = authUsers.get(body.phoneNumber[0]);
      return json(uid ? { users: [{ localId: uid }] } : {});
    }
    if (authUsers.has(body.phoneNumber))
      return json({ error: { message: "PHONE_NUMBER_EXISTS" } }, 400);
    const uid = "uid" + ++uidCounter;
    authUsers.set(body.phoneNumber, uid);
    return json({ localId: uid });
  }

  if (url.includes("firestore.googleapis.com")) {
    if (url.endsWith(":runQuery")) {
      const f = JSON.parse(init.body).structuredQuery.where.fieldFilter;
      const coll = JSON.parse(init.body).structuredQuery.from[0].collectionId;
      const wanted =
        f.op === "IN"
          ? f.value.arrayValue.values.map((v) => v.stringValue)
          : [f.value.stringValue];
      const hits = [];
      for (const [p, fields] of docs) {
        if (
          p.startsWith(coll + "/") &&
          p.split("/").length === 2 &&
          wanted.includes(fields[f.field.fieldPath]?.stringValue)
        )
          hits.push({ document: { name: p, fields } });
      }
      return json(hits.length ? hits : [{ readTime: "x" }]);
    }
    const m = url.match(/\/documents\/([^?]+)(\?(.*))?$/);
    const path = decodeURIComponent(m[1]);
    if (method === "GET")
      return docs.has(path) ? json({ fields: docs.get(path) }) : json({}, 404);
    if (method === "PATCH") {
      const incoming = JSON.parse(init.body).fields || {};
      const mask = (m[3] || "")
        .split("&")
        .filter(Boolean)
        .map((s) => decodeURIComponent(s.split("=")[1]));
      const cur = docs.get(path) || {};
      if (mask.length === 0) docs.set(path, incoming);
      else {
        const next = { ...cur };
        for (const k of mask) {
          if (k in incoming) next[k] = incoming[k];
          else delete next[k];
        }
        docs.set(path, next);
      }
      return json({ name: path });
    }
  }
  throw new Error("unexpected fetch " + method + " " + url);
};

// ── env + dial helper ─────────────────────────────────────────────────────
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const env = {
  USSD_SECRET: "s3cret",
  FIREBASE_PROJECT_ID: "p",
  FIREBASE_CLIENT_EMAIL: "x@y",
  FIREBASE_PRIVATE_KEY: privateKey.replace(/\n/g, "\\n"),
};

let failures = 0,
  checks = 0;
const ok = (cond, msg) => {
  checks++;
  if (!cond) {
    failures++;
    console.log("  ✗ FAIL:", msg);
  }
};

async function dial(phone, text, key = "s3cret") {
  const body = new URLSearchParams({
    phoneNumber: phone,
    text,
    sessionId: "s",
  });
  const res = await worker.fetch(
    new Request(`https://w.dev/ussd?key=${key}`, { method: "POST", body }),
    env,
    { waitUntil() {} },
  );
  const out = await res.text();
  ok(
    out.length <= 182,
    `response over 182 chars (${out.length}): ${out.slice(0, 40)}…`,
  );
  ok(/^(CON|END) /.test(out), `bad prefix: ${out}`);
  return out;
}

// rule helpers mirrored from firestore.rules
const validUserDoc = (d, uid) =>
  ["uid", "email", "role"].every((k) => k in d) &&
  d.uid === uid &&
  typeof d.email === "string" &&
  ["buyer", "seller", "transporter", "vet"].includes(d.role);
const validBiz = (d) =>
  ["email", "businessName", "phone", "country", "province"].every(
    (k) => k in d,
  ) &&
  typeof d.email === "string" &&
  d.businessName.length > 0 &&
  d.phone.length > 0 &&
  typeof d.country === "string" &&
  typeof d.province === "string";

// ── 1. wrong key ──────────────────────────────────────────────────────────
console.log("1. secret check");
{
  const r = await worker.fetch(
    new Request("https://w.dev/ussd?key=bad", {
      method: "POST",
      body: new URLSearchParams({ phoneNumber: "0771", text: "" }),
    }),
    env,
    {},
  );
  ok(r.status === 403, "bad key should 403");
}

// ── 2. register each role ─────────────────────────────────────────────────
console.log("2. registration");
ok(
  (await dial("0771000001", "")).startsWith("CON Kraal Market"),
  "new number sees register menu",
);
ok((await dial("0771000001", "1")).includes("Seller"), "role menu");
const sellerEnd = await dial(
  "0771000001",
  "1*1*Tendai Moyo*63-123456-a-42*5*Marondera Farm*1234*1234",
);
ok(
  sellerEnd.startsWith("END Welcome Tendai Moyo"),
  "seller registered: " + sellerEnd,
);
{
  const u = get("users/uid1"),
    s = get("sellers/uid1"),
    c = get("ussd_credentials/uid1");
  ok(validUserDoc(u, "uid1"), "users doc passes validUserDoc");
  ok(
    u.role === "seller" &&
      u.phone === "+263771000001" &&
      u.nationalId === "63-123456-A-42",
    "users fields",
  );
  ok(!("pinHash" in u) && !("pinSalt" in u), "no PIN hash on users doc");
  ok(
    c && c.pinHash.length === 64 && c.failedAttempts === 0,
    "credentials stored privately",
  );
  ok(validBiz(s), "sellers doc passes validSellerProfile");
  ok(
    s.province === "Mashonaland East",
    "province expanded to full name: " + s.province,
  );
  ok(
    !("nationalId" in s) && !("pinHash" in s),
    "public sellers doc has no ID/PIN",
  );
}
ok(
  (
    await dial(
      "0771000002",
      "1*3*Farai Dube*12-1234567-B-12*2*ABC1234*2*4321*4321",
    )
  ).includes("registered as transporter"),
  "transporter registered",
);
{
  const t = get("transporters/uid2");
  ok(
    validBiz(t) &&
      Array.isArray(t.serviceProvinces) &&
      t.serviceProvinces[0] === "Bulawayo" &&
      t.vehicleType === "small_truck" &&
      t.available === true,
    "transporter doc: " + JSON.stringify(t),
  );
}
ok(
  (
    await dial("0771000003", "1*4*Dr Ncube*45-1111111-C-45*1*VET-55*1111*1111")
  ).includes("registered as vet"),
  "vet registered",
);
{
  const v = get("vets/uid3");
  ok(validBiz(v) && v.vetRegNo === "VET-55", "vet doc");
}
ok(
  (
    await dial("0771000004", "1*2*Chipo Buyer*22-2222222-D-22*1*9999*9999")
  ).includes("registered as buyer"),
  "buyer registered",
);
{
  ok(
    validUserDoc(get("users/uid4"), "uid4") &&
      get("buyers/uid4")?.role === "buyer",
    "buyer docs",
  );
}

// ── 3. validation + retry ─────────────────────────────────────────────────
console.log("3. validation");
ok(
  (await dial("0771000005", "1*1*Ab")).startsWith("END Invalid"),
  "short name rejected",
);
ok(
  (await dial("0771000005", "1*1*Good Name*badid")).startsWith("END Invalid"),
  "bad ID rejected",
);
ok(
  (
    await dial("0771000005", "1*2*Good Name*22-2222222-D-22*1*1234*9999")
  ).startsWith("END Invalid"),
  "PIN mismatch rejected",
);
ok(!docs.has("users/uid5"), "nothing written for rejected attempts");

// ── 4. sign in ────────────────────────────────────────────────────────────
console.log("4. sign in");
ok(
  (await dial("0771000001", "")).includes("Enter your 4-digit PIN"),
  "registered number asked for PIN",
);
ok(
  (await dial("0771000001", "1234")).includes("1 My account"),
  "correct PIN shows menu",
);
{
  const a = await dial("0771000001", "1234*1");
  ok(
    a.includes("Role: seller") &&
      a.includes("Mashonaland East") &&
      a.includes("pending"),
    "account summary: " + a,
  );
}
ok(
  (await dial("0771000001", "1234*2")).startsWith("END Market"),
  "market info",
);

// ── 5. lockout ────────────────────────────────────────────────────────────
console.log("5. lockout");
ok(
  (await dial("0771000002", "0000")).includes("2 tries left"),
  "1st wrong PIN",
);
ok((await dial("0771000002", "1111")).includes("1 try left"), "2nd wrong PIN");
ok(
  (await dial("0771000002", "2222")).includes("Locked for 15 min"),
  "3rd wrong PIN locks",
);
ok(
  (await dial("0771000002", "4321")).includes("Try again in"),
  "correct PIN refused while locked",
);
const realNow = Date.now;
Date.now = () => realNow() + 16 * 60000;
ok(
  (await dial("0771000002", "4321")).includes("1 My account"),
  "correct PIN works after lock expires",
);
ok(
  get("ussd_credentials/uid2").failedAttempts === 0 &&
    get("ussd_credentials/uid2").lockedUntil === 0,
  "counters reset",
);
Date.now = realNow;
ok((await dial("0771000002", "12")).includes("Invalid PIN"), "malformed PIN");

// ── 6. legacy + app-registered users ──────────────────────────────────────
console.log("6. legacy / app users");
{
  // old-style doc: hash on users/{uid}. Build via a registration then move the hash.
  await dial("0771000006", "1*2*Old User*33-3333333-E-33*1*5555*5555");
  const id = authUsers.get("+263771000006");
  const c = docs.get(`ussd_credentials/${id}`);
  docs.delete(`ussd_credentials/${id}`);
  docs.set(`users/${id}`, {
    ...docs.get(`users/${id}`),
    pinHash: c.pinHash,
    pinSalt: c.pinSalt,
  });
  ok(
    (await dial("0771000006", "5555")).includes("1 My account"),
    "legacy user can sign in",
  );
  ok(
    !("pinHash" in get(`users/${id}`)) &&
      get(`ussd_credentials/${id}`)?.pinHash,
    "legacy hash migrated off users doc",
  );
  ok(
    (await dial("0771000006", "5555*1")).includes("Old User"),
    "still signs in after migration",
  );
}
{
  docs.set("users/appuser", {
    uid: { stringValue: "appuser" },
    email: { stringValue: "a@b.c" },
    phone: { stringValue: "+263771000009" },
    role: { stringValue: "buyer" },
  });
  const r = await dial("0771000009", "1234");
  ok(
    r.startsWith("END") && r.includes("app"),
    "email/app user is pointed to the app: " + r,
  );
}

console.log("7. WhatsApp-registered numbers");
{
  // registration.js style: doc id is the number, no uid/PIN, phone has no "+"
  docs.set("users/263771000010", {
    phone: { stringValue: "263771000010" },
    role: { stringValue: "seller" },
    businessName: { stringValue: "Wa Farm" },
  });
  const before = docs.size,
    authBefore = authUsers.size;
  const r = await dial("0771000010", "");
  ok(
    r.startsWith("END") && r.includes("WhatsApp"),
    "WhatsApp user gets a clear message: " + r,
  );
  ok(
    (await dial("0771000010", "1")).includes("WhatsApp"),
    "no duplicate registration offered",
  );
  ok(
    docs.size === before && authUsers.size === authBefore,
    "nothing new created for WhatsApp user",
  );
  // a uid-backed profile with the same number wins over the WhatsApp one
  const id = authUsers.get("+263771000001");
  ok(
    (await dial("0771000001", "")).includes("Enter your 4-digit PIN"),
    "registered USSD user still signs in",
  );
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
