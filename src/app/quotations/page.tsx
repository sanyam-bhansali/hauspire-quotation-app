"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quote } from "@/lib/types";
import { listLatest, STAGE_LABEL } from "@/lib/quotesRepo";
import { setPendingQuote } from "@/lib/quoteStore";
import { inr } from "@/lib/pricing";

export default function QuotationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Quote[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("Loading…");
  const [openClient, setOpenClient] = useState<string | null>(null);

  async function refresh(search = q) {
    setStatus("Loading…");
    const list = await listLatest(search);
    setRows(list);
    setStatus(`${list.length} quotation${list.length === 1 ? "" : "s"}`);
  }
  useEffect(() => { refresh(""); /* eslint-disable-next-line */ }, []);

  // Group latest-per-quote into client folders.
  const folders = useMemo(() => {
    const m = new Map<string, Quote[]>();
    for (const r of rows) {
      const c = (r.client_name || "—").trim();
      (m.get(c) ?? m.set(c, []).get(c)!).push(r);
    }
    return Array.from(m.entries())
      .map(([client, listRaw]) => {
        const list = listRaw.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        return {
          client, list,
          latestTpv: list[0]?.tpv || 0,     // amount of the most recent quotation
          latest: list[0]?.created_at || "",
        };
      })
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [rows]);

  function openInBuilder(quote: Quote) {
    setPendingQuote({
      client: quote.client_name, mobile: quote.mobile, location: quote.location,
      bhk: quote.bhk, kitchenRun: quote.kitchen_run || 0, lines: quote.lines || [],
      fromId: quote.id, quoteNo: quote.quote_no, stage: (quote.stage as "sales" | "design") ?? "sales",
    });
    router.push("/builder");
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand">Client Quotations</h1>
        <input
          className="input max-w-sm" placeholder="Search client, quote no, mobile, location…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") refresh(); }}
        />
        <button onClick={() => refresh()} className="rounded bg-brand px-3 py-1.5 text-sm font-bold text-white">Search</button>
        <button onClick={() => { setQ(""); refresh(""); }} className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600">Clear</button>
        <span className="text-xs text-neutral-500">{status}</span>
      </div>

      {folders.length === 0 ? (
        <p className="rounded-lg border border-brand-line p-6 text-center text-neutral-500">No saved quotations yet. Build one and Save in the Full Builder.</p>
      ) : (
        <div className="space-y-2">
          {folders.map((f) => {
            const open = openClient === f.client;
            return (
              <div key={f.client} className="overflow-hidden rounded-lg border border-brand-line">
                <button
                  onClick={() => setOpenClient(open ? null : f.client)}
                  className="flex w-full items-center gap-3 bg-brand-band px-4 py-2.5 text-left"
                >
                  <span className="text-brand">{open ? "▾" : "▸"}</span>
                  <span className="text-base">📁</span>
                  <span className="font-bold text-brand">{f.client}</span>
                  <span className="text-[11px] text-neutral-500">{f.list.length} quotation{f.list.length > 1 ? "s" : ""}</span>
                  <span className="ml-auto text-[12px] font-semibold text-neutral-700" title="Latest quotation amount">{inr(f.latestTpv)}</span>
                </button>
                {open && (
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-brand-light text-left text-white">
                        <th className="px-3 py-1.5">Quote No</th><th className="px-3 py-1.5">Stage</th><th className="px-3 py-1.5">Config</th>
                        <th className="px-3 py-1.5">Location</th>
                        <th className="px-3 py-1.5 text-right">Value</th><th className="px-3 py-1.5">Date</th><th className="px-3 py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.list.map((r) => (
                        <tr key={r.id} className="border-t border-brand-line">
                          <td className="px-3 py-1.5 font-mono">{r.quote_no || "—"}</td>
                          <td className="px-3 py-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${r.stage === "design" ? "bg-brand-light" : "bg-brand"}`}>{STAGE_LABEL[(r.stage as "sales" | "design") ?? "sales"]}</span>
                          </td>
                          <td className="px-3 py-1.5">{r.bhk}</td>
                          <td className="px-3 py-1.5">{r.location}</td>
                          <td className="px-3 py-1.5 text-right">{inr(r.tpv || 0)}</td>
                          <td className="px-3 py-1.5 text-neutral-500">{(r.created_at || "").slice(0, 10)}</td>
                          <td className="px-3 py-1.5 text-right">
                            <button onClick={() => openInBuilder(r)} className="rounded border border-brand px-2 py-1 text-[11px] font-semibold text-brand">Open &amp; edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
