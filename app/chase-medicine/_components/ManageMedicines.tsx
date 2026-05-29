"use client";

import { useState } from "react";
import { type Medicine } from "../_lib/schedule";
import s from "./chase.module.css";

interface Props {
  meds: Medicine[];
  onStop: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function rangeText(med: Medicine): string {
  if (!med.end_date) return `from ${med.start_date} · ongoing`;
  return `${med.start_date} → ${med.end_date}`;
}

export default function ManageMedicines({
  meds,
  onStop,
  onResume,
  onDelete,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  if (meds.length === 0) {
    return <div className={s.empty}>No medicines yet.</div>;
  }

  return (
    <div>
      {meds.map((med) => (
        <div key={med.id} className={s.medItem}>
          <div className={s.medInfo}>
            <div className={`${s.medName} ${med.active ? "" : s.medStopped}`}>
              {med.name}
              {!med.active && " · stopped"}
            </div>
            <div className={s.meta}>
              {med.times.join(", ")} · {rangeText(med)}
            </div>
          </div>
          {med.active ? (
            <button
              className={s.linkBtn}
              disabled={busy === med.id}
              onClick={() => run(med.id, () => onStop(med.id))}
            >
              Stop
            </button>
          ) : (
            <button
              className={s.linkBtn}
              disabled={busy === med.id}
              onClick={() => run(med.id, () => onResume(med.id))}
            >
              Resume
            </button>
          )}
          <button
            className={`${s.linkBtn} ${s.linkDanger}`}
            disabled={busy === med.id}
            onClick={() => {
              if (
                confirm(
                  `Delete "${med.name}" and its history? This can't be undone.`,
                )
              ) {
                run(med.id, () => onDelete(med.id));
              }
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
