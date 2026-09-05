// The standard first-quotation selection, derived from Hauspire's real quotes.
// Given a product's name + pricing type, returns the first-quote settings to apply
// (include flag, placement rooms, default size/qty, rules) — or null to leave it out.
// Used both by the "Select standard set" button and, as a fallback, by the builder
// when no product has been explicitly flagged yet.
import type { Product } from "./types";

export function standardPatch(name: string, type: string): Partial<Product> | null {
  const s = name.toLowerCase();
  const bhk = (s.match(/([1-4])\s*bhk/) || [])[1];
  const bhkTag = bhk ? `${bhk}BHK` : "";
  const dims = (w: number, h: number) => (type === "Area" ? { w, h } : {});

  // Kitchen
  if (/tandem/.test(s) && /(horizon|horizant)/.test(s)) return { fq: true, rooms: "Kitchen", qty: 3 };
  if (/tandem/.test(s) && /(vertical|bottle)/.test(s)) return { fq: true, rooms: "Kitchen", qty: 1 };
  if (/tandem/.test(s)) return { fq: true, rooms: "Kitchen", qty: 4 };
  if (/base cabinet/.test(s)) return { fq: true, rooms: "Kitchen", useRun: true, h: 750 };
  if (/wall cabinet/.test(s) && /(glass|profile shutter)/.test(s)) return { fq: true, rooms: "Kitchen", qty: 1 };
  if (/wall cabinet/.test(s)) return { fq: true, rooms: "Kitchen", useRun: true, h: 600 };
  if (/\bloft\b/.test(s)) return { fq: true, rooms: "Kitchen,Bedroom,Study", useRun: true, w: 1500, h: 600 };
  if (/dry balcony/.test(s)) return { fq: true, rooms: "Kitchen", balcony: true, w: 1200, h: 600 };

  // Bedroom
  if (/wardrobe/.test(s) && !/walk/.test(s)) return { fq: true, rooms: "Bedroom,Study", w: 1500, h: 2100 };
  if (/bed/.test(s) && /(hydraulic|storage)/.test(s) && !/king/.test(s)) return { fq: true, rooms: "Bedroom", qty: 1 };
  if (/headboard/.test(s) && !/king/.test(s)) return { fq: true, rooms: "Bedroom", qty: 1 };
  if (/dressing/.test(s) && /(base|back)\s*storage/.test(s)) return { fq: true, rooms: "Bedroom", qty: 1 };
  if (/dressing/.test(s) && /mirror/.test(s)) return { fq: true, rooms: "Bedroom", qty: 1 };
  if (/workstation/.test(s) && !/overhead/.test(s) && !/fold/.test(s)) return { fq: true, rooms: "Bedroom,Study", ...dims(1200, 750) };

  // Living
  if (/tv unit/.test(s) && !/ledge/.test(s) && !/base/.test(s)) return { fq: true, rooms: "Living", ...dims(1500, 2100) };
  if (/safety door/.test(s)) return { fq: true, rooms: "Living", qty: 1 };
  if (/mandir/.test(s)) return { fq: true, rooms: "Living", ...dims(600, 1800) };
  if (/(console|shoe rack)/.test(s)) return { fq: true, rooms: "Living", ...dims(1200, 900) };

  // Other services
  if (/vanity/.test(s)) return { fq: true, rooms: "Other", perBath: true, ...dims(600, 600) };
  if (/painting/.test(s) && !/lust/.test(s)) return { fq: true, rooms: "Other", bhk: bhkTag };
  if (/electrical/.test(s)) return { fq: true, rooms: "Other", bhk: bhkTag };

  return null;
}

/** Apply the standard selection to a catalog. If ANY product is already flagged
 *  `fq`, the catalog is returned unchanged (the user's own selection wins). */
export function withStandardSelection(products: Product[]): Product[] {
  if (products.some((p) => p.fq)) return products;
  return products.map((p) => {
    const patch = standardPatch(p.product, p.type);
    return patch ? { ...p, ...patch } : p;
  });
}
