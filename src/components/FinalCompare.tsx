"use client";
import type { QuoteLine } from "@/lib/types";
import { compareLines } from "@/lib/compare";
import { computeTotals, inr } from "@/lib/pricing";

// On-screen Original vs Final comparison used in the Full Builder.
export default function FinalCompare({
  original, current, modularPct, onSpot,
}: { original: QuoteLine[]; current: QuoteLine[]; modularPct: number; onSpot: number }) {
  const { rows, additions } = compareLines(original, current);
  const rooms = Array.from(new Set([...rows, ...additions].map((r) => r.room)));
  const ot = computeTotals(original, { modularPct, onSpot });
  const ft = computeTotals(current, { modularPct, onSpot });
  const delta = ft.tpv - ot.tpv;

  const fmt = (n: number | null) => (n == null ? "—" : inr(n));

  return (
    <div className="text-[12px]">
      <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
        <div className="text-2xl font-extrabold text-brand">Final Quotation — Original vs Revised</div>
      </div>

      {rooms.map((room) => {
        const rr = rows.filter((r) => r.room === room);
        const aa = additions.filter((r) => r.room === room);
        return (
          <div key={room} className="mb-4">
            <div className="bg-brand px-2 py-1 text-[12px] font-bold text-white">{room}</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-light text-left text-[11px] text-white">
                  <th className="border border-brand-line px-2 py-1">Product</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Original (₹)</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Final (₹)</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {rr.map((r, i) => {
                  const d = (r.final ?? 0) - (r.orig ?? 0);
                  return (
                    <tr key={i} className="align-top">
                      <td className="border border-brand-line px-2 py-1"><b>{r.product}</b>{r.final === 0 ? <span className="ml-1 text-[10px] text-red-500">(removed)</span> : null}</td>
                      <td className="border border-brand-line px-2 py-1 text-right">{fmt(r.orig)}</td>
                      <td className="border border-brand-line px-2 py-1 text-right">{fmt(r.final)}</td>
                      <td className={`border border-brand-line px-2 py-1 text-right ${d > 0 ? "text-green-700" : d < 0 ? "text-red-600" : "text-neutral-400"}`}>{d === 0 ? "—" : (d > 0 ? "+" : "") + inr(d)}</td>
                    </tr>
                  );
                })}
                {aa.map((r, i) => (
                  <tr key={"a" + i} className="bg-amber-50 align-top">
                    <td className="border border-brand-line px-2 py-1"><b>{r.product}</b> <span className="text-[10px] text-amber-700">(added)</span></td>
                    <td className="border border-brand-line px-2 py-1 text-right text-neutral-400">—</td>
                    <td className="border border-brand-line px-2 py-1 text-right">{fmt(r.final)}</td>
                    <td className="border border-brand-line px-2 py-1 text-right text-green-700">+{inr(r.final ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <table className="mt-4 w-full max-w-md border-collapse text-[12px]">
        <tbody>
          <tr><td className="border border-brand-line px-2 py-1">Original Total Project Value</td><td className="border border-brand-line px-2 py-1 text-right">{inr(ot.tpv)}</td></tr>
          <tr><td className="border border-brand-line px-2 py-1">Final Total Project Value</td><td className="border border-brand-line px-2 py-1 text-right font-bold">{inr(ft.tpv)}</td></tr>
          <tr className={`font-extrabold ${delta >= 0 ? "text-green-700" : "text-red-600"}`}>
            <td className="border border-brand-line px-2 py-1">Change</td>
            <td className="border border-brand-line px-2 py-1 text-right">{(delta >= 0 ? "+" : "") + inr(delta)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
