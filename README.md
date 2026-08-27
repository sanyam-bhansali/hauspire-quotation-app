# Hauspire Quotation Studio

One web app that combines the **First-Quote auto-builder** and a **Full manual builder**, prices everything off the enriched **ProductMaster**, and is ready to host on **Vercel**. Auth via **Clerk**, storage via **Supabase**, plus a schematic **2D plan** view. 3D and floor-plan auto-extraction are the next features to layer on.

## What's inside

```
src/
  data/productMaster.json   ← 53 products, prices (single source of truth)
  data/template.json        ← per-room default template (calibrated to real quotes)
  lib/pricing.ts            ← sizing, 7% fee, 15% modular discount, payment stages
  lib/buildQuote.ts         ← template + kitchen run → quote lines
  lib/supabase.ts           ← save / load quotes
  app/                      ← dashboard, /first-quote, /builder, /sign-in
  components/               ← QuoteTable, Totals, Plan2D
supabase/schema.sql         ← run once in Supabase
```

The pricing rule (verified against your real quotes): **TPV = (MO + NM) + 7% fee − 15% discount on modular.** Kitchen items size from the kitchen run × standard heights; everything else uses standard sizes; every price comes from `productMaster.json`.

## Run locally

```bash
npm install
cp .env.example .env.local     # fill in the keys below
npm run dev                    # http://localhost:3000
```

## Configure the two services

**Clerk (login)** — create an app at https://dashboard.clerk.com, copy the publishable + secret keys into `.env.local`. Add `/sign-in` as the sign-in path.

**Supabase (database)** — create a project at https://supabase.com, open the SQL editor and run `supabase/schema.sql`, then copy the project URL + anon key into `.env.local`. (Until Supabase is set, the app still runs — save/load simply no-op.)

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, **New Project → import the repo** (framework auto-detected as Next.js).
3. Add the same env vars from `.env.example` under **Settings → Environment Variables**.
4. Deploy. Every push redeploys.

## Roadmap

- **Floor-plan extraction** — upload a plan, a vision model reads the room list + kitchen run and pre-fills First Quote (designer confirms). OCR fallback for clean PDFs (`plan_extract.py` in the parent folder).
- **3D** — extend `Plan2D` into a three.js room-massing view.
- **Export to the Excel tool** — write the confirmed draft into the existing Hauspire workbook for branding/revisions.
- **Revisions & Final comparison** — versioned quotes and a Revised-vs-Final view.
