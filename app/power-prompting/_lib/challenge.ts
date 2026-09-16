// Shared, DB-free types + helpers for Power Prompting. Safe to import from
// both server code and client components.

export const ATHLETES = ["Gal", "Ofir"] as const;
export type Athlete = (typeof ATHLETES)[number];

export function isAthlete(x: unknown): x is Athlete {
  return typeof x === "string" && (ATHLETES as readonly string[]).includes(x);
}

/** Bring Sally Up — Push Up Challenge with Timer (Ezi Boteach). */
export const VIDEO_ID = "koMp3ei4xJw";
export const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

/**
 * The second of the video at which the song (and therefore the timer) starts.
 * The video has an intro before the first "bring Sally up"; playback is
 * started here and the survival clock reads `video time − this`.
 */
export const SONG_START_SECONDS = 5.8;

/** Length of the 3-2-1 countdown shown before the song. */
export const COUNTDOWN_SECONDS = 3;
/** Duration of the black-hole launch transition (keep in sync with the CSS). */
export const LAUNCH_MS = 1050;
/**
 * Where playback starts when Start is tapped, so that after the launch
 * transition and the countdown the song begins exactly on cue. Starting the
 * video inside the tap itself is what lets phones play sound without a
 * second "Play" tap.
 */
export const PLAY_FROM_SECONDS = Math.max(
  0,
  SONG_START_SECONDS - COUNTDOWN_SECONDS - LAUNCH_MS / 1000,
);

/** Routes inside this space. */
export const ROUTES = {
  home: "/power-prompting",
  arena: "/power-prompting/arena",
  history: "/power-prompting/history",
} as const;

/** Per-athlete accent colours (Gal = system blue, Ofir = Claude terracotta). */
export const ATHLETE_COLORS: Record<Athlete, string> = {
  Gal: "#0071e3",
  Ofir: "#c9603a",
};

/** Upper bound for a recorded time: the song is ~3.5 min, so 1 h is plenty. */
export const MAX_SECONDS = 3600;

export interface ResultRow {
  id: string;
  sessionId: string;
  athlete: Athlete;
  seconds: number;
  completed: boolean;
}

export interface SessionRow {
  id: string;
  startedAt: string; // ISO
  songSeconds: number | null;
  results: ResultRow[];
}

export interface BestMark {
  seconds: number;
  completed: boolean;
  sessionId: string;
  startedAt: string;
}

export interface AthleteStats {
  athlete: Athlete;
  best: BestMark | null;
  sessions: number;
  finishes: number;
  average: number | null;
}

export interface HeadToHead {
  wins: Record<Athlete, number>;
  ties: number;
  contested: number;
}

export interface Dashboard {
  sessions: SessionRow[];
  stats: AthleteStats[];
  headToHead: HeadToHead;
  last: SessionRow | null;
}

// ── formatting ───────────────────────────────────────────────────────────────

/** "2:14.3" (tenths) or "2:14" — the survival time as a stopwatch reading. */
export function formatSeconds(
  total: number,
  opts: { tenths?: boolean } = {},
): string {
  const safe = Math.max(0, Number.isFinite(total) ? total : 0);
  const tenths = opts.tenths ?? true;
  const whole = tenths ? Math.floor(safe * 10) / 10 : Math.round(safe);
  const m = Math.floor(whole / 60);
  const s = whole - m * 60;
  const sec = tenths
    ? s.toFixed(1).padStart(4, "0")
    : String(Math.round(s)).padStart(2, "0");
  return `${m}:${sec}`;
}

/** Parse "2:14.3", "134.3", "2:14" → seconds (or null if invalid). */
export function parseSeconds(input: string): number | null {
  const str = input.trim();
  if (!str) return null;
  const parts = str.split(":");
  if (parts.length > 2) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const value = parts.length === 2 ? nums[0] * 60 + nums[1] : nums[0];
  if (value > MAX_SECONDS) return null;
  return Math.round(value * 100) / 100;
}

/** "16.09.2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Signed delta vs a reference time: "+4.2s" / "−12.0s". */
export function formatDelta(seconds: number): string {
  const sign = seconds >= 0 ? "+" : "−";
  return `${sign}${Math.abs(seconds).toFixed(1)}s`;
}

// ── derived stats ────────────────────────────────────────────────────────────

export function computeStats(sessions: SessionRow[]): AthleteStats[] {
  return ATHLETES.map((athlete) => {
    let best: BestMark | null = null;
    let count = 0;
    let finishes = 0;
    let sum = 0;
    for (const session of sessions) {
      const r = session.results.find((x) => x.athlete === athlete);
      if (!r) continue;
      count += 1;
      sum += r.seconds;
      if (r.completed) finishes += 1;
      if (!best || r.seconds > best.seconds) {
        best = {
          seconds: r.seconds,
          completed: r.completed,
          sessionId: session.id,
          startedAt: session.startedAt,
        };
      }
    }
    return {
      athlete,
      best,
      sessions: count,
      finishes,
      average: count ? sum / count : null,
    };
  });
}

export function computeHeadToHead(sessions: SessionRow[]): HeadToHead {
  const wins = { Gal: 0, Ofir: 0 } as Record<Athlete, number>;
  let ties = 0;
  let contested = 0;
  for (const session of sessions) {
    const a = session.results.find((r) => r.athlete === ATHLETES[0]);
    const b = session.results.find((r) => r.athlete === ATHLETES[1]);
    if (!a || !b) continue;
    contested += 1;
    if (a.seconds > b.seconds) wins[ATHLETES[0]] += 1;
    else if (b.seconds > a.seconds) wins[ATHLETES[1]] += 1;
    else ties += 1;
  }
  return { wins, ties, contested };
}

export function buildDashboard(sessions: SessionRow[]): Dashboard {
  return {
    sessions,
    stats: computeStats(sessions),
    headToHead: computeHeadToHead(sessions),
    last: sessions[0] ?? null,
  };
}

/** The winner of a session (longest time), or null on a tie / single result. */
export function sessionWinner(session: SessionRow): Athlete | null {
  if (session.results.length < 2) return null;
  const sorted = [...session.results].sort((a, b) => b.seconds - a.seconds);
  if (sorted[0].seconds === sorted[1].seconds) return null;
  return sorted[0].athlete;
}
