// Shared types for the Hauspire quotation app.

export type WorkCode = "MO-01" | "NM-01";
export type PriceType = "Area" | "Unit";

/** A row in the ProductMaster (the single source of truth for prices). */
export interface Product {
  product: string;
  wc: WorkCode;
  type: PriceType;
  rate: number | null; // ₹/sqft for Area products
  unit: number | null; // ₹ flat for Unit products
  details: string;
  rooms: string; // comma-separated category tags
}

/** How a template line is sized. */
export type SizeKind = "run" | "fixed" | "unit" | "perbed";

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
  stages: { label: string; amount: number }[];
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
