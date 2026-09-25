"use client";
import type { ElectricalBill } from "@/lib/types";

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

export default function ElectricalBillPrint({ bill }: { bill: ElectricalBill }) {
  const lines = bill.lines.filter((l) => l.qty > 0);
  const total = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const discount = Math.round(total * (bill.discountPct || 0));
  const net = total - discount;
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl px-2 pt-4 text-[12px] text-neutral-900 print:max-w-none print:mx-0">
      {/* Branded header */}
      <div className="mb-2 flex items-end justify-between border-b-2 border-brand pb-2">
        <div>
          <div className="text-2xl font-extrabold text-brand">HAUSPIRE</div>
          <div className="text-[10px] text-neutral-500">Luxury Interiors · 501, Balewadi Plaza, Balewadi, Pune 411045</div>
        </div>
        <div className="text-right text-[11px]"><b>Electrical Bill</b><br />{date}</div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
        <div><span className="font-semibold text-brand">Client:</span> {bill.client_name || "—"}</div>
        <div><span className="font-semibold text-brand">Designer:</span> {bill.designer || "—"}</div>
        <div><span className="font-semibold text-brand">Location:</span> {bill.location || "—"}</div>
        {bill.quote_no ? <div><span className="font-semibold text-brand">Quotation No:</span> {bill.quote_no}</div> : <div />}
      </div>

      <div className="roomhdr bg-brand px-2 py-1 text-[12px] font-bold text-white">Electrical Rate List</div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-brand-light text-left text-[11px] text-white">
            <th className="border border-brand-line px-2 py-1">Sr.</th>
            <th className="border border-brand-line px-2 py-1">Item</th>
            <th className="border border-brand-line px-2 py-1 text-right">Unit</th>
            <th className="border border-brand-line px-2 py-1 text-right">Rate (₹)</th>
            <th className="border border-brand-line px-2 py-1 text-right">Cost (₹)</th>
            <th className="border border-brand-line px-2 py-1">Description</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="align-top">
              <td className="border border-brand-line px-2 py-1">{i + 1}</td>
              <td className="border border-brand-line px-2 py-1"><b>{l.item}</b></td>
              <td className="border border-brand-line px-2 py-1 text-right">{l.qty}</td>
              <td className="border border-brand-line px-2 py-1 text-right">{fmt(l.rate)}</td>
              <td className="border border-brand-line px-2 py-1 text-right">{fmt(l.qty * l.rate)}</td>
              <td className="border border-brand-line px-2 py-1 whitespace-pre-line text-[10px] text-neutral-600">{l.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="mt-3 w-full max-w-md border-collapse text-[11px] avoid">
        <tbody>
          <tr><td className="border border-brand-line px-2 py-1">Total</td><td className="border border-brand-line px-2 py-1 text-right">{fmt(total)}</td></tr>
          {discount ? <tr className="text-red-700"><td className="border border-brand-line px-2 py-1">Discount ({Math.round((bill.discountPct || 0) * 100)}%)</td><td className="border border-brand-line px-2 py-1 text-right">− {fmt(discount)}</td></tr> : null}
          <tr className="bg-brand font-extrabold text-white"><td className="border border-brand-line px-2 py-1">Net Total</td><td className="border border-brand-line px-2 py-1 text-right">₹{fmt(net)}</td></tr>
        </tbody>
      </table>

      {bill.materials.some((m) => m.brand) && (
        <div className="mt-4 avoid">
          <div className="roomhdr bg-brand px-2 py-1 text-[12px] font-bold text-white">Material Used</div>
          <table className="w-full max-w-md border-collapse text-[11px]">
            <tbody>
              {bill.materials.filter((m) => m.label || m.brand).map((m, i) => (
                <tr key={i}><td className="border border-brand-line px-2 py-1 font-medium">{m.label}</td><td className="border border-brand-line px-2 py-1">{m.brand}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bill.note && <p className="avoid mt-4 text-[10px] text-neutral-600"><b>Note:</b> {bill.note}</p>}
    </div>
  );
}
