// ---------------------------------------------------------------------------
// PURE option catalogue for the value-first self-segment step (Wave 17, T2/P1.4).
// TAP choices only — every option is a single-select chip, ZERO free-text. Shared by
// the anon segment surface (app/segment/page.tsx) and its server actions
// (app/actions/segment.ts) so the rendered labels and the server-side validation bind
// to ONE source of truth. No I/O, no DB, no server-runtime modules — safe to import
// from a client-or-server page and from a "use server" action file alike.
// See docs/strategy/wave17-anon-funnel-adr.md.
// ---------------------------------------------------------------------------

/** Exam-timing self-report (JTBD). Copy reads as an outcome, not a form label. */
export const SEGMENT_EXAM_TIMINGS = [
  { value: "week", label: "Іспит за тиждень" },
  { value: "month", label: "Іспит за місяць" },
  { value: "later", label: "Іспит пізніше" },
  { value: "unsure", label: "Ще не знаю коли" },
] as const;
export type SegmentExamTiming = (typeof SEGMENT_EXAM_TIMINGS)[number]["value"];

/** Confidence self-report (JTBD). Two chips, single-select. */
export const SEGMENT_CONFIDENCE = [
  { value: "confident", label: "Почуваюся впевнено" },
  { value: "not_yet", label: "Ще ні" },
] as const;
export type SegmentConfidence = (typeof SEGMENT_CONFIDENCE)[number]["value"];

export function isSegmentTiming(v: string): v is SegmentExamTiming {
  return SEGMENT_EXAM_TIMINGS.some((t) => t.value === v);
}
export function isSegmentConfidence(v: string): v is SegmentConfidence {
  return SEGMENT_CONFIDENCE.some((c) => c.value === v);
}
