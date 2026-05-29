import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "GBA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Faint background dots echoing the live particle field: [left, top, diameter].
const DOTS: [number, number, number][] = [
  [120, 90, 6],
  [300, 180, 4],
  [980, 120, 8],
  [1080, 300, 4],
  [200, 520, 6],
  [500, 90, 4],
  [760, 540, 6],
  [1040, 500, 4],
  [150, 300, 4],
  [900, 420, 6],
  [600, 560, 4],
  [420, 470, 4],
  [860, 150, 4],
  [1120, 210, 6],
  [60, 440, 4],
  [700, 70, 5],
];

export default async function Image() {
  const balloon = await readFile(
    join(process.cwd(), "assets/BagelFatOne-Regular.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 120% at 50% 38%, #16161d 0%, #060607 72%)",
        }}
      >
        {DOTS.map(([left, top, d], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              width: d,
              height: d,
              borderRadius: d,
              background: "#ffffff",
              opacity: 0.22,
            }}
          />
        ))}

        {/* soft glow behind the letters */}
        <div
          style={{
            position: "absolute",
            width: 760,
            height: 420,
            borderRadius: 420,
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(210,220,255,0.18) 0%, rgba(6,6,7,0) 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontFamily: "Bagel",
            fontSize: 300,
            color: "#f3f5f9",
            letterSpacing: 6,
            lineHeight: 1,
          }}
        >
          GBA
        </div>

        {/* three-dot motif */}
        <div style={{ display: "flex", gap: 18, marginTop: 56 }}>
          <div style={{ width: 16, height: 16, borderRadius: 16, background: "#d0d5df" }} />
          <div style={{ width: 16, height: 16, borderRadius: 16, background: "#9aa1b2" }} />
          <div style={{ width: 16, height: 16, borderRadius: 16, background: "#d0d5df" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bagel", data: balloon, style: "normal", weight: 400 },
      ],
    },
  );
}
