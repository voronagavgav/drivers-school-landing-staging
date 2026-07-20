// ---------------------------------------------------------------------------
// Pure "detoxified" streak calculator. No clock, no DB, no randomness. A single
// missed day auto-consumes a freeze token instead of resetting the streak — the
// policy is never punitive, and this fn returns STATE only (copy is a W12
// concern). Self-contained (no `@/…` imports) so an oracle smoke can resolve it
// via a relative import. The day gap is derived by parsing ISO day keys to UTC
// day indices — deterministic, NOT a `now` read.
// ---------------------------------------------------------------------------

export interface StreakState {
  current: number;
  best: number;
  lastDay: string | null;
}

export interface NextStreakState {
  current: number;
  best: number;
  lastDay: string;
  freezeTokens: number;
  usedFreeze: boolean;
}

/**
 * Convert an ISO `YYYY-MM-DD` day key into a UTC day index (days since epoch).
 * Deterministic: parses the calendar fields and uses `Date.UTC`, never a clock.
 */
function dayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Compute the next streak state after a day of activity.
 *
 * Transition contract (gap = todayIndex − lastIndex):
 * - `prev.lastDay === null` → first day: `current=1`, `best=max(prev.best,1)`, tokens unchanged;
 * - gap `0` (same day) → idempotent: unchanged current/best, tokens unchanged;
 * - gap `1` (consecutive) → `current+1`, `best=max`, tokens unchanged;
 * - gap `2` (one missed day) & `tokens>0` → auto-freeze: `current+1`, `best=max`, `freezeTokens-1`,
 *   `usedFreeze=true`;
 * - gap `2` & `tokens===0` → reset: `current=1`, `best` unchanged, tokens unchanged;
 * - gap `≥3` (multiple missed days) → reset: `current=1`, `best` unchanged, tokens unchanged.
 *
 * `lastDay` in the result is always `todayKey`.
 */
export function nextStreakState(
  prev: StreakState,
  todayKey: string,
  tokens: number,
): NextStreakState {
  if (prev.lastDay === null) {
    return {
      current: 1,
      best: Math.max(prev.best, 1),
      lastDay: todayKey,
      freezeTokens: tokens,
      usedFreeze: false,
    };
  }

  const gap = dayIndex(todayKey) - dayIndex(prev.lastDay);

  // Same day (or any non-advancing key): idempotent no-op.
  if (gap <= 0) {
    return {
      current: prev.current,
      best: prev.best,
      lastDay: todayKey,
      freezeTokens: tokens,
      usedFreeze: false,
    };
  }

  // Consecutive day: extend the streak.
  if (gap === 1) {
    const current = prev.current + 1;
    return {
      current,
      best: Math.max(prev.best, current),
      lastDay: todayKey,
      freezeTokens: tokens,
      usedFreeze: false,
    };
  }

  // Exactly one missed day with a token to spend: auto-freeze, streak survives.
  if (gap === 2 && tokens > 0) {
    const current = prev.current + 1;
    return {
      current,
      best: Math.max(prev.best, current),
      lastDay: todayKey,
      freezeTokens: tokens - 1,
      usedFreeze: true,
    };
  }

  // Missed day(s) with no token, or multiple missed days: reset (best preserved).
  return {
    current: 1,
    best: prev.best,
    lastDay: todayKey,
    freezeTokens: tokens,
    usedFreeze: false,
  };
}
