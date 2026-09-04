// Turns the per-room template + project context into concrete quote lines.
import template from "@/data/template.json";
import type { Template, TemplateItem, QuoteLine } from "./types";
import { BHK_ROOMS, areaAmount, sqftAmount, rftAmount, MM_PER_SQFT } from "./pricing";

// Default single-layer false-ceiling rate (₹/sqft). Editable per quote.
export const DEFAULT_FC_RATE = 75;

const TPL = template as unknown as Template;

// Parents Bedroom reuses the Guest Bedroom set when a 4 BHK is chosen.
function roomTemplate(room: string): TemplateItem[] {
  if (room === "Parents Bedroom") return TPL["Guest Bedroom"] ?? [];
  return TPL[room] ?? [];
}

// Suggested wardrobe width from a bedroom's shorter wall (heuristic ~55% of it,
// clamped to a realistic 1200–2400mm). Only a suggestion — always editable.
function wardrobeWidth(dim: { w: number; h: number } | undefined, std: number): number {
  if (!dim || !dim.w || !dim.h) return std;
  const wall = Math.min(dim.w, dim.h);
  return Math.max(1200, Math.min(2400, Math.round((wall * 0.55) / 50) * 50));
}

export interface BuildContext {
  bhk: string;
  kitchenRun: number;
  bathrooms?: number; // drives Vanity quantity
  hasBalcony?: boolean; // includes Dry Balcony storage
  hasStudy?: boolean; // adds the Office / Study room
  sizeToPlan?: boolean; // size bedroom wardrobes/lofts to the plan's walls
  roomDims?: Record<string, { w: number; h: number }>; // room name → mm
  enabledOptional?: Record<string, boolean>; // key = `${room}||${product}`
  kingMaster?: boolean;
  falseCeiling?: boolean; // add a room-wise false-ceiling line to each room
  fcRate?: number; // false-ceiling ₹/sqft (defaults to DEFAULT_FC_RATE)
}

// sqft floor area of a room from its plan dimensions (mm × mm). 0 if unknown.
function roomSqft(dim: { w: number; h: number } | undefined): number {
  if (!dim || !dim.w || !dim.h) return 0;
  return Math.round((dim.w * dim.h) / MM_PER_SQFT);
}

export function buildFirstQuote(ctx: BuildContext): QuoteLine[] {
  const base = BHK_ROOMS[ctx.bhk] ?? BHK_ROOMS["3 BHK"];
  const bedrooms = base.filter((r) => r.includes("Bedroom")).length;
  const bathrooms = Math.max(1, ctx.bathrooms ?? 1);

  const rooms = [...base];
  if (ctx.hasStudy && !rooms.includes("Office / Study")) {
    const i = rooms.indexOf("Other Services");
    rooms.splice(i < 0 ? rooms.length : i, 0, "Office / Study");
  }

  const lines: QuoteLine[] = [];
  for (const room of rooms) {
    // One wardrobe width per bedroom when sizing to the plan.
    const isBedroom = room.includes("Bedroom");
    const planWardrobe =
      ctx.sizeToPlan && isBedroom ? wardrobeWidth(ctx.roomDims?.[room], 1500) : null;

    for (const it of roomTemplate(room)) {
      const on =
        it.def ||
        ctx.enabledOptional?.[`${room}||${it.p}`] ||
        (it.balcony && ctx.hasBalcony);
      if (!on) continue;

      let product = it.p;
      let width: number | null = null;
      let height: number | null = null;
      let amount: number;
      let qty: number | undefined;
      let unitPrice: number | undefined;
      let sqft: number | undefined;
      let rft: number | undefined;

      const isWardrobeOrLoft =
        it.kind === "fixed" && (it.p.toLowerCase().includes("wardrobe") || it.p.startsWith("Loft"));

      if (planWardrobe && isWardrobeOrLoft) {
        width = planWardrobe; height = it.H ?? 0; amount = areaAmount(width, height, it.rate ?? 0);
      } else if (it.kind === "run") {
        width = ctx.kitchenRun; height = it.H ?? 600; amount = areaAmount(width, height, it.rate ?? 0);
      } else if (it.kind === "fixed") {
        width = it.W ?? 0; height = it.H ?? 0; amount = areaAmount(width, height, it.rate ?? 0);
      } else if (it.kind === "perbed") {
        unitPrice = it.amt ?? 0; qty = bedrooms; amount = unitPrice * qty;
      } else if (it.kind === "sqft") {
        sqft = it.area ?? 0; amount = sqftAmount(sqft, it.rate ?? 0);
      } else if (it.kind === "rft") {
        rft = it.len ?? 0; amount = rftAmount(rft, it.rate ?? 0);
      } else {
        // unit — quantity × unit price (vanity multiplies by bathrooms)
        unitPrice = it.amt ?? 0;
        qty = it.perBath ? bathrooms : (it.qty ?? 1);
        amount = unitPrice * qty;
      }

      if (room === "Master Bedroom" && ctx.kingMaster && it.p.startsWith("Queen")) {
        product = "King size Bed- Hydraulic Storage";
        unitPrice = 64000; qty = 1; amount = 64000;
      }

      const details = it.perBath && bathrooms > 1 ? `${it.details} (×${bathrooms} bathrooms)` : it.details;
      const rate = it.kind === "run" || it.kind === "fixed" || it.kind === "sqft" || it.kind === "rft" ? it.rate : undefined;
      lines.push({ room, product, wc: it.wc, details, width, height, amount, rate, qty, unitPrice, sqft, rft });
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
