"use server";

import { cookies } from "next/headers";
import { getSupabase } from "./_lib/supabase";
import {
  buildSlots,
  type DayData,
  type Dose,
  type Medicine,
} from "./_lib/schedule";

const COOKIE = "chase_auth";

async function isUnlocked(): Promise<boolean> {
  const code = process.env.CHASE_CODE;
  if (!code) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === code;
}

async function requireUnlocked() {
  if (!(await isUnlocked())) throw new Error("locked");
}

/** Verify the passcode and, on success, set a long-lived httpOnly cookie. */
export async function unlock(code: string): Promise<{ ok: boolean }> {
  const expected = process.env.CHASE_CODE;
  if (!expected || code !== expected) return { ok: false };
  const jar = await cookies();
  jar.set(COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/chase-medicine",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return { ok: true };
}

/** All medicines + the time-sorted slots for one local date. */
export async function getDay(date: string): Promise<DayData> {
  await requireUnlocked();
  const db = getSupabase();

  const [{ data: meds, error: mErr }, { data: doses, error: dErr }] =
    await Promise.all([
      db.from("medicines").select("*").order("created_at", { ascending: true }),
      db.from("doses").select("*").eq("dose_date", date),
    ]);
  if (mErr) throw new Error(mErr.message);
  if (dErr) throw new Error(dErr.message);

  const medicines = (meds ?? []) as Medicine[];
  const slots = buildSlots(medicines, (doses ?? []) as Dose[], date);
  return { date, slots, meds: medicines };
}

export async function giveDose(
  medicineId: string,
  date: string,
  time: string,
  by: string | null,
): Promise<void> {
  await requireUnlocked();
  const db = getSupabase();
  const { error } = await db.from("doses").upsert(
    {
      medicine_id: medicineId,
      dose_date: date,
      dose_time: time,
      given_by: by,
      given_at: new Date().toISOString(),
    },
    { onConflict: "medicine_id,dose_date,dose_time" },
  );
  if (error) throw new Error(error.message);
}

export async function undoDose(
  medicineId: string,
  date: string,
  time: string,
): Promise<void> {
  await requireUnlocked();
  const db = getSupabase();
  const { error } = await db
    .from("doses")
    .delete()
    .eq("medicine_id", medicineId)
    .eq("dose_date", date)
    .eq("dose_time", time);
  if (error) throw new Error(error.message);
}

/** Correct the recorded time a dose was given (e.g. given at 14:00 but logged at 15:00). */
export async function setGivenTime(
  medicineId: string,
  date: string,
  time: string,
  givenAtISO: string,
): Promise<void> {
  await requireUnlocked();
  if (Number.isNaN(Date.parse(givenAtISO))) throw new Error("Invalid time");
  const db = getSupabase();
  const { error } = await db
    .from("doses")
    .update({ given_at: givenAtISO })
    .eq("medicine_id", medicineId)
    .eq("dose_date", date)
    .eq("dose_time", time);
  if (error) throw new Error(error.message);
}

export async function addMedicine(input: {
  name: string;
  times: string[];
  startDate: string;
  endDate: string | null;
  notes: string | null;
}): Promise<void> {
  await requireUnlocked();
  const name = input.name.trim();
  const times = [...new Set(input.times.filter(Boolean))].sort();
  if (!name) throw new Error("Name is required");
  if (times.length === 0) throw new Error("At least one time is required");

  const db = getSupabase();
  const { error } = await db.from("medicines").insert({
    name,
    times,
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/** Stop a medicine now (hide it going forward; keeps dose history). */
export async function stopMedicine(id: string): Promise<void> {
  await requireUnlocked();
  const db = getSupabase();
  const { error } = await db
    .from("medicines")
    .update({ active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Re-activate a stopped medicine. */
export async function resumeMedicine(id: string): Promise<void> {
  await requireUnlocked();
  const db = getSupabase();
  const { error } = await db
    .from("medicines")
    .update({ active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Permanently delete a medicine and its dose history. */
export async function deleteMedicine(id: string): Promise<void> {
  await requireUnlocked();
  const db = getSupabase();
  const { error } = await db.from("medicines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
