"use client";
// Load/save the editable Terms & Conditions. Persists to Supabase (shared across
// devices) when an `app_settings` table exists; always mirrors to localStorage so
// it works with zero setup. Falls back to the bundled default.
import { supabase } from "./supabase";
import { DEFAULT_TERMS } from "@/data/termsDefault";

const LS_KEY = "hauspire_terms_v1";
const SETTING_KEY = "terms";

export async function loadTerms(): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      if (!error && data && typeof data.value === "string" && data.value.trim()) return data.value;
    } catch {
      /* table may not exist — fall back */
    }
  }
  if (typeof window !== "undefined") {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v && v.trim()) return v;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_TERMS;
}

/** Returns where it was saved: "supabase" (shared) or "local" (this browser only). */
export async function saveTerms(text: string): Promise<"supabase" | "local"> {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(LS_KEY, text); } catch { /* ignore */ }
  }
  if (supabase) {
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: SETTING_KEY, value: text }, { onConflict: "key" });
      if (!error) return "supabase";
    } catch {
      /* fall through to local */
    }
  }
  return "local";
}

export function defaultTerms(): string {
  return DEFAULT_TERMS;
}
