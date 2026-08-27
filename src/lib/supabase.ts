import { createClient } from "@supabase/supabase-js";
import type { Quote } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Falls back to a null client when env is not set, so the app still runs
// (save/load simply no-op) before Supabase is configured.
export const supabase = url && anon ? createClient(url, anon) : null;

export async function saveQuote(q: Quote): Promise<Quote | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("quotes").insert(q).select().single();
  if (error) throw error;
  return data as Quote;
}

export async function listQuotes(designerId: string): Promise<Quote[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("designer_id", designerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Quote[];
}
