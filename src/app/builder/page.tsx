"use client";
import { useEffect, useMemo, useState } from "react";
import { useDesignerId } from "@/lib/useDesignerId";
import productMaster from "@/data/productMaster.json";
import type { Product, QuoteLine } from "@/lib/types";
import { areaAmount, sqftAmount, rftAmount, computeTotals, inr } from "@/lib/pricing";
import { saveQuote } from "@/lib/supabase";
import { takePendingQuote } from "@/lib/quoteStore";
import { loadProducts } from "@/lib/productStore";
import { addProposal } from "@/lib/proposalStore";
import QuoteTable from "@/components/QuoteTable";
import Totals from "@/components/Totals";
import PrintDocument from "@/components/PrintDocument";

const SEED = productMaster as unknown as Product[];
const ROOMS = ["Kitchen", "Master Bedroom", "Kids Bedroom", "Guest Bedroom", "Parents Bedroom", "Living, Dining & Foyer", "Other Services"];

export default function BuilderPage() {
  const designerId = useDesignerId();
  const [client, setClient] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("Pune");
  const [bhk, setBhk] = useState("3 BHK");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [banner, setBanner] = useState("");
  const [tab, setTab] = useState<"quote" | "pdf">("quote");
  const [modularPct, setModularPct] = useState(0.15);
  const [onSpot, setOnSpot] = useState(0);

  // add-line form
  const [products, setProducts] = useState<Product[]>(SEED);
  const [room, setRoom] = useState(ROOMS[0]);
  const [productName, setProductName] = useState(SEED[0].product);
  const [w, setW] = useState(1800);
  const [h, setH] = useState(2100);
  const [qty, setQty] = useState(1);
  const [sqft, setSqft] = useState(1000);
  const [rft, setRft] = useState(10);
  // Propose-a-new-product form
  const [npOpen, setNpOpen] = useState(false);
  const [np, setNp] = useState({ product: "", wc: "NM-01", type: "Unit", value: 10000, details: "" });

  async function proposeNew() {
    if (!np.product.trim()) return;
    const isUnit = np.type === "Unit";
    const prod: Product = {
      product: np.product.trim(), wc: np.wc as any, type: np.type as any,
      rate: isUnit ? null : np.value, unit: isUnit ? np.value : null,
      details: np.details, rooms: room.includes("Bedroom") ? "Bedroom" : room.includes("Kitchen") ? "Kitchen" : room.includes("Living") ? "Living" : "Other",
    };
    await addProposal(prod, designerId);
    setLines((ls) => [...ls, { room, product: prod.product, wc: prod.wc, details: np.details, width: null, height: null, amount: np.value, qty: 1, unitPrice: np.value }]);
    setBanner(`Proposed “${np.product}” for approval and added it to this quote.`);
    setNp({ product: "", wc: "NM-01", type: "Unit", value: 10000, details: "" });
    setNpOpen(false);
  }

  // Load the configured Product Master (Supabase) so the picker uses your rates.
  useEffect(() => {
    loadProducts().then(setProducts).catch(() => {});
  }, []);

  // Receive a first quote handed off from the First-Quote page.
  useEffect(() => {
    const p = takePendingQuote();
    if (p) {
      setClient(p.client); setMobile(p.mobile); setLocation(p.location);
      setBhk(p.bhk); setLines(p.lines);
      setBanner(`Revising first quote for ${p.client || "client"} — edit lines, add products, then Save as revision.`);
    }
  }, []);

  const product = useMemo(() => products.find((p) => p.product === productName) ?? products[0], [products, productName]);
  const previewAmt =
    product.type === "Area" ? areaAmount(w, h, product.rate ?? 0)
    : product.type === "SqFt" ? sqftAmount(sqft, product.rate ?? 0)
    : product.type === "RFT" ? rftAmount(rft, product.rate ?? 0)
    : (product.unit ?? 0) * qty;

  function addLine() {
    const isArea = product.type === "Area";
    const isSqft = product.type === "SqFt";
    const isRft = product.type === "RFT";
    setLines([...lines, {
      room, product: product.product, wc: product.wc, details: product.details,
      width: isArea ? w : null, height: isArea ? h : null,
      amount: previewAmt,
      rate: isArea || isSqft || isRft ? product.rate ?? undefined : undefined,
      qty: product.type === "Unit" ? qty : undefined,
      unitPrice: product.type === "Unit" ? product.unit ?? undefined : undefined,
      sqft: isSqft ? sqft : undefined,
      rft: isRft ? rft : undefined,
    }]);
  }
  async function save() {
    if (!lines.length) return;
    const tpv = computeTotals(lines, { modularPct, onSpot }).tpv;
    try {
      await saveQuote({ designer_id: designerId, client_name: client || "—", mobile, location, bhk, kitchen_run: 0, lines, tpv });
      setBanner("Saved ✓");
    } catch { setBanner("Save failed — configure Supabase."); }
  }

  const meta = { client, mobile, location, bhk, modularPct, onSpot };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
      <aside className="no-print space-y-3 border-r border-brand-line bg-white p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brand-light">Project</h2>
        <input className="input" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <select className="input" value={bhk} onChange={(e) => setBhk(e.target.value)}>
          {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa"].map((b) => <option key={b}>{b}</option>)}
        </select>

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Add a line</h2>
        <select className="input" value={room} onChange={(e) => setRoom(e.target.value)}>{ROOMS.map((r) => <option key={r}>{r}</option>)}</select>
        <select className="input" value={productName} onChange={(e) => setProductName(e.target.value)}>{products.map((p) => <option key={p.product}>{p.product}</option>)}</select>
        <p className="text-[11px] text-neutral-500">{product.wc} · {product.type} {product.type === "Area" || product.type === "SqFt" ? `· ₹${product.rate}/sqft` : product.type === "RFT" ? `· ₹${product.rate}/rft` : `· ₹${product.unit}/unit`}</p>
        {product.type === "Area" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">W (mm)<input className="input" type="number" value={w} onChange={(e) => setW(Number(e.target.value) || 0)} /></label>
            <label className="text-xs">H (mm)<input className="input" type="number" value={h} onChange={(e) => setH(Number(e.target.value) || 0)} /></label>
          </div>
        ) : product.type === "SqFt" ? (
          <label className="text-xs">Area (sq ft)<input className="input" type="number" value={sqft} onChange={(e) => setSqft(Number(e.target.value) || 0)} /></label>
        ) : product.type === "RFT" ? (
          <label className="text-xs">Length (running ft)<input className="input" type="number" value={rft} onChange={(e) => setRft(Number(e.target.value) || 0)} /></label>
        ) : (
          <label className="text-xs">Quantity<input className="input" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} /></label>
        )}
        <p className="text-sm font-semibold text-brand">Line amount: {inr(previewAmt)}</p>
        <button onClick={addLine} className="btn">+ Add line</button>

        <button onClick={() => setNpOpen((v) => !v)} className="text-[11px] font-semibold text-brand underline">
          {npOpen ? "− Cancel new product" : "＋ Propose a NEW product (not in master)"}
        </button>
        {npOpen && (
          <div className="space-y-2 rounded border border-brand-line bg-orange-50/40 p-2">
            <input className="input" placeholder="New product name" value={np.product} onChange={(e) => setNp({ ...np, product: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={np.wc} onChange={(e) => setNp({ ...np, wc: e.target.value })}><option>MO-01</option><option>NM-01</option></select>
              <select className="input" value={np.type} onChange={(e) => setNp({ ...np, type: e.target.value })}><option>Unit</option><option>Area</option><option>SqFt</option><option>RFT</option></select>
            </div>
            <label className="text-xs">{np.type === "Unit" ? "Amount (₹)" : "Rate (₹/sqft·rft)"}
              <input className="input" type="number" value={np.value} onChange={(e) => setNp({ ...np, value: Number(e.target.value) || 0 })} />
            </label>
            <textarea className="input h-12 text-[11px]" placeholder="Details (client-facing)" value={np.details} onChange={(e) => setNp({ ...np, details: e.target.value })} />
            <button onClick={proposeNew} className="btn-sec w-full">Propose &amp; add to quote</button>
            <p className="text-[10.5px] text-neutral-500">Sent to the Products tab for approval; once approved it becomes a standard line item.</p>
          </div>
        )}

        <button onClick={save} className="btn-sec">Save quotation</button>
      </aside>

      <section className="p-5">
        {banner && <div className="no-print mb-3 rounded bg-brand-band px-3 py-2 text-[12px] text-neutral-700">{banner}</div>}
        <div className="no-print mb-3 flex gap-2">
          <Tab on={tab === "quote"} onClick={() => setTab("quote")}>Quotation</Tab>
          <Tab on={tab === "pdf"} onClick={() => setTab("pdf")}>PDF preview</Tab>
          {lines.length > 0 && (
            <button onClick={() => { setTab("pdf"); setTimeout(() => window.print(), 350); }} className="ml-auto rounded bg-brand px-3 py-1 text-sm font-bold text-white">
              ⬇ Save as PDF
            </button>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="text-neutral-500">Add products from the panel, or open a first quote via “Revise in Full Builder”.</p>
        ) : tab === "quote" ? (
          <>
            <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
              <div><div className="text-2xl font-extrabold text-brand">HAUSPIRE</div><div className="text-xs text-neutral-500">Quotation · {inr(computeTotals(lines, { modularPct, onSpot }).tpv)}</div></div>
              <div className="text-right text-xs"><b>{client || "—"}</b><br />{location} · {bhk}</div>
            </div>
            <QuoteTable lines={lines} onChange={setLines} />
            <Totals lines={lines} modularPct={modularPct} onSpot={onSpot} onModularPct={setModularPct} onOnSpot={setOnSpot} />
          </>
        ) : (
          <PrintDocument meta={meta} lines={lines} />
        )}
      </section>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-t-lg border border-b-0 border-brand-line px-4 py-2 text-sm font-semibold ${on ? "bg-white text-brand" : "bg-brand-band text-neutral-600"}`}>{children}</button>;
}
