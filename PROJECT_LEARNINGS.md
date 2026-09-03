# Learnings from the Hauspire Quotation App — for building a Project Tracker next

Grounded in what actually helped or bit us while building the quotation studio.

## 1. Model the domain data first; one source of truth
- The app only worked once the **ProductMaster** was the single authoritative list — editable in-app, persisted in Supabase, consumed by every view.
- Tracker: define **Project → Task** (status, owner, dates, priority, dependencies) as one schema. Ship a `seed.json`, then move to a `tasks` table with a "reset to defaults".

## 2. Users want to edit everything after generation
- Biggest UX wins: inline-editable quote lines; editing a dimension auto-repriced.
- Tracker: inline-edit status/owner/dates, add/remove rows, live rollups (%, counts, due-soon). Treat the auto-generated state as a draft.

## 3. AI/vision integration — sharp, recurring edges (reuse these rules)
- **Model names get retired.** Auto-resolve the model from the provider's list API; never hardcode.
- **Parse defensively.** Read ALL content blocks (models emit reasoning blocks first); extract JSON with a brace-balanced scanner, not a greedy regex.
- **Retry on 503**, then fall back to a second provider, then to a non-AI path.
- **Surface the raw provider error to the UI** — turns hours of guessing into one-line fixes.
- **Human-in-the-loop:** AI proposes, user confirms; never auto-finalize a misread.

## 4. Graceful degradation beats hard dependencies
- App runs with no auth key, no DB, no vision key — each missing piece degrades to manual, not a crash. Let us deploy/demo before configuration.
- Tracker: open and work locally before Supabase/Clerk are wired; features light up as keys are added.

## 5. Secrets, deploys, infra truths
- Never put keys in code (GitHub scanners find them fast). Env vars only; `.env.local` gitignored.
- Env changes require a **redeploy** on Vercel.
- Supabase needs **RLS + a policy** or reads/writes silently fail; new `sb_publishable_` keys require it.
- Run `next build` after every change to catch issues before production.
- Stack transfers wholesale: **Next.js (App Router) + Tailwind on Vercel, Supabase, Clerk.** Copy the auth-optional / DB-optional wiring.

## 6. Calibrate and validate against real artifacts
- The engine became trustworthy only after reverse-engineering rates from 940 real quotes and validating totals to the rupee against 4 real PDFs. Real examples caught edge cases theory missed.
- Tracker: test against your real projects and task lists, not abstractions.

## 7. Scope honestly; name the hard limit
- Most useful moments were admitting what a plan can't convey (design intent) and what free OCR can't do (messy photos), then designing around it with a confirm step + sensible defaults.
- Tracker: be explicit about what auto-status/estimates can infer; add a human checkpoint.

## 8. Print/PDF is fiddly — budget for it
- Branded PDF needed `@page` sizing, one image per page, and removing `break-inside-avoid` gaps.
- Reuse this print CSS if the tracker exports reports.

## Suggested first steps for the tracker
1. Scaffold Next.js + Tailwind; copy `authEnv`/optional-Clerk and optional-Supabase patterns.
2. Define `projects` and `tasks` schema + `seed.json`; build one editable table view first.
3. Add board (kanban) and list views over the same data.
4. Add Supabase persistence + RLS; then Clerk auth.
5. Only then add AI (digests, auto-summaries) using the parsing/fallback rules above.
6. Add export/print last, reusing the page-sizing CSS.
