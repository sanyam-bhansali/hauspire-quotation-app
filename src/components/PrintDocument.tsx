"use client";
import { useEffect, useState } from "react";
import type { QuoteLine } from "@/lib/types";
import { computeTotals, inr } from "@/lib/pricing";
import { loadTerms } from "@/lib/termsStore";
import { DEFAULT_TERMS } from "@/data/termsDefault";
import TermsView from "./TermsView";
import QuoteSummary from "./QuoteSummary";

export interface QuoteMeta {
  client: string;
  mobile: string;
  location: string;
  bhk: string;
  quoteNo?: string;
  revision?: number;
  stage?: "sales" | "design";
  modularPct?: number;
  onSpot?: number;
}
export const stageLabel = (s?: "sales" | "design") => (s === "design" ? "Design Final" : "Sales Final");

// Branded quotation document that matches Hauspire's PDF exactly:
// the Cover, About ("Why Choose Us") and Terms pages are the real branded
// artwork; the quotation/summary/totals pages in between are generated.
export default function PrintDocument({ meta, lines }: { meta: QuoteMeta; lines: QuoteLine[] }) {
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);
  useEffect(() => { loadTerms().then(setTerms).catch(() => {}); }, []);

  const rooms = Array.from(new Set(lines.map((l) => l.room)));
  const t = computeTotals(lines, { modularPct: meta.modularPct, onSpot: meta.onSpot });
  const roomTotal = (r: string) => lines.filter((l) => l.room === r).reduce((s, l) => s + l.amount, 0);
  // Amount after the modular discount (MO-01 lines only).
  const discOf = (l: QuoteLine) => (l.wc === "MO-01" ? Math.round(l.amount * (1 - t.modularPct)) : l.amount);
  const roomDisc = (r: string) => lines.filter((l) => l.room === r).reduce((s, l) => s + discOf(l), 0);
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const quoteNo = meta.quoteNo || "Draft";

  return (
    <div className="mx-auto max-w-4xl text-[12px] text-neutral-900 print:max-w-none print:mx-0">
      {/* Cover + About + Terms are the exact branded pages */}
      <img src="/brand/cover.png" alt="Cover" className="brandpage block w-full brk-after" />
      <img src="/brand/about.png" alt="About" className="brandpage block w-full brk-after" />

      {/* Quotation header */}
      <section className="px-2 pt-4">
        <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 border-b-2 border-brand pb-3 text-[11px]">
          <Field k="Client Name" v={meta.client || "—"} />
          <Field k="Quotation No" v={quoteNo} />
          <Field k="Client Mobile" v={meta.mobile} />
          <Field k="Date" v={date} />
          <Field k="Flat No" v="" />
          <Field k="Location" v={meta.location} />
          <Field k="Configuration" v={meta.bhk} />
        </div>

        {rooms.map((room) => (
          <div key={room} className="mb-4">
            <div className="roomhdr bg-brand px-2 py-1 text-[12px] font-bold text-white">{room}</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-light text-left text-[11px] text-white">
                  <Th>S.No.</Th><Th>Product</Th><Th>Work Code</Th><Th>Details</Th>
                  <Th right>Units</Th><Th right>Width(mm)</Th><Th right>Height(mm)</Th><Th right>Amount (₹)</Th><Th right>Discounted (₹)</Th>
                </tr>
              </thead>
              <tbody>
                {lines.filter((l) => l.room === room).map((l, i) => (
                  <tr key={i} className="align-top">
                    <Td>{i + 1}</Td>
                    <Td><b>{l.product}</b></Td>
                    <Td>{l.wc}</Td>
                    <Td className="whitespace-pre-line text-[10px] text-neutral-600">{l.details}</Td>
                    <Td right>{l.unitPrice != null ? (l.qty ?? 1) : ""}</Td>
                    <Td right>{l.width ?? ""}</Td>
                    <Td right>{l.height ?? ""}</Td>
                    <Td right className={l.wc === "MO-01" ? "text-neutral-400 line-through" : ""}>{fmt(l.amount)}</Td>
                    <Td right className={l.wc === "MO-01" ? "font-semibold text-green-700" : "text-neutral-600"}>{fmt(discOf(l))}</Td>
                  </tr>
                ))}
                <tr className="bg-brand-band font-bold">
                  <Td colSpan={7}>{room} (Sub-total)</Td>
                  <Td right>{fmt(roomTotal(room))}</Td>
                  <Td right>{fmt(roomDisc(room))}</Td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Summary by room, totals, payment stages, material spec */}
        <QuoteSummary lines={lines} modularPct={meta.modularPct} onSpot={meta.onSpot} />
      </section>

      {/* Terms & Conditions — editable, branded page */}
      <section className="brk-before px-2 pt-6">
        <div className="mb-3 flex items-center justify-between border-b-2 border-brand pb-2">
          <div className="text-2xl font-extrabold text-brand">HAUSPIRE</div>
          <div className="text-[11px] uppercase tracking-wide text-brand-light">Terms &amp; Conditions</div>
        </div>
        <TermsView text={terms} />
      </section>
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
