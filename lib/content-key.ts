// ---------------------------------------------------------------------------
// Pure content-key derivation. No DB, no I/O, no side effects. Maps a stable
// (section, question-number) pair from the official source into a deterministic
// string id, and an option ordinal into a per-option id. The loader (task 05)
// uses these as the upsert/override keys; keeping the derivation pure means it
// is unit-testable and identical across import and override-lookup call sites.
//
// NORMALIZATION (and why it is injective):
//   A section is a dotted numeric path `\d+(\.\d+)*` (e.g. "11", "8", "8.1").
//   `questionKey` replaces each "." in the section with "_" and joins
//   ["q", normalizedSection, qnum] with "_":  q_<section>_<qnum>.
//     questionKey("11", 7)  -> "q_11_7"
//     questionKey("8",  1)  -> "q_8_1"
//     questionKey("8.1", 2) -> "q_8_1_2"   (the "." became "_")
//   This is collision-free for distinct (section, qnum): the result is
//   "q" + "_" + tokens, where tokens = [...section digits-groups, qnum]. The
//   LAST "_"-separated token is always qnum and everything between the leading
//   "q_" and that final token is the (dot->underscore) section, so the split
//   back into (section, qnum) is unambiguous and the map is one-to-one.
//   (The seeming "8.1" vs "8" with qnum collision is avoided precisely because
//   qnum is pinned as the final token — "8"+qnum 1+2 would be "q_8_1_2" only if
//   qnum itself were "1_2", which it cannot be: qnum is a single integer.)
//
//   `optionKey` joins the (already-normalized) questionKey, a "__" separator
//   (double underscore, to stay distinct from the single-"_" question tokens),
//   and the 1-based ordinal n:  <questionKey>__<n>.
//     optionKey("q_11_7", 1)   -> "q_11_7__1"
//     optionKey("q_8_1_2", 3)  -> "q_8_1_2__3"
// ---------------------------------------------------------------------------

/**
 * Deterministic id for a question, derived from its source section and 1-based
 * question number. Each "." in `section` is normalized to "_" (so "8.1" and the
 * key "q_8_1" share a stem); `qnum` is always the final "_"-token, which keeps
 * the map injective over distinct (section, qnum). See the file header.
 */
export function questionKey(section: string, qnum: number): string {
  const normalizedSection = section.replace(/\./g, "_");
  return `q_${normalizedSection}_${qnum}`;
}

/**
 * Deterministic id for one option of a question, from the question's key and a
 * 1-based ordinal. The "__" (double-underscore) separator keeps option ids in a
 * distinct namespace from the single-"_" question tokens.
 */
export function optionKey(questionKey: string, n: number): string {
  return `${questionKey}__${n}`;
}

/**
 * Recover the TOP-LEVEL official наказ section number from a `questionKey`
 * (`q_<section>_<qnum>`, where a dotted subsection like "8.1" is normalized to
 * "8_1"). Returns the FIRST numeric group after the leading "q_" — so a dotted
 * subsection maps to its PARENT section (`q_8_1_2` → 8). Returns `null` for a
 * malformed key (no leading `q_<digits>_`, e.g. "", "abc", "q__1").
 *
 * This is the STABLE section source for blueprint bucketing: unlike
 * Topic.displayOrder (which drifts +1 per section that was imported as two
 * topics), the section here comes straight from the content key and never
 * shifts on re-import. See lib/exam-blueprint.ts `groupCandidatesByBlock`.
 */
export function sectionFromQuestionKey(key: string): number | null {
  const m = /^q_(\d+)_/.exec(key);
  return m ? Number.parseInt(m[1], 10) : null;
}
