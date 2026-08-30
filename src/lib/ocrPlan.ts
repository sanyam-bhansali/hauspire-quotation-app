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

export async function ocrExtractPlan(file: File): Promise<PlanExtract | null> {
  const worker = await Tesseract.createWorker("eng");
  let lines: string[] = [];
  try {
    const { data } = await worker.recognize(file);
    lines = (data.lines || []).map((l: any) => l.text.trim()).filter(Boolean);
    if (!lines.length && data.text) lines = data.text.split("\n").map((s) => s.trim()).filter(Boolean);
  } finally {
    await worker.terminate();
  }

  const rooms: { name: string; widthMm: number; depthMm: number }[] = [];
  let bathrooms = 0;
  let hasBalcony = false;
  let hasStudy = false;
  let lastRoom: string | null = null;

  for (const line of lines) {
    const rm = roomFor(line);
    if (rm === "Toilet") bathrooms++;
    if (rm === "Balcony") hasBalcony = true;
    if (rm === "Study") hasStudy = true;
    if (rm && rm !== "Toilet" && rm !== "Balcony") lastRoom = rm;

    const dim = parseDim(line);
    if (dim) {
      // attach to the room named on this line, else the most recent room label
      const name = rm && rm !== "Toilet" && rm !== "Balcony" ? rm : lastRoom;
      if (name) rooms.push({ name, widthMm: dim.w, depthMm: dim.h });
    }
  }

  // Kitchen run from a detected kitchen dimension.
  const kitchen = rooms.find((r) => r.name === "Kitchen");
  const kitchenRun = kitchen ? Math.max(600, kitchen.widthMm + kitchen.depthMm - 900) : 0;

  // Bedrooms (incl. study) → BHK.
  const bedNames = new Set(rooms.filter((r) => r.name.includes("Bedroom")).map((r) => r.name));
  let beds = bedNames.size || rooms.filter((r) => r.name === "Bedroom").length;
  if (hasStudy) beds += 1;
  const bhk = beds >= 1 && beds <= 4 ? `${beds} BHK` : "3 BHK";

  // Not enough signal → let the caller fall back.
  if (!kitchenRun && rooms.length < 2) return null;

  const conf: PlanExtract["confidence"] = kitchenRun && rooms.length >= 3 ? "medium" : "low";
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
