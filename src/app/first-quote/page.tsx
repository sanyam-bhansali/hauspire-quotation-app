"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDesignerId } from "@/lib/useDesignerId";
import template from "@/data/template.json";
import type { Template, QuoteLine } from "@/lib/types";
import { buildFirstQuote } from "@/lib/buildQuote";
import { BHK_ROOMS, feetInchesToMm, estimateKitchenRun, computeTotals, inr } from "@/lib/pricing";
import { saveQuote } from "@/lib/supabase";
import { setPendingQuote } from "@/lib/quoteStore";
import { ocrExtractPlan } from "@/lib/ocrPlan";
import QuoteTable from "@/components/QuoteTable";
import Totals from "@/components/Totals";
import Plan2D from "@/components/Plan2D";
import PrintDocument from "@/components/PrintDocument";

const TPL = template as unknown as Template;

const DEMOS: Record<string, { bhk: string; run: number }> = {
  "3BHK plan (Kitchen 10'×10'2\")": { bhk: "3 BHK", run: feetInchesToMm(10, 0) + feetInchesToMm(10, 2) - 900 },
  "2BHK Floor Plan C (7'10\"²)": { bhk: "2 BHK", run: estimateKitchenRun(feetInchesToMm(7, 10), feetInchesToMm(7, 10)) },
  "3BHK 902 plan (10'×11')": { bhk: "3 BHK", run: feetInchesToMm(10, 0) + feetInchesToMm(11, 0) - 900 },
  "2BHK handwritten (7'10\"×9')": { bhk: "2 BHK", run: feetInchesToMm(7, 10) + feetInchesToMm(9, 0) - 900 },
};

export default function FirstQuotePage() {
  const designerId = useDesignerId();
  const router = useRouter();
  const [client, setClient] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("Pune");
  const [bhk, setBhk] = useState("3 BHK");
  const [run, setRun] = useState(3960);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [king, setKing] = useState(false);
  const [bathrooms, setBathrooms] = useState(2);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasStudy, setHasStudy] = useState(false);
  const [sizeToPlan, setSizeToPlan] = useState(false);
  const [roomDims, setRoomDims] = useState<Record<string, { w: number; h: number }>>({});
  const [modularPct, setModularPct] = useState(0.15);
  const [onSpot, setOnSpot] = useState(0);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [tab, setTab] = useState<"quote" | "plan" | "pdf">("quote");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const rooms = BHK_ROOMS[bhk] ?? [];
  const optionals = useMemo(
    () => rooms.flatMap((r) => (r === "Parents Bedroom" ? TPL["Guest Bedroom"] : TPL[r] ?? []).filter((it) => !it.def).map((it) => ({ room: r, p: it.p }))),
    [bhk] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function build(o: { bhk?: string; run?: number; bathrooms?: number; hasBalcony?: boolean; hasStudy?: boolean } = {}) {
    setLines(
      buildFirstQuote({
        bhk: o.bhk ?? bhk,
        kitchenRun: o.run ?? run,
        bathrooms: o.bathrooms ?? bathrooms,
        hasBalcony: o.hasBalcony ?? hasBalcony,
        hasStudy: o.hasStudy ?? hasStudy,
        sizeToPlan,
        roomDims,
        enabledOptional: enabled,
        kingMaster: king,
      })
    );
    setStatus("");
  }

  function applyExtract(d: any, source: string) {
    if (d.bhk) setBhk(d.bhk);
    if (d.kitchenRun) setRun(d.kitchenRun);
    if (typeof d.bathrooms === "number") setBathrooms(d.bathrooms);
    setHasBalcony(!!d.hasBalcony);
    setHasStudy(!!d.hasStudy);
    const dims: Record<string, { w: number; h: number }> = {};
    (d.rooms || []).forEach((r: any) => { if (r.name) dims[r.name] = { w: r.widthMm || 0, h: r.depthMm || 0 }; });
    setRoomDims(dims);
    const conf = d.confidence ? ` · confidence: ${d.confidence}` : "";
    setStatus(`Read via ${source}: ${d.bhk}, kitchen run ${d.kitchenRun} mm, ${d.bathrooms} bath${d.hasBalcony ? ", balcony" : ""}${d.hasStudy ? ", study" : ""}. Check §4 and Build.${conf}`);
    setTimeout(() => build({ bhk: d.bhk, run: d.kitchenRun, bathrooms: d.bathrooms, hasBalcony: d.hasBalcony, hasStudy: d.hasStudy }), 0);
  }

  // Returns "ok" (applied), "not_configured" (no key), or "error" (surfaced).
  async function visionExtract(base64: string, mediaType: string): Promise<"ok" | "not_configured" | "error"> {
    try {
      const res = await fetch("/api/extract-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (res.status === 501) return "not_configured";
      if (!res.ok) {
        const e = await res.json().catch(() => ({} as any));
        const info = e.detail || e.raw || "";
        const detail = info ? ` — ${String(info).slice(0, 200)}` : "";
        setStatus(`Vision read failed (${e.error || res.status})${detail}`);
        return "error";
      }
      applyExtract(await res.json(), "vision");
      return "ok";
    } catch (err: any) {
      setStatus(`Network error calling Claude: ${String(err?.message || err)}`);
      return "error";
    }
  }

  async function onUpload(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const dataUrl: string = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (e) => resolve(String(e.target?.result || ""));
      r.readAsDataURL(file);
    });
    setPreview(dataUrl.startsWith("data:image") ? dataUrl : "");
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;

    // 1) Vision first (Gemini/Claude on the server) — most accurate.
    setStatus("Reading floor plan…");
    const v = await visionExtract(base64, file.type || "image/jpeg");
    if (v === "ok") return;

    // 2) Fallback to free in-browser OCR (covers no-key and transient outages).
    if (file.type.startsWith("image") || file.type.includes("pdf")) {
      try {
        const d = await ocrExtractPlan(file);
        if (d && d.kitchenRun) { applyExtract(d, "free OCR"); return; }
      } catch { /* fall through */ }
    }
    // Keep the detailed vision error if there was one; otherwise guide to manual.
    if (v === "not_configured") {
      setStatus("No vision key set and OCR couldn't read it — enter the kitchen run in §2 and counts in §4.");
    }
  }

  function applyDemo(k: string) {
    const d = DEMOS[k];
    if (!d) return;
    setBhk(d.bhk); setRun(d.run);
    setTimeout(() => build({ bhk: d.bhk, run: d.run }), 0);
  }

  async function save() {
    if (!lines.length) return;
    const tpv = computeTotals(lines, { modularPct, onSpot }).tpv;
    try {
      await saveQuote({ designer_id: designerId, client_name: client || "—", mobile, location, bhk, kitchen_run: run, lines, tpv });
      setStatus("Saved ✓");
    } catch { setStatus("Save failed — configure Supabase."); }
  }

  function reviseInBuilder() {
    if (!lines.length) return;
    setPendingQuote({ client, mobile, location, bhk, kitchenRun: run, lines });
    router.push("/builder");
  }

  const meta = { client, mobile, location, bhk, modularPct, onSpot };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr]">
      <aside className="no-print space-y-3 border-r border-brand-line bg-white p-4">
        <Section title="1 · Floor plan">
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-brand-light bg-orange-50/40 p-3 text-center text-xs text-neutral-600">
            {fileName ? "Change floor plan" : "Upload floor plan (image or PDF)"}
            <input type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
          </label>
          {preview ? (
            <img src={preview} alt="plan" className="max-h-40 w-full rounded object-contain" />
          ) : fileName ? (
            <p className="text-[11px] text-neutral-500">📄 {fileName}</p>
          ) : null}
          <label className="text-xs text-neutral-600">…or auto-fill a sample plan</label>
          <select className="input" onChange={(e) => applyDemo(e.target.value)} defaultValue="">
            <option value="">— pick —</option>
            {Object.keys(DEMOS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Section>
        <Section title="2 · Project">
          <input className="input" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={bhk} onChange={(e) => setBhk(e.target.value)}>
              {Object.keys(BHK_ROOMS).map((b) => <option key={b}>{b}</option>)}
            </select>
            <input className="input" type="number" value={run} onChange={(e) => setRun(Number(e.target.value) || 0)} />
          </div>
          <p className="text-[11px] text-neutral-500">Kitchen run (mm) drives base+wall+loft width.</p>
        </Section>
        <Section title="3 · Options">
          {optionals.map((o) => {
            const id = `${o.room}||${o.p}`;
            return (
              <label key={id} className="flex items-center gap-2 text-[12.5px]">
                <input type="checkbox" checked={!!enabled[id]} onChange={(e) => setEnabled({ ...enabled, [id]: e.target.checked })} />
                {o.p} <span className="text-neutral-400">({o.room})</span>
              </label>
            );
          })}
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={king} onChange={(e) => setKing(e.target.checked)} /> Master: King bed
          </label>
        </Section>
        <Section title="4 · Detected from plan — confirm">
          <label className="text-xs text-neutral-600">Bathrooms (→ vanities)</label>
          <input className="input" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value) || 0)} />
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} /> Dry balcony present
          </label>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={hasStudy} onChange={(e) => setHasStudy(e.target.checked)} /> Study / office room
          </label>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={sizeToPlan} onChange={(e) => setSizeToPlan(e.target.checked)} /> Size wardrobes to plan walls
          </label>
          <p className="text-[10.5px] text-neutral-400">Off = standard sizes (1800/1500). On = suggested from each bedroom’s wall; rebuild to apply.</p>
        </Section>
        <button onClick={() => build()} className="btn">Build first quotation ▸</button>
        <button onClick={save} className="btn-sec">Save</button>
        <button onClick={reviseInBuilder} className="btn-sec">Revise in Full Builder →</button>
        {status && <p className="rounded bg-brand-band px-2 py-1 text-center text-[11px] text-neutral-700">{status}</p>}
      </aside>

      <section className="p-5">
        <div className="no-print mb-3 flex gap-2">
          <Tab on={tab === "quote"} onClick={() => setTab("quote")}>Quotation</Tab>
          <Tab on={tab === "plan"} onClick={() => setTab("plan")}>2D plan</Tab>
          <Tab on={tab === "pdf"} onClick={() => setTab("pdf")}>PDF preview</Tab>
          {lines.length > 0 && (
            <button onClick={() => { setTab("pdf"); setTimeout(() => window.print(), 350); }} className="ml-auto rounded bg-brand px-3 py-1 text-sm font-bold text-white">
              ⬇ Save as PDF
            </button>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="text-neutral-500">Upload a plan (or pick a sample), set the project, then Build.</p>
        ) : tab === "quote" ? (
          <>
            <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
              <div><div className="text-2xl font-extrabold text-brand">HAUSPIRE</div><div className="text-xs text-neutral-500">First-draft quotation · {inr(computeTotals(lines, { modularPct, onSpot }).tpv)}</div></div>
              <div className="text-right text-xs"><b>{client || "—"}</b><br />{location} · {bhk}</div>
            </div>
            <QuoteTable lines={lines} onChange={setLines} />
            <Totals lines={lines} modularPct={modularPct} onSpot={onSpot} onModularPct={setModularPct} onOnSpot={setOnSpot} />
          </>
        ) : tab === "plan" ? (
          <Plan2D lines={lines} />
        ) : (
          <PrintDocument meta={meta} lines={lines} />
        )}
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1 border-b border-brand-line pb-1 text-xs font-bold uppercase tracking-wide text-brand-light">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-t-lg border border-b-0 border-brand-line px-4 py-2 text-sm font-semibold ${on ? "bg-white text-brand" : "bg-brand-band text-neutral-600"}`}>{children}</button>;
}
