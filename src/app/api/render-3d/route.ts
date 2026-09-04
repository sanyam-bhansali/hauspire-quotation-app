import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Beautify the accurate three.js isometric view into a realistic render using an
// image-capable Gemini model. Needs GEMINI_API_KEY (image models are separate
// from text; set IMAGE_MODEL to override). Graceful when not configured.
const PROMPT =
  "This is a rough isometric 3D massing of a residential flat's interior (rooms, walls and blocky furniture). " +
  "Re-render it as a clean, realistic Planner-5D / SketchUp-style isometric interior illustration: keep the SAME room layout, " +
  "wall positions and furniture placement, but make the furniture look realistic (beds with bedding, sofas, wooden wardrobes, " +
  "kitchen counters and cabinets, dining set, plants), soft studio lighting, light neutral materials, white background. " +
  "Do not add rooms or change proportions.";

async function resolveImageModel(key: string): Promise<string> {
  if (process.env.IMAGE_MODEL) return process.env.IMAGE_MODEL;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (r.ok) {
      const j = await r.json();
      const names: string[] = (j.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m: any) => String(m.name || "").replace(/^models\//, ""));
      const img = names.find((n) => n.includes("image"));
      if (img) return img;
    }
  } catch {
    /* ignore */
  }
  return "gemini-2.5-flash-image";
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "not_configured", message: "Set GEMINI_API_KEY (image-capable) to use AI render." }, { status: 501 });
  }
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "no_image" }, { status: 400 });
    const model = await resolveImageModel(key);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ inline_data: { mime_type: "image/png", data: imageBase64 } }, { text: PROMPT }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    };
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let resp!: Response;
    for (let attempt = 0; attempt < 3; attempt++) {
      resp = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (resp.ok) break;
      if (resp.status === 429 && attempt < 2) { await sleep(2000 * (attempt + 1)); continue; }
      break;
    }
    if (!resp.ok) {
      const detail = await resp.text();
      const quota = resp.status === 429;
      return NextResponse.json(
        { error: quota ? "quota" : "render_failed", model, detail, message: quota ? "Image-generation quota exceeded — image AI needs billing enabled (unlike text/vision). The free 3D + Download still work." : undefined },
        { status: quota ? 429 : 502 }
      );
    }
    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p: any) => p.inline_data?.data || p.inlineData?.data);
    const image = imgPart?.inline_data?.data || imgPart?.inlineData?.data;
    if (!image) return NextResponse.json({ error: "no_image_returned", model, detail: JSON.stringify(parts).slice(0, 200) }, { status: 502 });
    return NextResponse.json({ image, model });
  } catch (e: any) {
    return NextResponse.json({ error: "server_error", message: String(e?.message || e) }, { status: 500 });
  }
}
