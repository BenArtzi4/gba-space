"use client";

import { useEffect, useRef } from "react";
import { mountPlayer } from "../_lib/player";
import s from "./power-prompting.module.css";

/**
 * Hosts the space-wide YouTube player. Rendered by the layout so it persists
 * across home ↔ arena navigations. It stays inside the viewport (off-screen
 * frames get throttled and refuse to play) but is invisible and unclickable.
 */
export default function PlayerHost() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    return mountPlayer(host);
  }, []);
  return <div ref={ref} className={s.playerDock} aria-hidden />;
}
