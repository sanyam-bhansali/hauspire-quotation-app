// Shared closing summary for the quotation PDFs: Summary-by-Room (+ donut),
// Totals with discount, Payment Stages and Material Specification.
import type { QuoteLine } from "@/lib/types";
import { computeTotals, inr } from "@/lib/pricing";
import { MATERIAL_SPEC } from "@/lib/boilerplate";
import RoomDonut from "./RoomDonut";

export default function QuoteSummary({ lines, modularPct, onSpot, onSpotLabel }: { lines: QuoteLine[]; modularPct?: number; onSpot?: number; onSpotLabel?: string }) {
  const rooms = Array.from(new Set(lines.map((l) => l.room)));
  const t = computeTotals(lines, { modularPct, onSpot });
  const roomTotal = (r: string) => lines.filter((l) => l.room === r).reduce((s, l) => s + l.amount, 0);
  const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

  return (
    <>
      {/* Summary by room — table + donut */}
      <div className="mt-4 avoid">
        <div className="roomhdr bg-brand px-2 py-1 font-bold text-white">Summary By Room</div>
        <div className="grid grid-cols-[minmax(260px,1fr)_auto] items-center gap-8 px-2 py-3">
          <table className="w-full border-collapse">
            <thead><tr className="bg-brand-light text-left text-white"><Th>S.No.</Th><Th>Rooms</Th><Th right>Amount (₹)</Th></tr></thead>
            <tbody>
              {rooms.map((r, i) => (<tr key={r}><Td>{i + 1}</Td><Td>{r}</Td><Td right>{fmt(roomTotal(r))}</Td></tr>))}
              <tr className="bg-brand-band font-bold"><Td colSpan={2}>Total</Td><Td right>{fmt(rooms.reduce((s, r) => s + roomTotal(r), 0))}</Td></tr>
            </tbody>
          </table>
          <RoomDonut data={rooms.map((r) => ({ label: r, value: roomTotal(r) }))} />
        </div>
      </div>

      {/* Totals */}
      <div className="mt-4 avoid">
        <table className="w-full max-w-md border-collapse text-[11px]">
          <tbody>
            <Row k="Sum-Total (MO-01)  ·  Modular" v={fmt(t.mo)} />
            <Row k="Sum-Total (NM-01)  ·  Non-Modular" v={fmt(t.nm)} />
            <Row k="Professional fees (7%)" v={fmt(t.fee)} />
            <Row k="Sub-Total" v={fmt(t.subTotal)} bold />
            <Row k={`Discount on Modular (${Math.round(t.modularPct * 100)}%)`} v={fmt(t.discount)} />
            {t.onSpot ? <Row k={`${onSpotLabel || "On-Spot Discount"} (₹)`} v={fmt(t.onSpot)} /> : null}
            <tr className="bg-brand font-extrabold text-white">
              <td className="border border-brand-line px-2 py-1">Total Project Value</td>
              <td className="border border-brand-line px-2 py-1 text-right">₹{fmt(t.tpv)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment stages */}
      <div className="mt-5">
        <div className="roomhdr bg-brand px-2 py-1 font-bold text-white">Payment Stages</div>
        <table className="w-full border-collapse text-[11px]">
          <thead><tr className="bg-brand-light text-left text-white"><Th>Stage</Th><Th>Deliverable</Th><Th right>Amount (₹)</Th></tr></thead>
          <tbody>
            {t.stages.map((s) => (
              <tr key={s.label} className="align-top">
                <Td><b>{s.label}</b></Td>
                <Td className="text-[10px] text-neutral-600">{s.desc ?? ""}</Td>
                <Td right>{fmt(s.amount)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Material Specification */}
      <div className="mt-5">
        <div className="roomhdr bg-brand px-2 py-1 font-bold text-white">Material Specification</div>
        <table className="w-full border-collapse text-[11px]">
          <thead><tr className="bg-brand-light text-left text-white"><Th>Material</Th><Th>Brand</Th><Th>Specification</Th></tr></thead>
          <tbody>
            {MATERIAL_SPEC.map(([mat, brand, spec]) => (
              <tr key={mat} className="align-top"><Td><b>{mat}</b></Td><Td>{brand}</Td><Td className="text-neutral-700">{spec}</Td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border border-brand-line px-2 py-1 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, colSpan, className = "" }: { children: React.ReactNode; right?: boolean; colSpan?: number; className?: string }) {
  return <td colSpan={colSpan} className={`border border-brand-line px-2 py-1 ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <tr className={bold ? "font-bold" : ""}><td className="border border-brand-line px-2 py-1">{k}</td><td className="border border-brand-line px-2 py-1 text-right">{v}</td></tr>;
}
