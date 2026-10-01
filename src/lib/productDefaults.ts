// Default size / quantity for a product, taken from its First-Quote defaults in
// the Product Master (the W, H, Qty, sq ft and running-ft set on the Products page).
// Used whenever a product is picked in the builder, so a new line starts at the
// standard size instead of whatever the previous item had.
import type { Product } from "./types";

export interface SizeDefaults {
  w?: number;    // width in mm   (Area products)
  h?: number;    // height in mm  (Area products)
  qty?: number;  // quantity      (Unit products)
  sqft?: number; // floor area    (SqFt products)
  rft?: number;  // running feet  (RFT products)
}

const pos = (v: unknown): number | undefined => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Only the values the master actually sets; missing ones stay undefined so the
 *  caller can keep its current value (e.g. kitchen units sized to the run have no width). */
export function sizeDefaults(p: Product | undefined): SizeDefaults {
  if (!p) return {};
  return { w: pos(p.w), h: pos(p.h), qty: pos(p.qty), sqft: pos(p.area), rft: pos(p.len) };
}
