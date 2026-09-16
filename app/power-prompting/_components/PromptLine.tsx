"use client";

import { useEffect, useState } from "react";
import s from "./power-prompting.module.css";

// The space's signature element: a terminal-style prompt that "types" the
// challenge's commands. Respects prefers-reduced-motion (shows a static line).
const LINES = [
  "bring sally up",
  "bring sally down",
  "hold… hold… hold…",
  "log the best time",
];

const TYPE_MS = 55;
const HOLD_MS = 1600;
const ERASE_MS = 28;

export default function PromptLine() {
  const [text, setText] = useState(LINES[0]);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    let cancelled = false;
    let line = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (fn: () => void, ms: number) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };
    // Start by erasing the SSR line so the loop is seamless.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnimated(true);
    const erase = (current: string) => {
      if (current.length === 0) {
        line = (line + 1) % LINES.length;
        type("");
        return;
      }
      const next = current.slice(0, -1);
      setText(next);
      schedule(() => erase(next), ERASE_MS);
    };
    const type = (current: string) => {
      const target = LINES[line];
      if (current.length === target.length) {
        schedule(() => erase(current), HOLD_MS);
        return;
      }
      const next = target.slice(0, current.length + 1);
      setText(next);
      schedule(() => type(next), TYPE_MS);
    };
    schedule(() => erase(LINES[0]), HOLD_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className={s.prompt} aria-label={`Prompt: ${LINES[0]}`}>
      <span className={s.promptChevron} aria-hidden>
        ❯
      </span>
      <span className={s.promptText}>{text}</span>
      <span
        className={`${s.promptCaret} ${animated ? s.promptCaretBlink : ""}`}
        aria-hidden
      />
    </div>
  );
}
