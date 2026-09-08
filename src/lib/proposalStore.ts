"use client";
// Pending new-product proposals raised by designers while quoting. Admins review
// them in the Products tab; approving one adds it to the Product Master. Persists
// to Supabase (`product_proposals`) when available, else localStorage.
import { supabase } from "./supabase";
import type { Product, QuoteLine, PriceType } from "./types";

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

// Infer a Product record from a quotation line (for auto-proposing new items).
function roomCategory(room: string): string {
  if (/kitchen/i.test(room)) return "Kitchen";
  if (/bedroom/i.test(room)) return "Bedroom";
  if (/living|dining|foyer/i.test(room)) return "Living";
  if (/study|office/i.test(room)) return "Study";
  return "Other";
}
export function lineToProduct(l: QuoteLine): Product {
  let type: PriceType = "Unit";
  if (l.sqft != null) type = "SqFt";
  else if (l.rft != null) type = "RFT";
  else if (l.rate != null && (l.width || l.height)) type = "Area";
  else type = "Unit";
  return {
    product: l.product.trim(),
    wc: l.wc,
    type,
    rate: type === "Unit" ? null : l.rate ?? null,
    unit: type === "Unit" ? l.unitPrice ?? l.amount ?? null : null,
    details: l.details ?? "",
    rooms: roomCategory(l.room),
  };
}

/** Scan a quotation's lines and file any product not already in the master (or
 *  already proposed) as a pending proposal. Returns the names newly proposed. */
export async function autoProposeNewProducts(lines: QuoteLine[], master: Product[], by?: string): Promise<string[]> {
  const norm = (s: string) => s.trim().toLowerCase();
  const known = new Set(master.map((p) => norm(p.product)));
  const proposed = new Set((await loadProposals()).map((p) => norm(p.product)));
  const seen = new Set<string>();
  const added: string[] = [];
  for (const l of lines) {
    const name = (l.product || "").trim();
    if (!name || norm(name) === "new item") continue;
    const k = norm(name);
    if (known.has(k) || proposed.has(k) || seen.has(k)) continue;
    seen.add(k);
    await addProposal(lineToProduct(l), by);
    added.push(name);
  }
  return added;
}

export function proposalToProduct(p: Proposal): Product {
  return {
    product: p.product, wc: (p.wc as any) || "MO-01", type: (p.type as any) || "Unit",
    rate: p.rate ?? null, unit: p.unit ?? null, details: p.details ?? "", rooms: p.rooms ?? "Other",
    fq: false,
  };
}
