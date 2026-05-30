"use server";

import { cookies } from "next/headers";

const COOKIE = "all_auth";

/** Verify the overview passcode and, on success, set a path-scoped cookie. */
export async function unlock(code: string): Promise<{ ok: boolean }> {
  const expected = process.env.SPACES_CODE;
  if (!expected || code !== expected) return { ok: false };
  const jar = await cookies();
  jar.set(COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/all",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return { ok: true };
}
