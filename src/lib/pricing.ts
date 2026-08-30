// Central pricing logic — calibrated to Hauspire's real first-quotes.
// TPV = (MO + NM) + 7% professional fee − 15% discount on modular (MO).
import type { TemplateItem, QuoteLine, Totals } from "./types";

export const MM_PER_SQFT = 92903.04; // mm² in one sqft (1 ft = 304.8 mm)
export const FEE_RATE = 0.07;
export const MODULAR_DISCOUNT = 0.15;
export const BOOKING_ADVANCE = 25000;

export const BHK_ROOMS: Record<string, string[]> = {
  "1 BHK": ["Kitchen", "Master Bedroom", "Living, Dining & Foyer", "Other Services"],
  "2 BHK": ["Kitchen", "Master Bedroom", "Kids Bedroom", "Living, Dining & Foyer", "Other Services"],
  "3 BHK": ["Kitchen", "Master Bedroom", "Kids Bedroom", "Guest Bedroom", "Living, Dining & Foyer", "Other Services"],
  "4 BHK": ["Kitchen", "Master Bedroom", "Kids Bedroom", "Guest Bedroom", "Parents Bedroom", "Living, Dining & Foyer", "Other Services"],
};

export function feetInchesToMm(ft: number, inch = 0): number {
  return Math.round(ft * 304.8 + inch * 25.4);
}

/** L-kitchen heuristic: run ≈ (width + depth) − 900mm corner/door allowance. */
export function estimateKitchenRun(widthMm: number, depthMm: number): number {
  return Math.max(600, widthMm + depthMm - 900);
}

export function areaAmount(widthMm: number, heightMm: number, ratePerSqft: number): number {
  return Math.round((widthMm * heightMm) / MM_PER_SQFT * ratePerSqft);
}

/** Compute the amount for one template item given the project context. */
export function lineAmount(
  it: TemplateItem,
  ctx: { kitchenRun: number; bedrooms: number }
): number {
  switch (it.kind) {
    case "run":
      return areaAmount(ctx.kitchenRun, it.H ?? 600, it.rate ?? 0);
    case "fixed":
      return areaAmount(it.W ?? 0, it.H ?? 0, it.rate ?? 0);
    case "perbed":
      return (it.amt ?? 0) * ctx.bedrooms;
    case "unit":
    default:
      return it.amt ?? 0;
  }
}

export interface DiscountOpts {
  modularPct?: number; // e.g. 0.15 for 15%
  onSpot?: number; // flat ₹ off
}

export function computeTotals(lines: QuoteLine[], opts: DiscountOpts = {}): Totals {
  const modularPct = opts.modularPct ?? MODULAR_DISCOUNT;
  const onSpot = opts.onSpot ?? 0;
  let mo = 0;
  let nm = 0;
  for (const l of lines) {
    if (l.wc === "MO-01") mo += l.amount;
    else nm += l.amount;
  }
  const fee = Math.round((mo + nm) * FEE_RATE);
  const subTotal = mo + nm + fee;
  const discount = Math.round(mo * modularPct);
  const tpv = subTotal - discount - onSpot;
  const after = tpv - BOOKING_ADVANCE;
  const stages = [
    { label: "Booking Advance (Fully Refundable for 3 days)", amount: BOOKING_ADVANCE },
    { label: "Design First Draft (5%)", amount: Math.round(after * 0.05) },
    { label: "Design Closure (10%)", amount: Math.round(after * 0.1) },
    { label: "Material Procurement (40%)", amount: Math.round(after * 0.4) },
    { label: "Material Dispatch (40%)", amount: Math.round(after * 0.4) },
    { label: "Project Handover (5%)", amount: Math.round(after * 0.05) },
  ];
  return { mo, nm, fee, subTotal, discount, onSpot, modularPct, tpv, stages };
}

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
