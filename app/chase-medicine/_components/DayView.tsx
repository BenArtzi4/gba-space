"use client";

import { useState } from "react";
import { dayLabel, isOverdue, type DayData } from "../_lib/schedule";
import s from "./chase.module.css";

interface Props {
  date: string;
  today: string;
  data: DayData | null;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onGive: (medId: string, time: string) => Promise<void>;
  onUndo: (medId: string, time: string) => Promise<void>;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DayView({
  date,
  today,
  data,
  onPrev,
  onNext,
  onToday,
  onGive,
  onUndo,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const slots = data?.slots ?? [];

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={s.dateBar}>
        <button className={s.navBtn} onClick={onPrev} aria-label="Previous day">
          ‹
        </button>
        <div className={s.dateLabel}>
          {dayLabel(date, today)}
          {date !== today && (
            <button className={s.today} onClick={onToday}>
              jump to today
            </button>
          )}
        </div>
        <button className={s.navBtn} onClick={onNext} aria-label="Next day">
          ›
        </button>
      </div>

      {data === null ? (
        <div className={s.empty}>Loading…</div>
      ) : slots.length === 0 ? (
        <div className={s.empty}>
          Nothing scheduled for this day.
          <br />
          Add a medicine to get started.
        </div>
      ) : (
        <div className={s.slots}>
          {slots.map((slot) => {
            const key = `${slot.medicineId}-${slot.time}`;
            const overdue = isOverdue(slot, date);
            const cls = [
              s.slot,
              slot.given ? s.slotGiven : "",
              overdue ? s.slotOverdue : "",
            ].join(" ");
            return (
              <div key={key} className={cls}>
                <div className={s.time}>{slot.time}</div>
                <div className={s.slotMain}>
                  <div className={s.name}>{slot.name}</div>
                  {slot.given && slot.givenAt ? (
                    <div className={`${s.meta} ${s.metaGiven}`}>
                      ✓ given {fmtTime(slot.givenAt)}
                      {slot.givenBy ? ` · ${slot.givenBy}` : ""}
                    </div>
                  ) : overdue ? (
                    <div className={`${s.meta} ${s.metaOverdue}`}>⚠ overdue</div>
                  ) : (
                    <div className={s.meta}>not yet given</div>
                  )}
                </div>
                {slot.given ? (
                  <button
                    className={s.undoBtn}
                    disabled={busy === key}
                    onClick={() =>
                      run(key, () => onUndo(slot.medicineId, slot.time))
                    }
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    className={s.giveBtn}
                    disabled={busy === key}
                    onClick={() =>
                      run(key, () => onGive(slot.medicineId, slot.time))
                    }
                  >
                    {busy === key ? "…" : "Give"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
