import "server-only";
import { ensureSeedAdmin } from "./accounts";
import {
  getSession,
  isConfigured as sessionConfigured,
  requireStaff,
  signInWithPassword,
  signOutSession,
} from "./session";

/**
 * Compatibility surface over the real session layer.
 *
 * This module used to hold the phase-1 shared passphrase. It now delegates to
 * accounts and sessions, keeping the same four exports so the fourteen admin
 * call sites did not all have to change in the same commit as the auth
 * rewrite — a large mechanical diff on top of a security change is how a
 * genuine mistake gets lost in review.
 */

export { isConfigured } from "./session";

/** True when the session belongs to staff. */
export async function isAdmin(): Promise<boolean> {
  return (await requireStaff()) !== null;
}

/** Any signed-in user, whatever their role. */
export async function currentSession() {
  return getSession();
}

export async function signIn(email: string, password: string): Promise<boolean> {
  // Seeded on demand, so the very first sign-in works on a fresh store.
  await ensureSeedAdmin();
  const res = await signInWithPassword(email, password);
  return res.ok;
}

export async function signOut(): Promise<void> {
  await signOutSession();
}

export function configured(): boolean {
  return sessionConfigured();
}
