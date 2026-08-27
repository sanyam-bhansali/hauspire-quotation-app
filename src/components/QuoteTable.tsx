"use client";
import type { QuoteLine } from "@/lib/types";
import { inr } from "@/lib/pricing";

/** Editable, room-grouped quotation table. */
export default function QuoteTable({
  lines,
  onChange,
}: {
  lines: QuoteLine[];
  onChange: (lines: QuoteLine[]) => void;
}) {
  const rooms = Array.from(new Set(lines.map((l) => l.room)));

  function setAmount(idx: number, value: number) {
    const next = lines.slice();
    next[idx] = { ...next[idx], amount: value };
    onChange(next);
  }
  function remove(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }

  return (
    <table className="w-full border-collapse bg-white text-[12px]">
      <tbody>
        {rooms.map((room) => {
          const idxs = lines.map((l, i) => ({ l, i })).filter((x) => x.l.room === room);
          const sub = idxs.reduce((s, x) => s + x.l.amount, 0);
          return (
            <RoomGroup
              key={room}
              room={room}
              idxs={idxs}
              sub={sub}
              setAmount={setAmount}
              remove={remove}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function RoomGroup({
  room,
  idxs,
  sub,
  setAmount,
  remove,
}: {
  room: string;
  idxs: { l: QuoteLine; i: number }[];
  sub: number;
  setAmount: (i: number, v: number) => void;
  remove: (i: number) => void;
}) {
  return (
    <>
      <tr className="bg-brand font-bold text-white">
        <td colSpan={7} className="border border-brand-line px-2 py-1">{room}</td>
      </tr>
      <tr className="bg-brand-light text-white">
        <th className="border border-brand-line px-2 py-1 text-left">#</th>
        <th className="border border-brand-line px-2 py-1 text-left">Product</th>
        <th className="border border-brand-line px-2 py-1 text-left">Code</th>
        <th className="border border-brand-line px-2 py-1 text-left">Details</th>
        <th className="border border-brand-line px-2 py-1 text-right">W</th>
        <th className="border border-brand-line px-2 py-1 text-right">H</th>
        <th className="border border-brand-line px-2 py-1 text-right">Amount</th>
      </tr>
      {idxs.map((x, n) => (
        <tr key={x.i} className="group align-top">
          <td className="border border-brand-line px-2 py-1">{n + 1}</td>
          <td className="border border-brand-line px-2 py-1 font-semibold">
            {x.l.product}
            <button
              onClick={() => remove(x.i)}
              className="no-print ml-2 hidden text-red-500 group-hover:inline"
              title="Remove line"
            >
              ✕
            </button>
          </td>
          <td className="border border-brand-line px-2 py-1">{x.l.wc}</td>
          <td className="whitespace-pre-line border border-brand-line px-2 py-1 text-[11px] text-neutral-700">
            {x.l.details}
          </td>
          <td className="border border-brand-line px-2 py-1 text-right">{x.l.width ?? ""}</td>
          <td className="border border-brand-line px-2 py-1 text-right">{x.l.height ?? ""}</td>
          <td className="border border-brand-line px-2 py-1 text-right">
            <input
              type="number"
              value={x.l.amount}
              onChange={(e) => setAmount(x.i, Number(e.target.value) || 0)}
              className="w-24 rounded border border-brand-line bg-yellow-50 px-1 py-0.5 text-right"
            />
          </td>
        </tr>
      ))}
      <tr className="bg-brand-band font-bold">
        <td colSpan={6} className="border border-brand-line px-2 py-1">{room} — Sub-total</td>
        <td className="border border-brand-line px-2 py-1 text-right">{inr(sub)}</td>
      </tr>
    </>
  );
}
