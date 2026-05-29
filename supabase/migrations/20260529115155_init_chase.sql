-- Chase medicine tracker schema.
-- All access is server-side via the service-role key (which bypasses RLS).
-- RLS is enabled with NO policies, so anon/publishable clients have no access.

create extension if not exists "pgcrypto";

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  times text[] not null,
  start_date date not null default current_date,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.doses (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  dose_date date not null,
  dose_time text not null,
  given_at timestamptz not null default now(),
  given_by text,
  unique (medicine_id, dose_date, dose_time)
);

create index if not exists doses_date_idx on public.doses (dose_date);

-- Lock the tables down: enable RLS, define no policies.
alter table public.medicines enable row level security;
alter table public.doses enable row level security;

-- The server uses the service-role key; make sure that role can operate.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.medicines to service_role;
grant select, insert, update, delete on public.doses to service_role;
