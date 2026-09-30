"use client";
// Load/save the ProductMaster. Persists to Supabase (shared across designers)
// when configured; otherwise falls back to the bundled seed list. First-quote
// settings (fq flag + defaults) are stored in a single jsonb column `fq_config`
// so only that one optional column needs adding to the table.
//
// SAFETY (after the 29-Sep wipe): a save must never leave the table empty.
//   1. snapshot the current rows into product_master_backups
//   2. insert the new rows
//   3. only if that succeeded, delete the old rows (by id)
// A failed insert therefore leaves the previous master untouched.
import { supabase } from "./supabase";
import seed from "@/data/productMaster.json";
import type { Product } from "./types";

const SEED = seed as unknown as Product[];

const FQ_KEYS = ["fq", "w", "h", "qty", "area", "len", "perBath", "perBed", "useRun", "balcony", "bhk"] as const;

function rowToProduct(r: any): Product {
  const cfg = r.fq_config && typeof r.fq_config === "object" ? r.fq_config : {};
  const num = (v: any) => (v == null || v === "" ? null : Number(v));
  return {
    product: r.product,
    wc: r.wc,
    type: r.type,
    rate: num(r.rate),
    unit: num(r.unit),
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

export type ProductSource = "database" | "defaults";
export interface LoadResult {
  products: Product[];
  source: ProductSource;
  /** Why the defaults are shown instead of the database list (if they are). */
  reason?: string;
}

/** Load the master and say where it came from, so the Products page can warn
 *  loudly instead of silently showing (and then saving) the bundled defaults. */
export async function loadProductsWithSource(): Promise<LoadResult> {
  if (!supabase) return { products: SEED, source: "defaults", reason: "Supabase is not configured." };
  const { data, error } = await supabase
    .from("product_master")
    .select("*")
    .order("sort", { ascending: true });
  if (error) return { products: SEED, source: "defaults", reason: `Could not read the database: ${error.message}` };
  if (!data || !data.length) return { products: SEED, source: "defaults", reason: "The product table in the database is empty." };
  return { products: data.map(rowToProduct), source: "database" };
}

export async function loadProducts(): Promise<Product[]> {
  return (await loadProductsWithSource()).products;
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export interface SaveResult { ok: boolean; error?: string; saved?: number; previous?: number }

/** Replace the whole ProductMaster with `list`, without ever leaving it empty. */
export async function saveProducts(list: Product[]): Promise<SaveResult> {
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const clean = list.filter((p) => (p.product || "").trim() !== "");
  if (!clean.length) return { ok: false, error: "Nothing to save — the list is empty." };

  const withCfg = clean.map((p, i) => ({
    product: p.product.trim(),
    wc: p.wc,
    type: p.type,
    rate: p.type === "Area" || p.type === "SqFt" || p.type === "RFT" ? toNum(p.rate) : null,
    unit: p.type === "Unit" ? toNum(p.unit) : null,
    details: p.details ?? "",
    rooms: p.rooms ?? "",
    sort: i,
    fq_config: fqConfig(p),
  }));

  // 1) Read what is there now and keep a snapshot of it.
  const cur = await supabase.from("product_master").select("*");
  if (cur.error) return { ok: false, error: `Could not read the current list, nothing changed: ${cur.error.message}` };
  const oldRows = cur.data ?? [];
  const oldIds = oldRows.map((r: any) => r.id);
  if (oldRows.length) {
    // Best-effort: a missing backups table must not block saving.
    await supabase.from("product_master_backups").insert({ rows: oldRows, row_count: oldRows.length });
  }

  // 2) Insert the new list. On failure, nothing has been removed.
  let ins = await supabase.from("product_master").insert(withCfg);
  if (ins.error && /fq_config/.test(ins.error.message || "")) {
    const withoutCfg = withCfg.map(({ fq_config, ...rest }) => rest);
    ins = await supabase.from("product_master").insert(withoutCfg);
  }
  if (ins.error) return { ok: false, error: `Save failed — previous list kept unchanged. (${ins.error.message})` };

  // 3) Remove the previous rows now that the new ones are safely in.
  for (let i = 0; i < oldIds.length; i += 100) {
    const del = await supabase.from("product_master").delete().in("id", oldIds.slice(i, i + 100));
    if (del.error) return { ok: false, error: `New list saved, but old rows could not be removed so some may show twice: ${del.error.message}` };
  }
  return { ok: true, saved: withCfg.length, previous: oldRows.length };
}

export function defaultProducts(): Product[] {
  return JSON.parse(JSON.stringify(SEED));
}
