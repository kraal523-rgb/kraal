/**
 * webhook.js — Meta webhook verification + event routing
 */

import { processMessage } from "./messageProcessor.js";

// ── Meta webhook verification ─────────────────────────────────────────────────
export function handleWebhookVerification(request, env) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return new Response(challenge, { status: 200 });
  }

  console.error("Webhook verification failed — token mismatch");
  return new Response("Forbidden", { status: 403 });
}

// ── Route incoming webhook events ─────────────────────────────────────────────
export async function handleWebhookEvent(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    console.error("Failed to parse webhook body");
    return;
  }

  // Meta sends entries — iterate all
  const entries = body?.entry || [];
  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const messages = value?.messages || [];
      const contacts = value?.contacts || [];

      for (const message of messages) {
        const contact = contacts.find((c) => c.wa_id === message.from);
        const senderName = contact?.profile?.name || "Farmer";

        try {
          await processMessage(message, senderName, env);
        } catch (err) {
          console.error(`Error processing message from ${message.from}:`, err);
          // Try to notify user of error without crashing
          await sendTextMessage(
            message.from,
            "Sorry, something went wrong. Please try again or type HELP.",
            env,
          ).catch(() => {});
        }
      }
    }
  }
}

// ── Send a plain text WhatsApp message ───────────────────────────────────────
export async function sendTextMessage(to, text, env) {
  return sendWhatsAppMessage(to, { type: "text", text: { body: text } }, env);
}

// ── Send an interactive button message ───────────────────────────────────────
export async function sendButtonMessage(to, bodyText, buttons, env) {
  return sendWhatsAppMessage(
    to,
    {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    },
    env,
  );
}

// ── Send a list message ───────────────────────────────────────────────────────
export async function sendListMessage(
  to,
  bodyText,
  buttonLabel,
  sections,
  env,
) {
  return sendWhatsAppMessage(
    to,
    {
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: buttonLabel,
          sections,
        },
      },
    },
    env,
  );
}

// ── Core WhatsApp API sender ──────────────────────────────────────────────────
export async function sendWhatsAppMessage(to, messagePayload, env) {
  const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    ...messagePayload,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("WhatsApp send failed:", err);
    throw new Error(`WhatsApp API error: ${res.status}`);
  }

  return res.json();
}

// ── Download media from Meta servers ─────────────────────────────────────────
export async function downloadMedia(mediaId, env) {
  // Step 1: get the download URL
  const metaUrl = `https://graph.facebook.com/v19.0/${mediaId}`;
  const urlRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });

  if (!urlRes.ok) throw new Error(`Failed to get media URL: ${urlRes.status}`);
  const { url, mime_type } = await urlRes.json();

  // Step 2: download the actual file
  const fileRes = await fetch(url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });

  if (!fileRes.ok)
    throw new Error(`Failed to download media: ${fileRes.status}`);

  const buffer = await fileRes.arrayBuffer();
  return { buffer, mimeType: mime_type };
}
