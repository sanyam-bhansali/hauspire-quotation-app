"use client";
import type { QuoteLine } from "@/lib/types";
import { computeTotals, inr, FEE_RATE, GST_RATE } from "@/lib/pricing";

export default function Totals({
  lines,
  modularPct,
  onSpot,
  onSpotLabel = "On-Spot Discount",
  onModularPct,
  feeOn = true,
  gstOn = false,
  onFeeOn,
  onGstOn,
}: {
  lines: QuoteLine[];
  modularPct: number; // fraction, e.g. 0.15
  onSpot: number;
  onSpotLabel?: string;
  onModularPct: (v: number) => void;
  feeOn?: boolean;
  gstOn?: boolean;
  /** When given, a tick-box lets the user drop the professional fee. */
  onFeeOn?: (v: boolean) => void;
  /** When given, a tick-box lets the user add GST. */
  onGstOn?: (v: boolean) => void;
}) {
  const t = computeTotals(lines, { modularPct, onSpot, feeOn, gstOn });
  const feePct = Math.round(FEE_RATE * 100);
  const gstPct = Math.round(GST_RATE * 100);
  const Row = ({ l, v, cls = "" }: { l: string; v: number; cls?: string }) => (
    <tr className={cls}>
      <td className="border border-brand-line px-2 py-1 font-medium">{l}</td>
      <td className="border border-brand-line px-2 py-1 text-right">{inr(v)}</td>
    </tr>
  );
  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <label className="no-print mr-1 inline-flex cursor-pointer items-center" title={label}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="h-3.5 w-3.5 accent-brand" />
    </label>
  );
  return (
    <div className="mt-4 max-w-xl text-[13px]">
      <table className="w-full border-collapse bg-white">
        <tbody>
          <Row l="Sum-Total (MO-01) — Modular" v={t.mo} />
          <Row l="Sum-Total (NM-01) — Non-Modular" v={t.nm} />
          {(t.feeOn || onFeeOn) && (
            <tr className={t.feeOn ? "" : "text-neutral-400"}>
              <td className="border border-brand-line px-2 py-1 font-medium">
                {onFeeOn && <Toggle on={t.feeOn} set={onFeeOn} label="Include professional fees" />}
                Professional fees ({feePct}%){!t.feeOn && " — removed"}
              </td>
              <td className="border border-brand-line px-2 py-1 text-right">{t.feeOn ? inr(t.fee) : "—"}</td>
            </tr>
          )}
          <Row l="Sub-Total" v={t.subTotal} />
          <tr className="text-red-700">
            <td className="border border-brand-line px-2 py-1 font-medium">
              Discount on Modular
              <input
                type="number"
                value={Math.round(modularPct * 100)}
                onChange={(e) => onModularPct((Number(e.target.value) || 0) / 100)}
                className="mx-1 w-14 rounded border border-brand-line bg-yellow-50 px-1 py-0.5 text-right"
              />
              %
            </td>
            <td className="border border-brand-line px-2 py-1 text-right">− {inr(t.discount)}</td>
          </tr>
          {t.onSpot ? (
            <tr className="text-red-700">
              <td className="border border-brand-line px-2 py-1 font-medium">{onSpotLabel}</td>
              <td className="border border-brand-line px-2 py-1 text-right">− {inr(t.onSpot)}</td>
            </tr>
          ) : null}
          <tr className={t.gstOn ? "font-bold" : "bg-brand font-extrabold text-white"}>
            <td className="border border-brand-line px-2 py-1">Total Project Value{t.gstOn ? " (before GST)" : ""}</td>
            <td className="border border-brand-line px-2 py-1 text-right">{inr(t.tpv)}</td>
          </tr>
          {(t.gstOn || onGstOn) && (
            <tr className={t.gstOn ? "" : "text-neutral-400"}>
              <td className="border border-brand-line px-2 py-1 font-medium">
                {onGstOn && <Toggle on={t.gstOn} set={onGstOn} label="Add GST" />}
                GST ({gstPct}%){!t.gstOn && " — not added"}
              </td>
              <td className="border border-brand-line px-2 py-1 text-right">{t.gstOn ? "+ " + inr(t.gst) : "—"}</td>
            </tr>
          )}
          {t.gstOn && (
            <tr className="bg-brand font-extrabold text-white">
              <td className="border border-brand-line px-2 py-1">Grand Total (incl. GST)</td>
              <td className="border border-brand-line px-2 py-1 text-right">{inr(t.grandTotal)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <h3 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-brand-light">
        Payment stages{t.gstOn ? " (incl. GST)" : ""}
      </h3>
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
