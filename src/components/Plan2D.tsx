"use client";
import type { QuoteLine } from "@/lib/types";
import { inr } from "@/lib/pricing";

// Schematic 2D plan: each room is a box laid out on a grid, with a labelled
// block per product (furniture). Real plan geometry arrives once an uploaded
// floor plan is parsed (Phase 2); this gives a spatial read of the quote now.
const COLORS: Record<string, string> = {
  Kitchen: "#e7c9a9",
  "Master Bedroom": "#cfe0ef",
  "Kids Bedroom": "#d6ead6",
  "Guest Bedroom": "#efe0cf",
  "Parents Bedroom": "#e9d6ef",
  "Living, Dining & Foyer": "#f0e6c8",
  "Other Services": "#e2e2e2",
};

export default function Plan2D({ lines }: { lines: QuoteLine[] }) {
  const rooms = Array.from(new Set(lines.map((l) => l.room))).filter(
    (r) => r !== "Other Services"
  );
  const cols = 3;
  const RW = 210;
  const RH = 150;
  const gap = 16;
  const rowsN = Math.ceil(rooms.length / cols);
  const W = cols * RW + (cols + 1) * gap;
  const H = rowsN * RH + (rowsN + 1) * gap;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-brand-line bg-white">
      {rooms.map((room, i) => {
        const cx = gap + (i % cols) * (RW + gap);
        const cy = gap + Math.floor(i / cols) * (RH + gap);
        const items = lines.filter((l) => l.room === room);
        const total = items.reduce((s, l) => s + l.amount, 0);
        return (
          <g key={room} transform={`translate(${cx},${cy})`}>
            <rect width={RW} height={RH} rx={6} fill={COLORS[room] ?? "#eee"} stroke="#8B5E3C" />
            <text x={8} y={16} fontSize={11} fontWeight={700} fill="#4a3826">{room}</text>
            <text x={RW - 8} y={16} fontSize={10} textAnchor="end" fill="#6b5a48">{inr(total)}</text>
            {items.slice(0, 6).map((it, j) => {
              const bx = 8 + (j % 3) * 66;
              const by = 26 + Math.floor(j / 3) * 52;
              return (
                <g key={j} transform={`translate(${bx},${by})`}>
                  <rect width={60} height={44} rx={3} fill="#ffffffcc" stroke="#8B5E3C" strokeWidth={0.6} />
                  <text x={4} y={14} fontSize={7.5} fill="#3a2c1e">
                    {it.product.length > 26 ? it.product.slice(0, 25) + "…" : it.product}
                  </text>
                  <text x={4} y={38} fontSize={7} fill="#6b5a48">{inr(it.amount)}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
