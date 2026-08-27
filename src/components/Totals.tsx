"use client";
import type { QuoteLine } from "@/lib/types";
import { computeTotals, inr } from "@/lib/pricing";

export default function Totals({ lines }: { lines: QuoteLine[] }) {
  const t = computeTotals(lines);
  const Row = ({ l, v, cls = "" }: { l: string; v: number; cls?: string }) => (
    <tr className={cls}>
      <td className="border border-brand-line px-2 py-1 font-medium">{l}</td>
      <td className="border border-brand-line px-2 py-1 text-right">{inr(v)}</td>
    </tr>
  );
  return (
    <div className="mt-4 max-w-xl text-[13px]">
      <table className="w-full border-collapse bg-white">
        <tbody>
          <Row l="Sum-Total (MO-01) — Modular" v={t.mo} />
          <Row l="Sum-Total (NM-01) — Non-Modular" v={t.nm} />
          <Row l="Professional fees (7%)" v={t.fee} />
          <Row l="Sub-Total" v={t.subTotal} />
          <tr className="text-red-700">
            <td className="border border-brand-line px-2 py-1 font-medium">Discount on Modular (15%)</td>
            <td className="border border-brand-line px-2 py-1 text-right">− {inr(t.discount)}</td>
          </tr>
          <tr className="bg-brand font-extrabold text-white">
            <td className="border border-brand-line px-2 py-1">Total Project Value</td>
            <td className="border border-brand-line px-2 py-1 text-right">{inr(t.tpv)}</td>
          </tr>
        </tbody>
      </table>
      <h3 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-brand-light">Payment stages</h3>
      <table className="w-full border-collapse bg-white">
        <tbody>
          {t.stages.map((s) => (
            <Row key={s.label} l={s.label} v={s.amount} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
