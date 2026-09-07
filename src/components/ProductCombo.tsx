"use client";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";

/** Excel-style searchable product picker: type to filter, arrow keys + Enter,
 *  or click. Matches product name, details and rooms. */
export default function ProductCombo({
  products, value, onChange, placeholder = "Search product…",
}: { products: Product[]; value: string; onChange: (name: string) => void; placeholder?: string }) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const ql = q.trim().toLowerCase();
  const matches = (ql
    ? products.filter((p) =>
        p.product.toLowerCase().includes(ql) ||
        (p.details || "").toLowerCase().includes(ql) ||
        (p.rooms || "").toLowerCase().includes(ql))
    : products
  ).slice(0, 60);

  function pick(p: Product) { onChange(p.product); setQ(p.product); setOpen(false); }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input w-full" value={q} placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => { setOpen(true); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter") { if (open && matches[hi]) { e.preventDefault(); pick(matches[hi]); } }
          else if (e.key === "Escape") { setOpen(false); }
        }}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-brand-line bg-white text-[12px] shadow-lg">
          {matches.map((p, i) => (
            <button
              key={p.product} type="button"
              onMouseEnter={() => setHi(i)} onClick={() => pick(p)}
              className={`block w-full border-b border-neutral-100 px-2 py-1.5 text-left ${i === hi ? "bg-brand-band" : ""} ${p.product === value ? "font-semibold text-brand" : ""}`}
            >
              <div>{p.product}</div>
              <div className="text-[10px] text-neutral-400">
                {p.wc} · {p.type} {p.type === "Unit" ? `· ₹${p.unit}` : `· ₹${p.rate}/sqft`}{p.rooms ? ` · ${p.rooms}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && matches.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded border border-brand-line bg-white px-2 py-2 text-[11px] text-neutral-500 shadow-lg">
          No match. Use “Propose a NEW product” to add it.
        </div>
      )}
    </div>
  );
}
