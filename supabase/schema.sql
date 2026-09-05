-- Hauspire quotation app — Supabase schema.
-- Run this in the Supabase SQL editor once.

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  designer_id text not null,          -- Clerk user id
  client_name text not null,
  mobile text,
  location text,
  bhk text,
  kitchen_run int,
  lines jsonb not null,               -- array of quote lines
  tpv int not null,
  created_at timestamptz default now()
);

create index if not exists quotes_designer_idx on quotes (designer_id, created_at desc);

-- Row Level Security: each designer sees only their own quotes.
-- (Uses the Clerk user id passed from the app; enable + adapt to your setup.)
alter table quotes enable row level security;

-- NOTE: with the anon key + Clerk, gate writes/reads in the app layer,
-- or wire Clerk JWT into Supabase and replace the policy below with
-- `auth.jwt() ->> 'sub' = designer_id`.
create policy "app manages access" on quotes for all using (true) with check (true);

-- ---- Product Master (editable rates / materials) ----
create table if not exists product_master (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  wc text,               -- MO-01 / NM-01
  type text,             -- Area / Unit
  rate int,              -- ₹/sqft for Area
  unit int,              -- flat ₹ for Unit
  details text,
  rooms text,            -- comma-separated category tags
  sort int default 0
);

alter table product_master enable row level security;
drop policy if exists "product master access" on product_master;
create policy "product master access"
  on product_master for all
  to anon, authenticated
  using (true) with check (true);

-- First-quote settings (fq flag + default size/qty/rules) live in one jsonb column.
-- Run this if you created product_master before this column existed:
alter table product_master add column if not exists fq_config jsonb;

-- ---- New-product proposals (raised while quoting, approved into the master) ----
create table if not exists product_proposals (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  wc text,
  type text,
  rate int,
  unit int,
  details text,
  rooms text,
  proposed_by text,
  created_at timestamptz default now()
);
alter table product_proposals enable row level security;
drop policy if exists "product proposals access" on product_proposals;
create policy "product proposals access" on product_proposals for all
  to anon, authenticated using (true) with check (true);

-- Also update the type comment: type is now Area / SqFt / RFT / Unit.

-- ---- App settings (editable Terms & Conditions, etc.) ----
-- Optional: run this so the Terms page syncs across devices. Without it,
-- Terms still save in each browser via localStorage.
create table if not exists app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;
drop policy if exists "app settings access" on app_settings;
create policy "app settings access"
  on app_settings for all
  to anon, authenticated
  using (true) with check (true);
