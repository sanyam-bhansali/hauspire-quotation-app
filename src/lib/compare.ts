// Compares an original quotation against the revised (current) one, matching by
// room + product name. Carries both line objects and a status so the Final sheet
// can show size/amount changes and highlight added / changed / removed items.
import type { QuoteLine } from "./types";

export type ChangeStatus = "added" | "removed" | "changed" | "same";

export interface CompareRow {
  room: string;
  product: string;
  o: QuoteLine | null; // original line (null = newly added)
  c: QuoteLine | null; // current/final line (null = removed)
  status: ChangeStatus;
}

/** Human size label for a line, by pricing type. */
export function sizeText(l: QuoteLine | null): string {
  if (!l) return "—";
  if (l.sqft != null) return `${l.sqft} sqft`;
  if (l.rft != null) return `${l.rft} rft`;
  if (l.unitPrice != null && l.width == null) return `${l.qty ?? 1} unit`;
  if (l.width || l.height) return `${l.width ?? "—"}×${l.height ?? "—"}`;
  return "—";
}

export function compareLines(original: QuoteLine[], current: QuoteLine[]): CompareRow[] {
  const key = (l: QuoteLine) => `${l.room}||${l.product.trim().toLowerCase()}`;
  const origByKey: Record<string, QuoteLine[]> = {};
  for (const l of original) (origByKey[key(l)] ||= []).push(l);
  const used: Record<string, number> = {};
  const rows: CompareRow[] = [];

  for (const l of current) {
    const k = key(l);
    const i = used[k] ?? 0;
    const o = origByKey[k]?.[i] ?? null;
    used[k] = i + 1;
    let status: ChangeStatus;
    if (!o) status = "added";
    else status = o.amount !== l.amount || sizeText(o) !== sizeText(l) || o.wc !== l.wc ? "changed" : "same";
    rows.push({ room: l.room, product: l.product, o, c: l, status });
  }
  // Original lines with no current match → removed.
  for (const k of Object.keys(origByKey)) {
    for (let i = used[k] ?? 0; i < origByKey[k].length; i++) {
      const o = origByKey[k][i];
      rows.push({ room: o.room, product: o.product, o, c: null, status: "removed" });
    }
  }
  return rows;
}
