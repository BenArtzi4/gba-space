import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isUser, type User } from "./arena";

// Identity for App Arena: players sign in with their name + a shared password.
// We can't trust a plaintext name in a cookie (anyone could set it), so we store
// a signed token `"<name>.<hmac>"` and verify the signature on every request.
// The shared password and the signing secret live in env vars only.

export const COOKIE = "app_arena_auth";

function secret(): string {
  const s = process.env.APP_ARENA_SECRET;
  if (!s) throw new Error("Missing APP_ARENA_SECRET environment variable.");
  return s;
}

function sign(user: string): string {
  return createHmac("sha256", secret()).update(user).digest("hex");
}

/** Build the signed cookie value for a verified player. */
export function signIdentity(user: User): string {
  return `${user}.${sign(user)}`;
}

/** Verify a cookie value and return the player, or null if it's invalid. */
export function verifyIdentity(value: string | undefined | null): User | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const user = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!isUser(user)) return null;

  const expected = sign(user);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length === 0 || a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? user : null;
}
