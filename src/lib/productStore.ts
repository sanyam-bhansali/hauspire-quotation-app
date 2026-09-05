"use client";
// Load/save the ProductMaster. Persists to Supabase (shared across designers)
// when configured; otherwise falls back to the bundled seed list. First-quote
// settings (fq flag + defaults) are stored in a single jsonb column `fq_config`
// so only that one optional column needs adding to the table.
import { supabase } from "./supabase";
import seed from "@/data/productMaster.json";
import type { Product } from "./types";

const SEED = seed as unknown as Product[];

const FQ_KEYS = ["fq", "w", "h", "qty", "area", "len", "perBath", "perBed", "useRun", "balcony", "bhk"] as const;

function rowToProduct(r: any): Product {
  const cfg = r.fq_config && typeof r.fq_config === "object" ? r.fq_config : {};
  return {
    product: r.product,
    wc: r.wc,
    type: r.type,
    rate: r.rate ?? null,
    unit: r.unit ?? null,
    details: r.details ?? "",
    rooms: r.rooms ?? "",
    fq: cfg.fq ?? false,
    w: cfg.w,
    h: cfg.h,
    qty: cfg.qty,
    area: cfg.area,
    len: cfg.len,
    perBath: cfg.perBath,
    perBed: cfg.perBed,
    useRun: cfg.useRun,
    balcony: cfg.balcony,
    bhk: cfg.bhk,
  };
}

function fqConfig(p: Product): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};
  for (const k of FQ_KEYS) {
    const v = (p as any)[k];
    if (v !== undefined && v !== null && v !== "") cfg[k] = v;
  }
  return cfg;
}

export async function loadProducts(): Promise<Product[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("product_master")
      .select("*")
      .order("sort", { ascending: true });
    if (!error && data && data.length) return data.map(rowToProduct);
  }
  return SEED;
}

/** Replace the whole ProductMaster with `list`. Returns true on success. */
export async function saveProducts(list: Product[]): Promise<boolean> {
  if (!supabase) return false;
  const withCfg = list.map((p, i) => ({
    product: p.product,
    wc: p.wc,
    type: p.type,
    rate: p.type === "Area" || p.type === "SqFt" || p.type === "RFT" ? p.rate ?? null : null,
    unit: p.type === "Unit" ? p.unit ?? null : null,
    details: p.details ?? "",
    rooms: p.rooms ?? "",
    sort: i,
    fq_config: fqConfig(p),
  }));

  const del = await supabase.from("product_master").delete().neq("product", "");
  if (del.error) return false;

  let ins = await supabase.from("product_master").insert(withCfg);
  // If the fq_config column doesn't exist yet, retry without it so saving still
  // works (first-quote settings then live only in the bundled seed until the
  // column is added).
  if (ins.error && /fq_config/.test(ins.error.message || "")) {
    const withoutCfg = withCfg.map(({ fq_config, ...rest }) => rest);
    ins = await supabase.from("product_master").insert(withoutCfg);
  }
  return !ins.error;
}

export function defaultProducts(): Product[] {
  return JSON.parse(JSON.stringify(SEED));
}
