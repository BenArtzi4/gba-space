"use client";

import { useRef, useState, useTransition } from "react";
import { scoreColor } from "../_lib/arena";
import { burstConfetti } from "./confetti";
import s from "./app-arena.module.css";

export default function ScoreSlider({
  initial,
  onSubmit,
}: {
  initial: number | null;
  onSubmit: (score: number) => Promise<void>;
}) {
  const [value, setValue] = useState(initial ?? 50);
  const [pending, start] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const color = scoreColor(value);
  const changed = value !== initial;

  function submit() {
    // Capture the button position now — submitting refreshes the board and may
    // unmount this slider, so the ref would be gone by the time the burst fires.
    const r = btnRef.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : undefined;
    const y = r ? r.top : undefined;
    start(async () => {
      await onSubmit(value);
      burstConfetti(x, y);
    });
  }

  return (
    <div className={s.sliderWrap}>
      <div className={s.sliderHead}>
        <span className={s.sliderLabel}>
          {initial === null ? "Your score" : "Update score"}
        </span>
        <span className={s.sliderValue} style={{ color }}>
          {value}
        </span>
      </div>
      <input
        className={s.slider}
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ "--thumb": color } as React.CSSProperties}
        aria-label="Score from 1 to 100"
      />
      <button
        ref={btnRef}
        className={s.scoreBtn}
        onClick={submit}
        disabled={pending || (!changed && initial !== null)}
        style={{ background: color }}
      >
        {pending
          ? "Saving…"
          : initial === null
            ? `Score it · ${value}`
            : `Update · ${value}`}
      </button>
    </div>
  );
}
