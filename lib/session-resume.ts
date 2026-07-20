// ---------------------------------------------------------------------------
// Pure resumable-session selector. No DB, no React. The DB query + dashboard
// wiring lives in lib/server/test-engine (task wave2-ux-03); this layer just
// picks the session a user should be offered to resume.
// ---------------------------------------------------------------------------

/** Minimal shape this selector needs; extra fields are preserved on the result. */
export interface ResumableSession {
  id: string;
  status: string;
  /** epoch ms or a Date (Prisma DateTime) — compared via new Date(x).getTime(). */
  startedAt: number | Date;
}

/**
 * Pick the session a user can resume: the most-recently STARTED session whose
 * status is "IN_PROGRESS". Returns the full input object (with any extra fields)
 * or null when none is in progress.
 */
export function selectResumableSession<T extends ResumableSession>(
  sessions: readonly T[],
): T | null {
  let latest: T | null = null;
  let latestMs = -Infinity;
  for (const session of sessions) {
    if (session.status !== "IN_PROGRESS") continue;
    const ms = new Date(session.startedAt).getTime();
    if (ms > latestMs) {
      latestMs = ms;
      latest = session;
    }
  }
  return latest;
}
