"use client";
import { useEffect, useState } from "react";
import type { ElectricalItem } from "@/lib/types";
import { loadElectricalRates, saveElectricalRates, defaultElectricalRates } from "@/lib/electricalStore";
import AdminGate from "@/components/AdminGate";

export default function ElectricalRatesPage() {
  return <AdminGate label="Electrical Rate Master"><Inner /></AdminGate>;
}

function Inner() {
  const [rows, setRows] = useState<ElectricalItem[]>([]);
  const [status, setStatus] = useState("Loading…");
  const [q, setQ] = useState("");

  useEffect(() => { loadElectricalRates().then((r) => { setRows(r); setStatus(`${r.length} items`); }); }, []);

  const update = (i: number, patch: Partial<ElectricalItem>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addRow = () => setRows((r) => [...r, { item: "", rate: 0, unit: "no." }]);
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  async function save() { setStatus("Saving…"); const ok = await saveElectricalRates(rows); setStatus(ok ? "Saved ✓ — live for everyone." : "Saved in this browser — run the electrical_rates SQL for shared save."); }
  const reset = () => { setRows(defaultElectricalRates()); setStatus("Reset to defaults (not saved)."); };

  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.item.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand">Electrical Rate Master</h1>
        <input className="input max-w-xs" placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={addRow} className="rounded bg-brand px-3 py-1.5 text-sm font-bold text-white">+ Add item</button>
        <button onClick={save} className="rounded border border-brand px-3 py-1.5 text-sm font-bold text-brand">Save</button>
        <button onClick={reset} className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600">Reset to defaults</button>
        <span className="text-xs text-neutral-500">{status}</span>
      </div>
      <p className="mb-3 text-[11px] text-neutral-500">These items and rates drive the Electrical Bill. Edit rates to your current numbers; the bill computes Cost = Qty × Rate.</p>
      <div className="overflow-auto rounded border border-brand-line">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0"><tr className="bg-brand-light text-left text-white">
            <th className="px-2 py-2">Item</th><th className="px-2 py-2 text-right">Rate ₹</th><th className="px-2 py-2">Unit</th><th className="px-2 py-2"></th>
          </tr></thead>
          <tbody>
            {shown.map(({ r, i }) => (
              <tr key={i} className="border-t border-brand-line">
                <td className="px-1 py-1"><input className="cell w-[28rem]" value={r.item} onChange={(e) => update(i, { item: e.target.value })} /></td>
                <td className="px-1 py-1 text-right"><input type="number" className="cell w-24 text-right" value={r.rate} onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })} /></td>
                <td className="px-1 py-1"><input className="cell w-20" value={r.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value })} /></td>
                <td className="px-1 py-1"><button onClick={() => remove(i)} className="text-red-500" title="Remove">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`.cell{border:1px solid #e0cdd3;border-radius:4px;padding:3px 5px;font-size:12px;background:#fffef8}`}</style>
    </div>
  );
}
