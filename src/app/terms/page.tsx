"use client";
import { useEffect, useState } from "react";
import { loadTerms, saveTerms, defaultTerms } from "@/lib/termsStore";
import TermsView from "@/components/TermsView";

export default function TermsPage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("Loading…");

  useEffect(() => {
    loadTerms().then((t) => { setText(t); setStatus("Loaded"); }).catch(() => setStatus("Loaded defaults"));
  }, []);

  async function save() {
    setStatus("Saving…");
    const where = await saveTerms(text);
    setStatus(where === "supabase"
      ? "Saved ✓ — shared across all devices."
      : "Saved ✓ — in this browser. (Run the app_settings SQL to sync across devices.)");
  }
  function reset() { setText(defaultTerms()); setStatus("Reset to default (not saved yet)."); }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand">Terms &amp; Conditions</h1>
        <button onClick={save} className="rounded bg-brand px-3 py-1.5 text-sm font-bold text-white">Save</button>
        <button onClick={reset} className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600">Reset to default</button>
        <span className="text-xs text-neutral-500">{status}</span>
      </div>
      <p className="mb-3 text-[11px] text-neutral-500">
        This text appears as the Terms page at the end of every quotation PDF. A line ending with “:” becomes a
        <b> section heading</b>; a line starting with “-” becomes a <b>bullet</b>; any other line is sub-text under the bullet above it.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-light">Edit</div>
          <textarea
            className="h-[70vh] w-full rounded border border-brand-line bg-[#fffef8] p-3 font-mono text-[12px] leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-light">Preview</div>
          <div className="h-[70vh] overflow-auto rounded border border-brand-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between border-b-2 border-brand pb-2">
              <div className="text-2xl font-extrabold text-brand">HAUSPIRE</div>
              <div className="text-[11px] uppercase tracking-wide text-brand-light">Terms &amp; Conditions</div>
            </div>
            <TermsView text={text} />
          </div>
        </div>
      </div>
    </div>
  );
}
