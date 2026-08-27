"use client";
import type { QuoteLine } from "@/lib/types";
import { computeTotals, inr } from "@/lib/pricing";
import { WELCOME, MATERIAL_SPEC, TERMS } from "@/lib/boilerplate";

export interface QuoteMeta {
  client: string;
  mobile: string;
  location: string;
  bhk: string;
}

// Full branded quotation document, styled to match Hauspire's PDF. Use the
// browser's Print (Ctrl/Cmd-P → Save as PDF) to export.
export default function PrintDocument({ meta, lines }: { meta: QuoteMeta; lines: QuoteLine[] }) {
  const rooms = Array.from(new Set(lines.map((l) => l.room)));
  const t = computeTotals(lines);
  const roomTotal = (r: string) => lines.filter((l) => l.room === r).reduce((s, l) => s + l.amount, 0);

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-[12px] text-neutral-900 print:p-0">
      {/* Cover */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center break-after-page text-center">
        <div className="text-5xl font-black tracking-tight text-brand">HAUSPIRE</div>
        <div className="mt-2 text-lg text-neutral-500">Quotation</div>
        <div className="mt-6 max-w-md text-sm text-neutral-500">Your Dream Home Awaits.</div>
        <div className="mt-10 text-[11px] text-neutral-400">
          Balewadi Plaza, Flat 501, Balewadi, Pune 411045 · info@hauspire.com · +91-76666-45800
        </div>
      </section>

      {/* Welcome */}
      <section className="break-after-page">
        <H>Welcome to Hauspire</H>
        <p className="whitespace-pre-line leading-relaxed text-neutral-700">{WELCOME}</p>
      </section>

      {/* Client + line items */}
      <section>
        <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
          <div className="text-3xl font-black text-brand">HAUSPIRE</div>
          <div className="text-right text-[11px]">
            <div><b>{meta.client || "—"}</b></div>
            <div>{meta.mobile}</div>
            <div>{meta.location} · {meta.bhk}</div>
            <div>{new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        {rooms.map((room) => (
          <div key={room} className="mb-4 break-inside-avoid">
            <div className="bg-brand px-2 py-1 font-bold text-white">{room}</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-light text-left text-white">
                  <Th>#</Th><Th>Product</Th><Th>Code</Th><Th>Details</Th>
                  <Th right>W</Th><Th right>H</Th><Th right>Amount</Th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((l) => l.room === room).map((l, i) => (
                  <tr key={i} className="align-top">
                    <Td>{i + 1}</Td>
                    <Td><b>{l.product}</b></Td>
                    <Td>{l.wc}</Td>
                    <Td className="whitespace-pre-line text-[10.5px] text-neutral-600">{l.details}</Td>
                    <Td right>{l.width ?? ""}</Td>
                    <Td right>{l.height ?? ""}</Td>
                    <Td right>{inr(l.amount)}</Td>
                  </tr>
                ))}
                <tr className="bg-brand-band font-bold">
                  <Td colSpan={6}>{room} — Sub-total</Td>
                  <Td right>{inr(roomTotal(room))}</Td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {/* Summary by room */}
      <section className="mt-6 break-inside-avoid">
        <H>Summary by room</H>
        <table className="w-full max-w-md border-collapse">
          <tbody>
            {rooms.map((r) => (
              <tr key={r}><Td>{r}</Td><Td right>{inr(roomTotal(r))}</Td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals */}
      <section className="mt-4 break-inside-avoid">
        <table className="w-full max-w-md border-collapse">
          <tbody>
            <TotRow l="Sum-Total (MO-01) — Modular" v={t.mo} />
            <TotRow l="Sum-Total (NM-01) — Non-Modular" v={t.nm} />
            <TotRow l="Professional fees (7%)" v={t.fee} />
            <TotRow l="Sub-Total" v={t.subTotal} />
            <tr className="text-red-700"><Td>Discount on Modular (15%)</Td><Td right>− {inr(t.discount)}</Td></tr>
            <tr className="bg-brand font-extrabold text-white"><Td>Total Project Value</Td><Td right>{inr(t.tpv)}</Td></tr>
          </tbody>
        </table>
      </section>

      {/* Payment stages */}
      <section className="mt-6 break-inside-avoid">
        <H>Payment stages</H>
        <table className="w-full max-w-md border-collapse">
          <tbody>{t.stages.map((s) => <TotRow key={s.label} l={s.label} v={s.amount} />)}</tbody>
        </table>
      </section>

      {/* Material spec */}
      <section className="mt-6 break-inside-avoid break-before-page">
        <H>Material specification</H>
        <table className="w-full border-collapse">
          <thead><tr className="bg-brand-light text-left text-white"><Th>Material</Th><Th>Brand</Th><Th>Specification</Th></tr></thead>
          <tbody>{MATERIAL_SPEC.map(([m, b, s]) => <tr key={m}><Td>{m}</Td><Td>{b}</Td><Td>{s}</Td></tr>)}</tbody>
        </table>
      </section>

      {/* Terms */}
      <section className="mt-6 break-inside-avoid">
        <H>Terms &amp; conditions</H>
        <ul className="list-disc space-y-1 pl-5 text-[10.5px] text-neutral-700">
          {TERMS.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 border-b border-brand-line pb-1 text-sm font-bold uppercase tracking-wide text-brand">{children}</h2>;
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border border-brand-line px-2 py-1 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, colSpan, className = "" }: { children: React.ReactNode; right?: boolean; colSpan?: number; className?: string }) {
  return <td colSpan={colSpan} className={`border border-brand-line px-2 py-1 ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}
function TotRow({ l, v }: { l: string; v: number }) {
  return <tr><Td className="font-medium">{l}</Td><Td right>{inr(v)}</Td></tr>;
}
