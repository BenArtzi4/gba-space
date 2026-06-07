-- App Arena: "comments" are now emoji-only (handled by arena_reactions), so the
-- free-text comment table is no longer used. Drop it to keep the schema honest.

drop table if exists public.arena_comments cascade;
