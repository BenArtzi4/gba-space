"use server";

import { cookies } from "next/headers";
import { getSupabase } from "./_lib/supabase";
import { COOKIE, signIdentity, verifyIdentity } from "./_lib/auth";
import {
  isUser,
  rankIdeas,
  REACTIONS,
  type Idea,
  type RankedIdea,
  type Reaction,
  type Score,
  type User,
} from "./_lib/arena";

async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return verifyIdentity(jar.get(COOKIE)?.value);
}

async function requireUser(): Promise<User> {
  const me = await currentUser();
  if (!me) throw new Error("Not signed in");
  return me;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Verify name + shared password and, on success, set a signed httpOnly cookie. */
export async function login(
  username: string,
  password: string,
): Promise<{ ok: boolean }> {
  const expected = process.env.APP_ARENA_PASSWORD;
  if (!expected || password !== expected || !isUser(username)) {
    return { ok: false };
  }
  const jar = await cookies();
  jar.set(COOKIE, signIdentity(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/app-arena",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: COOKIE, path: "/app-arena" });
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export interface Board {
  me: User;
  ideas: RankedIdea[];
}

/** Everything the board needs, ranked for the current viewer. */
export async function getBoard(): Promise<Board> {
  const me = await requireUser();
  const db = getSupabase();
  const [ideasRes, scoresRes, reactionsRes] = await Promise.all([
    db.from("arena_ideas").select("*"),
    db.from("arena_scores").select("*"),
    db.from("arena_reactions").select("*"),
  ]);
  for (const res of [ideasRes, scoresRes, reactionsRes]) {
    if (res.error) throw new Error(res.error.message);
  }
  const ideas = rankIdeas(
    (ideasRes.data ?? []) as Idea[],
    (scoresRes.data ?? []) as Score[],
    (reactionsRes.data ?? []) as Reaction[],
    me,
  );
  return { me, ideas };
}

// ── Ideas ─────────────────────────────────────────────────────────────────────

export async function addIdea(input: {
  title: string;
  description: string;
}): Promise<void> {
  const me = await requireUser();
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  if (title.length > 120) throw new Error("Title is too long (max 120)");
  const description = input.description.trim();
  if (description.length > 1000) throw new Error("Description is too long");

  const db = getSupabase();
  const { error } = await db.from("arena_ideas").insert({
    title,
    description: description || null,
    suggested_by: me,
  });
  if (error) throw new Error(error.message);
}

export async function editIdea(
  id: string,
  input: { title: string; description: string },
): Promise<void> {
  const me = await requireUser();
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  const db = getSupabase();
  // The `.eq("suggested_by", me)` clause means you can only edit your own idea.
  const { error } = await db
    .from("arena_ideas")
    .update({ title, description: input.description.trim() || null })
    .eq("id", id)
    .eq("suggested_by", me);
  if (error) throw new Error(error.message);
}

export async function deleteIdea(id: string): Promise<void> {
  const me = await requireUser();
  const db = getSupabase();
  const { error } = await db
    .from("arena_ideas")
    .delete()
    .eq("id", id)
    .eq("suggested_by", me);
  if (error) throw new Error(error.message);
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export async function scoreIdea(ideaId: string, score: number): Promise<void> {
  const me = await requireUser();
  const value = Math.round(score);
  if (!Number.isFinite(value) || value < 1 || value > 100) {
    throw new Error("Score must be between 1 and 100");
  }
  const db = getSupabase();

  // You can't score your own idea.
  const { data: idea, error: iErr } = await db
    .from("arena_ideas")
    .select("suggested_by")
    .eq("id", ideaId)
    .single();
  if (iErr) throw new Error(iErr.message);
  if (idea?.suggested_by === me) throw new Error("You can't score your own idea");

  const { error } = await db.from("arena_scores").upsert(
    {
      idea_id: ideaId,
      voter: me,
      score: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "idea_id,voter" },
  );
  if (error) throw new Error(error.message);
}

// ── Reactions (emoji-only "comments") ─────────────────────────────────────────

/** Add the reaction if absent, remove it if present (toggle). */
export async function toggleReaction(
  ideaId: string,
  emoji: string,
): Promise<void> {
  const me = await requireUser();
  if (!(REACTIONS as readonly string[]).includes(emoji)) {
    throw new Error("Invalid reaction");
  }
  const db = getSupabase();
  const { data: existing, error: selErr } = await db
    .from("arena_reactions")
    .select("id")
    .eq("idea_id", ideaId)
    .eq("reactor", me)
    .eq("emoji", emoji)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  if (existing) {
    const { error } = await db
      .from("arena_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db
      .from("arena_reactions")
      .insert({ idea_id: ideaId, reactor: me, emoji });
    if (error) throw new Error(error.message);
  }
}
