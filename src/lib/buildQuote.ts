// Turns the per-room template + project context into concrete quote lines.
import template from "@/data/template.json";
import type { Template, TemplateItem, QuoteLine } from "./types";
import { BHK_ROOMS, lineAmount, areaAmount } from "./pricing";

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

      // Bedroom wardrobe/loft sized to the plan wall (fixed-kind area items).
      const isWardrobeOrLoft =
        it.kind === "fixed" && (it.p.toLowerCase().includes("wardrobe") || it.p.startsWith("Loft"));
      if (planWardrobe && isWardrobeOrLoft) {
        width = planWardrobe;
        height = it.H ?? 0;
        amount = areaAmount(width, height, it.rate ?? 0);
      } else {
        amount = lineAmount(it, { kitchenRun: ctx.kitchenRun, bedrooms });
        if (it.kind === "run") { width = ctx.kitchenRun; height = it.H ?? null; }
        else if (it.kind === "fixed") { width = it.W ?? null; height = it.H ?? null; }
      }

      if (it.perBath) amount *= bathrooms; // one vanity per bathroom

      if (room === "Master Bedroom" && ctx.kingMaster && it.p.startsWith("Queen")) {
        product = "King size Bed- Hydraulic Storage";
        amount = 64000;
      }

      const details = it.perBath && bathrooms > 1 ? `${it.details} (×${bathrooms} bathrooms)` : it.details;
      lines.push({ room, product, wc: it.wc, details, width, height, amount });
    }
  }
  return lines;
}
