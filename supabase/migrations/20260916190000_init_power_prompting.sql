-- Power Prompting schema — Gal & Ofir's "Bring Sally Up" push-up challenge log.
-- A session is one play of the song; each athlete gets one result per session:
-- how many seconds of the track they survived, and whether they finished it.
-- All access is server-side via the service-role key (which bypasses RLS).
-- RLS is enabled with NO policies, so anon/publishable clients have no access.
-- Tables are prefixed `power_prompting_` to stay isolated in the shared GBA db.

create extension if not exists "pgcrypto";

create table if not exists public.power_prompting_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  song_seconds numeric(7, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.power_prompting_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.power_prompting_sessions(id) on delete cascade,
  athlete text not null,
  seconds numeric(7, 2) not null check (seconds >= 0),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, athlete)
);

create index if not exists power_prompting_results_session_idx
  on public.power_prompting_results (session_id);
create index if not exists power_prompting_results_athlete_idx
  on public.power_prompting_results (athlete, seconds desc);

-- Lock the tables down: enable RLS, define no policies.
alter table public.power_prompting_sessions enable row level security;
alter table public.power_prompting_results enable row level security;

-- The server uses the service-role key; make sure that role can operate.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.power_prompting_sessions to service_role;
grant select, insert, update, delete on public.power_prompting_results to service_role;
