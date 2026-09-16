"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "./_lib/supabase";
import { listSessions } from "./_lib/data";
import {
  ATHLETES,
  computeStats,
  isAthlete,
  MAX_SECONDS,
  ROUTES,
  type Athlete,
} from "./_lib/challenge";

const SESSIONS = "power_prompting_sessions";
const RESULTS = "power_prompting_results";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidate() {
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.history);
}

function cleanSeconds(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_SECONDS) {
    throw new Error("Time must be between 0 and 60 minutes");
  }
  return Math.round(n * 100) / 100;
}

function requireUuid(id: unknown): string {
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Bad id");
  return id;
}

export interface NewResult {
  athlete: Athlete;
  seconds: number;
  completed: boolean;
}

export interface SaveSessionInput {
  startedAt: string; // ISO timestamp of when the song started
  songSeconds: number | null;
  results: NewResult[];
}

export interface SaveSessionOutput {
  id: string;
  /** Each athlete's best time BEFORE this session (null = first ever). */
  previousBests: Record<Athlete, number | null>;
}

/** Persist one finished session (both athletes' times) and return the id. */
export async function saveSession(
  input: SaveSessionInput,
): Promise<SaveSessionOutput> {
  const startedAt = new Date(input.startedAt);
  if (Number.isNaN(startedAt.getTime())) throw new Error("Bad start time");
  const songSeconds =
    input.songSeconds === null || input.songSeconds === undefined
      ? null
      : cleanSeconds(input.songSeconds);

  const seen = new Set<string>();
  const results = (input.results ?? []).map((r) => {
    if (!isAthlete(r.athlete)) throw new Error("Unknown athlete");
    if (seen.has(r.athlete)) throw new Error("Duplicate athlete");
    seen.add(r.athlete);
    return {
      athlete: r.athlete,
      seconds: cleanSeconds(r.seconds),
      completed: !!r.completed,
    };
  });
  if (results.length === 0) throw new Error("No results to save");

  // Bests before this session, so the client can show "new best" deltas.
  const stats = computeStats(await listSessions());
  const previousBests = Object.fromEntries(
    ATHLETES.map((a) => [
      a,
      stats.find((s) => s.athlete === a)?.best?.seconds ?? null,
    ]),
  ) as Record<Athlete, number | null>;

  const db = getSupabase();
  const { data: session, error: sErr } = await db
    .from(SESSIONS)
    .insert({ started_at: startedAt.toISOString(), song_seconds: songSeconds })
    .select("id")
    .single();
  if (sErr || !session) throw new Error(sErr?.message ?? "Could not save");

  const { error: rErr } = await db.from(RESULTS).insert(
    results.map((r) => ({
      session_id: session.id,
      athlete: r.athlete,
      seconds: r.seconds,
      completed: r.completed,
    })),
  );
  if (rErr) {
    // Don't leave an empty session behind.
    await db.from(SESSIONS).delete().eq("id", session.id);
    throw new Error(rErr.message);
  }

  revalidate();
  return { id: session.id as string, previousBests };
}

/** Edit one athlete's recorded time / finished flag. */
export async function updateResult(
  id: string,
  patch: { seconds: number; completed: boolean },
): Promise<void> {
  const resultId = requireUuid(id);
  const seconds = cleanSeconds(patch.seconds);
  const db = getSupabase();
  const { error } = await db
    .from(RESULTS)
    .update({ seconds, completed: !!patch.completed })
    .eq("id", resultId);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Move a session to a different date/time. */
export async function updateSessionDate(
  id: string,
  startedAtISO: string,
): Promise<void> {
  const sessionId = requireUuid(id);
  const when = new Date(startedAtISO);
  if (Number.isNaN(when.getTime())) throw new Error("Bad date");
  const db = getSupabase();
  const { error } = await db
    .from(SESSIONS)
    .update({ started_at: when.toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Delete a whole session (both athletes' results go with it). */
export async function deleteSession(id: string): Promise<void> {
  const sessionId = requireUuid(id);
  const db = getSupabase();
  const { error } = await db.from(SESSIONS).delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidate();
}
