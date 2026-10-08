"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDesignerId } from "@/lib/useDesignerId";
import productMaster from "@/data/productMaster.json";
import type { Product, QuoteLine } from "@/lib/types";
import { areaAmount, sqftAmount, rftAmount, computeTotals, inr, BHK_ROOMS } from "@/lib/pricing";
import { saveStage, nextQuoteNo, STAGE_LABEL, type Stage } from "@/lib/quotesRepo";
import { printWithFilename, quoteFilename, todayIso } from "@/lib/printDoc";
import { takePendingQuote } from "@/lib/quoteStore";
import { loadProducts } from "@/lib/productStore";
import { sizeDefaults } from "@/lib/productDefaults";
import { addProposal, autoProposeNewProducts } from "@/lib/proposalStore";
import QuoteTable from "@/components/QuoteTable";
import Totals from "@/components/Totals";
import PrintDocument from "@/components/PrintDocument";
import ProductCombo from "@/components/ProductCombo";
import DiscountPicker from "@/components/DiscountPicker";
import FinalCompare from "@/components/FinalCompare";
import PrintFinal from "@/components/PrintFinal";

const SEED = productMaster as unknown as Product[];
const DEFAULT_ROOMS = ["Kitchen", "Master Bedroom", "Kids Bedroom", "Guest Bedroom", "Living, Dining & Foyer", "Other Services"];

/** Distinct room names used by a quotation's lines, in the order they appear. */
function roomsOf(lines: QuoteLine[]): string[] {
  const out: string[] = [];
  for (const l of lines) if (l.room && !out.includes(l.room)) out.push(l.room);
  return out;
}

export default function BuilderPage() {
  const designerId = useDesignerId();
  const [client, setClient] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("Pune");
  const [bhk, setBhk] = useState("3 BHK");
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [banner, setBanner] = useState("");
  const [quoteNo, setQuoteNo] = useState<string>("");
  // The client the current quote number belongs to. If the designer types a
  // different client name, saving starts a NEW quotation (new number → new
  // folder) instead of overwriting this client's quotation.
  const [ownerClient, setOwnerClient] = useState<string>("");
  // Only quotations OPENED from My Quotations branch off on a name change. A quote
  // started in this session just keeps its number (so fixing a typo after the
  // first Save doesn't create a second quotation).
  const [openedSaved, setOpenedSaved] = useState(false);
  const [stage, setStage] = useState<Stage>("sales");
  const [baseLines, setBaseLines] = useState<QuoteLine[]>([]); // "Original" for the Final comparison
  const [tab, setTab] = useState<"quote" | "final" | "pdf" | "finalpdf">("quote");
  const [modularPct, setModularPct] = useState(0.15);
  const [onSpot, setOnSpot] = useState(0);
  const [onSpotLabel, setOnSpotLabel] = useState("On-Spot Discount");
  const noRef = useRef("");                                  // quote number once assigned
  const noPending = useRef<Promise<string> | null>(null);    // in-flight number lookup
  const [feeOn, setFeeOn] = useState(true);   // 7% professional fee
  const [gstOn, setGstOn] = useState(false);  // 18% GST (optional)
  const [quoteDate, setQuoteDate] = useState(todayIso()); // date printed on the quotation

  // rooms
  const [roomList, setRoomList] = useState<string[]>(DEFAULT_ROOMS);
  const [hasStudy, setHasStudy] = useState(false);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [newRoom, setNewRoom] = useState("");

  // add-line form
  const [products, setProducts] = useState<Product[]>(SEED);
  const [room, setRoom] = useState(DEFAULT_ROOMS[0]);
  const [productName, setProductName] = useState(SEED[0].product);
  const pickedRef = useRef(false); // designer has chosen a product in the panel
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
    loadProducts().then((ps) => {
      setProducts(ps);
      // Size the initially selected product from the live master too, unless
      // the designer already picked something while it was loading.
      if (!pickedRef.current) pickProduct(SEED[0].product, ps);
    }).catch(() => {});
  }, []);

  // Receive a quote handed off from the First-Quote page or the Quotations list.
  useEffect(() => {
    const p = takePendingQuote();
    if (p) {
      setClient(p.client); setMobile(p.mobile); setLocation(p.location);
      setBhk(p.bhk); setLines(p.lines); setBaseLines(p.lines); // opened state = the "Original"
      // Use the quotation's own rooms (e.g. "Kids Bedroom (Ayona)", "Living Balcony")
      // instead of the default room set.
      const opened = roomsOf(p.lines);
      if (opened.length) { setRoomList(opened); setRoom(opened[0]); }
      if (p.quoteNo) { setQuoteNo(p.quoteNo); setOwnerClient(p.client); setOpenedSaved(true); }
      if (p.stage) setStage(p.stage as Stage);
      const s = p.settings;
      if (s) {
        if (s.modularPct != null) setModularPct(s.modularPct);
        if (s.onSpot != null) setOnSpot(s.onSpot);
        if (s.onSpotLabel) setOnSpotLabel(s.onSpotLabel);
        if (s.feeOn != null) setFeeOn(s.feeOn);
        if (s.gstOn != null) setGstOn(s.gstOn);
        if (s.quoteDate) setQuoteDate(s.quoteDate);
      }
      setBanner(
        p.template
          ? `New quotation for ${p.client}, started from ${p.template.client}'s ${p.template.quoteNo || "quotation"}. Edit it, then Save — this creates ${p.client}'s own folder; ${p.template.client}'s quotation is not changed.`
          : p.quoteNo
          ? `Editing ${p.quoteNo} — ${STAGE_LABEL[(p.stage as Stage) ?? "sales"]}. Saving overrides this quotation. (Change the client name to save it as a new quotation instead.)`
          : `Revising first quote for ${p.client || "client"} — edit lines, then Save.`
      );
    }
  }, []);

  function applyConfig() {
    const base = BHK_ROOMS[bhk] ?? (/villa/i.test(bhk) ? BHK_ROOMS["4 BHK"] : BHK_ROOMS["3 BHK"]);
    const list = base.filter((r) => r !== "Other Services");
    if (hasStudy || /villa/i.test(bhk)) list.push("Office / Study");
    list.push("Other Services");
    setRoomList(list);
    if (!list.includes(room)) setRoom(list[0]);
    setBanner(`${bhk} configuration applied — ${list.length} rooms.`);
  }
  function renameRoom() {
    const from = renameFrom; const to = renameTo.trim();
    if (!from || !to || to === from) return;
    // Rename everywhere: the room list (merging if `to` already exists) and every line in it.
    setRoomList((rl) => {
      const next = rl.map((r) => (r === from ? to : r));
      return next.filter((r, i) => next.indexOf(r) === i);
    });
    const n = lines.filter((l) => l.room === from).length;
    setLines((ls) => ls.map((l) => (l.room === from ? { ...l, room: to } : l)));
    if (room === from) setRoom(to);
    setRenameFrom(""); setRenameTo("");
    setBanner(`Renamed “${from}” → “${to}”` + (n ? ` (${n} item${n > 1 ? "s" : ""}).` : "."));
  }
  function addRoom() {
    const n = newRoom.trim();
    if (!n || rooms.includes(n)) { setNewRoom(""); return; }
    setRoomList((rl) => [...rl, n]); setRoom(n); setNewRoom("");
  }

  const product = useMemo(() => products.find((p) => p.product === productName) ?? products[0], [products, productName]);

  // Live room list: every room used by the quotation's lines (in quotation order —
  // reflects renames and rooms typed into the table), then any extra rooms added
  // or configured that have no lines yet.
  const rooms = useMemo(() => {
    const out = roomsOf(lines);
    for (const r of roomList) if (!out.includes(r)) out.push(r);
    return out;
  }, [lines, roomList]);
  const activeRoom = rooms.includes(room) ? room : rooms[0];

  // Picking a product loads its standard size / quantity from the Product Master
  // (its First-Quote defaults). Fields the master leaves blank keep their value.
  function pickProduct(name: string, list: Product[] = products) {
    setProductName(name);
    const d = sizeDefaults(list.find((p) => p.product === name));
    if (d.w) setW(d.w);
    if (d.h) setH(d.h);
    setQty(d.qty ?? 1);
    if (d.sqft) setSqft(d.sqft);
    if (d.rft) setRft(d.rft);
  }
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
      room: activeRoom, product: product.product, wc: product.wc, details: product.details,
      width: isArea ? w : null, height: isArea ? h : null,
      amount: previewAmt,
      rate: isArea || isSqft || isRft ? product.rate ?? undefined : undefined,
      qty: product.type === "Unit" ? qty : undefined,
      unitPrice: product.type === "Unit" ? product.unit ?? undefined : undefined,
      sqft: isSqft ? sqft : undefined,
      rft: isRft ? rft : undefined,
    }]);
  }
  // Client name differs from the client this quote number belongs to?
  const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const isRenamed = openedSaved && !!quoteNo && !!ownerClient.trim() && !!client.trim() && normName(client) !== normName(ownerClient);

  async function save(saveStageArg: Stage = stage): Promise<string> {
    if (!lines.length) return "";
    if (!client.trim()) { setBanner("Enter a Client name before saving."); return ""; }
    setStage(saveStageArg);
    // tpv stays the pre-GST project value (what later comparisons and the vendor app use).
    const tpv = computeTotals(lines, { modularPct, onSpot, feeOn, gstOn }).tpv;
    try {
      // A different client name than the one this quote belongs to = a new
      // quotation for a new client (the opened one is used as a template).
      const renamed = isRenamed;
      const fromNo = quoteNo, fromClient = ownerClient;
      if (renamed) { noRef.current = ""; noPending.current = null; setOpenedSaved(false); }
      // One number per project: reuse it, and let rapid repeat clicks share the
      // same pending lookup instead of each grabbing a new number.
      const no = (renamed ? "" : quoteNo) || noRef.current || (await (noPending.current ??= nextQuoteNo()));
      noRef.current = no;
      if (no !== quoteNo) setQuoteNo(no);
      setOwnerClient(client);
      await saveStage({
        designer_id: designerId, client_name: client, mobile, location, bhk, kitchen_run: 0, lines, tpv, quote_no: no, stage: saveStageArg,
        settings: { modularPct, onSpot, onSpotLabel, feeOn, gstOn, quoteDate },
      });
      // Auto-collect any line whose product isn't in the master → pending approval.
      const newOnes = await autoProposeNewProducts(lines, products, designerId);
      const extra = newOnes.length ? ` · ${newOnes.length} new item(s) sent to Products for approval` : "";
      setBanner(
        renamed
          ? `Saved ✓  New quotation ${no} for ${client.trim()} (new folder). ${fromClient.trim()}'s quotation ${fromNo} is unchanged.` + extra
          : `Saved ✓  ${no} · ${STAGE_LABEL[saveStageArg]} (overrides previous)` + extra
      );
      return no;
    } catch { setBanner("Save failed — configure Supabase (or it saved locally in this browser)."); return quoteNo; }
  }

  const meta = { client, mobile, location, bhk, modularPct, onSpot, onSpotLabel, quoteNo, stage, feeOn, gstOn, date: quoteDate };
  const shownTotal = (() => { const t = computeTotals(lines, { modularPct, onSpot, feeOn, gstOn }); return t.gstOn ? t.grandTotal : t.tpv; })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
      <aside className="no-print space-y-3 border-r border-brand-line bg-white p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brand-light">Project</h2>
        <input className="input" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} />
        {isRenamed && (
          <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            Name changed — saving creates a <b>new quotation &amp; folder for “{client.trim()}”</b>. {ownerClient.trim()}’s quotation {quoteNo} stays as it is.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="shrink-0 font-semibold">Quotation date</span>
          <input className="input" type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value || todayIso())} />
          {quoteDate !== todayIso() && (
            <button type="button" onClick={() => setQuoteDate(todayIso())} className="shrink-0 text-[11px] font-semibold text-brand underline">Today</button>
          )}
        </label>
        <select className="input" value={bhk} onChange={(e) => setBhk(e.target.value)}>
          {["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Villa"].map((b) => <option key={b}>{b}</option>)}
        </select>

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Rooms</h2>
        <label className="flex items-center gap-2 text-[12.5px]">
          <input type="checkbox" checked={hasStudy} onChange={(e) => setHasStudy(e.target.checked)} /> Include Study / Office
        </label>
        <button onClick={applyConfig} className="btn-sec w-full">Apply {bhk} configuration</button>
        <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1">
          <select className="input" value={renameFrom} onChange={(e) => { setRenameFrom(e.target.value); setRenameTo(e.target.value); }}>
            <option value="">Rename room…</option>
            {rooms.map((r) => {
              const n = lines.filter((l) => l.room === r).length;
              return <option key={r} value={r}>{r}{n ? ` (${n})` : ""}</option>;
            })}
          </select>
          <input className="input" placeholder="New name" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} />
          <button onClick={renameRoom} className="rounded border border-brand px-2 py-1 text-xs font-semibold text-brand">↺</button>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-1">
          <input className="input" placeholder="Add custom room" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addRoom(); }} />
          <button onClick={addRoom} className="rounded border border-brand px-2 py-1 text-xs font-semibold text-brand">＋</button>
        </div>

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Add a line</h2>
        <select className="input" value={activeRoom} onChange={(e) => setRoom(e.target.value)}>{rooms.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <ProductCombo products={products} value={productName} onChange={(name) => { pickedRef.current = true; pickProduct(name); }} />
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

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Discount</h2>
        <DiscountPicker label={onSpotLabel} amount={onSpot} onLabel={setOnSpotLabel} onAmount={setOnSpot} />

        <h2 className="mt-3 text-xs font-bold uppercase tracking-wide text-brand-light">Fees &amp; Tax</h2>
        <div className="space-y-1.5 text-[12.5px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={feeOn} onChange={(e) => setFeeOn(e.target.checked)} />
            Professional fees (7%)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={gstOn} onChange={(e) => setGstOn(e.target.checked)} />
            Add GST (18%)
          </label>
          <p className="text-[10.5px] text-neutral-400">Untick the fee to remove it from the quote and PDF. GST is added on the final project value, after discounts; payment stages then include GST.</p>
        </div>

        {quoteNo && !isRenamed && (
          <p className="rounded bg-brand-band px-2 py-1 text-center text-[11px] font-semibold text-brand">
            {quoteNo} · editing {STAGE_LABEL[stage]}
          </p>
        )}
        {isRenamed && (
          <p className="rounded bg-amber-50 px-2 py-1 text-center text-[11px] font-semibold text-amber-800">
            New quotation for {client.trim()} · gets a new number on Save
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => save("sales")} className="btn-sec" title="Save/override the Sales-Final quotation (used until the client is booked)">Save Sales Final</button>
          <button onClick={() => save("design")} className="btn-sec" title="Save/override the Design-Final quotation (used until design is finalized)">Save Design Final</button>
        </div>
        <p className="text-[10.5px] text-neutral-400">Only two quotations are kept per project — <b>Sales Final</b> and <b>Design Final</b>. Each save overrides the previous one.</p>
      </aside>

      <section className="p-5">
        {banner && <div className="no-print mb-3 rounded bg-brand-band px-3 py-2 text-[12px] text-neutral-700">{banner}</div>}
        <div className="no-print mb-3 flex flex-wrap gap-2">
          <Tab on={tab === "quote"} onClick={() => setTab("quote")}>Quotation</Tab>
          <Tab on={tab === "final"} onClick={() => setTab("final")}>Final (Original vs Revised)</Tab>
          <Tab on={tab === "pdf"} onClick={() => setTab("pdf")}>PDF preview</Tab>
          {lines.length > 0 && (
            <div className="ml-auto flex gap-2">
              <button onClick={async () => { const no = await save(); setTab("pdf"); setTimeout(() => printWithFilename(quoteFilename(client, no || quoteNo, false, quoteDate)), 400); }} className="rounded bg-brand px-3 py-1 text-sm font-bold text-white" title="Saves this revision, then exports the PDF">⬇ Save &amp; Quotation PDF</button>
              <button onClick={async () => { const no = await save(); setTab("finalpdf"); setTimeout(() => printWithFilename(quoteFilename(client, no || quoteNo, true, quoteDate)), 400); }} className="rounded border border-brand px-3 py-1 text-sm font-bold text-brand" title="Saves this revision, then exports the Original vs Final PDF">⬇ Save &amp; Final PDF</button>
            </div>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="text-neutral-500">Add products from the panel, or open a first quote via “Revise in Full Builder”.</p>
        ) : tab === "quote" ? (
          <>
            <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
              <div><div className="text-2xl font-extrabold text-brand">HAUSPIRE</div><div className="text-xs text-neutral-500">Quotation · {inr(shownTotal)}{gstOn ? " incl. GST" : ""}</div></div>
              <div className="text-right text-xs"><b>{client || "—"}</b><br />{location} · {bhk}</div>
            </div>
            <QuoteTable lines={lines} onChange={setLines} products={products} modularPct={modularPct} />
            <Totals lines={lines} modularPct={modularPct} onSpot={onSpot} onSpotLabel={onSpotLabel} onModularPct={setModularPct} feeOn={feeOn} gstOn={gstOn} onFeeOn={setFeeOn} onGstOn={setGstOn} />
          </>
        ) : tab === "final" ? (
          <>
            <div className="no-print mb-3 flex items-center gap-2">
              <button onClick={() => setBaseLines(lines.map((l) => ({ ...l })))} className="rounded border border-brand px-2 py-1 text-[11px] font-semibold text-brand">Snapshot current as “Original”</button>
              <span className="text-[11px] text-neutral-500">Original = {baseLines.length} line(s). Open a saved quote or snapshot here, then edit lines and compare.</span>
            </div>
            <FinalCompare original={baseLines} current={lines} modularPct={modularPct} onSpot={onSpot} feeOn={feeOn} gstOn={gstOn} />
          </>
        ) : tab === "finalpdf" ? (
          <PrintFinal meta={meta} original={baseLines} current={lines} />
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
