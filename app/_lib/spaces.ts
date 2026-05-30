// The registry of every "space" in GBA — one self-contained page or mini-app
// served at `/<slug>`. This is the single source of truth: the public directory
// (`/spaces`) and the sitemap (`app/sitemap.ts`) are both generated from it.
//
// Add one entry per space. The scaffolding script (`npm run new-space`) appends
// entries here automatically; you can also edit by hand. Keep `slug` identical
// to the route folder name under `app/`.

export type SpaceStatus =
  | "live" // finished and linked publicly
  | "wip" // under construction, hidden from the directory by default
  | "private"; // intentionally unlisted (e.g. passcode-gated personal tools)

export interface Space {
  /** Route segment under `app/`, kebab-case. `app/<slug>/` ⇒ `/<slug>`. */
  slug: string;
  /** Display name shown in the directory. */
  title: string;
  /** One-line description shown in the directory and used for SEO. */
  description: string;
  /** Lifecycle state — controls visibility in the public directory + sitemap. */
  status: SpaceStatus;
  /** Date the space was added, "YYYY-MM-DD". */
  added: string;
  /** Force-hide from the public directory + sitemap regardless of status. */
  hidden?: boolean;
  /** Optional emoji/badge shown next to the title in the directory. */
  emoji?: string;
}

export const spaces: Space[] = [
  {
    slug: "chase-medicine",
    title: "Chase",
    description: "Shared dog-medicine schedule tracker.",
    status: "private",
    added: "2026-05-24",
    hidden: true,
    emoji: "🐾",
  },
];

/** Spaces that should appear in the public directory + sitemap (live only). */
export function publicSpaces(): Space[] {
  return spaces
    .filter((s) => s.status === "live" && !s.hidden)
    .sort((a, b) => b.added.localeCompare(a.added));
}

/** Look up a single space by slug. */
export function getSpace(slug: string): Space | undefined {
  return spaces.find((s) => s.slug === slug);
}
