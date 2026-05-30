import type { MetadataRoute } from "next";
import { publicSpaces } from "./_lib/spaces";

// Generated from the spaces registry (`app/_lib/spaces.ts`) so it scales as new
// spaces are added — no manual edits needed here. Keep this base URL in sync
// with `metadataBase` in `app/layout.tsx`.
const BASE_URL = "https://gba-space.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/spaces`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...publicSpaces().map((space) => ({
      url: `${BASE_URL}/${space.slug}`,
      lastModified: new Date(space.added),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
