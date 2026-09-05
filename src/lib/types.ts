// Shared types for the Hauspire quotation app.

export type WorkCode = "MO-01" | "NM-01";
// Area = ₹/sqft × (Width×Height in mm). SqFt = ₹/sqft × a plain floor area you
// type in square feet (painting, electricals, false ceiling by area).
// RFT = ₹/running-foot × a length you type in running feet. Unit = flat ₹ × qty.
export type PriceType = "Area" | "Unit" | "SqFt" | "RFT";

/** A row in the ProductMaster (the single source of truth for prices AND for
 *  what the First-Quote builder includes). */
export interface Product {
  product: string;
  wc: WorkCode;
  type: PriceType;
  rate: number | null; // ₹/sqft for Area / SqFt / RFT products
  unit: number | null; // ₹ flat for Unit products
  details: string;
  rooms: string; // comma-separated placement categories: Kitchen, Bedroom, Living, Study, Other, Utility

  // ---- First-Quote selection & defaults (edited in the Product Master) ----
  fq?: boolean;       // include this product in the auto-built first quote
  w?: number;         // default width (mm) for Area lines
  h?: number;         // default height (mm) for Area lines
  qty?: number;       // default quantity for Unit lines
  area?: number;      // default floor area (sqft) for SqFt lines
  len?: number;       // default length (running ft) for RFT lines
  perBath?: boolean;  // quantity = number of bathrooms (e.g. Vanity)
  perBed?: boolean;   // quantity = number of bedrooms
  useRun?: boolean;   // in the Kitchen, size width to the kitchen run
  balcony?: boolean;  // include only when the plan has a dry balcony
  bhk?: string;       // BHK tag ("1BHK".."4BHK"): include only when it matches the plan
  sort?: number;
}

/** How a template line is sized. */
export type SizeKind = "run" | "fixed" | "unit" | "perbed" | "sqft" | "rft";

/** A default line in the per-room template used by the First-Quote builder. */
export interface TemplateItem {
  p: string; // display name (usually the Product name)
  wc: WorkCode;
  kind: SizeKind;
  def: boolean; // included by default?
  details: string;
  rate?: number; // Area rate (from ProductMaster)
  W?: number; // fixed width (mm)
  H?: number; // height (mm)
  amt?: number; // Unit amount (from ProductMaster)
  area?: number; // default floor area in sqft for a sqft line
  len?: number; // default length in running feet for an rft line
  qty?: number; // default units for a unit line (e.g. tandems = 4)
  perBath?: boolean; // multiply by number of bathrooms (e.g. Vanity)
  balcony?: boolean; // include only when the plan has a balcony
  bhkTemplate?: string; // name pattern with "#BHK" placeholder → resolved to the
  // BHK-specific product (e.g. "Painting - #BHK (Emulsion)" → "Painting - 3BHK (Emulsion)")
}

export type Template = Record<string, TemplateItem[]>;

/** A concrete line inside a built quotation (editable). */
export interface QuoteLine {
  room: string;
  product: string;
  wc: WorkCode;
  details: string;
  width: number | null;
  height: number | null;
  amount: number;
  rate?: number; // ₹/sqft for area/sqft lines — lets area recompute the amount
  qty?: number; // units for unit-priced lines
  unitPrice?: number; // ₹ per unit — lets Units recompute the amount
  sqft?: number; // floor area in sqft for SqFt-priced lines (amount = sqft × rate)
  rft?: number; // length in running feet for RFT-priced lines (amount = rft × rate)
}

export interface Totals {
  mo: number;
  nm: number;
  fee: number;
  subTotal: number;
  discount: number;
  onSpot: number;
  modularPct: number;
  tpv: number;
  stages: { label: string; amount: number; desc?: string }[];
}

export interface Quote {
  id?: string;
  designer_id: string;
  client_name: string;
  mobile: string;
  location: string;
  bhk: string;
  kitchen_run: number;
  lines: QuoteLine[];
  tpv: number;
  created_at?: string;
}
