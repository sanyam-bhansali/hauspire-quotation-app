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

// Quote numbers are a plain running series starting at this number.
export const QUOTE_START = 2300;

/** Next quote number: max existing (>= QUOTE_START-1) + 1, so the series begins at 2300. */
export async function nextQuoteNo(): Promise<string> {
  let list: (string | undefined)[] = [];
  if (supabase) {
    try {
      const { data } = await supabase.from("quotes").select("quote_no");
      list = (data ?? []).map((r: any) => r.quote_no);
    } catch { list = lsGet().map((q) => q.quote_no); }
  } else {
    list = lsGet().map((q) => q.quote_no);
  }
  const nums = list
    .map((s) => parseInt(String(s ?? "").replace(/\D/g, ""), 10))
    // Only plain numbers in the running range — ignores any legacy "HI/2026/007" ids.
    .filter((n) => !isNaN(n) && n >= QUOTE_START && n < 100000);
  const maxN = Math.max(QUOTE_START - 1, ...nums);
  return String(maxN + 1);
}

export type Stage = "sales" | "design";
export const STAGE_LABEL: Record<Stage, string> = { sales: "Sales Final", design: "Design Final" };

const bareCols = (row: Quote) => { const { quote_no, revision, stage, ...bare } = row; return bare; };
const colErr = (m?: string) => /stage|quote_no|revision|column|schema/i.test(m || "");

/** Save the given quotation stage, OVERRIDING any existing quotation for the same
 *  (quote_no, stage). Only two rows per project ever exist: Sales Final + Design Final. */
export async function saveStage(q: Quote): Promise<Quote> {
  const stage: Stage = (q.stage as Stage) ?? "sales";
  const row: Quote = { ...q, stage, created_at: new Date().toISOString() };

  if (supabase) {
    try {
      let existingId: string | undefined;
      if (q.quote_no) {
        try {
          const { data } = await supabase.from("quotes").select("id").eq("quote_no", q.quote_no).eq("stage", stage).maybeSingle();
          existingId = (data as any)?.id;
        } catch { /* stage/quote_no column may be missing */ }
      }
      let res;
      if (existingId) {
        res = await supabase.from("quotes").update(row).eq("id", existingId).select().single();
        if (res.error && colErr(res.error.message)) res = await supabase.from("quotes").update(bareCols(row)).eq("id", existingId).select().single();
      } else {
        res = await supabase.from("quotes").insert(row).select().single();
        if (res.error && colErr(res.error.message)) res = await supabase.from("quotes").insert(bareCols(row)).select().single();
      }
      if (!res.error && res.data) {
        const rec = { ...row, ...(res.data as Quote) } as Quote;
        upsertLs(rec, stage);
        return rec;
      }
    } catch { /* fall back to localStorage */ }
  }
  const rec: Quote = { ...row, id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())) };
  upsertLs(rec, stage);
  return rec;
}

function upsertLs(rec: Quote, stage: Stage) {
  const all = lsGet();
  const i = all.findIndex((x) => x.quote_no && x.quote_no === rec.quote_no && ((x.stage as Stage) ?? "sales") === stage);
  if (i >= 0) all[i] = { ...rec, id: all[i].id }; else all.push(rec);
  lsSet(all);
}

/** Back-compat: older callers used saveRevision — now a plain stage save. */
export const saveRevision = saveStage;

/** Latest saved record per (quote_no, stage), newest first; optional text filter. */
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
  // One row per (quote_no, stage) — keep the newest.
  const best = new Map<string, Quote>();
  for (const q of rows) {
    const key = (q.quote_no || q.id || Math.random().toString()) + "|" + (q.stage || "");
    const cur = best.get(key);
    if (!cur || (q.created_at || "") > (cur.created_at || "")) best.set(key, q);
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
