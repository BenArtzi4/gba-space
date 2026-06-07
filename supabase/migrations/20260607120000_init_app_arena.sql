-- App Arena schema — three friends pitch app ideas and score each other 1–100.
-- All access is server-side via the service-role key (which bypasses RLS).
-- RLS is enabled with NO policies, so anon/publishable clients have no access.
-- Tables are prefixed `arena_` to stay isolated inside the shared GBA database.

create extension if not exists "pgcrypto";

create table if not exists public.arena_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  suggested_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.arena_scores (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.arena_ideas(id) on delete cascade,
  voter text not null,
  score int not null check (score between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idea_id, voter)
);

create table if not exists public.arena_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.arena_ideas(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.arena_reactions (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.arena_ideas(id) on delete cascade,
  reactor text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (idea_id, reactor, emoji)
);

create index if not exists arena_scores_idea_idx on public.arena_scores (idea_id);
create index if not exists arena_comments_idea_idx on public.arena_comments (idea_id);
create index if not exists arena_reactions_idea_idx on public.arena_reactions (idea_id);

-- Lock the tables down: enable RLS, define no policies.
alter table public.arena_ideas enable row level security;
alter table public.arena_scores enable row level security;
alter table public.arena_comments enable row level security;
alter table public.arena_reactions enable row level security;

-- The server uses the service-role key; make sure that role can operate.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.arena_ideas to service_role;
grant select, insert, update, delete on public.arena_scores to service_role;
grant select, insert, update, delete on public.arena_comments to service_role;
grant select, insert, update, delete on public.arena_reactions to service_role;
