<?xml version="1.0" encoding="UTF-8"?>
<!-- Renders /sitemap.xml as a styled HTML page in browsers. Crawlers ignore
     this stylesheet and read the raw XML. -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"
    doctype-system="about:legacy-compat" />

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sitemap · GBA</title>
        <style>
          :root { color-scheme: dark; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #060607;
            color: #e5e7eb;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
              Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            padding: clamp(1.5rem, 5vw, 4rem) 1.25rem;
          }
          .wrap { max-width: 56rem; margin: 0 auto; }
          h1 {
            font-size: clamp(1.6rem, 5vw, 2.4rem);
            font-weight: 700; letter-spacing: -0.02em; color: #f3f4f6;
          }
          .note {
            margin: 0.5rem 0 1.75rem; color: #9ca3af; font-size: 0.95rem;
            line-height: 1.5;
          }
          .note code {
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 0.85em; color: #a5b4fc;
          }
          .count { color: #6b7280; font-size: 0.85rem; margin-bottom: 0.75rem; }
          table { width: 100%; border-collapse: collapse; }
          th, td {
            text-align: left; padding: 0.7rem 0.9rem;
            border-bottom: 1px solid #1f2937; font-size: 0.9rem;
          }
          th {
            color: #6b7280; font-size: 0.72rem; text-transform: uppercase;
            letter-spacing: 0.08em; font-weight: 600;
          }
          tr:hover td { background: #0c0d10; }
          a { color: #818cf8; text-decoration: none; }
          a:hover { color: #c7d2fe; text-decoration: underline; }
          .meta { color: #6b7280; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Sitemap</h1>
          <p class="note">
            This is the machine-readable sitemap that search engines read. The
            human directory lives at <code>/spaces</code>.
          </p>
          <p class="count">
            <xsl:value-of select="count(s:urlset/s:url)" /> URLs
          </p>
          <table>
            <thead>
              <tr><th>URL</th><th>Last modified</th><th>Priority</th></tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td>
                    <a href="{s:loc}"><xsl:value-of select="s:loc" /></a>
                  </td>
                  <td class="meta">
                    <xsl:value-of select="substring(s:lastmod, 1, 10)" />
                  </td>
                  <td class="meta"><xsl:value-of select="s:priority" /></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
