import Link from "next/link";
import type { Overview as OverviewData, OverviewRow } from "../_lib/overview";
import s from "./all.module.css";

const GROUPS: { key: OverviewRow["status"]; label: string }[] = [
  { key: "live", label: "Live" },
  { key: "wip", label: "In progress" },
  { key: "private", label: "Private" },
  { key: "system", label: "System" },
];

function Row({ row }: { row: OverviewRow }) {
  const body = (
    <>
      <span className={s.rowTop}>
        <span className={s.rowTitle}>
          {row.emoji ? `${row.emoji} ` : ""}
          {row.title}
        </span>
        <span className={s.badges}>
          {row.drift === "unregistered" && (
            <span className={`${s.badge} ${s.warn}`}>not in registry</span>
          )}
          {row.drift === "missing" && (
            <span className={`${s.badge} ${s.danger}`}>folder missing</span>
          )}
        </span>
      </span>
      <span className={s.rowDesc}>{row.description}</span>
      <span className={s.rowMeta}>
        <code className={s.slug}>{row.href}</code>
        {row.added && <span className={s.added}>added {row.added}</span>}
      </span>
    </>
  );

  // Don't link to a route whose folder no longer exists (would 404).
  return row.exists ? (
    <Link href={row.href} className={s.row}>
      {body}
    </Link>
  ) : (
    <div className={`${s.row} ${s.rowDead}`}>{body}</div>
  );
}

export default function Overview({ data }: { data: OverviewData }) {
  const { rows, counts } = data;

  return (
    <main className={s.main}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>All routes</h1>
          <p className={s.subtitle}>
            Everything under gba-space — generated from the live app + registry.
          </p>
        </div>
        <Link href="/spaces" className={s.publicLink}>
          public directory →
        </Link>
      </header>

      <div className={s.summary}>
        <span className={s.stat}>
          <strong>{counts.total}</strong> routes
        </span>
        <span className={s.dot}>·</span>
        <span className={s.stat}>{counts.live} live</span>
        <span className={s.stat}>{counts.wip} wip</span>
        <span className={s.stat}>{counts.private} private</span>
        {counts.drift > 0 && (
          <span className={`${s.stat} ${s.driftStat}`}>
            ⚠ {counts.drift} need attention
          </span>
        )}
      </div>

      {GROUPS.map(({ key, label }) => {
        const group = rows.filter((r) => r.status === key);
        if (group.length === 0) return null;
        return (
          <section key={key} className={s.group}>
            <h2 className={s.groupHead}>
              {label} <span className={s.groupCount}>{group.length}</span>
            </h2>
            <div className={s.list}>
              {group.map((row) => (
                <Row key={`${row.slug}-${row.exists}`} row={row} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
