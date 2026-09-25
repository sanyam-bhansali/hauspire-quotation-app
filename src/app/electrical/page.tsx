"use client";
import { useEffect, useMemo, useState } from "react";
import type { ElectricalItem, ElectricalLine, Quote } from "@/lib/types";
import { loadElectricalRates, saveElectricalBill, getElectricalBillByQuoteNo, DEFAULT_MATERIALS, DEFAULT_NOTE } from "@/lib/electricalStore";
import { draftElectricalFromQuote } from "@/lib/electricalDraft";
import { listLatest } from "@/lib/quotesRepo";
import { inr } from "@/lib/pricing";
import { printWithFilename } from "@/lib/printDoc";
import ElectricalBillPrint from "@/components/ElectricalBillPrint";

export default function ElectricalPage() {
  const [rateItems, setRateItems] = useState<ElectricalItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [client, setClient] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("Pune");
  const [designer, setDesigner] = useState("");
  const [quoteNo, setQuoteNo] = useState("");
  const [lines, setLines] = useState<ElectricalLine[]>([]);
  const [discountPct, setDiscountPct] = useState(0.15);
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [tab, setTab] = useState<"bill" | "pdf">("bill");
  const [status, setStatus] = useState("");
  const [pick, setPick] = useState("");

  useEffect(() => {
    loadElectricalRates().then((items) => {
      setRateItems(items);
      setLines(items.map((r) => ({ item: r.item, rate: r.rate, qty: 0, description: "" })));
    });
    listLatest("").then(setQuotes).catch(() => {});
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + l.qty * l.rate, 0), [lines]);
  const discount = Math.round(total * discountPct);
  const net = total - discount;

  const unitFor = (item: string) => rateItems.find((r) => r.item === item)?.unit ?? "";
  const setLine = (i: number, patch: Partial<ElectricalLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function generateFromQuote(id: string) {
    const qte = quotes.find((x) => x.id === id);
    if (!qte) return;
    setClient(qte.client_name || ""); setMobile(qte.mobile || ""); setLocation(qte.location || ""); setQuoteNo(qte.quote_no || "");
    if (qte.designer_id && qte.designer_id !== "anon") setDesigner(qte.designer_id);
    // If a bill already exists for this quotation, load it; else auto-draft.
    const existing = qte.quote_no ? await getElectricalBillByQuoteNo(qte.quote_no) : null;
    if (existing) {
      setLines(existing.lines); setDiscountPct(existing.discountPct ?? 0.15); setMaterials(existing.materials?.length ? existing.materials : DEFAULT_MATERIALS); setNote(existing.note || DEFAULT_NOTE);
      setStatus(`Loaded saved electrical bill for ${qte.client_name}.`);
    } else {
      setLines(draftElectricalFromQuote(rateItems, qte.lines || []));
      setStatus(`Drafted from quotation ${qte.quote_no || ""} — review quantities & descriptions, then Save.`);
    }
  }

  async function save() {
    if (!client.trim()) { setStatus("Enter a client name first."); return; }
    setStatus("Saving…");
    await saveElectricalBill({ quote_no: quoteNo || undefined, client_name: client, mobile, location, designer, lines, discountPct, materials, note, total, net });
    setStatus("Saved ✓");
  }
  const bill = { quote_no: quoteNo, client_name: client, mobile, location, designer, lines, discountPct, materials, note, total, net };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr]">
      <aside className="no-print space-y-3 border-r border-brand-line bg-white p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brand-light">Generate from quotation</h2>
        <select className="input" value={pick} onChange={(e) => { setPick(e.target.value); generateFromQuote(e.target.value); }}>
          <option value="">— pick a saved quotation —</option>
          {quotes.map((q) => <option key={q.id} value={q.id}>{(q.quote_no ? q.quote_no + " · " : "") + (q.client_name || "—") + " · " + q.bhk}</option>)}
        </select>
        <p className="text-[10.5px] text-neutral-400">Auto-drafts electrical points from the furniture in that quotation. You then review the quantities & room notes.</p>

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Details</h2>
        <input className="input" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <input className="input" placeholder="Designer (e.g. Ar. Renuka Gupta)" value={designer} onChange={(e) => setDesigner(e.target.value)} />
        <label className="text-xs text-neutral-600">Discount %
          <input type="number" className="input" value={Math.round(discountPct * 100)} onChange={(e) => setDiscountPct((Number(e.target.value) || 0) / 100)} />
        </label>

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Material used</h2>
        {materials.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1">
            <input className="input" value={m.label} onChange={(e) => setMaterials((ms) => ms.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            <input className="input" value={m.brand} onChange={(e) => setMaterials((ms) => ms.map((x, j) => j === i ? { ...x, brand: e.target.value } : x))} />
            <button onClick={() => setMaterials((ms) => ms.filter((_, j) => j !== i))} className="text-red-500">✕</button>
          </div>
        ))}
        <button onClick={() => setMaterials((ms) => [...ms, { label: "", brand: "" }])} className="text-[11px] font-semibold text-brand underline">＋ add material</button>

        <button onClick={save} className="btn">Save electrical bill</button>
        {status && <p className="rounded bg-brand-band px-2 py-1 text-center text-[11px] text-neutral-700">{status}</p>}
      </aside>

      <section className="p-5">
        <div className="no-print mb-3 flex gap-2">
          <Tab on={tab === "bill"} onClick={() => setTab("bill")}>Electrical bill</Tab>
          <Tab on={tab === "pdf"} onClick={() => setTab("pdf")}>PDF preview</Tab>
          <button onClick={async () => { await save(); setTab("pdf"); setTimeout(() => printWithFilename(`${client || "Client"} Hauspire Electrical Bill${quoteNo ? " " + quoteNo : ""}`), 400); }} className="ml-auto rounded bg-brand px-3 py-1 text-sm font-bold text-white">⬇ Save &amp; PDF</button>
        </div>

        {tab === "pdf" ? (
          <ElectricalBillPrint bill={bill} />
        ) : (
          <>
            <div className="mb-2 flex items-end justify-between border-b-2 border-brand pb-2">
              <div><div className="text-2xl font-extrabold text-brand">HAUSPIRE</div><div className="text-xs text-neutral-500">Electrical bill · {inr(net)}</div></div>
              <div className="text-right text-xs"><b>{client || "—"}</b><br />{designer}</div>
            </div>
            <table className="w-full border-collapse bg-white text-[12px]">
              <thead>
                <tr className="bg-brand-light text-left text-white">
                  <th className="border border-brand-line px-2 py-1">#</th>
                  <th className="border border-brand-line px-2 py-1">Item</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Unit</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Qty</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Rate</th>
                  <th className="border border-brand-line px-2 py-1 text-right">Cost</th>
                  <th className="border border-brand-line px-2 py-1">Description</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className={`align-top ${l.qty > 0 ? "" : "opacity-50"}`}>
                    <td className="border border-brand-line px-1 py-1 text-center">{i + 1}</td>
                    <td className="border border-brand-line px-1 py-1">{l.item}</td>
                    <td className="border border-brand-line px-1 py-1 text-right text-[10px] text-neutral-400">{unitFor(l.item)}</td>
                    <td className="border border-brand-line px-1 py-1 text-right"><input type="number" className="cell w-16 text-right" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} /></td>
                    <td className="border border-brand-line px-1 py-1 text-right"><input type="number" className="cell w-20 text-right" value={l.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) || 0 })} /></td>
                    <td className="border border-brand-line px-1 py-1 text-right">{inr(l.qty * l.rate)}</td>
                    <td className="border border-brand-line px-1 py-1"><textarea className="cell h-10 w-72 text-[11px]" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} /></td>
                  </tr>
                ))}
              </tbody>
              <tbody>
                <tr className="bg-brand-band font-bold"><td colSpan={5} className="border border-brand-line px-2 py-1 text-right">Total</td><td className="border border-brand-line px-2 py-1 text-right">{inr(total)}</td><td className="border border-brand-line" /></tr>
                <tr className="font-bold text-red-700"><td colSpan={5} className="border border-brand-line px-2 py-1 text-right">Discount ({Math.round(discountPct * 100)}%)</td><td className="border border-brand-line px-2 py-1 text-right">− {inr(discount)}</td><td className="border border-brand-line" /></tr>
                <tr className="bg-brand font-extrabold text-white"><td colSpan={5} className="border border-brand-line px-2 py-1 text-right">Net Total</td><td className="border border-brand-line px-2 py-1 text-right">{inr(net)}</td><td className="border border-brand-line" /></tr>
              </tbody>
            </table>
            <label className="mt-3 block text-xs text-neutral-600">Note
              <textarea className="input h-16 text-[11px]" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <style jsx>{`.cell{border:1px solid #e0cdd3;border-radius:4px;padding:2px 4px;font-size:12px;background:#fffef8}`}</style>
          </>
        )}
      </section>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-t-lg border border-b-0 border-brand-line px-4 py-2 text-sm font-semibold ${on ? "bg-white text-brand" : "bg-brand-band text-neutral-600"}`}>{children}</button>;
}
