# First-Quotation Builder — LOCKED (2026-09-07)

The first-quote builder and its Product-Master-driven configuration are frozen as of
this date. Do not change the following without re-opening this lock:

- `src/lib/buildQuote.ts` — first-quote build logic (rooms, kitchen-run sizing,
  per-bath vanities, room-wise false ceiling, King swap, BHK variant selection).
- `src/lib/firstQuoteDefaults.ts` — the standard first-quote product selection rules.
- `src/data/productMaster.json` — catalog + first-quote `fq` selections and defaults
  (analysis-derived from real Hauspire quotes).
- `src/app/first-quote/page.tsx` — the First Quote page.

Everything above is the saved source of truth. To make it live in Supabase:
run the `fq_config` column migration, then Products → Reset to defaults → Save.

Active development continues on the **Full Builder** (`/builder`).
