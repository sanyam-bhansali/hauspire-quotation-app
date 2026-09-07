"use client";
import type { QuoteLine } from "@/lib/types";
import { compareLines, sizeText, type ChangeStatus } from "@/lib/compare";
import { computeTotals, inr } from "@/lib/pricing";

const ROW_BG: Record<ChangeStatus, string> = {
  added: "bg-green-50", removed: "bg-red-50", changed: "bg-amber-50", same: "",
};
const TAG: Record<ChangeStatus, { t: string; c: string } | null> = {
  added: { t: "NEW", c: "bg-green-600" }, removed: { t: "REMOVED", c: "bg-red-500" },
  changed: { t: "CHANGED", c: "bg-amber-500" }, same: null,
};

export default function FinalCompare({
  original, current, modularPct, onSpot,
}: { original: QuoteLine[]; current: QuoteLine[]; modularPct: number; onSpot: number }) {
  const rows = compareLines(original, current);
  const rooms = Array.from(new Set(rows.map((r) => r.room)));
  const ot = computeTotals(original, { modularPct, onSpot });
  const ft = computeTotals(current, { modularPct, onSpot });
  const delta = ft.tpv - ot.tpv;

  return (
    <div className="text-[12px]">
      <div className="mb-2 flex items-center justify-between border-b-2 border-brand pb-2">
        <div className="text-2xl font-extrabold text-brand">Final Quotation — Original vs Revised</div>
        <Legend />
      </div>

      {rooms.map((room) => {
        const rr = rows.filter((r) => r.room === room);
        return (
          <div key={room} className="mb-4">
            <div className="bg-brand px-2 py-1 text-[12px] font-bold text-white">{room}</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-light text-left text-[11px] text-white">
                  <th className="border border-brand-line px-2 py-1">Product</th>
                  <th className="border border-brand-line px-2 py-1">Size (Orig → Final)</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Original (₹)</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Final (₹)</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {rr.map((r, i) => {
                  const oAmt = r.o?.amount ?? null;
                  const fAmt = r.c?.amount ?? 0;
                  const d = fAmt - (oAmt ?? 0);
                  const os = sizeText(r.o), fs = sizeText(r.c);
                  const tag = TAG[r.status];
                  return (
                    <tr key={i} className={`align-top ${ROW_BG[r.status]}`}>
                      <td className="border border-brand-line px-2 py-1">
                        <b className={r.status === "removed" ? "line-through" : ""}>{r.product}</b>
                        {tag && <span className={`ml-1 rounded px-1 text-[9px] font-bold text-white ${tag.c}`}>{tag.t}</span>}
                      </td>
                      <td className="border border-brand-line px-2 py-1">
                        {r.status === "changed" && os !== fs ? <span><span className="text-neutral-400 line-through">{os}</span> → <b>{fs}</b></span>
                          : r.status === "added" ? <b>{fs}</b>
                          : r.status === "removed" ? <span className="text-neutral-400 line-through">{os}</span>
                          : os}
                      </td>
                      <td className="border border-brand-line px-2 py-1 text-right">{oAmt == null ? "—" : inr(oAmt)}</td>
                      <td className="border border-brand-line px-2 py-1 text-right font-semibold">{r.status === "removed" ? "—" : inr(fAmt)}</td>
                      <td className={`border border-brand-line px-2 py-1 text-right ${d > 0 ? "text-green-700" : d < 0 ? "text-red-600" : "text-neutral-400"}`}>{d === 0 ? "—" : (d > 0 ? "+" : "") + inr(d)}</td>
                    </tr>
                  );
                })}
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

function Legend() {
  return (
    <div className="flex gap-2 text-[10px]">
      <span className="rounded bg-green-600 px-1.5 py-0.5 font-bold text-white">NEW</span>
      <span className="rounded bg-amber-500 px-1.5 py-0.5 font-bold text-white">CHANGED</span>
      <span className="rounded bg-red-500 px-1.5 py-0.5 font-bold text-white">REMOVED</span>
    </div>
  );
}
