"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDesignerId } from "@/lib/useDesignerId";
import { listQuotes } from "@/lib/supabase";
import { inr } from "@/lib/pricing";
import type { Quote } from "@/lib/types";

export default function Dashboard() {
  const designerId = useDesignerId();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listQuotes(designerId)
      .then(setQuotes)
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  }, [designerId]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-brand">Welcome</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Auto-build a first quotation from a floor plan, or open the full builder.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/first-quote" className="rounded-xl border border-brand-line bg-white p-5 hover:shadow">
          <div className="text-lg font-bold text-brand">⚡ First Quote</div>
          <p className="mt-1 text-sm text-neutral-600">
            Pick a plan / config, confirm the kitchen run, and get a full draft on ProductMaster rates.
          </p>
        </Link>
        <Link href="/builder" className="rounded-xl border border-brand-line bg-white p-5 hover:shadow">
          <div className="text-lg font-bold text-brand">🧱 Full Builder</div>
          <p className="mt-1 text-sm text-neutral-600">
            Add rooms and products by hand, edit dimensions, and fine-tune every line.
          </p>
        </Link>
      </div>

      <h2 className="mb-2 mt-8 text-xs font-bold uppercase tracking-wide text-brand-light">
        Your recent quotations
      </h2>
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : quotes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          None yet — or Supabase isn’t configured. Build one to get started.
        </p>
      ) : (
        <table className="w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="bg-brand-light text-left text-white">
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Config</th>
              <th className="px-3 py-2 text-right">TPV</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-brand-line">
                <td className="px-3 py-2">{q.client_name}</td>
                <td className="px-3 py-2">{q.bhk}</td>
                <td className="px-3 py-2 text-right">{inr(q.tpv)}</td>
                <td className="px-3 py-2">{q.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
