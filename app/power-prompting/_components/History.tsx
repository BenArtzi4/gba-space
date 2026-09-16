"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSession, updateResult, updateSessionDate } from "../actions";
import {
  ATHLETES,
  ATHLETE_COLORS,
  formatDate,
  formatSeconds,
  formatTime,
  parseSeconds,
  ROUTES,
  sessionWinner,
  type Athlete,
  type AthleteStats,
  type SessionRow,
} from "../_lib/challenge";
import s from "./power-prompting.module.css";

export default function History({
  sessions,
  stats,
  error,
}: {
  sessions: SessionRow[];
  stats: AthleteStats[];
  error: string | null;
}) {
  return (
    <main className={s.page}>
      <header className={s.topbar}>
        <Link href={ROUTES.home} className={s.backLink}>
          ← Home
        </Link>
      </header>

      <section className={s.pageHead}>
        <h1 className={s.pageTitle}>History</h1>
        <p className={s.pageLede}>
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
          {stats.some((st) => st.best) &&
            ` · ${stats
              .filter((st) => st.best)
              .map((st) => `${st.athlete} ${formatSeconds(st.best!.seconds)}`)
              .join(" · ")}`}
        </p>
      </section>

      {error && (
        <p className={s.notice} role="alert">
          History unavailable right now.
        </p>
      )}

      {sessions.length === 0 && !error ? (
        <div className={s.card}>
          <p className={s.empty}>No sessions yet.</p>
        </div>
      ) : (
        <ol className={s.historyList}>
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </ol>
      )}
    </main>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

type Draft = {
  date: string;
  times: Record<Athlete, string>;
  finished: Record<Athlete, boolean>;
};

function draftFrom(session: SessionRow): Draft {
  const times = {} as Record<Athlete, string>;
  const finished = {} as Record<Athlete, boolean>;
  for (const a of ATHLETES) {
    const r = session.results.find((x) => x.athlete === a);
    times[a] = r ? formatSeconds(r.seconds) : "";
    finished[a] = r ? r.completed : false;
  }
  return { date: toLocalInput(session.startedAt), times, finished };
}

function SessionCard({ session }: { session: SessionRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(session));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const winner = sessionWinner(session);

  function beginEdit() {
    setDraft(draftFrom(session));
    setErr(null);
    setEditing(true);
  }

  function saveEdit() {
    setErr(null);
    const ops: Promise<void>[] = [];
    for (const r of session.results) {
      const seconds = parseSeconds(draft.times[r.athlete]);
      if (seconds === null) {
        setErr(`${r.athlete}: use m:ss.t, e.g. 2:14.3`);
        return;
      }
      const completed = draft.finished[r.athlete];
      if (seconds !== r.seconds || completed !== r.completed) {
        ops.push(updateResult(r.id, { seconds, completed }));
      }
    }
    const when = new Date(draft.date);
    if (Number.isNaN(when.getTime())) {
      setErr("Pick a valid date.");
      return;
    }
    if (when.getTime() !== new Date(session.startedAt).getTime()) {
      ops.push(updateSessionDate(session.id, when.toISOString()));
    }
    startTransition(async () => {
      try {
        await Promise.all(ops);
        setEditing(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        await deleteSession(session.id);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not delete");
      }
    });
  }

  return (
    <li className={`${s.historyCard} ${pending ? s.historyCardBusy : ""}`}>
      <div className={s.historyHead}>
        <div className={s.sessionWhen}>
          <span>{formatDate(session.startedAt)}</span>
          <span className={s.sessionClock}>{formatTime(session.startedAt)}</span>
        </div>
        <div className={s.historyActions}>
          {!editing && (
            <button type="button" className={s.ghostBtn} onClick={beginEdit}>
              Edit
            </button>
          )}
          <button
            type="button"
            className={`${s.ghostBtn} ${confirmDelete ? s.ghostBtnDanger : ""}`}
            onClick={remove}
            disabled={pending}
          >
            {confirmDelete ? "Sure?" : "Delete"}
          </button>
        </div>
      </div>

      {editing ? (
        <form
          className={s.editForm}
          onSubmit={(e) => {
            e.preventDefault();
            saveEdit();
          }}
        >
          <label className={s.field}>
            <span>Date</span>
            <input
              type="datetime-local"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              required
            />
          </label>
          {session.results.map((r) => (
            <div key={r.id} className={s.editRow}>
              <span
                className={s.editName}
                style={{ "--athlete": ATHLETE_COLORS[r.athlete] } as React.CSSProperties}
              >
                <span className={s.dot} />
                {r.athlete}
              </span>
              <label className={s.field}>
                <span>Time</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.times[r.athlete]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      times: { ...draft.times, [r.athlete]: e.target.value },
                    })
                  }
                  placeholder="2:14.3"
                  required
                />
              </label>
              <label className={s.check}>
                <input
                  type="checkbox"
                  checked={draft.finished[r.athlete]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      finished: {
                        ...draft.finished,
                        [r.athlete]: e.target.checked,
                      },
                    })
                  }
                />
                <span>Finished</span>
              </label>
            </div>
          ))}
          {err && <p className={s.formError}>{err}</p>}
          <div className={s.editActions}>
            <button type="submit" className={s.primaryBtn} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <ul className={s.summaryList}>
            {ATHLETES.map((athlete) => {
              const r = session.results.find((x) => x.athlete === athlete);
              return (
                <li
                  key={athlete}
                  className={`${s.summaryRow} ${winner === athlete ? s.summaryWon : ""}`}
                  style={{ "--athlete": ATHLETE_COLORS[athlete] } as React.CSSProperties}
                >
                  <span className={s.dot} />
                  <span className={s.summaryName}>{athlete}</span>
                  <span className={`${s.mono} ${s.summaryTime}`}>
                    {r ? formatSeconds(r.seconds) : "—"}
                  </span>
                  {r?.completed && <span className={s.badge}>Finished</span>}
                  {winner === athlete && <span className={s.crown}>Won</span>}
                </li>
              );
            })}
          </ul>
          {err && <p className={s.formError}>{err}</p>}
        </>
      )}
    </li>
  );
}
