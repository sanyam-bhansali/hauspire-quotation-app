"use client";
// Free, in-browser floor-plan reader using Tesseract OCR — no API key, no cost.
// Best-effort: works on clean digital plans/photos with legible printed
// dimensions; returns null when it can't read enough, so the caller can fall
// back to the vision model or manual entry.
import Tesseract from "tesseract.js";

export interface PlanExtract {
  bhk: string;
  kitchenRun: number;
  bathrooms: number;
  hasBalcony: boolean;
  hasStudy: boolean;
  confidence: "high" | "medium" | "low";
  rooms: { name: string; widthMm: number; depthMm: number }[];
  source: "OCR";
}

const FT = 304.8;
const ftToMm = (ft: number) => Math.round(ft * FT);

// tolerant to OCR noise: 10'0"X10'2"  →  [ft, in, ft, in]
const DIM = /(\d{1,2})\s*['’ºo"]?\s*(\d{0,2})\s*["”]?\s*[xX×]\s*(\d{1,2})\s*['’ºo"]?\s*(\d{0,2})/;

const ROOMS: [RegExp, string][] = [
  [/m\.?\s*bed|master/i, "Master Bedroom"],
  [/kids?\s*bed/i, "Kids Bedroom"],
  [/guest\s*bed/i, "Guest Bedroom"],
  [/parents?\s*bed/i, "Parents Bedroom"],
  [/bed\s*room|bedroom/i, "Bedroom"],
  [/kitchen/i, "Kitchen"],
  [/living|dining|hall/i, "Living/Dining"],
  [/study|office/i, "Study"],
  [/toilet|w\.?c|bath/i, "Toilet"],
  [/balcony|terrace/i, "Balcony"],
  [/foyer|lobby/i, "Foyer"],
];

function roomFor(text: string): string | null {
  for (const [re, name] of ROOMS) if (re.test(text)) return name;
  return null;
}
function parseDim(text: string): { w: number; h: number } | null {
  const m = text.match(DIM);
  if (!m) return null;
  const w = ftToMm(Number(m[1]) + (Number(m[2]) || 0) / 12);
  const h = ftToMm(Number(m[3]) + (Number(m[4]) || 0) / 12);
  if (w < 600 || w > 12000 || h < 600 || h > 12000) return null;
  return { w, h };
}

// Render page 1 of a PDF to a canvas so OCR (which needs an image) can read it.
async function pdfToCanvas(file: File): Promise<HTMLCanvasElement> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
  return canvas;
}

export async function ocrExtractPlan(file: File): Promise<PlanExtract | null> {
  // Images go straight to OCR; PDFs are rasterized to an image first.
  const input: File | HTMLCanvasElement = file.type.includes("pdf") ? await pdfToCanvas(file) : file;
  const worker = await Tesseract.createWorker("eng");
  let lines: string[] = [];
  try {
    const { data } = await worker.recognize(input as any);
    lines = (data.lines || []).map((l: any) => l.text.trim()).filter(Boolean);
    if (!lines.length && data.text) lines = data.text.split("\n").map((s) => s.trim()).filter(Boolean);
  } finally {
    await worker.terminate();
  }

  const rooms: { name: string; widthMm: number; depthMm: number }[] = [];
  let bathrooms = 0;
  let hasBalcony = false;
  let hasStudy = false;
  let bedCount = 0; // count each bedroom label occurrence (→ BHK)
  let lastRoom: string | null = null;

  for (const line of lines) {
    const rm = roomFor(line);
    if (rm === "Toilet") bathrooms++;
    if (rm === "Balcony") hasBalcony = true;
    if (rm === "Study") hasStudy = true;
    if (rm && rm.includes("Bedroom")) bedCount++;
    if (rm && rm !== "Toilet" && rm !== "Balcony") lastRoom = rm;

    const dim = parseDim(line);
    if (dim) {
      const name = rm && rm !== "Toilet" && rm !== "Balcony" ? rm : lastRoom;
      if (name) rooms.push({ name, widthMm: dim.w, depthMm: dim.h });
    }
  }

  // Kitchen run — accept only realistic kitchen dimensions (7–15 ft/side).
  let kitchenRun = 0;
  let runOk = true;
  const kitchen = rooms.find((r) => r.name === "Kitchen");
  if (kitchen) {
    const sane = (mm: number) => mm >= 2000 && mm <= 4600;
    if (sane(kitchen.widthMm) && sane(kitchen.depthMm)) {
      kitchenRun = kitchen.widthMm + kitchen.depthMm - 900;
    } else {
      runOk = false; // misread dimension — leave for the designer
    }
  }

  // Bedrooms (by label count, incl. study) → BHK.
  let beds = bedCount || rooms.filter((r) => r.name.includes("Bedroom")).length;
  if (hasStudy) beds += 1;
  beds = Math.min(4, Math.max(beds, 0));
  const bhk = beds >= 1 ? `${beds} BHK` : "3 BHK";

  // Not enough signal → let the caller fall back.
  if (!kitchenRun && rooms.length < 2) return null;

  const conf: PlanExtract["confidence"] =
    runOk && kitchenRun && beds >= 1 && rooms.length >= 3 ? "medium" : "low";
  return {
    bhk,
    kitchenRun: kitchenRun || 3960,
    bathrooms: bathrooms || 1,
    hasBalcony,
    hasStudy,
    confidence: conf,
    rooms,
    source: "OCR",
  };
}
