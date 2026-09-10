import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  AGENCY_ROLES,
  STAFF_ROLES,
  findUserByEmail,
  getUser,
  recordLogin,
  verifyPassword,
  type Role,
} from "./accounts";

/**
 * Signed session cookie.
 *
 * The payload carries the user id only. Role and agency are re-read from the
 * store on every request rather than trusted from the cookie, so revoking
 * someone or changing their role takes effect immediately instead of whenever
 * their session happens to expire.
 */

const COOKIE = "lavion_session";
const MAX_AGE = 60 * 60 * 8;

export interface Session {
  userId: string;
  email: string;
  name: string;
  role: Role;
  agencyId?: string;
}

function secret(): string | null {
  const p = process.env.ADMIN_PASSPHRASE;
  return p && p.length >= 8 ? p : null;
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function seal(userId: string, key: string): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${userId}.${exp}`;
  return `${body}.${sign(body, key)}`;
}

function unseal(token: string, key: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const expected = sign(`${userId}.${expRaw}`, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}

/**
 * `await connection()` before every auth decision, so a route that resolves to
 * "signed out" is never prerendered and cached as such.
 */
export async function getSession(): Promise<Session | null> {
  await connection();

  const key = secret();
  if (!key) return null;

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const userId = unseal(token, key);
  if (!userId) return null;

  const user = await getUser(userId);
  if (!user || !user.active) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    agencyId: user.agencyId,
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  await connection();

  const key = secret();
  if (!key) return { ok: false, error: "Sign-in is not configured." };

  const user = await findUserByEmail(email);

  // Same message and roughly the same work either way: distinguishing
  // "no such account" from "wrong password" tells an attacker which emails
  // are registered.
  const fail = { ok: false as const, error: "Those details are not correct." };
  if (!user || !user.active) {
    await verifyPassword(password, "scrypt$00$00");
    return fail;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return fail;

  const jar = await cookies();
  jar.set(COOKIE, seal(user.id, key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  await recordLogin(user.id);

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agencyId: user.agencyId,
    },
  };
}

export async function signOutSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/* ---------- guards ---------- */

export async function requireStaff(): Promise<Session | null> {
  const s = await getSession();
  return s && STAFF_ROLES.includes(s.role) ? s : null;
}

export async function requireAgency(): Promise<Session | null> {
  const s = await getSession();
  return s && AGENCY_ROLES.includes(s.role) ? s : null;
}

/**
 * Agency scoping. Staff get undefined, meaning "no filter"; an agency user
 * gets their own id, which every scoped query must apply.
 */
export async function scopeAgencyId(): Promise<string | undefined | null> {
  const s = await getSession();
  if (!s) return null;
  return STAFF_ROLES.includes(s.role) ? undefined : s.agencyId;
}

export function isConfigured(): boolean {
  return secret() !== null;
}
