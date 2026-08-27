"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDesignerId } from "@/lib/useDesignerId";
import { listQuotes } from "@/lib/supabase";
import { setPendingQuote } from "@/lib/quoteStore";
import { inr } from "@/lib/pricing";
import type { Quote } from "@/lib/types";

export default function Dashboard() {
  const designerId = useDesignerId();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  function revise(q: Quote) {
    setPendingQuote({
      client: q.client_name, mobile: q.mobile || "", location: q.location || "Pune",
      bhk: q.bhk || "3 BHK", kitchenRun: q.kitchen_run || 0, lines: q.lines, fromId: q.id,
    });
    router.push("/builder");
  }

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
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-b border-brand-line">
                <td className="px-3 py-2">{q.client_name}</td>
                <td className="px-3 py-2">{q.bhk}</td>
                <td className="px-3 py-2 text-right">{inr(q.tpv)}</td>
                <td className="px-3 py-2">{q.created_at?.slice(0, 10)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => revise(q)} className="rounded border border-brand px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-band">
                    Revise →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
