"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, type SaveSessionOutput } from "../actions";
import {
  ATHLETES,
  ATHLETE_COLORS,
  formatDelta,
  formatSeconds,
  ROUTES,
  SONG_START_SECONDS,
  VIDEO_ID,
  type Athlete,
} from "../_lib/challenge";
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "../_lib/youtube";
import s from "./power-prompting.module.css";

type Phase =
  | "loading" // fetching the YouTube player
  | "countdown" // 3-2-1-GO on a black screen
  | "blocked" // the browser refused to autoplay: needs a tap
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

const COUNTDOWN_FROM = 3;
const UNDO_MS = 3000;
const GRACE_MS = 3000;
const PLAY_WATCHDOG_MS = 2500;
const BUFFER_GRACE_MS = 5000;
const CLOCK_TICK_MS = 100;
const CONFIRM_MS = 4000;

type TimerKey = "grace" | "undo" | "watchdog" | "confirm";

export default function Arena() {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const phaseRef = useRef<Phase>("loading");
  const stopsRef = useRef<Stops>({});
  const undoableRef = useRef<Athlete | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const awaitingPlayRef = useRef(false);
  const songLengthRef = useRef(0);
  const timers = useRef<Partial<Record<TimerKey, number>>>({});
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const onStateRef = useRef<(state: number) => void>(() => {});

  const [phase, setPhaseState] = useState<Phase>("loading");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [clock, setClock] = useState(0);
  const [songLength, setSongLengthState] = useState(0);
  const [stops, setStopsState] = useState<Stops>({});
  const [undoable, setUndoableState] = useState<Athlete | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
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
  const setSongLength = useCallback((d: number) => {
    songLengthRef.current = d;
    setSongLengthState(d);
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

  /** Seconds of the SONG elapsed (video time minus the intro). */
  const elapsed = useCallback((): number => {
    try {
      const t = playerRef.current?.getCurrentTime() ?? 0;
      if (!Number.isFinite(t)) return 0;
      return Math.max(0, t - SONG_START_SECONDS);
    } catch {
      return 0;
    }
  }, []);

  /** Length of the song part of the video (0 if unknown). */
  const readSongLength = useCallback((): number => {
    try {
      const d = playerRef.current?.getDuration() ?? 0;
      if (Number.isFinite(d) && d > SONG_START_SECONDS) {
        return d - SONG_START_SECONDS;
      }
    } catch {
      /* fall through */
    }
    return songLengthRef.current;
  }, []);

  // ── persistence ───────────────────────────────────────────────────────────
  const persist = useCallback(
    async (results: Outcome[], songSeconds: number | null) => {
      setSave({ status: "saving" });
      try {
        const data = await saveSession({
          startedAt: startedAtRef.current ?? new Date().toISOString(),
          songSeconds,
          results,
        });
        setSave({ status: "saved", data });
      } catch (e) {
        setSave({
          status: "error",
          message: e instanceof Error ? e.message : "Could not save",
        });
      }
    },
    [],
  );

  // ── the session state machine ─────────────────────────────────────────────
  const finish = useCallback(
    (reason: "ended" | "all-stopped") => {
      if (phaseRef.current === "finished") return;
      clearTimer("grace");
      clearTimer("undo");
      setUndoable(null);
      const total = readSongLength();
      const stopsNow = stopsRef.current;
      const results: Outcome[] = ATHLETES.map((athlete) => {
        const t = stopsNow[athlete];
        if (t !== undefined) {
          return {
            athlete,
            seconds: total > 0 ? Math.min(t, total) : t,
            completed: false,
          };
        }
        return { athlete, seconds: total, completed: reason === "ended" };
      });
      if (reason !== "ended") {
        try {
          playerRef.current?.pauseVideo();
        } catch {
          /* ignore */
        }
      }
      setPhase("finished");
      setOutcomes(results);
      // Freeze the big clock on the last recorded time, not the undo window.
      setClock(Math.max(...results.map((r) => r.seconds)));
      void persist(results, total > 0 ? total : null);
    },
    [clearTimer, persist, readSongLength, setPhase, setUndoable],
  );

  const stop = useCallback(
    (athlete: Athlete) => {
      const ph = phaseRef.current;
      if (ph !== "live" && ph !== "finishing") return;
      if (stopsRef.current[athlete] !== undefined) return;
      const next: Stops = { ...stopsRef.current, [athlete]: elapsed() };
      setStops(next);
      setUndoable(athlete);
      setTimer("undo", () => setUndoable(null), UNDO_MS);
      if (ATHLETES.every((a) => next[a] !== undefined)) {
        setPhase("finishing");
        setTimer("grace", () => finish("all-stopped"), GRACE_MS);
      }
    },
    [elapsed, finish, setPhase, setStops, setTimer, setUndoable],
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

  const startPlayback = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    awaitingPlayRef.current = true;
    try {
      // Skip the intro: the clock starts with the song.
      p.seekTo(SONG_START_SECONDS, true);
      p.playVideo();
    } catch {
      /* ignore */
    }
    const check = (bufferAllowance: number) => {
      if (!awaitingPlayRef.current || phaseRef.current === "live") return;
      let state: number = YT_STATE.UNSTARTED;
      try {
        state = p.getPlayerState();
      } catch {
        /* ignore */
      }
      if (state === YT_STATE.BUFFERING && bufferAllowance > 0) {
        // Slow network rather than a blocked autoplay: give it a bit longer.
        setTimer("watchdog", () => check(0), bufferAllowance);
        return;
      }
      if (state !== YT_STATE.PLAYING) setPhase("blocked");
    };
    setTimer("watchdog", () => check(BUFFER_GRACE_MS), PLAY_WATCHDOG_MS);
  }, [setPhase, setTimer]);

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
    awaitingPlayRef.current = false;
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* ignore */
    }
    setCount(COUNTDOWN_FROM);
    setPhase("countdown");
  }, [clearTimer, setPhase, setStops, setUndoable]);

  const exit = useCallback(() => {
    const ph = phaseRef.current;
    const mid = ph === "countdown" || ph === "live" || ph === "finishing";
    if (mid && !confirmExit) {
      setConfirmExit(true);
      setTimer("confirm", () => setConfirmExit(false), CONFIRM_MS);
      return;
    }
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* ignore */
    }
    router.push(ROUTES.home);
  }, [confirmExit, router, setTimer]);

  // Player events need the latest handlers without re-creating the player.
  useEffect(() => {
    onStateRef.current = (state: number) => {
      const ph = phaseRef.current;
      if (state === YT_STATE.PLAYING) {
        const d = readSongLength();
        if (d > 0 && d !== songLengthRef.current) setSongLength(d);
        if (awaitingPlayRef.current) {
          awaitingPlayRef.current = false;
          clearTimer("watchdog");
          const t = elapsed();
          startedAtRef.current = new Date(Date.now() - t * 1000).toISOString();
          setRound((r) => r + 1);
          setPhase("live");
          try {
            navigator.vibrate?.(30);
          } catch {
            /* ignore */
          }
        } else if (ph !== "live" && ph !== "finishing") {
          // Playback we didn't ask for (e.g. after a seek): keep it parked.
          try {
            playerRef.current?.pauseVideo();
          } catch {
            /* ignore */
          }
        }
      } else if (state === YT_STATE.ENDED) {
        if (ph === "live" || ph === "finishing") finish("ended");
      }
    };
  }, [clearTimer, elapsed, finish, readSongLength, setPhase, setSongLength]);

  // ── mount: load the YouTube player ────────────────────────────────────────
  useEffect(() => {
    // Release the black <html> ground the launch transition set.
    document.documentElement.style.backgroundColor = "";
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const target = document.createElement("div");
    host.appendChild(target);
    const timerStore = timers.current;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(target, {
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
            onReady: (e) => {
              if (cancelled) return;
              let d = 0;
              try {
                d = e.target.getDuration();
              } catch {
                /* ignore */
              }
              if (Number.isFinite(d) && d > SONG_START_SECONDS) {
                setSongLength(d - SONG_START_SECONDS);
              }
              setCount(COUNTDOWN_FROM);
              setPhase("countdown");
            },
            onStateChange: (e) => {
              if (!cancelled) onStateRef.current(e.data);
            },
            onError: () => {
              if (cancelled) return;
              setErrorMsg("YouTube won't play the track here.");
              setPhase("error");
            },
          },
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Could not load YouTube.");
        setPhase("error");
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      target.remove();
      for (const id of Object.values(timerStore)) {
        if (id) window.clearTimeout(id);
      }
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [setPhase, setSongLength]);

  // ── countdown: 3 → 2 → 1 → GO (play) ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count > 0) {
      const id = window.setTimeout(() => setCount((c) => c - 1), 1000);
      return () => window.clearTimeout(id);
    }
    startPlayback();
  }, [phase, count, startPlayback]);

  // ── the clock ticks while the song plays ──────────────────────────────────
  const running = phase === "live" || phase === "finishing";
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setClock(elapsed()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, [running, elapsed]);

  // ── keep the screen awake during the hold ─────────────────────────────────
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

  const progress = songLength > 0 ? Math.min(1, clock / songLength) : 0;
  const dark =
    phase === "loading" ||
    phase === "countdown" ||
    phase === "blocked" ||
    phase === "error";

  return (
    <div className={`${s.arena} ${running || phase === "finished" ? s.arenaLive : ""}`}>
      <header className={s.arenaBar}>
        <button
          type="button"
          className={`${s.arenaExit} ${confirmExit ? s.arenaExitConfirm : ""}`}
          onClick={exit}
        >
          {confirmExit ? "Tap again to leave" : "Exit"}
        </button>

        <div className={s.arenaClock} aria-live="off">
          <span
            className={`${s.livePill} ${running ? s.livePillOn : ""}`}
            aria-label={running ? "Live" : "Paused"}
          >
            <span className={s.liveDot} />
            {phase === "finished" ? "DONE" : running ? "LIVE" : "READY"}
          </span>
          <span className={s.clockDigits}>{formatSeconds(clock)}</span>
        </div>

        <div className={s.arenaTools}>
          <div className={s.playerDock}>
            <div ref={hostRef} className={s.playerHost} />
            <div className={s.playerShield} aria-hidden />
          </div>
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

      {undoable && running && (
        <button type="button" className={s.undoToast} onClick={undo}>
          Undo {undoable}
        </button>
      )}

      <div className={`${s.curtain} ${dark ? "" : s.curtainLifted}`}>
        {phase === "loading" && <p className={s.curtainText}>Loading</p>}
        {phase === "countdown" && (
          <div key={count} className={s.countStage}>
            <span className={s.flash} />
            <span className={s.shock} />
            <span className={`${s.shock} ${s.shockLate}`} />
            <div className={s.countNum}>{count > 0 ? count : "GO"}</div>
            <p className={s.curtainText}>
              {count > 0 ? "Get in position" : "Bring Sally up"}
            </p>
          </div>
        )}
        {phase === "blocked" && (
          <button type="button" className={s.bigBtn} onClick={startPlayback}>
            ▶ Play
          </button>
        )}
        {phase === "error" && (
          <>
            <p className={s.curtainText}>{errorMsg ?? "Something broke."}</p>
            <button
              type="button"
              className={s.bigBtn}
              onClick={() => router.push(ROUTES.home)}
            >
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
          onHome={() => router.push(ROUTES.home)}
          onRetry={() =>
            persist(
              outcomes,
              songLengthRef.current > 0 ? songLengthRef.current : null,
            )
          }
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
            if (prev === null) note = "First time";
            else if (typeof prev === "number") {
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
