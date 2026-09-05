// Builds the auto first-quotation directly from the Product Master.
// The Product Master decides WHAT is included (products flagged `fq`), WHERE it
// goes (its `rooms` placement categories), and HOW it's priced (its type + rate/
// unit + default size/qty). Change a rate or a default in Products and the first
// quote follows — there is no separate hard-coded template.
import type { Product, QuoteLine } from "./types";
import { BHK_ROOMS, areaAmount, sqftAmount, rftAmount, MM_PER_SQFT } from "./pricing";
import { withStandardSelection } from "./firstQuoteDefaults";

// Default single-layer false-ceiling rate (₹/sqft). Editable per quote.
export const DEFAULT_FC_RATE = 75;

// Suggested wardrobe width from a bedroom's shorter wall (~55% of it, clamped to
// 1200–2400mm). Only a suggestion — always editable.
function wardrobeWidth(dim: { w: number; h: number } | undefined, std: number): number {
  if (!dim || !dim.w || !dim.h) return std;
  const wall = Math.min(dim.w, dim.h);
  return Math.max(1200, Math.min(2400, Math.round((wall * 0.55) / 50) * 50));
}

// sqft floor area of a room from its plan dimensions (mm × mm). 0 if unknown.
function roomSqft(dim: { w: number; h: number } | undefined): number {
  if (!dim || !dim.w || !dim.h) return 0;
  return Math.round((dim.w * dim.h) / MM_PER_SQFT);
}

function normName(s: string): string {
  return s.toLowerCase().replace(/lust[eu]re?/g, "lustre").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

// Map a concrete first-quote room to the placement category used in Product.rooms.
function roomCategory(room: string): string {
  if (room === "Kitchen") return "Kitchen";
  if (room.includes("Bedroom")) return "Bedroom";
  if (room.startsWith("Living")) return "Living";
  if (room.startsWith("Office")) return "Study";
  return "Other";
}

export interface BuildContext {
  bhk: string;
  kitchenRun: number;
  bathrooms?: number;
  hasBalcony?: boolean;
  hasStudy?: boolean;
  sizeToPlan?: boolean;
  roomDims?: Record<string, { w: number; h: number }>;
  kingMaster?: boolean;
  falseCeiling?: boolean;
  fcRate?: number;
}

export function buildFirstQuote(rawProducts: Product[], ctx: BuildContext): QuoteLine[] {
  // If nothing has been flagged for the first quote yet, apply the standard
  // selection automatically so the quote still builds from the live catalog.
  const products = withStandardSelection(rawProducts);
  const base = BHK_ROOMS[ctx.bhk] ?? BHK_ROOMS["3 BHK"];
  const bedrooms = base.filter((r) => r.includes("Bedroom")).length;
  const bathrooms = Math.max(1, ctx.bathrooms ?? 1);
  const bhkLabel = (/villa/i.test(ctx.bhk) ? "4BHK" : ctx.bhk.replace(/\s+/g, "")).toUpperCase();

  const rooms = [...base];
  if (ctx.hasStudy && !rooms.includes("Office / Study")) {
    const i = rooms.indexOf("Other Services");
    rooms.splice(i < 0 ? rooms.length : i, 0, "Office / Study");
  }

  const fq = products.filter((p) => p.fq);
  const byName = (n: string) => products.find((p) => normName(p.product) === normName(n));

  const lines: QuoteLine[] = [];
  for (const room of rooms) {
    const cat = roomCategory(room);
    const isBedroom = cat === "Bedroom";
    const planW = ctx.sizeToPlan && isBedroom ? wardrobeWidth(ctx.roomDims?.[room], 1500) : null;

    for (const p of fq) {
      const cats = (p.rooms || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (!cats.includes(cat)) continue;
      if (p.balcony && !ctx.hasBalcony) continue;
      if (p.bhk && p.bhk.replace(/\s+/g, "").toUpperCase() !== bhkLabel) continue;

      let product = p.product;
      let width: number | null = null;
      let height: number | null = null;
      let amount: number;
      let qty: number | undefined;
      let unitPrice: number | undefined;
      let sqft: number | undefined;
      let rft: number | undefined;
      const rate = p.rate ?? 0;
      const isWardrobeOrLoft = p.product.toLowerCase().includes("wardrobe") || p.product.startsWith("Loft");

      if (p.type === "Area") {
        const w = p.useRun && cat === "Kitchen" ? ctx.kitchenRun : planW && isWardrobeOrLoft ? planW : p.w ?? 0;
        width = w; height = p.h ?? 0; amount = areaAmount(width, height, rate);
      } else if (p.type === "SqFt") {
        sqft = p.area ?? 0; amount = sqftAmount(sqft, rate);
      } else if (p.type === "RFT") {
        rft = p.len ?? 0; amount = rftAmount(rft, rate);
      } else {
        unitPrice = p.unit ?? 0;
        qty = p.perBed ? bedrooms : p.qty ?? 1; // perBath handled by repetition below
        amount = unitPrice * qty;
      }

      // King option: in the Master Bedroom, swap Queen bed/headboard for the King
      // equivalents from the master (which set the price).
      if (room === "Master Bedroom" && ctx.kingMaster) {
        if (/^queen size bed/i.test(p.product)) {
          const k = byName("King size Bed Hydraulic Storage");
          if (k) { product = k.product; unitPrice = k.unit ?? unitPrice; qty = qty ?? 1; amount = (unitPrice ?? 0) * qty; }
        } else if (/^queen size - headboard/i.test(p.product)) {
          const k = byName("King Size - Headboard");
          if (k) { product = k.product; unitPrice = k.unit ?? unitPrice; qty = qty ?? 1; amount = (unitPrice ?? 0) * qty; }
        }
      }

      const rateOut = p.type === "Area" || p.type === "SqFt" || p.type === "RFT" ? rate : undefined;
      // Per-bathroom products (e.g. Vanity) get one line per bathroom, each editable.
      const reps = p.perBath ? Math.max(1, bathrooms) : 1;
      for (let k = 0; k < reps; k++) {
        const details = reps > 1 ? `${p.details} (Bathroom ${k + 1})` : p.details;
        lines.push({ room, product, wc: p.wc, details, width, height, amount, rate: rateOut, qty, unitPrice, sqft, rft });
      }
    }
  }

  // False ceiling — one room-wise line per physical room, priced by that room's
  // floor area × ₹/sqft. Area auto-fills from the plan and stays editable.
  if (ctx.falseCeiling) {
    const fcRate = ctx.fcRate ?? DEFAULT_FC_RATE;
    for (const room of rooms) {
      if (room === "Other Services") continue;
      const area = roomSqft(ctx.roomDims?.[room]);
      lines.push({
        room,
        product: "False Ceiling",
        wc: "NM-01",
        details:
          "Single-layer false ceiling with concealed wiring and panel lights (Saint-Gobain board, Gyproc framing, Polycab wiring). Priced by room area.",
        width: null,
        height: null,
        amount: sqftAmount(area, fcRate),
        rate: fcRate,
        sqft: area,
      });
    }
  }

  return lines;
}
