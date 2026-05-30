import "server-only";
import { spaces, type Space, type SpaceStatus } from "../../_lib/spaces";
import { routeSlugs } from "../../_lib/routes.generated";

// Meta / infrastructure routes that exist as folders but aren't "spaces" and
// should never be flagged as drift.
const META_ROUTES = new Set(["spaces", "all"]);

export type Drift =
  | "unregistered" // a route folder exists but has no registry entry
  | "missing" // a registry entry exists but the route folder is gone
  | null;

export interface OverviewRow {
  slug: string;
  href: string;
  title: string;
  description: string;
  status: SpaceStatus | "system";
  added: string | null;
  hidden: boolean;
  emoji?: string;
  exists: boolean; // route folder is present on disk
  drift: Drift;
}

export interface Overview {
  rows: OverviewRow[];
  counts: {
    total: number;
    live: number;
    wip: number;
    private: number;
    system: number;
    drift: number;
  };
}

/**
 * Merge what actually exists on disk (routeSlugs, generated at build) with the
 * registry (app/_lib/spaces.ts) so the owner sees every route and any drift
 * between the two.
 */
export function buildOverview(): Overview {
  const bySlug = new Map<string, Space>(spaces.map((s) => [s.slug, s]));
  const existing = new Set(routeSlugs);
  const rows: OverviewRow[] = [];

  // 1) Everything that exists on disk.
  for (const slug of routeSlugs) {
    if (META_ROUTES.has(slug)) {
      rows.push({
        slug,
        href: `/${slug}`,
        title: slug === "spaces" ? "Spaces (public directory)" : "All (this page)",
        description:
          slug === "spaces"
            ? "Public listing of live spaces."
            : "Owner overview of every route.",
        status: "system",
        added: null,
        hidden: false,
        exists: true,
        drift: null,
      });
      continue;
    }
    const meta = bySlug.get(slug);
    rows.push({
      slug,
      href: `/${slug}`,
      title: meta?.title ?? slug,
      description: meta?.description ?? "—",
      status: meta?.status ?? "wip",
      added: meta?.added ?? null,
      hidden: meta?.hidden ?? false,
      emoji: meta?.emoji,
      exists: true,
      drift: meta ? null : "unregistered",
    });
  }

  // 2) Registry entries with no matching folder (e.g. deleted/renamed).
  for (const s of spaces) {
    if (!existing.has(s.slug)) {
      rows.push({
        slug: s.slug,
        href: `/${s.slug}`,
        title: s.title,
        description: s.description,
        status: s.status,
        added: s.added,
        hidden: s.hidden ?? false,
        emoji: s.emoji,
        exists: false,
        drift: "missing",
      });
    }
  }

  rows.sort((a, b) => a.slug.localeCompare(b.slug));

  const counts = {
    total: rows.length,
    live: rows.filter((r) => r.status === "live").length,
    wip: rows.filter((r) => r.status === "wip").length,
    private: rows.filter((r) => r.status === "private").length,
    system: rows.filter((r) => r.status === "system").length,
    drift: rows.filter((r) => r.drift !== null).length,
  };

  return { rows, counts };
}
