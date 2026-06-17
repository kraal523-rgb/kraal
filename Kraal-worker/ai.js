/**
 * ai.js — Workers AI helpers: image understanding + speech-to-text
 *
 * Reuses the same "AI" binding your worker.js already uses for
 * env.AI.run(...) elsewhere — no new wrangler.toml config needed.
 */

const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";
const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";

/**
 * Looks at a photo of an animal and tries to extract listing details.
 * Returns {} on any failure (caller already expects this — see the
 * try/catch around extractListingFromImage in messageProcessor.js).
 */
export async function extractListingFromImage(photoUrl, context, env) {
  try {
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image (${imgRes.status})`);
    }
    const imgBuffer = await imgRes.arrayBuffer();

    const prompt =
      `You are a livestock listing assistant for Kraal, a marketplace in Zimbabwe. ` +
      `Look at this photo and identify the animal(s) for sale.` +
      (context ? ` ${context}` : "") +
      `\n\nRespond ONLY with a single valid JSON object, no markdown, no explanation:\n` +
      `{"title":"short title e.g. 'Brahman Bull'","category":"cattle|goats|sheep|poultry|pigs|other",` +
      `"breed":null,"quantity":1,"price":null}`;

    const result = await env.AI.run(VISION_MODEL, {
      image: [...new Uint8Array(imgBuffer)],
      prompt,
      max_tokens: 300,
    });

    const raw = result?.description || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || null,
      category: parsed.category || null,
      breed: parsed.breed || null,
      quantity: parsed.quantity || null,
      price: typeof parsed.price === "number" ? parsed.price : null,
    };
  } catch (err) {
    console.error("extractListingFromImage failed:", err.message);
    return {};
  }
}

/**
 * Transcribes a WhatsApp voice note. Always resolves to a string (never
 * throws) — messageProcessor.js calls this without a try/catch, so on
 * failure we just return "" and the flow continues without a transcript.
 */
export async function transcribeAudio(buffer, mimeType, env) {
  try {
    const result = await env.AI.run(WHISPER_MODEL, {
      audio: [...new Uint8Array(buffer)],
    });
    return (result?.text || "").trim();
  } catch (err) {
    console.error(`transcribeAudio failed (mime=${mimeType}):`, err.message);
    return "";
  }
}
