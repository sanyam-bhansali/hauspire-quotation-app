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

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "not_configured", message: "ANTHROPIC_API_KEY is not set — enter dimensions manually." },
      { status: 501 }
    );
  }
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "no_image" }, { status: 400 });

    // Floor plan can be an image OR a PDF — the vision model reads both.
    const isPdf = String(mediaType || "").includes("pdf");
    const mediaBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: imageBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } };

    const model = await resolveModel(key);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [mediaBlock, { type: "text", text: PROMPT }],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: "vision_failed", model, detail: t }, { status: 502 });
    }
    const data = await resp.json();
    // Concatenate all text blocks (newer models may emit a reasoning block first).
    const text: string = (data?.content || [])
      .filter((b: any) => b?.type === "text" && typeof b.text === "string")
      .map((b: any) => b.text)
      .join("\n") || data?.content?.[0]?.text || "";
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
