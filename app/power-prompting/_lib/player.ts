// A single, space-wide YouTube player (client-side only).
//
// The player is mounted once by <PlayerHost> in the space layout, so it
// survives the home → arena navigation. That matters on phones: browsers only
// let sound start inside a user tap, so the Start button starts playback
// itself and the arena simply takes over an already-playing player.

import { loadYouTubeApi, YT_STATE, type YTPlayer } from "./youtube";
import { VIDEO_ID } from "./challenge";

/** Extra events emitted alongside the YouTube player states. */
export const PLAYER_EVENT = {
  READY: 100,
  ERROR: -100,
} as const;

type Listener = (event: number) => void;

let player: YTPlayer | null = null;
let ready = false;
let failed = false;
let lastState: number = YT_STATE.UNSTARTED;
const listeners = new Set<Listener>();

function emit(event: number) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      /* a listener must never break the others */
    }
  }
}

/** Create the hidden player inside `host`. Returns a cleanup function. */
export function mountPlayer(host: HTMLElement): () => void {
  let cancelled = false;
  const target = document.createElement("div");
  host.appendChild(target);
  failed = false;

  loadYouTubeApi()
    .then((YT) => {
      if (cancelled) return;
      player = new YT.Player(target, {
        videoId: VIDEO_ID,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            ready = true;
            emit(PLAYER_EVENT.READY);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            lastState = e.data;
            emit(e.data);
          },
          onError: () => {
            if (cancelled) return;
            failed = true;
            emit(PLAYER_EVENT.ERROR);
          },
        },
      });
    })
    .catch(() => {
      if (cancelled) return;
      failed = true;
      emit(PLAYER_EVENT.ERROR);
    });

  return () => {
    cancelled = true;
    try {
      player?.destroy();
    } catch {
      /* ignore */
    }
    player = null;
    ready = false;
    lastState = YT_STATE.UNSTARTED;
    target.remove();
  };
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isReady(): boolean {
  return ready && player !== null;
}

export function hasFailed(): boolean {
  return failed;
}

export function getState(): number {
  try {
    return player?.getPlayerState() ?? lastState;
  } catch {
    return lastState;
  }
}

export function isPlaying(): boolean {
  const s = getState();
  return s === YT_STATE.PLAYING || s === YT_STATE.BUFFERING;
}

/** Current video time in seconds (0 when unknown). */
export function getTime(): number {
  try {
    const t = player?.getCurrentTime() ?? 0;
    return Number.isFinite(t) && t > 0 ? t : 0;
  } catch {
    return 0;
  }
}

/** Video duration in seconds (0 when unknown). */
export function getDuration(): number {
  try {
    const d = player?.getDuration() ?? 0;
    return Number.isFinite(d) && d > 0 ? d : 0;
  } catch {
    return 0;
  }
}

/**
 * Seek and play. Call this INSIDE a user tap handler whenever possible: that
 * is what unlocks sound on phones. Returns false if the player isn't ready.
 */
export function play(fromSeconds: number): boolean {
  if (!isReady() || !player) return false;
  try {
    player.seekTo(fromSeconds, true);
    player.playVideo();
    return true;
  } catch {
    return false;
  }
}

export function pause(): void {
  try {
    player?.pauseVideo();
  } catch {
    /* ignore */
  }
}

// Debug hook: inspect the shared player from the browser console.
if (typeof window !== "undefined") {
  (window as unknown as { __pp?: unknown }).__pp = {
    isReady,
    hasFailed,
    getState,
    getTime,
    getDuration,
    play,
    pause,
  };
}
