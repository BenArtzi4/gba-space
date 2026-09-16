"use client";

import { PLAY_FROM_SECONDS } from "../_lib/challenge";
import { play } from "../_lib/player";
import { useLaunch } from "./LaunchProvider";
import s from "./power-prompting.module.css";

export default function StartButton() {
  const launch = useLaunch();
  return (
    <button
      type="button"
      className={s.startBtn}
      onClick={(e) => {
        // Start the track inside the tap itself: phones only allow sound to
        // begin from a user gesture. The intro plays under the transition and
        // the countdown, and the song lands exactly on GO.
        play(PLAY_FROM_SECONDS);

        // On phones, go fullscreen for the session (best effort; iPhones
        // don't allow it and simply ignore the request).
        if (window.matchMedia("(pointer: coarse)").matches) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }

        const r = e.currentTarget.getBoundingClientRect();
        launch({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
    >
      <span className={s.startIcon} aria-hidden>
        ▶
      </span>
      Start session
    </button>
  );
}
