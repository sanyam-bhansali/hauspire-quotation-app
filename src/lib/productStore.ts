"use client";
// Load/save the ProductMaster. Persists to Supabase (shared across designers)
// when configured; otherwise falls back to the bundled seed list.
import { supabase } from "./supabase";
import seed from "@/data/productMaster.json";
import type { Product } from "./types";

const SEED = seed as unknown as Product[];

function rowToProduct(r: any): Product {
  return {
    product: r.product,
    wc: r.wc,
    type: r.type,
    rate: r.rate ?? null,
    unit: r.unit ?? null,
    details: r.details ?? "",
    rooms: r.rooms ?? "",
  };
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
  const rows = list.map((p, i) => ({
    product: p.product,
    wc: p.wc,
    type: p.type,
    rate: p.type === "Area" || p.type === "SqFt" ? p.rate ?? null : null,
    unit: p.type === "Unit" ? p.unit ?? null : null,
    details: p.details ?? "",
    rooms: p.rooms ?? "",
    sort: i,
  }));
  // Simple replace-all for this small admin table.
  const del = await supabase.from("product_master").delete().neq("product", "");
  if (del.error) return false;
  const ins = await supabase.from("product_master").insert(rows);
  return !ins.error;
}

export function defaultProducts(): Product[] {
  return JSON.parse(JSON.stringify(SEED));
}
