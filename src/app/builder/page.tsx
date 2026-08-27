"use client";
import { useMemo, useState } from "react";
import { useDesignerId } from "@/lib/useDesignerId";
import productMaster from "@/data/productMaster.json";
import type { Product, QuoteLine } from "@/lib/types";
import { areaAmount, inr } from "@/lib/pricing";
import { saveQuote } from "@/lib/supabase";
import QuoteTable from "@/components/QuoteTable";
import Totals from "@/components/Totals";

const PM = productMaster as unknown as Product[];
const ROOMS = [
  "Kitchen", "Master Bedroom", "Kids Bedroom", "Guest Bedroom",
  "Parents Bedroom", "Living, Dining & Foyer", "Other Services",
];

export default function BuilderPage() {
  const designerId = useDesignerId();
  const [client, setClient] = useState("");
  const [bhk, setBhk] = useState("3 BHK");
  const [lines, setLines] = useState<QuoteLine[]>([]);

  // add-line form
  const [room, setRoom] = useState(ROOMS[0]);
  const [productName, setProductName] = useState(PM[0].product);
  const [w, setW] = useState(1800);
  const [h, setH] = useState(2100);
  const [qty, setQty] = useState(1);

  const product = useMemo(() => PM.find((p) => p.product === productName)!, [productName]);
  const preview = product.type === "Area" ? areaAmount(w, h, product.rate ?? 0) : (product.unit ?? 0) * qty;

  function addLine() {
    const line: QuoteLine = {
      room,
      product: product.product,
      wc: product.wc,
      details: product.details,
      width: product.type === "Area" ? w : null,
      height: product.type === "Area" ? h : null,
      amount: preview,
    };
    setLines([...lines, line]);
  }
  async function save() {
    if (!lines.length) return;
    const tpv = lines.reduce((s, l) => s + l.amount, 0);
    try {
      await saveQuote({ designer_id: designerId, client_name: client || "—", mobile: "", location: "Pune", bhk, kitchen_run: 0, lines, tpv });
      alert("Saved ✓");
    } catch {
      alert("Save failed — configure Supabase.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[340px_1fr]">
      <aside className="no-print space-y-3 border-r border-brand-line bg-white p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brand-light">Project</h2>
        <input className="input" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} />
        <select className="input" value={bhk} onChange={(e) => setBhk(e.target.value)}>
          {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa"].map((b) => <option key={b}>{b}</option>)}
        </select>

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Add a line</h2>
        <select className="input" value={room} onChange={(e) => setRoom(e.target.value)}>
          {ROOMS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className="input" value={productName} onChange={(e) => setProductName(e.target.value)}>
          {PM.map((p) => <option key={p.product}>{p.product}</option>)}
        </select>
        <p className="text-[11px] text-neutral-500">
          {product.wc} · {product.type}{" "}
          {product.type === "Area" ? `· ₹${product.rate}/sqft` : `· ₹${product.unit}/unit`}
        </p>
        {product.type === "Area" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">W (mm)<input className="input" type="number" value={w} onChange={(e) => setW(Number(e.target.value) || 0)} /></label>
            <label className="text-xs">H (mm)<input className="input" type="number" value={h} onChange={(e) => setH(Number(e.target.value) || 0)} /></label>
          </div>
        ) : (
          <label className="text-xs">Quantity<input className="input" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} /></label>
        )}
        <p className="text-sm font-semibold text-brand">Line amount: {inr(preview)}</p>
        <button onClick={addLine} className="btn">+ Add line</button>
        <button onClick={save} className="btn-sec">Save quotation</button>
        <button onClick={() => window.print()} className="btn-sec">Print / PDF</button>
      </aside>

      <section className="p-5">
        {lines.length === 0 ? (
          <p className="text-neutral-500">Add products from the panel to build a quotation from scratch.</p>
        ) : (
          <>
            <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
              <div><div className="text-2xl font-extrabold text-brand">HAUSPIRE</div><div className="text-xs text-neutral-500">Quotation</div></div>
              <div className="text-right text-xs"><b>{client || "—"}</b><br />{bhk}</div>
            </div>
            <QuoteTable lines={lines} onChange={setLines} />
            <Totals lines={lines} />
          </>
        )}
      </section>
    </div>
  );
}
