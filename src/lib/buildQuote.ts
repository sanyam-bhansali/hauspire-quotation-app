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
  enabledOptional?: Record<string, boolean>; // key = `${room}||${product}`
  kingMaster?: boolean;
}

export function buildFirstQuote(ctx: BuildContext): QuoteLine[] {
  const rooms = BHK_ROOMS[ctx.bhk] ?? BHK_ROOMS["3 BHK"];
  const bedrooms = rooms.filter((r) => r.includes("Bedroom")).length;
  const lines: QuoteLine[] = [];

  for (const room of rooms) {
    for (const it of roomTemplate(room)) {
      const on = it.def || ctx.enabledOptional?.[`${room}||${it.p}`];
      if (!on) continue;

      let product = it.p;
      let amount = lineAmount(it, { kitchenRun: ctx.kitchenRun, bedrooms });

      if (room === "Master Bedroom" && ctx.kingMaster && it.p.startsWith("Queen")) {
        product = "King size Bed- Hydraulic Storage";
        amount = 64000;
      }

      let width: number | null = null;
      let height: number | null = null;
      if (it.kind === "run") { width = ctx.kitchenRun; height = it.H ?? null; }
      else if (it.kind === "fixed") { width = it.W ?? null; height = it.H ?? null; }

      lines.push({ room, product, wc: it.wc, details: it.details, width, height, amount });
    }
  }
  return lines;
}
