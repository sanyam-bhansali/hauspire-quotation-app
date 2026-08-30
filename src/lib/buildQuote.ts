// Turns the per-room template + project context into concrete quote lines.
import template from "@/data/template.json";
import type { Template, TemplateItem, QuoteLine } from "./types";
import { BHK_ROOMS, lineAmount } from "./pricing";

const TPL = template as unknown as Template;

// Parents Bedroom reuses the Guest Bedroom set when a 4 BHK is chosen.
function roomTemplate(room: string): TemplateItem[] {
  if (room === "Parents Bedroom") return TPL["Guest Bedroom"] ?? [];
  return TPL[room] ?? [];
}

export interface BuildContext {
  bhk: string;
  kitchenRun: number;
  bathrooms?: number; // drives Vanity quantity
  hasBalcony?: boolean; // includes Dry Balcony storage
  hasStudy?: boolean; // adds the Office / Study room
  enabledOptional?: Record<string, boolean>; // key = `${room}||${product}`
  kingMaster?: boolean;
}

export function buildFirstQuote(ctx: BuildContext): QuoteLine[] {
  const base = BHK_ROOMS[ctx.bhk] ?? BHK_ROOMS["3 BHK"];
  const bedrooms = base.filter((r) => r.includes("Bedroom")).length;
  const bathrooms = Math.max(1, ctx.bathrooms ?? 1);

  // Insert Office / Study (before Other Services) when the plan has a study.
  const rooms = [...base];
  if (ctx.hasStudy && !rooms.includes("Office / Study")) {
    const i = rooms.indexOf("Other Services");
    rooms.splice(i < 0 ? rooms.length : i, 0, "Office / Study");
  }

  const lines: QuoteLine[] = [];
  for (const room of rooms) {
    for (const it of roomTemplate(room)) {
      // Include if default, explicitly toggled on, or (for dry-balcony) a balcony exists.
      const on =
        it.def ||
        ctx.enabledOptional?.[`${room}||${it.p}`] ||
        (it.balcony && ctx.hasBalcony);
      if (!on) continue;

      let product = it.p;
      let amount = lineAmount(it, { kitchenRun: ctx.kitchenRun, bedrooms });

      if (it.perBath) amount *= bathrooms; // one vanity per bathroom

      if (room === "Master Bedroom" && ctx.kingMaster && it.p.startsWith("Queen")) {
        product = "King size Bed- Hydraulic Storage";
        amount = 64000;
      }

      let width: number | null = null;
      let height: number | null = null;
      if (it.kind === "run") { width = ctx.kitchenRun; height = it.H ?? null; }
      else if (it.kind === "fixed") { width = it.W ?? null; height = it.H ?? null; }

      const details = it.perBath && bathrooms > 1 ? `${it.details} (×${bathrooms} bathrooms)` : it.details;
      lines.push({ room, product, wc: it.wc, details, width, height, amount });
    }
  }
  return lines;
}
