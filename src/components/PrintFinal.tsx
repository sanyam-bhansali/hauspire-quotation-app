"use client";
import { useEffect, useState } from "react";
import type { QuoteLine } from "@/lib/types";
import type { QuoteMeta } from "./PrintDocument";
import { compareLines } from "@/lib/compare";
import { computeTotals, inr } from "@/lib/pricing";
import { loadTerms } from "@/lib/termsStore";
import { DEFAULT_TERMS } from "@/data/termsDefault";
import TermsView from "./TermsView";

// Branded FINAL quotation PDF: Cover -> About -> Original-vs-Final -> Terms.
export default function PrintFinal({ meta, original, current }: { meta: QuoteMeta; original: QuoteLine[]; current: QuoteLine[] }) {
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);
  useEffect(() => { loadTerms().then(setTerms).catch(() => {}); }, []);

  const { rows, additions } = compareLines(original, current);
  const rooms = Array.from(new Set([...rows, ...additions].map((r) => r.room)));
  const ot = computeTotals(original, { modularPct: meta.modularPct, onSpot: meta.onSpot });
  const ft = computeTotals(current, { modularPct: meta.modularPct, onSpot: meta.onSpot });
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const fmt = (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString("en-IN"));

  return (
    <div className="mx-auto max-w-4xl text-[12px] text-neutral-900 print:max-w-none print:mx-0">
      <img src="/brand/cover.png" alt="Cover" className="brandpage block w-full brk-after" />
      <img src="/brand/about.png" alt="About" className="brandpage block w-full brk-after" />

      <section className="px-2 pt-4">
        <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 border-b-2 border-brand pb-3 text-[11px]">
          <Field k="Client Name" v={meta.client || "—"} />
          <Field k="Quotation No" v={meta.quoteNo || "—"} />
          <Field k="Client Mobile" v={meta.mobile} />
          <Field k="Date" v={date} />
          <Field k="Location" v={meta.location} />
          <Field k="Revision (Final)" v={String(meta.revision ?? 0)} />
        </div>

        <div className="mb-2 bg-brand px-2 py-1 text-[13px] font-bold text-white">Final Quotation — Original vs Revised</div>

        {rooms.map((room) => {
          const rr = rows.filter((r) => r.room === room);
          const aa = additions.filter((r) => r.room === room);
          return (
            <div key={room} className="mb-4">
              <div className="bg-brand-light px-2 py-1 text-[12px] font-bold text-white">{room}</div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-band text-left text-[11px]">
                    <Th>Product</Th><Th>Details</Th><Th right>Original (₹)</Th><Th right>Final (₹)</Th>
                  </tr>
                </thead>
                <tbody>
                  {rr.map((r, i) => (
                    <tr key={i} className="align-top">
                      <Td><b>{r.product}</b>{r.final === 0 ? " (removed)" : ""}</Td>
                      <Td className="text-[10px] text-neutral-600">{r.details}</Td>
                      <Td right>{fmt(r.orig)}</Td><Td right>{fmt(r.final)}</Td>
                    </tr>
                  ))}
                  {aa.map((r, i) => (
                    <tr key={"a" + i} className="align-top">
                      <Td><b>{r.product}</b> (added)</Td>
                      <Td className="text-[10px] text-neutral-600">{r.details}</Td>
                      <Td right>—</Td><Td right>{fmt(r.final)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <table className="mt-4 w-full max-w-md border-collapse text-[11px]">
          <tbody>
            <Row k="Original Total Project Value" v={fmt(ot.tpv)} />
            <tr className="bg-brand font-extrabold text-white">
              <td className="border border-brand-line px-2 py-1">Final Total Project Value</td>
              <td className="border border-brand-line px-2 py-1 text-right">₹{fmt(ft.tpv)}</td>
            </tr>
          </tbody>
        </table>
      </section>

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

function Field({ k, v }: { k: string; v: string }) {
  return <div><span className="font-semibold text-brand">{k}:</span> <span>{v}</span></div>;
}
function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`border border-brand-line px-2 py-1 ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
function Td({ children, right, className = "" }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`border border-brand-line px-2 py-1 ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <tr><td className="border border-brand-line px-2 py-1">{k}</td><td className="border border-brand-line px-2 py-1 text-right">{v}</td></tr>;
}
