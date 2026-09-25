"use client";
// Electrical rate master + saved electrical bills. Supabase-backed with a
// localStorage fallback, mirroring productStore / quotesRepo.
import { supabase } from "./supabase";
import seed from "@/data/electricalRates.json";
import type { ElectricalItem, ElectricalBill } from "./types";

const SEED = seed as unknown as ElectricalItem[];
const RATES_LS = "hauspire_electrical_rates_v1";
const BILLS_LS = "hauspire_electrical_bills_v1";

export const DEFAULT_MATERIALS: { label: string; brand: string }[] = [
  { label: "Wire", brand: "Polycab" },
  { label: "Panel / Surface lights", brand: "Polycab / Crompton" },
  { label: "Switches & Sockets", brand: "As per selection" },
  { label: "LED strip & Profile light", brand: "As per selection" },
];
export const DEFAULT_NOTE =
  "Any material which is not mentioned in the above rate list will be charged extra (e.g. Switches, Switch Plates, Plug Points, TV Cables, LAN Cables, surface lights, spot lights). All these charges are on actuals.";

// ---- Rate master ----
export async function loadElectricalRates(): Promise<ElectricalItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("electrical_rates").select("*").order("sort", { ascending: true });
      if (!error && data && data.length) return data.map((r: any) => ({ item: r.item, rate: r.rate ?? 0, unit: r.unit ?? "", sort: r.sort }));
    } catch { /* fall back */ }
  }
  if (typeof window !== "undefined") {
    try { const v = localStorage.getItem(RATES_LS); if (v) return JSON.parse(v); } catch { /* ignore */ }
  }
  return SEED;
}
export async function saveElectricalRates(list: ElectricalItem[]): Promise<boolean> {
  if (typeof window !== "undefined") { try { localStorage.setItem(RATES_LS, JSON.stringify(list)); } catch { /* ignore */ } }
  if (supabase) {
    try {
      const del = await supabase.from("electrical_rates").delete().neq("item", "");
      if (!del.error) {
        const ins = await supabase.from("electrical_rates").insert(list.map((p, i) => ({ item: p.item, rate: p.rate, unit: p.unit ?? "", sort: i })));
        if (!ins.error) return true;
      }
    } catch { /* fall through */ }
  }
  return false;
}
export function defaultElectricalRates(): ElectricalItem[] {
  return JSON.parse(JSON.stringify(SEED));
}

// ---- Saved bills (one per quote_no, overrides on save) ----
function billsLs(): ElectricalBill[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(BILLS_LS) || "[]"); } catch { return []; }
}
function setBillsLs(a: ElectricalBill[]) { try { localStorage.setItem(BILLS_LS, JSON.stringify(a)); } catch { /* ignore */ } }

export async function saveElectricalBill(b: ElectricalBill): Promise<ElectricalBill> {
  const row = { ...b, created_at: new Date().toISOString() };
  if (supabase) {
    try {
      let existingId: string | undefined;
      if (b.quote_no) {
        try { const { data } = await supabase.from("electrical_bills").select("id").eq("quote_no", b.quote_no).maybeSingle(); existingId = (data as any)?.id; } catch { /* ignore */ }
      }
      let res;
      if (existingId) res = await supabase.from("electrical_bills").update(row).eq("id", existingId).select().single();
      else res = await supabase.from("electrical_bills").insert(row).select().single();
      if (!res.error && res.data) { const rec = { ...row, ...(res.data as ElectricalBill) }; upsertBillLs(rec); return rec; }
    } catch { /* fall back */ }
  }
  const rec: ElectricalBill = { ...row, id: b.id || (globalThis.crypto?.randomUUID?.() ?? String(Date.now())) };
  upsertBillLs(rec);
  return rec;
}
function upsertBillLs(rec: ElectricalBill) {
  const all = billsLs();
  const i = all.findIndex((x) => (rec.quote_no && x.quote_no === rec.quote_no) || x.id === rec.id);
  if (i >= 0) all[i] = rec; else all.push(rec);
  setBillsLs(all);
}
export async function getElectricalBillByQuoteNo(quoteNo: string): Promise<ElectricalBill | null> {
  if (supabase) {
    try { const { data } = await supabase.from("electrical_bills").select("*").eq("quote_no", quoteNo).maybeSingle(); if (data) return data as ElectricalBill; } catch { /* ignore */ }
  }
  return billsLs().find((x) => x.quote_no === quoteNo) ?? null;
}
