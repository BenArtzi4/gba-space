"use client";

import {
  medalFor,
  scoreColor,
  USER_COLORS,
  type RankedIdea,
  type User,
} from "../_lib/arena";
import s from "./app-arena.module.css";

/** Display-only top-3 podium. Renders columns in 2nd · 1st · 3rd order. */
export default function Podium({ ideas }: { ideas: RankedIdea[] }) {
  if (ideas.length === 0) return null;

  const [first, second, third] = ideas;
  const columns = [
    second && { ri: second, place: s.podiumSecond },
    first && { ri: first, place: s.podiumFirst },
    third && { ri: third, place: s.podiumThird },
  ].filter(Boolean) as { ri: RankedIdea; place: string }[];

  return (
    <section className={s.podium} aria-label="Top ideas">
      {columns.map(({ ri, place }) => {
        const by = ri.idea.suggested_by as User;
        const scored = ri.avg !== null;
        return (
          <div
            key={ri.idea.id}
            className={`${s.podiumCol} ${place} ${
              ri.rank === 1 ? s.podiumChampion : ""
            }`}
          >
            <div className={s.podiumMedal}>{medalFor(ri.rank)}</div>
            <div
              className={s.podiumScore}
              style={{ color: scored ? scoreColor(ri.avg!) : "var(--muted)" }}
            >
              {scored ? Math.round(ri.avg!) : "—"}
            </div>
            <div className={s.podiumTitle} title={ri.idea.title}>
              {ri.idea.title}
            </div>
            <div className={s.podiumBy} style={{ color: USER_COLORS[by] }}>
              {ri.idea.suggested_by}
            </div>
            <div className={s.podiumStand}>#{ri.rank}</div>
          </div>
        );
      })}
    </section>
  );
}
