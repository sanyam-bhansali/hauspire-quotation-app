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
