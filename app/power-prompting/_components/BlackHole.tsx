"use client";

import type { CSSProperties } from "react";
import s from "./power-prompting.module.css";

/**
 * Full-screen overlay for the "start" transition. Four pre-painted layers
 * pinned at the Start button, animated with transform/opacity only so the
 * whole thing runs on the compositor while the arena route loads:
 *   glow  – light bleed as the horizon crosses the viewport
 *   ring  – tilted, spinning accretion disc (conic gradient masked to a ring)
 *   disc  – the event horizon, growing until it covers the screen
 *   out   – a guaranteed pure-black end state
 * The page content underneath is spiralled in by `LaunchProvider`.
 * Reduced motion → plain fade to black.
 */
export default function BlackHole({
  style,
  reduced,
}: {
  style?: CSSProperties;
  reduced: boolean;
}) {
  return (
    <div
      className={`${s.hole} ${reduced ? s.holeReduced : ""}`}
      style={style}
      aria-hidden
    >
      {!reduced && (
        <>
          <div className={`${s.orb} ${s.holeGlow}`} />
          <div className={`${s.orb} ${s.holeRing}`} />
          <div className={`${s.orb} ${s.holeDisc}`} />
        </>
      )}
      <div className={s.holeOut} />
    </div>
  );
}
