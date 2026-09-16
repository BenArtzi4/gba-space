"use client";

import { useLaunch } from "./LaunchProvider";
import s from "./power-prompting.module.css";

export default function StartButton() {
  const launch = useLaunch();
  return (
    <button
      type="button"
      className={s.startBtn}
      onClick={(e) => {
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
