import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reads a floor plan with a vision model and returns structured room data.
// Requires ANTHROPIC_API_KEY in the environment. Model is configurable via
// ANTHROPIC_MODEL (defaults to a current vision-capable Claude).
// Pick a model the account actually has: honor ANTHROPIC_MODEL, else ask the
// API which models are available and prefer a Sonnet (good vision + value).
async function resolveModel(key: string): Promise<string> {
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  try {
    const r = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (r.ok) {
      const j = await r.json();
      const ids: string[] = (j.data || []).map((m: any) => m.id).filter(Boolean);
      return (
        ids.find((id) => id.includes("sonnet")) ||
        ids.find((id) => id.includes("opus")) ||
        ids[0] ||
        "claude-3-5-sonnet-20241022"
      );
    }
  } catch {
    /* fall through */
  }
  return "claude-3-5-sonnet-20241022";
}

const PROMPT = `You are reading an architectural floor plan for an interior-design quotation in India.
Extract the flat configuration and each room's printed dimensions (usually like 10'0"X10'2", feet and inches).
Return ONLY strict minified JSON, no prose, in this exact shape:
{"bhk":"1 BHK"|"2 BHK"|"3 BHK"|"4 BHK","kitchen":{"widthFt":number,"depthFt":number}|null,"bathrooms":number,"hasBalcony":boolean,"hasStudy":boolean,"confidence":"high"|"medium"|"low","rooms":[{"name":string,"widthFt":number,"depthFt":number}]}
Rules:
- bhk = number of bedrooms, counting a separate Study/Office room toward the total (e.g. 3 bedrooms + a study is "4 BHK").
- hasStudy = true if there is a separate Study or Office room.
- bathrooms = count of Toilet / Bathroom / W.C. rooms.
- hasBalcony = true if any Balcony / Dry Balcony / Terrace / Dry Terrace is present.
- confidence = how clearly the dimensions were printed and legible (low for handwritten/blurred).
- name should be one of: Kitchen, Master Bedroom, Kids Bedroom, Guest Bedroom, Parents Bedroom, Living/Dining, Study, Toilet, Balcony, Foyer.
- Convert any dimension to decimal feet (e.g. 10'6" -> 10.5). If a dimension is missing/unreadable use 0.
- Include the kitchen both in "kitchen" and in "rooms".`;

// Extract the first complete, brace-balanced JSON object from a string
// (robust to any prose before/after, and to braces inside strings).
function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

type CallResult = { text: string; model: string } | { error: string; model: string };

// Pick an available Gemini model: honor GEMINI_MODEL, else ask the API and
// prefer a current Flash model (fast + free). Robust to model renames.
async function resolveGeminiModel(key: string): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (r.ok) {
      const j = await r.json();
      const names: string[] = (j.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => String(m.name || "").replace(/^models\//, ""))
        .filter(Boolean);
      const ver = (n: string) => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
      // Prefer the newest plain Flash model (highest version number).
      const flash = names
        .filter((n) => n.includes("flash") && !n.includes("lite") && !n.includes("thinking") && !/preview|exp/.test(n))
        .sort((a, b) => ver(b) - ver(a));
      const pick = flash[0] || names.filter((n) => n.includes("flash")).sort((a, b) => ver(b) - ver(a))[0] || names[0];
      if (pick) return pick;
    }
  } catch {
    /* fall through */
  }
  return "gemini-3.6-flash";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Google Gemini (free tier via AI Studio key). Reads images and PDFs.
// Retries on transient 503 "high demand" errors before giving up.
async function callGemini(key: string, imageBase64: string, mediaType: string, isPdf: boolean): Promise<CallResult> {
  const model = await resolveGeminiModel(key);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [
      { inline_data: { mime_type: isPdf ? "application/pdf" : (mediaType || "image/jpeg"), data: imageBase64 } },
      { text: PROMPT },
    ] }],
    generationConfig: { temperature: 0, maxOutputTokens: 2048 },
  };
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const resp = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (resp.ok) {
      const data = await resp.json();
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text).filter(Boolean).join("\n") || "";
      return { text, model };
    }
    lastErr = await resp.text();
    const overloaded = resp.status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(lastErr);
    if (overloaded && attempt < 3) { await sleep(800 * (attempt + 1)); continue; }
    break;
  }
  return { error: lastErr || "unavailable", model };
}

// Anthropic Claude (paid). Reads images and PDFs.
async function callAnthropic(key: string, imageBase64: string, mediaType: string, isPdf: boolean): Promise<CallResult> {
  const model = await resolveModel(key);
  const mediaBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } };
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: [mediaBlock, { type: "text", text: PROMPT }] }] }),
  });
  if (!resp.ok) return { error: await resp.text(), model };
  const data = await resp.json();
  const text = (data?.content || [])
    .filter((b: any) => b?.type === "text" && typeof b.text === "string")
    .map((b: any) => b.text).join("\n") || data?.content?.[0]?.text || "";
  return { text, model };
}

export async function POST(req: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    return NextResponse.json(
      { error: "not_configured", message: "No vision key set (GEMINI_API_KEY or ANTHROPIC_API_KEY) — enter dimensions manually." },
      { status: 501 }
    );
  }
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "no_image" }, { status: 400 });

    // Floor plan can be an image OR a PDF. Prefer Gemini (free); fall back to
    // Claude if Gemini errors or is overloaded and an Anthropic key is set.
    const isPdf = String(mediaType || "").includes("pdf");
    let r: CallResult;
    let provider = "";
    if (anthropicKey) {
      provider = "claude";
      r = await callAnthropic(anthropicKey, imageBase64, mediaType, isPdf);
      if ("error" in r && geminiKey) {
        provider = "gemini (claude unavailable)";
        r = await callGemini(geminiKey, imageBase64, mediaType, isPdf);
      }
    } else {
      provider = "gemini";
      r = await callGemini(geminiKey!, imageBase64, mediaType, isPdf);
    }
    if ("error" in r) {
      return NextResponse.json({ error: "vision_failed", provider, model: r.model, detail: r.error }, { status: 502 });
    }
    const text = r.text;
    const model = r.model;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      return NextResponse.json({ error: "parse_failed", model, raw: text.slice(0, 400) }, { status: 502 });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "parse_failed", model, raw: jsonStr.slice(0, 400) }, { status: 502 });
    }

    // Derive kitchen run (mm): (width + depth) − 900 (L-kitchen allowance).
    const ftToMm = (ft: number) => Math.round(ft * 304.8);
    let kitchenRun = 3960;
    if (parsed.kitchen && parsed.kitchen.widthFt && parsed.kitchen.depthFt) {
      kitchenRun = Math.max(600, ftToMm(parsed.kitchen.widthFt) + ftToMm(parsed.kitchen.depthFt) - 900);
    }
    const rooms = (parsed.rooms || []).map((r: any) => ({
      name: r.name,
      widthMm: ftToMm(r.widthFt || 0),
      depthMm: ftToMm(r.depthFt || 0),
    }));

    return NextResponse.json({
      bhk: parsed.bhk || "3 BHK",
      kitchenRun,
      bathrooms: Number(parsed.bathrooms) || 1,
      hasBalcony: !!parsed.hasBalcony,
      hasStudy: !!parsed.hasStudy,
      confidence: parsed.confidence || "medium",
      rooms,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "server_error", message: String(e?.message || e) }, { status: 500 });
  }
}
