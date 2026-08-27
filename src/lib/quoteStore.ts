"use client";
import type { QuoteLine } from "./types";

// Lightweight hand-off between First Quote and the Full Builder (same browser).
export interface PendingQuote {
  client: string;
  mobile: string;
  location: string;
  bhk: string;
  kitchenRun: number;
  lines: QuoteLine[];
  fromId?: string; // if revising an existing saved quote
}

const KEY = "hauspire_pending_quote";

export function setPendingQuote(q: PendingQuote) {
  try { sessionStorage.setItem(KEY, JSON.stringify(q)); } catch {}
}
export function takePendingQuote(): PendingQuote | null {
  try {
    const s = sessionStorage.getItem(KEY);
    if (!s) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(s) as PendingQuote;
  } catch {
    return null;
  }
}
