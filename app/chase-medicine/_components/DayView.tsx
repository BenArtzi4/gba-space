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
  onSetTime: (medId: string, time: string, givenAtISO: string) => Promise<void>;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** local HH:MM for a time input, from an ISO timestamp */
function localHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
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
  onSetTime,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const slots = data?.slots ?? [];

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  function startEdit(key: string, givenAt: string) {
    setEditingKey(key);
    setEditValue(localHHMM(givenAt));
  }

  async function saveEdit(medId: string, slotTime: string, key: string) {
    if (!editValue) return;
    const iso = new Date(`${date}T${editValue}:00`).toISOString();
    await run(key, () => onSetTime(medId, slotTime, iso));
    setEditingKey(null);
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
            const editing = editingKey === key;
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
                    editing ? (
                      <div className={s.editRow}>
                        <input
                          type="time"
                          className={s.editInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                        <button
                          className={s.saveBtn}
                          disabled={busy === key}
                          onClick={() => saveEdit(slot.medicineId, slot.time, key)}
                        >
                          Save
                        </button>
                        <button
                          className={s.cancelBtn}
                          onClick={() => setEditingKey(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className={`${s.meta} ${s.metaGiven}`}>
                        ✓ given {fmtTime(slot.givenAt)}
                        {slot.givenBy ? ` · ${slot.givenBy}` : ""}
                        <button
                          className={s.editLink}
                          onClick={() => startEdit(key, slot.givenAt!)}
                        >
                          edit time
                        </button>
                      </div>
                    )
                  ) : overdue ? (
                    <div className={`${s.meta} ${s.metaOverdue}`}>⚠ overdue</div>
                  ) : (
                    <div className={s.meta}>not yet given</div>
                  )}
                </div>
                {!editing &&
                  (slot.given ? (
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
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
