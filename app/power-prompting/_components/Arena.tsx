"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, type SaveSessionOutput } from "../actions";
import {
  ATHLETES,
  ATHLETE_COLORS,
  COUNTDOWN_SECONDS,
  formatDelta,
  formatSeconds,
  PLAY_FROM_SECONDS,
  ROUTES,
  SONG_START_SECONDS,
  type Athlete,
} from "../_lib/challenge";
import {
  getDuration,
  getTime,
  hasFailed,
  isPlaying,
  pause,
  play,
  PLAYER_EVENT,
  subscribe,
} from "../_lib/player";
import { YT_STATE } from "../_lib/youtube";
import { burstConfetti } from "./confetti";
import s from "./power-prompting.module.css";

type Phase =
  | "countdown" // the intro plays, 3-2-1 counts down to the song
  | "blocked" // the browser refused to play without a tap
  | "live" // song playing, clock running
  | "finishing" // everyone stopped: short undo window before we save
  | "finished" // results on screen
  | "error";

type Stops = Partial<Record<Athlete, number>>;

interface Outcome {
  athlete: Athlete;
  seconds: number;
  completed: boolean;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; data: SaveSessionOutput }
  | { status: "error"; message: string };

const UNDO_MS = 3000;
const GRACE_MS = 3000;
const PLAY_WATCHDOG_MS = 2500;
const BUFFER_GRACE_MS = 5000;
const TICK_MS = 100;
const CONFIRM_MS = 4000;
const LEAVE_MS = 220;
const GO_FLASH_MS = 800;
const YT_ERROR = "YouTube won't play the track here.";

type TimerKey = "grace" | "undo" | "watchdog" | "confirm" | "leave" | "go";

/** Seconds of the SONG elapsed (video time minus the intro), never negative. */
function songElapsed(): number {
  return Math.max(0, getTime() - SONG_START_SECONDS);
}

/** Length of the song part of the video (0 if unknown yet). */
function songLength(): number {
  const d = getDuration();
  return d > SONG_START_SECONDS ? d - SONG_START_SECONDS : 0;
}

export default function Arena() {
  const router = useRouter();
  // A player that already failed (e.g. on the home page) starts us in error.
  const [phase, setPhaseState] = useState<Phase>(() =>
    hasFailed() ? "error" : "countdown",
  );
  const phaseRef = useRef<Phase>(phase);
  const stopsRef = useRef<Stops>({});
  const undoableRef = useRef<Athlete | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const armedRef = useRef(false); // we asked for playback and await PLAYING
  const timers = useRef<Partial<Record<TimerKey, number>>>({});
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [clock, setClock] = useState(0);
  const [total, setTotal] = useState(0);
  const [stops, setStopsState] = useState<Stops>({});
  const [undoable, setUndoableState] = useState<Athlete | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [errorMsg, setErrorMsg] = useState<string | null>(() =>
    hasFailed() ? YT_ERROR : null,
  );
  const [confirmExit, setConfirmExit] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [goFlash, setGoFlash] = useState(false);
  const [round, setRound] = useState(0); // bumps on every GO → replays slam-in

  // ── small helpers that keep refs and state in sync ────────────────────────
  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const setStops = useCallback((next: Stops) => {
    stopsRef.current = next;
    setStopsState(next);
  }, []);
  const setUndoable = useCallback((a: Athlete | null) => {
    undoableRef.current = a;
    setUndoableState(a);
  }, []);
  const clearTimer = useCallback((key: TimerKey) => {
    const id = timers.current[key];
    if (id) window.clearTimeout(id);
    timers.current[key] = undefined;
  }, []);
  const setTimer = useCallback(
    (key: TimerKey, fn: () => void, ms: number) => {
      clearTimer(key);
      timers.current[key] = window.setTimeout(fn, ms);
    },
    [clearTimer],
  );

  // ── persistence ───────────────────────────────────────────────────────────
  const persist = useCallback(async (results: Outcome[]) => {
    setSave({ status: "saving" });
    try {
      const len = songLength();
      const data = await saveSession({
        startedAt: startedAtRef.current ?? new Date().toISOString(),
        songSeconds: len > 0 ? len : null,
        results,
      });
      setSave({ status: "saved", data });
    } catch (e) {
      setSave({
        status: "error",
        message: e instanceof Error ? e.message : "Could not save",
      });
    }
  }, []);

  // ── the session state machine ─────────────────────────────────────────────
  const finish = useCallback(
    (reason: "ended" | "all-stopped") => {
      if (phaseRef.current === "finished") return;
      clearTimer("grace");
      clearTimer("undo");
      setUndoable(null);
      const len = songLength();
      const stopsNow = stopsRef.current;
      const results: Outcome[] = ATHLETES.map((athlete) => {
        const t = stopsNow[athlete];
        if (t !== undefined) {
          return {
            athlete,
            seconds: len > 0 ? Math.min(t, len) : t,
            completed: false,
          };
        }
        return { athlete, seconds: len, completed: reason === "ended" };
      });
      if (reason !== "ended") pause();
      setPhase("finished");
      setOutcomes(results);
      // Freeze the big clock on the last recorded time, not the undo window.
      setClock(Math.max(...results.map((r) => r.seconds)));
      void persist(results);
    },
    [clearTimer, persist, setPhase, setUndoable],
  );

  const stop = useCallback(
    (athlete: Athlete) => {
      const ph = phaseRef.current;
      if (ph !== "live" && ph !== "finishing") return;
      if (stopsRef.current[athlete] !== undefined) return;
      const next: Stops = { ...stopsRef.current, [athlete]: songElapsed() };
      setStops(next);
      setUndoable(athlete);
      setTimer("undo", () => setUndoable(null), UNDO_MS);
      try {
        navigator.vibrate?.(20);
      } catch {
        /* ignore */
      }
      if (ATHLETES.every((a) => next[a] !== undefined)) {
        setPhase("finishing");
        setTimer("grace", () => finish("all-stopped"), GRACE_MS);
      }
    },
    [finish, setPhase, setStops, setTimer, setUndoable],
  );

  const undo = useCallback(() => {
    const athlete = undoableRef.current;
    const ph = phaseRef.current;
    if (!athlete || (ph !== "live" && ph !== "finishing")) return;
    const next: Stops = { ...stopsRef.current };
    delete next[athlete];
    setStops(next);
    setUndoable(null);
    clearTimer("undo");
    if (ph === "finishing") {
      clearTimer("grace");
      setPhase("live");
    }
  }, [clearTimer, setPhase, setStops, setUndoable]);

  /**
   * Ask the player to play from the pre-song point. Best called inside a tap
   * (Start, Play, Rematch). A watchdog turns a refused autoplay into the
   * "blocked" screen, which offers a tap.
   */
  const arm = useCallback(() => {
    armedRef.current = true;
    if (!play(PLAY_FROM_SECONDS)) {
      // Not ready yet: the READY event below will retry.
      return;
    }
    const check = (bufferAllowance: number) => {
      if (!armedRef.current || phaseRef.current !== "countdown") return;
      if (isPlaying() && getTime() > 0) return;
      const state = isPlaying();
      if (state && bufferAllowance > 0) {
        setTimer("watchdog", () => check(0), bufferAllowance);
        return;
      }
      setPhase("blocked");
    };
    setTimer("watchdog", () => check(BUFFER_GRACE_MS), PLAY_WATCHDOG_MS);
  }, [setPhase, setTimer]);

  const goLive = useCallback(() => {
    armedRef.current = false;
    clearTimer("watchdog");
    startedAtRef.current = new Date(
      Date.now() - songElapsed() * 1000,
    ).toISOString();
    setRound((r) => r + 1);
    setGoFlash(true);
    setTimer("go", () => setGoFlash(false), GO_FLASH_MS);
    setPhase("live");
    try {
      navigator.vibrate?.(30);
    } catch {
      /* ignore */
    }
  }, [clearTimer, setPhase, setTimer]);

  const rematch = useCallback(() => {
    clearTimer("grace");
    clearTimer("undo");
    clearTimer("watchdog");
    setStops({});
    setUndoable(null);
    setOutcomes(null);
    setSave({ status: "idle" });
    setClock(0);
    startedAtRef.current = null;
    setCount(COUNTDOWN_SECONDS);
    setPhase("countdown");
    arm(); // inside the Rematch tap → sound allowed
  }, [arm, clearTimer, setPhase, setStops, setUndoable]);

  const goHome = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    pause();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimer("leave", () => router.push(ROUTES.home), LEAVE_MS);
  }, [leaving, router, setTimer]);

  const exit = useCallback(() => {
    const ph = phaseRef.current;
    const mid = ph === "countdown" || ph === "live" || ph === "finishing";
    if (mid && !confirmExit) {
      setConfirmExit(true);
      setTimer("confirm", () => setConfirmExit(false), CONFIRM_MS);
      return;
    }
    goHome();
  }, [confirmExit, goHome, setTimer]);

  // ── mount: take over the shared player ────────────────────────────────────
  useEffect(() => {
    // Release the black <html> ground the launch transition set.
    document.documentElement.style.backgroundColor = "";
    router.prefetch(ROUTES.home);
    const timerStore = timers.current;

    if (phaseRef.current !== "error") {
      if (isPlaying()) {
        // Start already kicked the track off inside its tap: just ride along.
        armedRef.current = true;
      } else {
        // Direct visit (or Start tapped before the player was ready): try.
        arm();
      }
    }

    const unsubscribe = subscribe((event) => {
      if (event === PLAYER_EVENT.ERROR) {
        setErrorMsg(YT_ERROR);
        setPhase("error");
      } else if (event === PLAYER_EVENT.READY) {
        if (armedRef.current && !isPlaying()) arm();
      } else if (event === YT_STATE.ENDED) {
        const ph = phaseRef.current;
        if (ph === "live" || ph === "finishing") finish("ended");
      }
    });

    return () => {
      unsubscribe();
      for (const id of Object.values(timerStore)) {
        if (id) window.clearTimeout(id);
      }
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [arm, finish, router, setPhase]);

  // ── the tick: drives the countdown from the video clock, then the timer ──
  const ticking =
    phase === "countdown" || phase === "live" || phase === "finishing";
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => {
      const t = getTime();
      const len = songLength();
      if (len > 0) setTotal((prev) => (prev === len ? prev : len));
      if (phaseRef.current === "countdown") {
        if (t >= SONG_START_SECONDS && isPlaying()) {
          goLive();
          setClock(songElapsed());
        } else if (t > 0) {
          setCount(
            Math.min(COUNTDOWN_SECONDS, Math.max(1, Math.ceil(SONG_START_SECONDS - t))),
          );
        }
      } else {
        setClock(songElapsed());
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [ticking, goLive]);

  // ── keep the screen awake during the hold ─────────────────────────────────
  const running = phase === "live" || phase === "finishing";
  useEffect(() => {
    if (!running) return;
    let active = true;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator)) return;
        const lock = await navigator.wakeLock.request("screen");
        if (!active) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        /* not available (e.g. low battery) — fine */
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [running]);

  // ── keyboard: 1 / ← = left athlete, 2 / → = right athlete, Backspace = undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1" || e.key === "ArrowLeft") stop(ATHLETES[0]);
      else if (e.key === "2" || e.key === "ArrowRight") stop(ATHLETES[1]);
      else if (e.key === "Backspace" || e.key.toLowerCase() === "u") undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, undo]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const progress = total > 0 ? Math.min(1, clock / total) : 0;
  const dark = phase === "countdown" || phase === "blocked" || phase === "error";

  return (
    <div
      className={`${s.arena} ${running || phase === "finished" ? s.arenaLive : ""} ${
        leaving ? s.arenaLeaving : ""
      }`}
    >
      <header className={s.arenaBar}>
        <button
          type="button"
          className={`${s.arenaExit} ${confirmExit ? s.arenaExitConfirm : ""}`}
          onClick={exit}
        >
          {confirmExit ? "Tap again to leave" : "Exit"}
        </button>

        <div className={s.arenaClock} aria-live="off">
          <span className={s.clockDigits}>{formatSeconds(clock)}</span>
        </div>

        <div className={s.arenaTools}>
          <button
            type="button"
            className={s.iconBtn}
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
        <div className={s.arenaProgress} aria-hidden>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      <div className={s.split} key={round}>
        {ATHLETES.map((athlete) => {
          const final = outcomes?.find((o) => o.athlete === athlete);
          const stoppedAt = stops[athlete];
          return (
            <Side
              key={athlete}
              athlete={athlete}
              running={running && stoppedAt === undefined}
              stoppedAt={stoppedAt}
              final={final}
              onStop={stop}
            />
          );
        })}
      </div>

      {goFlash && (
        <div className={s.goBurst} aria-hidden>
          GO
        </div>
      )}

      {undoable && running && (
        <button type="button" className={s.undoToast} onClick={undo}>
          Undo {undoable}
        </button>
      )}

      <div className={`${s.curtain} ${dark ? "" : s.curtainLifted}`}>
        {phase === "countdown" && (
          <div key={count} className={s.countStage}>
            <span className={s.flash} />
            <span className={s.shock} />
            <span className={`${s.shock} ${s.shockLate}`} />
            <div className={s.countNum}>{count}</div>
            <p className={s.curtainText}>Get in position</p>
          </div>
        )}
        {phase === "blocked" && (
          <button
            type="button"
            className={s.bigBtn}
            onClick={() => {
              setPhase("countdown");
              arm();
            }}
          >
            ▶ Play
          </button>
        )}
        {phase === "error" && (
          <>
            <p className={s.curtainText}>{errorMsg ?? "Something broke."}</p>
            <button type="button" className={s.bigBtn} onClick={goHome}>
              Home
            </button>
          </>
        )}
      </div>

      {phase === "finished" && outcomes && (
        <Results
          outcomes={outcomes}
          save={save}
          onRematch={rematch}
          onHome={goHome}
          onRetry={() => persist(outcomes)}
        />
      )}
    </div>
  );
}

// ── one half of the screen ───────────────────────────────────────────────────

function Side({
  athlete,
  running,
  stoppedAt,
  final,
  onStop,
}: {
  athlete: Athlete;
  running: boolean;
  stoppedAt: number | undefined;
  final: Outcome | undefined;
  onStop: (a: Athlete) => void;
}) {
  const stopped = stoppedAt !== undefined;
  const finishedSong = !!final?.completed;
  const shown = final ? final.seconds : stopped ? stoppedAt : null;
  const hint = finishedSong
    ? "Finished"
    : shown !== null
      ? "Stopped"
      : running
        ? "Tap to stop"
        : "Ready";
  return (
    <button
      type="button"
      className={`${s.side} ${stopped && !finishedSong ? s.sideStopped : ""} ${
        finishedSong ? s.sideFinished : ""
      }`}
      style={{ "--athlete": ATHLETE_COLORS[athlete] } as React.CSSProperties}
      onClick={() => onStop(athlete)}
      disabled={!running}
      aria-label={`${athlete}: ${hint}`}
    >
      <span className={s.sideSkin} aria-hidden />
      <span className={s.sideBody}>
        <span className={s.sideName}>{athlete}</span>
        {shown !== null && (
          <span className={s.sideTime}>{formatSeconds(shown)}</span>
        )}
        <span className={s.sideHint}>{hint}</span>
      </span>
    </button>
  );
}

// ── results card ─────────────────────────────────────────────────────────────

function Results({
  outcomes,
  save,
  onRematch,
  onHome,
  onRetry,
}: {
  outcomes: Outcome[];
  save: SaveState;
  onRematch: () => void;
  onHome: () => void;
  onRetry: () => void;
}) {
  const celebratedRef = useRef(false);
  const sorted = [...outcomes].sort((a, b) => b.seconds - a.seconds);
  const [first, second] = sorted;
  let verdict: string;
  if (first && second && first.seconds === second.seconds) {
    verdict = first.completed ? "Both finished the song" : "Dead heat";
  } else if (first && second) {
    verdict = `${first.athlete} wins by ${(first.seconds - second.seconds).toFixed(1)}s`;
  } else {
    verdict = "Done";
  }
  const bests = save.status === "saved" ? save.data.previousBests : null;

  // Confetti once, for a new personal best or a finished song.
  useEffect(() => {
    if (!bests || celebratedRef.current) return;
    const winners = outcomes.filter((o) => {
      const prev = bests[o.athlete];
      return o.completed || prev === null || o.seconds > prev;
    });
    if (winners.length === 0) return;
    celebratedRef.current = true;
    burstConfetti(
      winners.map((o) => ATHLETE_COLORS[o.athlete]).concat("#ffffff"),
    );
  }, [bests, outcomes]);

  return (
    <div className={s.resultsBackdrop}>
      <section className={s.results} aria-label="Session results">
        <p className={s.resultsKicker}>Session complete</p>
        <h2 className={s.resultsTitle}>{verdict}</h2>
        <ul className={s.resultsList}>
          {outcomes.map((o) => {
            const prev = bests ? bests[o.athlete] : undefined;
            let note = "";
            let best = false;
            if (prev === null) {
              note = "First time";
              best = true;
            } else if (typeof prev === "number") {
              if (o.seconds > prev) {
                note = `New best ${formatDelta(o.seconds - prev)}`;
                best = true;
              } else {
                note = `${formatDelta(o.seconds - prev)} vs best`;
              }
            }
            return (
              <li
                key={o.athlete}
                className={s.resultRow}
                style={{ "--athlete": ATHLETE_COLORS[o.athlete] } as React.CSSProperties}
              >
                <span className={s.dot} />
                <span className={s.resultName}>{o.athlete}</span>
                <span className={s.resultTime}>{formatSeconds(o.seconds)}</span>
                <span className={s.resultMeta}>
                  {o.completed && <span className={s.badge}>Finished</span>}
                  {note && (
                    <span
                      className={`${s.resultNote} ${best ? s.resultNoteBest : ""}`}
                    >
                      {note}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className={s.saveState} role="status">
          {save.status === "saving" && "Saving…"}
          {save.status === "saved" && "Saved ✓"}
          {save.status === "error" && (
            <>
              Not saved ({save.message}).{" "}
              <button type="button" className={s.linkBtn} onClick={onRetry}>
                Retry
              </button>
            </>
          )}
        </p>
        <div className={s.resultsActions}>
          <button type="button" className={s.primaryBtn} onClick={onRematch}>
            Rematch
          </button>
          <button type="button" className={s.secondaryBtn} onClick={onHome}>
            Home
          </button>
        </div>
      </section>
    </div>
  );
}
