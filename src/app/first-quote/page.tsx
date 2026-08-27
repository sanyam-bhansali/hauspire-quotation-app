"use client";
import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import template from "@/data/template.json";
import type { Template, QuoteLine } from "@/lib/types";
import { buildFirstQuote } from "@/lib/buildQuote";
import { BHK_ROOMS, feetInchesToMm, estimateKitchenRun } from "@/lib/pricing";
import { saveQuote } from "@/lib/supabase";
import QuoteTable from "@/components/QuoteTable";
import Totals from "@/components/Totals";
import Plan2D from "@/components/Plan2D";

const TPL = template as unknown as Template;

// Vision-extracted sample plans (Phase-2 demo). run = (W + H − 900).
const DEMOS: Record<string, { bhk: string; run: number }> = {
  "3BHK plan (Kitchen 10'×10'2\")": { bhk: "3 BHK", run: feetInchesToMm(10, 0) + feetInchesToMm(10, 2) - 900 },
  "2BHK Floor Plan C (7'10\"²)": { bhk: "2 BHK", run: estimateKitchenRun(feetInchesToMm(7, 10), feetInchesToMm(7, 10)) },
  "3BHK 902 plan (10'×11')": { bhk: "3 BHK", run: feetInchesToMm(10, 0) + feetInchesToMm(11, 0) - 900 },
  "2BHK handwritten (7'10\"×9')": { bhk: "2 BHK", run: feetInchesToMm(7, 10) + feetInchesToMm(9, 0) - 900 },
};

export default function FirstQuotePage() {
  const { user } = useUser();
  const [client, setClient] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("Pune");
  const [bhk, setBhk] = useState("3 BHK");
  const [run, setRun] = useState(3960);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [king, setKing] = useState(false);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [tab, setTab] = useState<"quote" | "plan">("quote");
  const [saved, setSaved] = useState<string>("");

  const rooms = BHK_ROOMS[bhk] ?? [];
  const optionals = useMemo(
    () =>
      rooms.flatMap((r) =>
        (r === "Parents Bedroom" ? TPL["Guest Bedroom"] : TPL[r] ?? [])
          .filter((it) => !it.def)
          .map((it) => ({ room: r, p: it.p }))
      ),
    [bhk] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function build() {
    setLines(buildFirstQuote({ bhk, kitchenRun: run, enabledOptional: enabled, kingMaster: king }));
    setSaved("");
  }
  function applyDemo(k: string) {
    const d = DEMOS[k];
    if (!d) return;
    setBhk(d.bhk);
    setRun(d.run);
    setTimeout(build, 0);
  }
  async function save() {
    if (!lines.length) return;
    const tpv = lines.reduce((s, l) => (l.wc === "MO-01" ? s + l.amount : s + l.amount), 0);
    try {
      await saveQuote({
        designer_id: user?.id ?? "anon",
        client_name: client || "—",
        mobile,
        location,
        bhk,
        kitchen_run: run,
        lines,
        tpv,
      });
      setSaved("Saved ✓");
    } catch {
      setSaved("Save failed (configure Supabase).");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[330px_1fr]">
      <aside className="no-print space-y-3 border-r border-brand-line bg-white p-4">
        <Section title="1 · Read from plan">
          <label className="text-xs text-neutral-600">Auto-fill from a plan (Phase 2 demo)</label>
          <select className="input" onChange={(e) => applyDemo(e.target.value)} defaultValue="">
            <option value="">— pick —</option>
            {Object.keys(DEMOS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
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
        <button onClick={build} className="btn">Build first quotation ▸</button>
        <button onClick={save} className="btn-sec">Save quotation</button>
        <button onClick={() => window.print()} className="btn-sec">Print / PDF</button>
        {saved && <p className="text-center text-xs text-green-700">{saved}</p>}
      </aside>

      <section className="p-5">
        <div className="no-print mb-3 flex gap-2">
          <Tab on={tab === "quote"} onClick={() => setTab("quote")}>Quotation</Tab>
          <Tab on={tab === "plan"} onClick={() => setTab("plan")}>2D plan</Tab>
        </div>
        {lines.length === 0 ? (
          <p className="text-neutral-500">Pick a plan or set the project, then Build.</p>
        ) : tab === "quote" ? (
          <>
            <div className="mb-3 flex items-end justify-between border-b-2 border-brand pb-2">
              <div><div className="text-2xl font-extrabold text-brand">HAUSPIRE</div><div className="text-xs text-neutral-500">First-draft quotation</div></div>
              <div className="text-right text-xs"><b>{client || "—"}</b><br />{location} · {bhk}</div>
            </div>
            <QuoteTable lines={lines} onChange={setLines} />
            <Totals lines={lines} />
          </>
        ) : (
          <Plan2D lines={lines} />
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
  return (
    <button onClick={onClick} className={`rounded-t-lg border border-b-0 border-brand-line px-4 py-2 text-sm font-semibold ${on ? "bg-white text-brand" : "bg-brand-band text-neutral-600"}`}>
      {children}
    </button>
  );
}
