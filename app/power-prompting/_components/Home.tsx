import Link from "next/link";
import LaunchProvider from "./LaunchProvider";
import HeroArt from "./HeroArt";
import StartButton from "./StartButton";
import {
  ATHLETES,
  ATHLETE_COLORS,
  formatDate,
  formatSeconds,
  ROUTES,
  sessionWinner,
  type AthleteStats,
  type Dashboard,
  type SessionRow,
} from "../_lib/challenge";
import s from "./power-prompting.module.css";

export default function Home({
  dashboard,
  error,
}: {
  dashboard: Dashboard;
  error: string | null;
}) {
  const { stats, headToHead, last, sessions } = dashboard;
  const recent = sessions.slice(0, 5);

  return (
    <LaunchProvider>
      <main className={s.page}>
        <header className={s.topbar}>
          <div className={s.brand}>
            <BrandMark />
            <span className={s.brandName}>Power Prompting</span>
          </div>
          <nav className={s.nav} aria-label="Space">
            <Link href={ROUTES.history} className={s.navLink}>
              History
            </Link>
          </nav>
        </header>

        <section className={s.hero}>
          <HeroArt />
          <h1 className={s.heroTitle}>
            Bring Sally up.
            <br />
            <span className={s.heroTitleMuted}>Then hold.</span>
          </h1>
          <StartButton />
        </section>

        {error && (
          <p className={s.notice} role="status">
            History unavailable right now.
          </p>
        )}

        <section className={s.section} aria-labelledby="bests">
          <div className={s.sectionHead}>
            <h2 id="bests" className={s.sectionTitle}>
              Personal bests
            </h2>
          </div>
          <div className={s.bestGrid}>
            {stats.map((st) => (
              <BestCard key={st.athlete} stats={st} />
            ))}
          </div>
        </section>

        <section className={s.duoGrid}>
          <div className={s.card}>
            <h2 className={s.cardTitle}>Head to head</h2>
            {headToHead.contested === 0 ? (
              <p className={s.empty}>No rounds yet.</p>
            ) : (
              <>
                <div className={s.h2h}>
                  <span
                    className={s.h2hName}
                    style={{ color: ATHLETE_COLORS[ATHLETES[0]] }}
                  >
                    {ATHLETES[0]}
                  </span>
                  <span className={s.h2hScore}>
                    {headToHead.wins[ATHLETES[0]]}
                    <span className={s.h2hDash}>–</span>
                    {headToHead.wins[ATHLETES[1]]}
                  </span>
                  <span
                    className={s.h2hName}
                    style={{ color: ATHLETE_COLORS[ATHLETES[1]] }}
                  >
                    {ATHLETES[1]}
                  </span>
                </div>
                <H2HBar
                  a={headToHead.wins[ATHLETES[0]]}
                  b={headToHead.wins[ATHLETES[1]]}
                  ties={headToHead.ties}
                />
                {headToHead.ties > 0 && (
                  <p className={s.cardFoot}>
                    {headToHead.ties} tie{headToHead.ties === 1 ? "" : "s"}
                  </p>
                )}
              </>
            )}
          </div>

          <div className={s.card}>
            <h2 className={s.cardTitle}>Last session</h2>
            {last ? (
              <SessionSummary session={last} />
            ) : (
              <p className={s.empty}>Nothing yet.</p>
            )}
          </div>
        </section>

        <section className={s.section} aria-labelledby="recent">
          <div className={s.sectionHead}>
            <h2 id="recent" className={s.sectionTitle}>
              Recent
            </h2>
            <Link href={ROUTES.history} className={s.sectionLink}>
              All history →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className={s.card}>
              <p className={s.empty}>No sessions yet.</p>
            </div>
          ) : (
            <ol className={s.sessionList}>
              {recent.map((session) => (
                <li key={session.id} className={s.sessionRow}>
                  <span className={s.sessionWhen}>
                    {formatDate(session.startedAt)}
                  </span>
                  <div className={s.sessionTimes}>
                    {ATHLETES.map((athlete) => {
                      const r = session.results.find(
                        (x) => x.athlete === athlete,
                      );
                      const won = sessionWinner(session) === athlete;
                      return (
                        <span
                          key={athlete}
                          className={`${s.sessionTime} ${won ? s.sessionWon : ""}`}
                          style={{ "--athlete": ATHLETE_COLORS[athlete] } as React.CSSProperties}
                        >
                          <span className={s.dot} />
                          <span className={s.sessionAthlete}>{athlete}</span>
                          <span className={s.mono}>
                            {r ? formatSeconds(r.seconds) : "—"}
                          </span>
                          {r?.completed && (
                            <span className={s.flag} title="Finished the song">
                              🏁
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </LaunchProvider>
  );
}

function BestCard({ stats }: { stats: AthleteStats }) {
  const color = ATHLETE_COLORS[stats.athlete];
  return (
    <article
      className={s.bestCard}
      style={{ "--athlete": color } as React.CSSProperties}
    >
      <div className={s.bestHead}>
        <span className={s.dot} />
        <span className={s.bestName}>{stats.athlete}</span>
        {stats.best?.completed && <span className={s.badge}>Finished</span>}
      </div>
      <div className={`${s.bestTime} ${stats.best ? "" : s.bestTimeEmpty}`}>
        {stats.best ? formatSeconds(stats.best.seconds) : "0:00.0"}
      </div>
      <p className={s.bestWhen}>
        {stats.best ? formatDate(stats.best.startedAt) : "No time yet"}
      </p>
      <dl className={s.statRow}>
        <div>
          <dt>Sessions</dt>
          <dd>{stats.sessions}</dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>{stats.average === null ? "—" : formatSeconds(stats.average)}</dd>
        </div>
        <div>
          <dt>Finished</dt>
          <dd>{stats.finishes}</dd>
        </div>
      </dl>
    </article>
  );
}

function H2HBar({ a, b, ties }: { a: number; b: number; ties: number }) {
  const total = a + b + ties || 1;
  return (
    <div className={s.h2hBar} aria-hidden>
      <span
        style={{
          width: `${(a / total) * 100}%`,
          background: ATHLETE_COLORS[ATHLETES[0]],
        }}
      />
      <span style={{ width: `${(ties / total) * 100}%` }} />
      <span
        style={{
          width: `${(b / total) * 100}%`,
          background: ATHLETE_COLORS[ATHLETES[1]],
        }}
      />
    </div>
  );
}

function SessionSummary({ session }: { session: SessionRow }) {
  const winner = sessionWinner(session);
  return (
    <div>
      <p className={s.cardMeta}>{formatDate(session.startedAt)}</p>
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
    </div>
  );
}

function BrandMark() {
  // A terminal chevron with a Claude-orange underscore: prompting + power.
  return (
    <svg
      className={s.brandMark}
      viewBox="0 0 32 32"
      width="28"
      height="28"
      aria-hidden
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#1d1d1f" />
      <path
        d="M9 10.5 16 16l-7 5.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 21.5h5"
        stroke="#d97757"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
