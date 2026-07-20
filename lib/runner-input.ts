/**
 * Pure test-runner input decision logic — Wave-12b §D bullets 3–5 + 7.
 *
 * Digit-key selection, swipe navigation, and reload-resume of the question index
 * are DECISIONS captured here as pure functions so they are deterministic and
 * unit-testable (spec §H: audit tools can't synthesize keys/swipes, so this class
 * of behavior is proven at the unit level). All DOM/browser signals (key strings,
 * pointer deltas, sessionStorage values) are INJECTED by `components/test-runner.tsx`,
 * never read here.
 */

/** A swipe below this horizontal distance (px) is treated as an accidental drag. */
export const SWIPE_THRESHOLD = 48;

/**
 * Map a keyboard key to a 0-based option index: "1".."9" select options 1..9
 * when the question has that many options; anything else ("0", "Enter", "12",
 * multi-char strings) is null so the caller ignores the event.
 */
export function digitToOptionIndex(key: string, optionCount: number): number | null {
  if (key.length !== 1 || key < "1" || key > "9") return null;
  const index = key.charCodeAt(0) - "1".charCodeAt(0);
  return index < optionCount ? index : null;
}

/**
 * Classify a completed pointer/touch gesture by its deltas. Predominantly
 * vertical movement (|deltaY| > |deltaX|) is a scroll, never navigation;
 * a leftward swipe of at least `threshold` px advances ("next"), a rightward
 * one goes back ("prev"); anything shorter is null.
 */
export function swipeAction(
  deltaX: number,
  deltaY: number,
  threshold: number = SWIPE_THRESHOLD,
): "prev" | "next" | null {
  if (Math.abs(deltaY) > Math.abs(deltaX)) return null;
  if (deltaX <= -threshold) return "next";
  if (deltaX >= threshold) return "prev";
  return null;
}

/**
 * Parse a persisted question index (raw sessionStorage value) back into a safe
 * in-range index. Anything unparseable, negative, or past the end of the
 * session falls back to 0 — a corrupt value must never strand the runner.
 */
export function clampResumeIndex(saved: unknown, total: number): number {
  const n =
    typeof saved === "string"
      ? Number.parseInt(saved, 10)
      : typeof saved === "number"
        ? Math.trunc(saved)
        : Number.NaN;
  if (Number.isNaN(n) || n < 0 || n >= total) return 0;
  return n;
}
