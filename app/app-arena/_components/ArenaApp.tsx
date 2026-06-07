"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBoard, logout, type Board } from "../actions";
import { USER_COLORS, type User } from "../_lib/arena";
import s from "./app-arena.module.css";
import Podium from "./Podium";
import IdeaCard from "./IdeaCard";
import SuggestApp from "./SuggestApp";

type Tab = "board" | "suggest";

export default function ArenaApp({ me }: { me: User }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>("board");
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      setBoard(await getBoard());
    } catch {
      /* keep previous data on transient errors */
    }
  }, []);

  // initial fetch + near-live sync (poll + focus/visibility)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = setInterval(refresh, 15000);
    const onFocus = () => refresh();
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const ideas = useMemo(() => board?.ideas ?? [], [board]);

  const progress = useMemo(() => {
    const scoreable = ideas.filter((i) => i.canScore);
    const scored = scoreable.filter((i) => i.myScore !== null);
    return { total: scoreable.length, done: scored.length };
  }, [ideas]);

  const topThree = ideas.slice(0, 3);

  async function onLogout() {
    await logout();
    router.refresh();
  }

  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.brand}>
          <h1 className={s.brandTitle}>
            App Arena <span className={s.brandTrophy}>🏆</span>
          </h1>
          <p className={s.brandTagline}>Pitch it. Rate it. Crown it.</p>
        </div>
        <div className={s.headerRight}>
          <span
            className={s.meChip}
            style={{ "--accent": USER_COLORS[me] } as React.CSSProperties}
          >
            <span className={s.meDot} style={{ background: USER_COLORS[me] }} />
            {me}
          </span>
          <button className={s.logoutBtn} onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      {progress.total > 0 && (
        <div
          className={`${s.progressChip} ${
            progress.done < progress.total ? s.progressOpen : s.progressDone
          }`}
        >
          {progress.done < progress.total ? (
            <>
              <span className={s.progressPulse} />
              {progress.total - progress.done} idea
              {progress.total - progress.done > 1 ? "s" : ""} awaiting your score
              <span className={s.progressCount}>
                {progress.done}/{progress.total}
              </span>
            </>
          ) : (
            <>✓ You&rsquo;ve scored everything · {progress.done}/{progress.total}</>
          )}
        </div>
      )}

      <nav className={s.tabs}>
        <button
          className={`${s.tab} ${tab === "board" ? s.tabActive : ""}`}
          onClick={() => setTab("board")}
        >
          Leaderboard
        </button>
        <button
          className={`${s.tab} ${tab === "suggest" ? s.tabActive : ""}`}
          onClick={() => setTab("suggest")}
        >
          Suggest an app
        </button>
      </nav>

      {tab === "suggest" ? (
        <SuggestApp
          onAdded={async () => {
            await refresh();
            setTab("board");
          }}
        />
      ) : board === null ? (
        <div className={s.empty}>Loading the arena…</div>
      ) : ideas.length === 0 ? (
        <div className={s.empty}>
          No ideas yet. Hit <strong>Suggest an app</strong> and be the first to
          pitch. 🚀
        </div>
      ) : (
        <>
          <Podium ideas={topThree} />
          <div className={s.list}>
            {ideas.map((ri) => (
              <IdeaCard key={ri.idea.id} ranked={ri} refresh={refresh} />
            ))}
          </div>
        </>
      )}

      <footer className={s.footer}>
        Built for Yonatan, Lior &amp; Gal · Givatayim
      </footer>
    </div>
  );
}
