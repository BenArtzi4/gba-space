import { publicSpaces } from "../_lib/spaces";

// Hand-rolled sitemap (instead of the app/sitemap.ts metadata convention) so we
// can attach an XSL stylesheet: opening /sitemap.xml in a browser then renders a
// clean styled table, while crawlers still read the raw XML. Generated from the
// registry via publicSpaces(), so it scales automatically.
//
// Keep this base URL in sync with `metadataBase` in app/layout.tsx.
const BASE_URL = "https://gba-space.vercel.app";

// Only depends on build-time registry data — cache as static.
export const dynamic = "force-static";

interface Entry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;",
  );
}

export function GET(): Response {
  const now = new Date().toISOString();

  const entries: Entry[] = [
    { loc: BASE_URL, lastmod: now, changefreq: "weekly", priority: "1.0" },
    {
      loc: `${BASE_URL}/spaces`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.8",
    },
    ...publicSpaces().map((space) => ({
      loc: `${BASE_URL}/${space.slug}`,
      lastmod: new Date(space.added).toISOString(),
      changefreq: "monthly",
      priority: "0.6",
    })),
  ];

  const urls = entries
    .map(
      (e) =>
        `  <url>\n` +
        `    <loc>${xmlEscape(e.loc)}</loc>\n` +
        `    <lastmod>${e.lastmod}</lastmod>\n` +
        `    <changefreq>${e.changefreq}</changefreq>\n` +
        `    <priority>${e.priority}</priority>\n` +
        `  </url>`,
    )
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
