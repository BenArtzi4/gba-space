import "server-only";
import { getSupabase } from "./supabase";
import {
  buildDashboard,
  isAthlete,
  type Dashboard,
  type ResultRow,
  type SessionRow,
} from "./challenge";

const SESSIONS = "power_prompting_sessions";
const RESULTS = "power_prompting_results";

interface DbResult {
  id: string;
  athlete: string;
  seconds: number | string;
  completed: boolean;
}

interface DbSession {
  id: string;
  started_at: string;
  song_seconds: number | string | null;
  power_prompting_results: DbResult[] | null;
}

function toSession(row: DbSession): SessionRow {
  const results: ResultRow[] = (row.power_prompting_results ?? [])
    .filter((r) => isAthlete(r.athlete))
    .map((r) => ({
      id: r.id,
      sessionId: row.id,
      athlete: r.athlete as ResultRow["athlete"],
      seconds: Number(r.seconds),
      completed: !!r.completed,
    }))
    // stable order: Gal first, then Ofir
    .sort((a, b) => a.athlete.localeCompare(b.athlete));
  return {
    id: row.id,
    startedAt: row.started_at,
    songSeconds: row.song_seconds === null ? null : Number(row.song_seconds),
    results,
  };
}

/** Newest-first sessions with their embedded results. */
export async function listSessions(limit = 500): Promise<SessionRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from(SESSIONS)
    .select(
      `id, started_at, song_seconds, ${RESULTS} ( id, athlete, seconds, completed )`,
    )
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as DbSession[]).map(toSession);
}

export async function getDashboard(): Promise<Dashboard> {
  return buildDashboard(await listSessions());
}
