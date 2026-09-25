// Drafts an electrical bill from a saved quotation: maps furniture lines + rooms
// to electrical points (quantities + room-wise descriptions), derived from real
// Hauspire electrical bills. The designer reviews and adjusts the result.
import type { QuoteLine, ElectricalItem, ElectricalLine } from "./types";

// Canonical item names (must match the rate master seed).
const I = {
  TV: "TV point (HDMI cable)",
  P6: "6 A plug point",
  P16: "16 A point creation",
  P13: "13 A point creation (universal socket)",
  LIGHT5: "Light point creation (Walls, Others) - More Than 5 Feet",
  SPOT: "Spot light 6 W",
  PROFILE: "Profile light",
  LED: "LED strip light",
  FANPT: "Fan point creation",
  FANFIT: "Fan fitting",
  ACNEW: "AC point creation",
  SURFACE: "surface light",
  DECOR: "Light fitting (wall lamp, chandelier or any decorative light)",
};

const mmToFt = (mm?: number | null) => (mm ? Math.round((mm / 304.8) * 10) / 10 : 0);

export function draftElectricalFromQuote(rateItems: ElectricalItem[], quoteLines: QuoteLine[]): ElectricalLine[] {
  const acc = new Map<string, { qty: number; notes: string[] }>();
  const add = (item: string, qty: number, note?: string) => {
    if (!qty) return;
    const e = acc.get(item) ?? { qty: 0, notes: [] };
    e.qty += qty;
    if (note) e.notes.push(note);
    acc.set(item, e);
  };

  const rooms = Array.from(new Set(quoteLines.map((l) => l.room)));

  // Per-line furniture → points.
  for (const l of quoteLines) {
    const p = l.product.toLowerCase();
    const R = l.room;
    if (/false ceiling/.test(p)) {
      const led = /living/i.test(R) ? 28 : /kitchen/i.test(R) ? 0 : 15;
      add(I.LED, led, `${led} RFT for ${R} ceiling`);
      add(I.SPOT, 2, `2 for ${R} ceiling`);
    }
    else if (/tv unit/.test(p) && !/base/.test(p)) { add(I.TV, 1, `1 for ${R} TV`); add(I.P6, 2, `2 for ${R} TV unit`); }
    else if (/appliance unit/.test(p)) { add(I.P16, 1, "1 for appliance unit"); add(I.P6, 1, "1 for appliance unit"); }
    else if (/mandir/.test(p)) { add(I.P6, 2, "2 for mandir"); }
    else if (/side table/.test(p)) { const q = l.qty ?? 2; add(I.P6, q, `${q} for ${R} side table`); }
    else if (/(console|shoe rack|foyer)/.test(p)) { add(I.SPOT, 1, `1 for ${R} shoe rack`); add(I.LIGHT5, 1, `1 for ${R} entrance`); }
    else if (/dressing/.test(p) && /mirror/.test(p)) { add(I.P6, 1, `1 for ${R} dressing`); }
    else if (/crockery/.test(p)) { add(I.PROFILE, mmToFt(l.width) || 5, "for crockery unit"); }
    else if (/wall cabinet/.test(p) && !/glass|shutter/.test(p)) { add(I.PROFILE, mmToFt(l.width) || 10, "for kitchen wall cabinet"); }
    else if (/workstation/.test(p) && !/overhead/.test(p)) { add(I.P16, 2, `2 for ${R} workstation`); add(I.PROFILE, mmToFt(l.width) || 6, `for ${R} unit`); }
    else if (/bay window/.test(p)) { add(I.P6, 1, `1 for ${R} bay window`); }
  }

  // Per-room baselines (fans + AC).
  for (const R of rooms) {
    if (/bedroom/i.test(R)) { add(I.FANPT, 1, `1 for ${R}`); add(I.FANFIT, 1, `1 for ${R}`); add(I.ACNEW, 1, `1 for ${R}`); }
    else if (/living/i.test(R)) { add(I.FANPT, 1, "1 for living room"); add(I.FANFIT, 1, "1 for living room"); add(I.ACNEW, 1, "1 for living room"); }
    else if (/kitchen/i.test(R)) { add(I.FANPT, 1, "1 for kitchen"); add(I.SURFACE, 4, "4 for kitchen ceiling"); }
  }

  // Emit one line per rate item, pre-filled where the rules produced something.
  return rateItems.map((ri) => {
    const e = acc.get(ri.item);
    return { item: ri.item, rate: ri.rate, qty: e ? Math.round(e.qty) : 0, description: e ? e.notes.join("\n") : "" };
  });
}
