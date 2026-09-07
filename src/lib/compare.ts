// Compares an original quotation against the revised (current) one, matching by
// room + product name, so the Final sheet can show Original vs Final side by side.
import type { QuoteLine, WorkCode } from "./types";

export interface CompareRow {
  room: string;
  product: string;
  wc: WorkCode;
  details: string;
  orig: number | null;   // null = wasn't in the original (an addition)
  final: number | null;  // 0 = removed in the final
}

export function compareLines(original: QuoteLine[], current: QuoteLine[]): { rows: CompareRow[]; additions: CompareRow[] } {
  const key = (l: QuoteLine) => `${l.room}||${l.product.trim().toLowerCase()}`;
  const origByKey: Record<string, QuoteLine[]> = {};
  for (const l of original) (origByKey[key(l)] ||= []).push(l);
  const used: Record<string, number> = {};

  const rows: CompareRow[] = [];
  const additions: CompareRow[] = [];

  for (const l of current) {
    const k = key(l);
    const i = used[k] ?? 0;
    const o = origByKey[k]?.[i];
    used[k] = i + 1;
    const row: CompareRow = { room: l.room, product: l.product, wc: l.wc, details: l.details, orig: o ? o.amount : null, final: l.amount };
    if (o) rows.push(row); else additions.push(row);
  }
  // Original lines with no match in the current quote → removed in final (final 0).
  for (const k of Object.keys(origByKey)) {
    for (let i = used[k] ?? 0; i < origByKey[k].length; i++) {
      const o = origByKey[k][i];
      rows.push({ room: o.room, product: o.product, wc: o.wc, details: o.details, orig: o.amount, final: 0 });
    }
  }
  return { rows, additions };
}
