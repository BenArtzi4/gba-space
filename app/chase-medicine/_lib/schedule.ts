// Pure, shared types + date/slot helpers for the Chase medicine tracker.
// No server or DB imports here, so both server actions and client components
// can use it.

export interface Medicine {
  id: string;
  name: string;
  times: string[]; // daily slots as "HH:MM"
  start_date: string; // "YYYY-MM-DD"
  end_date: string | null; // null = ongoing
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Dose {
  id: string;
  medicine_id: string;
  dose_date: string;
  dose_time: string;
  given_at: string; // ISO timestamp
  given_by: string | null;
}

export interface Slot {
  medicineId: string;
  name: string;
  time: string; // "HH:MM"
  given: boolean;
  givenAt: string | null; // ISO timestamp
  givenBy: string | null;
}

export interface DayData {
  date: string;
  slots: Slot[];
  meds: Medicine[];
}

/** Is a medicine scheduled on a given local date (YYYY-MM-DD)? */
export function isActiveOn(med: Medicine, date: string): boolean {
  if (!med.active) return false;
  if (med.start_date && date < med.start_date) return false;
  if (med.end_date && date > med.end_date) return false;
  return true;
}

/** Expand active meds into time-sorted slots for a date, merged with doses. */
export function buildSlots(
  meds: Medicine[],
  doses: Dose[],
  date: string,
): Slot[] {
  const slots: Slot[] = [];
  for (const med of meds) {
    if (!isActiveOn(med, date)) continue;
    for (const time of med.times) {
      const dose = doses.find(
        (d) => d.medicine_id === med.id && d.dose_time === time,
      );
      slots.push({
        medicineId: med.id,
        name: med.name,
        time,
        given: !!dose,
        givenAt: dose?.given_at ?? null,
        givenBy: dose?.given_by ?? null,
      });
    }
  }
  slots.sort(
    (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
  );
  return slots;
}

/** Local "YYYY-MM-DD" (not UTC) for a Date. */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Shift a "YYYY-MM-DD" by n days (local). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return localDateStr(dt);
}

/** "HH:MM" current local time, for overdue comparison. */
export function localTimeStr(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/** A slot is overdue if it's today, its time has passed, and it isn't given. */
export function isOverdue(slot: Slot, date: string, now: Date = new Date()): boolean {
  if (slot.given) return false;
  if (date !== localDateStr(now)) return false;
  return slot.time < localTimeStr(now);
}

/** Friendly "Today · Thu, 29 May" style label for a date string. */
export function dayLabel(date: string, today: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString(undefined, { weekday: "short" });
  const rest = dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  let prefix = "";
  if (date === today) prefix = "Today · ";
  else if (date === addDays(today, 1)) prefix = "Tomorrow · ";
  else if (date === addDays(today, -1)) prefix = "Yesterday · ";
  return `${prefix}${weekday}, ${rest}`;
}
