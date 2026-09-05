"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { loadProducts, saveProducts, defaultProducts } from "@/lib/productStore";
import { standardPatch } from "@/lib/firstQuoteDefaults";

const BLANK: Product = { product: "", wc: "MO-01", type: "Area", rate: 2000, unit: null, details: "", rooms: "Kitchen", fq: false, w: 1500, h: 2100, qty: 1 };
const BHK_TAGS = ["", "1BHK", "2BHK", "3BHK", "4BHK"];

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [status, setStatus] = useState("Loading…");
  const [q, setQ] = useState("");

  useEffect(() => {
    loadProducts().then((p) => { setRows(p); setStatus(`${p.length} products loaded`); });
  }, []);

  function update(i: number, patch: Partial<Product>) {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function setType(i: number, type: "Area" | "Unit" | "SqFt" | "RFT") {
    if (type === "Area" || type === "SqFt" || type === "RFT")
      update(i, { type, unit: null, rate: rows[i].rate ?? (type === "SqFt" ? 26 : type === "RFT" ? 1200 : 2000) });
    else update(i, { type, rate: null, unit: rows[i].unit ?? 10000 });
  }
  function addRow() { setRows((r) => [{ ...BLANK }, ...r]); }
  function remove(i: number) { setRows((r) => r.filter((_, j) => j !== i)); }

  async function save() {
    setStatus("Saving…");
    const ok = await saveProducts(rows);
    setStatus(ok ? "Saved ✓ — changes are live for everyone." : "Save failed — Supabase not configured, or run the product_master SQL.");
  }
  function reset() { setRows(defaultProducts()); setStatus("Reset to bundled defaults (not saved yet)."); }

  // One-click: tick the standard first-quote set across the CURRENT catalog by
  // matching product names, and give each a sensible room + default size/qty.
  function selectStandard() {
    let n = 0;
    setRows((rs) => rs.map((r) => {
      const patch = standardPatch(r.product, r.type);
      if (patch) { n++; return { ...r, ...patch }; }
      return r;
    }));
    setStatus(`Selected the standard first-quote set (${n} products). Review, then Save.`);
  }
  function clearSelection() {
    setRows((rs) => rs.map((r) => ({ ...r, fq: false })));
    setStatus("Cleared all first-quote selections (not saved yet).");
  }

  const shown = rows.filter((r) => r.product.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand">Product Master</h1>
        <input className="input max-w-xs" placeholder="Search product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={addRow} className="rounded bg-brand px-3 py-1.5 text-sm font-bold text-white">+ Add material</button>
        <button onClick={save} className="rounded border border-brand px-3 py-1.5 text-sm font-bold text-brand">Save</button>
        <button onClick={selectStandard} className="rounded border border-brand bg-brand-band px-3 py-1.5 text-sm font-semibold text-brand">Select standard 1st-quote set</button>
        <button onClick={clearSelection} className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600">Clear 1st-quote</button>
        <button onClick={reset} className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600">Reset to defaults</button>
        <span className="text-xs text-neutral-500">{status}</span>
      </div>
      <p className="mb-3 text-[11px] text-neutral-500">
        Edit rates/units here to price with your own numbers. Area = ₹/sqft (needs Width×Height); SqFt = ₹/sqft × a floor area you type in sq ft; RFT = ₹/running-ft × a length; Unit = flat ₹.
        <b> Tick “1st Q”</b> to include a product in the auto-built first quotation, and set its default size / quantity there.
        <b> Rooms</b> are placement categories — use <code>Kitchen</code>, <code>Bedroom</code>, <code>Living</code>, <code>Study</code>, <code>Other</code> (comma-separated); a Bedroom item is placed in every bedroom. <b>BHK</b> limits a product to one home size (e.g. Painting/Electricals variants); <b>×bath</b> makes one line per bathroom; <b>balc</b> includes it only when a dry balcony is present; <b>run</b> sizes a kitchen item's width to the kitchen run. Saved changes apply everywhere.
      </p>

      <div className="overflow-auto rounded border border-brand-line">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0">
            <tr className="bg-brand-light text-left text-white">
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2">Code</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2 text-right">Rate ₹/sqft·rft</th>
              <th className="px-2 py-2 text-right">Unit ₹</th>
              <th className="px-2 py-2">Rooms</th>
              <th className="px-2 py-2 text-center">1st Q</th>
              <th className="px-2 py-2">First-quote size / rules</th>
              <th className="px-2 py-2">Details</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const i = rows.indexOf(r);
              return (
                <tr key={i} className="border-t border-brand-line align-top">
                  <td className="px-1 py-1"><input className="cell w-52" value={r.product} onChange={(e) => update(i, { product: e.target.value })} /></td>
                  <td className="px-1 py-1">
                    <select className="cell" value={r.wc} onChange={(e) => update(i, { wc: e.target.value as any })}>
                      <option>MO-01</option><option>NM-01</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <select className="cell" value={r.type} onChange={(e) => setType(i, e.target.value as any)}>
                      <option>Area</option><option>SqFt</option><option>RFT</option><option>Unit</option>
                    </select>
                  </td>
                  <td className="px-1 py-1 text-right">
                    {r.type === "Area" || r.type === "SqFt" || r.type === "RFT" ? <input type="number" className="cell w-24 text-right" value={r.rate ?? 0} onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })} /> : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-1 py-1 text-right">
                    {r.type === "Unit" ? <input type="number" className="cell w-28 text-right" value={r.unit ?? 0} onChange={(e) => update(i, { unit: Number(e.target.value) || 0 })} /> : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-1 py-1"><input className="cell w-40" value={r.rooms} onChange={(e) => update(i, { rooms: e.target.value })} /></td>
                  <td className="px-1 py-1 text-center">
                    <input type="checkbox" checked={!!r.fq} onChange={(e) => update(i, { fq: e.target.checked })} title="Include in the auto-built first quotation" />
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-neutral-600">
                      {r.type === "Area" ? (
                        <>
                          <label className="flex items-center gap-1">W<input type="number" className="cell w-14 text-right" value={r.w ?? 0} onChange={(e) => update(i, { w: Number(e.target.value) || 0 })} /></label>
                          <label className="flex items-center gap-1">H<input type="number" className="cell w-14 text-right" value={r.h ?? 0} onChange={(e) => update(i, { h: Number(e.target.value) || 0 })} /></label>
                          <label className="flex items-center gap-1" title="In the kitchen, size width to the kitchen run"><input type="checkbox" checked={!!r.useRun} onChange={(e) => update(i, { useRun: e.target.checked })} />run</label>
                        </>
                      ) : r.type === "SqFt" ? (
                        <label className="flex items-center gap-1">sqft<input type="number" className="cell w-16 text-right" value={r.area ?? 0} onChange={(e) => update(i, { area: Number(e.target.value) || 0 })} /></label>
                      ) : r.type === "RFT" ? (
                        <label className="flex items-center gap-1">rft<input type="number" className="cell w-14 text-right" value={r.len ?? 0} onChange={(e) => update(i, { len: Number(e.target.value) || 0 })} /></label>
                      ) : (
                        <label className="flex items-center gap-1">Qty<input type="number" className="cell w-12 text-right" value={r.qty ?? 1} onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })} /></label>
                      )}
                      <label className="flex items-center gap-1" title="One line per bathroom"><input type="checkbox" checked={!!r.perBath} onChange={(e) => update(i, { perBath: e.target.checked })} />×bath</label>
                      <label className="flex items-center gap-1" title="Include only when the plan has a dry balcony"><input type="checkbox" checked={!!r.balcony} onChange={(e) => update(i, { balcony: e.target.checked })} />balc</label>
                      <label className="flex items-center gap-1" title="Include only for this home size">BHK
                        <select className="cell" value={r.bhk ?? ""} onChange={(e) => update(i, { bhk: e.target.value })}>
                          {BHK_TAGS.map((t) => <option key={t} value={t}>{t || "any"}</option>)}
                        </select>
                      </label>
                    </div>
                  </td>
                  <td className="px-1 py-1"><textarea className="cell w-60 h-10" value={r.details} onChange={(e) => update(i, { details: e.target.value })} /></td>
                  <td className="px-1 py-1"><button onClick={() => remove(i)} className="text-red-500" title="Remove">✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style jsx>{`.cell{border:1px solid #e0cdd3;border-radius:4px;padding:3px 5px;font-size:12px;background:#fffef8}`}</style>
    </div>
  );
}
