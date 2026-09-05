"use client";
// Pending new-product proposals raised by designers while quoting. Admins review
// them in the Products tab; approving one adds it to the Product Master. Persists
// to Supabase (`product_proposals`) when available, else localStorage.
import { supabase } from "./supabase";
import type { Product } from "./types";

const LS_KEY = "hauspire_proposals_v1";

export interface Proposal {
  id: string;
  product: string;
  wc: string;
  type: string;
  rate: number | null;
  unit: number | null;
  details: string;
  rooms: string;
  proposed_by?: string;
  created_at?: string;
}

function lsGet(): Proposal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsSet(a: Proposal[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

export async function loadProposals(): Promise<Proposal[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("product_proposals")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) return data as Proposal[];
    } catch { /* fall back */ }
  }
  return lsGet();
}

export async function addProposal(p: Product, by?: string): Promise<void> {
  const rec = {
    product: p.product, wc: p.wc, type: p.type,
    rate: p.rate ?? null, unit: p.unit ?? null,
    details: p.details ?? "", rooms: p.rooms ?? "", proposed_by: by ?? "",
  };
  if (supabase) {
    try {
      const { error } = await supabase.from("product_proposals").insert(rec);
      if (!error) return;
    } catch { /* fall back */ }
  }
  const a = lsGet();
  a.push({ ...rec, id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())), created_at: new Date().toISOString() });
  lsSet(a);
}

export async function deleteProposal(id: string): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase.from("product_proposals").delete().eq("id", id);
      if (!error) return;
    } catch { /* fall back */ }
  }
  lsSet(lsGet().filter((p) => p.id !== id));
}

export function proposalToProduct(p: Proposal): Product {
  return {
    product: p.product, wc: (p.wc as any) || "MO-01", type: (p.type as any) || "Unit",
    rate: p.rate ?? null, unit: p.unit ?? null, details: p.details ?? "", rooms: p.rooms ?? "Other",
    fq: false,
  };
}
