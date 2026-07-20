// ---------------------------------------------------------------------------
// Pure content-override merge. No I/O, no side effects, no DB. Given a plan
// entry (the content the importer derived from the official source) and an
// optional override entry (hand-authored content keyed by questionKey), returns
// the EFFECTIVE content object the loader should write. The loader (task 06)
// reads the override JSON off disk and CALLS this helper; keeping the merge pure
// makes it unit-testable and identical wherever it runs.
//
// SHALLOW, PER-FIELD, OVERRIDE-WINS:
//   Only the overridable top-level fields participate (OVERRIDABLE_FIELDS).
//   For each one, the merge looks at whether the KEY is PRESENT in the override
//   object (own property), NOT at the value's truthiness:
//     - key ABSENT  -> the plan's value is kept unchanged.
//     - key PRESENT -> the override's value REPLACES the plan's value wholesale
//                      (no deep-merge of arrays/objects: an override that supplies
//                      `options` replaces the WHOLE options array; you do not
//                      partially patch one option). `answer` is the 1-based
//                      correct option number that pairs with `options`, so an
//                      override that changes `options` should also set `answer`.
//   Because presence is decided by own-property existence, an override value of
//   explicit `null` is a DELIBERATE clear: { imageKey: null } sets imageKey to
//   null (override wins), which is distinct from omitting the key (keep plan).
//
//   A `null`/`undefined` override argument means "no override" -> the plan's
//   content is returned unchanged (a shallow copy, so the input is not mutated).
//   Both `null` and `undefined` are treated identically.
//
// NON-MUTATING: a fresh object is returned; neither `planEntry` nor
// `overrideEntry` is modified. (Nested values are shared by reference, which is
// safe here because nothing reassigns into them.)
// ---------------------------------------------------------------------------

/** The top-level content fields an override file may replace. */
export const OVERRIDABLE_FIELDS = [
  "text",
  "options",
  "answer",
  "topic",
  "categories",
  "explanation",
  "imageKey",
] as const;

export type OverridableField = (typeof OVERRIDABLE_FIELDS)[number];

/** A content entry — the importer's plan shape or a hand-authored override. */
export type ContentEntry = Record<string, unknown>;

/** An override carries any subset of the overridable fields (each may be null). */
export type OverrideEntry = Partial<Record<OverridableField, unknown>>;

/**
 * Merge a plan entry with an optional override, override-wins, shallow per
 * overridable field. A field whose KEY is present in `overrideEntry` replaces
 * the plan's field wholesale (an explicit `null` value clears it); an absent key
 * keeps the plan's value. A `null`/`undefined` override returns the plan content
 * unchanged. Non-mutating: returns a fresh object. See the file header.
 */
export function applyOverride<T extends ContentEntry>(
  planEntry: T,
  overrideEntry?: OverrideEntry | null,
): T {
  const result = { ...planEntry } as ContentEntry;
  if (overrideEntry != null) {
    for (const field of OVERRIDABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(overrideEntry, field)) {
        result[field] = overrideEntry[field];
      }
    }
  }
  return result as T;
}
