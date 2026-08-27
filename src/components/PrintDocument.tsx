"use client";
import type { QuoteLine } from "@/lib/types";
import { computeTotals, inr, MODULAR_DISCOUNT } from "@/lib/pricing";

export interface QuoteMeta {
  client: string;
  mobile: string;
  location: string;
  bhk: string;
  quoteNo?: string;
  revision?: number;
}

// Branded quotation document that matches Hauspire's PDF exactly:
// the Cover, About ("Why Choose Us") and Terms pages are the real branded
// artwork; the quotation/summary/totals pages in between are generated.
export default function PrintDocument({ meta, lines }: { meta: QuoteMeta; lines: QuoteLine[] }) {
  const rooms = Array.from(new Set(lines.map((l) => l.room)));
  const t = computeTotals(lines);
  const roomTotal = (r: string) => lines.filter((l) => l.room === r).reduce((s, l) => s + l.amount, 0);
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const quoteNo = meta.quoteNo || "HI/2026/001";
  const rev = meta.revision ?? 0;

  return (
    <div className="mx-auto max-w-4xl text-[12px] text-neutral-900">
      {/* Cover + About + Terms are the exact branded pages */}
      <img src="/brand/cover.png" alt="Cover" className="mx-auto block w-full break-after-page" />
      <img src="/brand/about.png" alt="About" className="mx-auto block w-full break-after-page" />

      {/* Quotation header */}
      <section className="px-2 pt-4">
        <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 border-b-2 border-brand pb-3 text-[11px]">
          <Field k="Client Name" v={meta.client || "—"} />
          <Field k="Quotation No" v={quoteNo} />
          <Field k="Client Mobile" v={meta.mobile} />
          <Field k="Date" v={date} />
          <Field k="Flat No" v="" />
          <Field k="Revision" v={String(rev)} />
          <Field k="Location" v={meta.location} />
          <Field k="Configuration" v={meta.bhk} />
        </div>

        {rooms.map((room) => (
          <div key={room} className="mb-4 break-inside-avoid">
            <div className="bg-brand px-2 py-1 text-[12px] font-bold text-white">{room}</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-light text-left text-[11px] text-white">
                  <Th>S.No.</Th><Th>Product</Th><Th>Work Code</Th><Th>Details</Th>
                  <Th right>Width(mm)</Th><Th right>Height(mm)</Th><Th right>Amount (₹)</Th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((l) => l.room === room).map((l, i) => (
                  <tr key={i} className="align-top">
                    <Td>{i + 1}</Td>
                    <Td><b>{l.product}</b></Td>
                    <Td>{l.wc}</Td>
                    <Td className="whitespace-pre-line text-[10px] text-neutral-600">{l.details}</Td>
                    <Td right>{l.width ?? ""}</Td>
                    <Td right>{l.height ?? ""}</Td>
                    <Td right>{fmt(l.amount)}</Td>
                  </tr>
                ))}
                <tr className="bg-brand-band font-bold">
                  <Td colSpan={6}>{room} (Sub-total)</Td>
                  <Td right>{fmt(roomTotal(room))}</Td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Summary by room */}
        <div className="mt-6 break-inside-avoid">
          <div className="bg-brand px-2 py-1 font-bold text-white">Summary By Room</div>
          <table className="w-full max-w-md border-collapse">
            <thead><tr className="bg-brand-light text-left text-white"><Th>S.No.</Th><Th>Rooms</Th><Th right>Amount (₹)</Th></tr></thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={r}><Td>{i + 1}</Td><Td>{r}</Td><Td right>{fmt(roomTotal(r))}</Td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-5 break-inside-avoid">
          <table className="w-full max-w-md border-collapse text-[11px]">
            <tbody>
              <Row k="Sum-Total (MO-01)  ·  Modular" v={fmt(t.mo)} />
              <Row k="Sum-Total (NM-01)  ·  Non-Modular" v={fmt(t.nm)} />
              <Row k="Professional fees (7%)" v={fmt(t.fee)} />
              <Row k="Sub-Total" v={fmt(t.subTotal)} bold />
              <Row k={`Discount on Modular (${MODULAR_DISCOUNT * 100}%)`} v={`${MODULAR_DISCOUNT * 100}%`} />
              <Row k="Discounted Value" v={fmt(t.discount)} />
              <Row k="On-Spot Discount (₹)" v="0" />
              <tr className="bg-brand font-extrabold text-white">
                <td className="border border-brand-line px-2 py-1">Total Project Value</td>
                <td className="border border-brand-line px-2 py-1 text-right">₹{fmt(t.tpv)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment stages */}
        <div className="mt-6 break-inside-avoid">
          <div className="bg-brand px-2 py-1 font-bold text-white">Payment Stages</div>
          <table className="w-full max-w-lg border-collapse text-[11px]">
            <tbody>{t.stages.map((s) => <Row key={s.label} k={s.label} v={fmt(s.amount)} />)}</tbody>
          </table>
        </div>
      </section>

      {/* Terms — exact branded page */}
      <img src="/brand/terms.png" alt="Terms" className="mx-auto mt-4 block w-full break-before-page" />
    </div>
  );
}

function fmt(n: number) { return Math.round(n).toLocaleString("en-IN"); }
function Field({ k, v }: { k: string; v: string }) {
  return <div><span className="font-semibold text-brand">{k}:</span> <span>{v}</span></div>;
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border border-brand-line px-2 py-1 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, colSpan, className = "" }: { children: React.ReactNode; right?: boolean; colSpan?: number; className?: string }) {
  return <td colSpan={colSpan} className={`border border-brand-line px-2 py-1 ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <tr className={bold ? "font-bold" : ""}>
      <td className="border border-brand-line px-2 py-1">{k}</td>
      <td className="border border-brand-line px-2 py-1 text-right">{v}</td>
    </tr>
  );
}
