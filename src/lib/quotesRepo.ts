"use client";
// Saving, revisioning and browsing quotations. Each save inserts a new row keyed
// by (quote_no, revision); "latest" = the highest revision for a quote_no.
// Supabase-backed, with a localStorage fallback so it works with zero setup.
import { supabase } from "./supabase";
import type { Quote } from "./types";

const LS_KEY = "hauspire_quotes_v1";

function lsGet(): Quote[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function lsSet(a: Quote[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch { /* ignore */ } }

/** Human-readable next quote number, e.g. "HI/2026/007". */
export async function nextQuoteNo(): Promise<string> {
  const year = new Date().getFullYear();
  let count = 0;
  if (supabase) {
    try {
      const { data } = await supabase.from("quotes").select("quote_no");
      const nos = new Set((data ?? []).map((r: any) => r.quote_no).filter(Boolean));
      count = nos.size;
    } catch { /* fall back */ }
  } else {
    count = new Set(lsGet().map((q) => q.quote_no).filter(Boolean)).size;
  }
  return `HI/${year}/${String(count + 1).padStart(3, "0")}`;
}

/** Insert a new revision row. Returns the saved quote (with id). */
export async function saveRevision(q: Quote): Promise<Quote> {
  const row: Quote = { ...q, revision: q.revision ?? 0 };
  if (supabase) {
    try {
      const { data, error } = await supabase.from("quotes").insert(row).select().single();
      if (!error && data) return data as Quote;
    } catch { /* fall back */ }
  }
  const rec = { ...row, id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())), created_at: new Date().toISOString() };
  const all = lsGet(); all.push(rec); lsSet(all);
  return rec;
}

/** Latest revision of each quote_no, newest first; optional text filter. */
export async function listLatest(search = ""): Promise<Quote[]> {
  let rows: Quote[] = [];
  if (supabase) {
    try {
      const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      rows = (data ?? []) as Quote[];
    } catch { rows = lsGet(); }
  } else {
    rows = lsGet().slice().reverse();
  }
  // Keep the highest revision per quote_no (fall back to id when no quote_no).
  const best = new Map<string, Quote>();
  for (const q of rows) {
    const key = q.quote_no || q.id || Math.random().toString();
    const cur = best.get(key);
    if (!cur || (q.revision ?? 0) > (cur.revision ?? 0)) best.set(key, q);
  }
  let out = Array.from(best.values());
  const s = search.trim().toLowerCase();
  if (s) out = out.filter((q) =>
    (q.client_name || "").toLowerCase().includes(s) ||
    (q.quote_no || "").toLowerCase().includes(s) ||
    (q.mobile || "").toLowerCase().includes(s) ||
    (q.location || "").toLowerCase().includes(s) ||
    (q.bhk || "").toLowerCase().includes(s));
  return out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

/** All revisions for a quote_no, oldest first. */
export async function listRevisions(quoteNo: string): Promise<Quote[]> {
  if (supabase) {
    try {
      const { data } = await supabase.from("quotes").select("*").eq("quote_no", quoteNo).order("revision", { ascending: true });
      if (data) return data as Quote[];
    } catch { /* fall back */ }
  }
  return lsGet().filter((q) => q.quote_no === quoteNo).sort((a, b) => (a.revision ?? 0) - (b.revision ?? 0));
}

export async function getQuote(id: string): Promise<Quote | null> {
  if (supabase) {
    try {
      const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
      if (data) return data as Quote;
    } catch { /* fall back */ }
  }
  return lsGet().find((q) => q.id === id) ?? null;
}
