import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Link-preview card (WhatsApp, iMessage, Slack…): "Power Prompting" typed on
// a terminal prompt, Claude Code style. 1200×630 PNG.

export const alt = "Power Prompting — Bring Sally up. Then hold.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ORANGE = "#d97757";

/** Fetch a Google Font's TTF for Satori; falls back to a bundled font. */
async function loadFont(): Promise<{ name: string; data: ArrayBuffer }> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((r) => r.text());
    const url = css.match(
      /src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/,
    )?.[1];
    if (!url) throw new Error("no ttf url");
    const data = await fetch(url).then((r) => r.arrayBuffer());
    return { name: "JetBrains Mono", data };
  } catch {
    const data = await readFile(
      join(process.cwd(), "assets/BagelFatOne-Regular.ttf"),
    );
    return {
      name: "Bagel",
      data: data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer,
    };
  }
}

export default async function Image() {
  const font = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0d",
          fontFamily: font.name,
        }}
      >
        {/* terminal window */}
        <div
          style={{
            width: 1080,
            height: 470,
            display: "flex",
            flexDirection: "column",
            borderRadius: 32,
            background: "#1d1d1f",
            border: "2px solid rgba(255,255,255,0.08)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
            padding: "36px 60px 40px",
          }}
        >
          {/* traffic lights */}
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 22, height: 22, borderRadius: 22, background: "#ff5f57" }} />
            <div style={{ width: 22, height: 22, borderRadius: 22, background: "#febc2e" }} />
            <div style={{ width: 22, height: 22, borderRadius: 22, background: "#28c840" }} />
          </div>

          {/* the prompt: two deliberate lines, caret after the last word */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 112,
              fontWeight: 800,
              letterSpacing: -5,
              lineHeight: 1.02,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
              <span style={{ color: ORANGE }}>❯</span>
              <span>Power</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                marginLeft: 100,
              }}
            >
              <span>Prompting</span>
              <div
                style={{
                  width: 44,
                  height: 100,
                  borderRadius: 6,
                  background: ORANGE,
                }}
              />
            </div>
          </div>

        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: font.name, data: font.data, weight: 800, style: "normal" },
      ],
    },
  );
}
