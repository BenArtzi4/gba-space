"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { LAUNCH_MS, ROUTES } from "../_lib/challenge";
import BlackHole from "./BlackHole";
import s from "./power-prompting.module.css";

export interface LaunchOrigin {
  x: number;
  y: number;
}

interface LaunchState extends LaunchOrigin {
  /** Scale that takes the 720px orb past the farthest viewport corner. */
  scale: number;
  reduced: boolean;
}

const LaunchContext = createContext<(origin: LaunchOrigin) => void>(() => {});

/** Trigger the black-hole transition into the arena from any client child. */
export function useLaunch() {
  return useContext(LaunchContext);
}

/** Painted size of the orb layers in CSS px (must match --hole-base in CSS). */
const ORB_BASE = 720;
/** Total collapse length (must match the CSS keyframe durations). */
const COLLAPSE_MS = LAUNCH_MS;
/** Navigate while the screen is already fully black, not at the very end. */
const NAVIGATE_AT = 0.84;
const REDUCED_MS = 200;

export default function LaunchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<LaunchState | null>(null);

  // Warm the arena route so the countdown can pop the instant the hole closes.
  useEffect(() => {
    router.prefetch(ROUTES.arena);
  }, [router]);

  useEffect(() => {
    if (!state) return;
    const id = window.setTimeout(
      () => {
        // No white flash between unmount and the arena's first (black) paint.
        document.documentElement.style.backgroundColor = "#000";
        router.push(ROUTES.arena);
      },
      state.reduced ? REDUCED_MS : Math.round(COLLAPSE_MS * NAVIGATE_AT),
    );
    return () => window.clearTimeout(id);
  }, [state, router]);

  const launch = useCallback((origin: LaunchOrigin) => {
    setState((prev) => {
      if (prev) return prev; // already collapsing
      const w = window.innerWidth;
      const h = window.innerHeight;
      const radius =
        Math.hypot(
          Math.max(origin.x, w - origin.x),
          Math.max(origin.y, h - origin.y),
        ) * 1.06;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      return { ...origin, scale: (radius * 2) / ORB_BASE, reduced };
    });
  }, []);

  const style = state
    ? ({
        "--hole-x": `${state.x}px`,
        "--hole-y": `${state.y}px`,
        "--hole-s": String(state.scale),
      } as CSSProperties)
    : undefined;

  return (
    <LaunchContext.Provider value={launch}>
      <div
        className={`${s.launchRoot} ${
          state ? (state.reduced ? s.launchFade : s.launchCollapse) : ""
        }`}
        style={style}
        aria-busy={!!state}
      >
        {children}
      </div>
      {state && <BlackHole style={style} reduced={state.reduced} />}
    </LaunchContext.Provider>
  );
}
