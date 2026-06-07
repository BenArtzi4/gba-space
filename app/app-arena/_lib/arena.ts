// Pure, shared types + ranking helpers for App Arena. No server or DB imports
// here, so both the server actions and the client components can use it.

export const USERS = ["Yonatan", "Lior", "Gal"] as const;
export type User = (typeof USERS)[number];

/** Per-player accent color, used for badges, chips and avatars. */
export const USER_COLORS: Record<User, string> = {
  Yonatan: "#38bdf8", // sky
  Lior: "#f472b6", // pink
  Gal: "#fbbf24", // amber
};

/**
 * Emoji a player can toggle on an idea — the only way to "comment".
 * Deliberately the weirdest, most cryptic emoji we could find: half the fun is
 * nobody having any idea what they're supposed to mean.
 */
export const REACTIONS = [
  "🫥", // dotted line face
  "🧿", // nazar amulet
  "🪬", // hamsa
  "🪤", // mousetrap
  "🪠", // plunger
  "🪦", // headstone
  "🫀", // anatomical heart
  "🫁", // lungs
  "🪨", // rock
  "🪵", // wood
  "🩻", // x-ray
  "🪅", // piñata
  "🪆", // nesting dolls
  "🫚", // ginger root
  "🫛", // pea pod
  "🛟", // ring buoy
  "🪈", // flute
  "🫎", // moose
  "🪿", // goose
  "🫏", // donkey
] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export function isUser(value: string): value is User {
  return (USERS as readonly string[]).includes(value);
}

// ── DB row shapes ──────────────────────────────────────────────────────────

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  suggested_by: string;
  created_at: string;
}

export interface Score {
  id: string;
  idea_id: string;
  voter: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface Reaction {
  id: string;
  idea_id: string;
  reactor: string;
  emoji: string;
  created_at: string;
}

// ── Derived, view-ready shapes ───────────────────────────────────────────────

export interface ReactionTally {
  emoji: string;
  count: number;
  byMe: boolean;
  who: string[]; // names of everyone who reacted with this emoji
}

export interface RankedIdea {
  idea: Idea;
  rank: number; // 1-based position on the leaderboard
  scores: Score[]; // received scores, sorted by voter
  reactions: ReactionTally[]; // one entry per emoji in REACTIONS
  avg: number | null; // average received score, null when unscored
  voteCount: number;
  maxVotes: number; // how many players may score it (everyone but the author)
  iSuggested: boolean;
  myScore: number | null;
  canScore: boolean; // false for your own idea
  awaitingMe: boolean; // canScore && not yet scored by me
}

/**
 * Expand raw rows into ranked, view-ready ideas for a given viewer.
 * Sort: scored ideas first, by average desc, then by vote count, then oldest.
 */
export function rankIdeas(
  ideas: Idea[],
  scores: Score[],
  reactions: Reaction[],
  me: User,
): RankedIdea[] {
  const ranked: RankedIdea[] = ideas.map((idea) => {
    const ideaScores = scores
      .filter((s) => s.idea_id === idea.id)
      .sort((a, b) => a.voter.localeCompare(b.voter));
    const voteCount = ideaScores.length;
    const avg = voteCount
      ? ideaScores.reduce((sum, s) => sum + s.score, 0) / voteCount
      : null;

    const ideaReactions = reactions.filter((r) => r.idea_id === idea.id);
    const tally: ReactionTally[] = REACTIONS.map((emoji) => {
      const hits = ideaReactions.filter((r) => r.emoji === emoji);
      return {
        emoji,
        count: hits.length,
        byMe: hits.some((r) => r.reactor === me),
        who: hits.map((r) => r.reactor),
      };
    });

    const iSuggested = idea.suggested_by === me;
    const myScore = ideaScores.find((s) => s.voter === me)?.score ?? null;
    const canScore = !iSuggested;

    return {
      idea,
      rank: 0,
      scores: ideaScores,
      reactions: tally,
      avg,
      voteCount,
      maxVotes: USERS.length - 1,
      iSuggested,
      myScore,
      canScore,
      awaitingMe: canScore && myScore === null,
    };
  });

  ranked.sort((a, b) => {
    // Scored ideas always rank above unscored ones.
    if ((a.avg === null) !== (b.avg === null)) return a.avg === null ? 1 : -1;
    if (a.avg !== null && b.avg !== null && b.avg !== a.avg) return b.avg - a.avg;
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.idea.created_at.localeCompare(b.idea.created_at);
  });

  ranked.forEach((r, i) => (r.rank = i + 1));
  return ranked;
}

/** A vivid red → amber → green color for a 1–100 score. */
export function scoreColor(score: number): string {
  const clamped = Math.max(1, Math.min(100, score));
  const hue = Math.round((clamped / 100) * 130); // 0 = red, 130 = green
  return `hsl(${hue} 80% 55%)`;
}

/** Medal emoji for the top three ranks, else null. */
export function medalFor(rank: number): string | null {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
}
