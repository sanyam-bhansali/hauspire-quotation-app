"use client";
import { Fragment } from "react";
import type { QuoteLine, WorkCode } from "@/lib/types";
import { inr, areaAmount, sqftAmount, rftAmount } from "@/lib/pricing";

/** Fully editable, room-grouped quotation table. Every field can be changed;
 *  editing Width/Height recomputes the amount for area lines (those with a rate). */
export default function QuoteTable({
  lines,
  onChange,
}: {
  lines: QuoteLine[];
  onChange: (lines: QuoteLine[]) => void;
}) {
  const rooms = Array.from(new Set(lines.map((l) => l.room)));

  function setField(idx: number, patch: Partial<QuoteLine>) {
    const next = lines.slice();
    const l: QuoteLine = { ...next[idx], ...patch };
    // If W/H changed and this is an area line (has a rate), recompute the amount.
    if (("width" in patch || "height" in patch) && l.rate && l.width && l.height) {
      l.amount = areaAmount(l.width, l.height, l.rate);
    }
    // If Units changed and this is a unit line (has a unit price), recompute.
    if ("qty" in patch && l.unitPrice != null && l.qty != null) {
      l.amount = Math.round(l.qty * l.unitPrice);
    }
    // If SqFt area changed on a per-sqft line (has a rate), recompute the amount.
    if ("sqft" in patch && l.sqft != null && l.rate) {
      l.amount = sqftAmount(l.sqft, l.rate);
    }
    // If running-feet length changed on a per-rft line (has a rate), recompute.
    if ("rft" in patch && l.rft != null && l.rate) {
      l.amount = rftAmount(l.rft, l.rate);
    }
    next[idx] = l;
    onChange(next);
  }
  function remove(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }
  function addLine(room: string) {
    onChange([...lines, { room, product: "New item", wc: "MO-01", details: "", width: null, height: null, amount: 0 }]);
  }

  const numOrNull = (v: string) => (v === "" ? null : Number(v) || 0);

  return (
    <table className="w-full border-collapse bg-white text-[12px]">
      <tbody>
        {rooms.map((room) => {
          const items = lines.map((l, i) => ({ l, i })).filter((x) => x.l.room === room);
          const sub = items.reduce((s, x) => s + x.l.amount, 0);
          return (
            <Fragment key={room}>
              <tr className="bg-brand font-bold text-white">
                <td colSpan={8} className="border border-brand-line px-2 py-1">{room}</td>
              </tr>
              <tr className="bg-brand-light text-left text-white">
                <th className="border border-brand-line px-2 py-1">#</th>
                <th className="border border-brand-line px-2 py-1">Product</th>
                <th className="border border-brand-line px-2 py-1">Code</th>
                <th className="border border-brand-line px-2 py-1">Details</th>
                <th className="border border-brand-line px-2 py-1 text-right">Units / SqFt / RFT</th>
                <th className="border border-brand-line px-2 py-1 text-right">W</th>
                <th className="border border-brand-line px-2 py-1 text-right">H</th>
                <th className="border border-brand-line px-2 py-1 text-right">Amount</th>
              </tr>
              {items.map((x, n) => (
                <tr key={x.i} className="align-top">
                  <td className="border border-brand-line px-1 py-1 text-center">{n + 1}</td>
                  <td className="border border-brand-line px-1 py-1">
                    <input className="cell w-44" value={x.l.product} onChange={(e) => setField(x.i, { product: e.target.value })} />
                  </td>
                  <td className="border border-brand-line px-1 py-1">
                    <select className="cell" value={x.l.wc} onChange={(e) => setField(x.i, { wc: e.target.value as WorkCode })}>
                      <option>MO-01</option><option>NM-01</option>
                    </select>
                  </td>
                  <td className="border border-brand-line px-1 py-1">
                    <textarea className="cell h-12 w-72 text-[11px]" value={x.l.details} onChange={(e) => setField(x.i, { details: e.target.value })} />
                  </td>
                  <td className="border border-brand-line px-1 py-1 text-right">
                    {x.l.sqft != null ? (
                      <span className="inline-flex items-center justify-end gap-1">
                        <input type="number" className="cell w-16 text-right" value={x.l.sqft} onChange={(e) => setField(x.i, { sqft: Number(e.target.value) || 0 })} />
                        <span className="text-[10px] text-neutral-400">sqft{x.l.rate ? ` @₹${x.l.rate}` : ""}</span>
                      </span>
                    ) : x.l.rft != null ? (
                      <span className="inline-flex items-center justify-end gap-1">
                        <input type="number" className="cell w-16 text-right" value={x.l.rft} onChange={(e) => setField(x.i, { rft: Number(e.target.value) || 0 })} />
                        <span className="text-[10px] text-neutral-400">rft{x.l.rate ? ` @₹${x.l.rate}` : ""}</span>
                      </span>
                    ) : x.l.unitPrice != null ? (
                      <input type="number" className="cell w-14 text-right" value={x.l.qty ?? 1} onChange={(e) => setField(x.i, { qty: Number(e.target.value) || 0 })} />
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="border border-brand-line px-1 py-1 text-right">
                    <input type="number" className="cell w-16 text-right" value={x.l.width ?? ""} onChange={(e) => setField(x.i, { width: numOrNull(e.target.value) })} />
                  </td>
                  <td className="border border-brand-line px-1 py-1 text-right">
                    <input type="number" className="cell w-16 text-right" value={x.l.height ?? ""} onChange={(e) => setField(x.i, { height: numOrNull(e.target.value) })} />
                  </td>
                  <td className="border border-brand-line px-1 py-1 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input type="number" className="cell w-24 text-right" value={x.l.amount} onChange={(e) => setField(x.i, { amount: Number(e.target.value) || 0 })} />
                      <button onClick={() => remove(x.i)} className="no-print text-red-500" title="Remove line">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-brand-band font-bold">
                <td colSpan={7} className="border border-brand-line px-2 py-1">
                  {room} — Sub-total
                  <button onClick={() => addLine(room)} className="no-print ml-2 rounded border border-brand px-1.5 text-[11px] font-semibold text-brand">+ add item</button>
                </td>
                <td className="border border-brand-line px-2 py-1 text-right">{inr(sub)}</td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
      <style jsx>{`.cell{border:1px solid #e0cdd3;border-radius:4px;padding:2px 4px;font-size:12px;background:#fffef8}`}</style>
    </table>
  );
}
