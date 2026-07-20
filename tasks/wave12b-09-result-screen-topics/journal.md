# Task: wave12b-09-result-screen-topics

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §C second bullet: the result screen gets a corrective topic summary, outcome-appropriate
headlines, and honest labelling of unanswered questions.

PASS = ALL true:

1. `lib/result-topics.ts` exists, is PURE (no `@/lib/db`/`server-only`/`@/lib/auth`; no JSX — describe
   markup in prose only), and exports
   `function topWrongTopics(items: Array<{ topicId: string; topicTitle: string; answered: boolean; correct: boolean }>, max?: number): Array<{ topicId: string; topicTitle: string; wrong: number }>`
   with FROZEN semantics (verify.sh probes; do NOT edit verify.sh):
   - counts only ANSWERED-and-WRONG items (unanswered are NOT «помилки» — spec);
   - sorts by wrong desc, ties by topicTitle asc (uk locale via localeCompare);
   - returns at most `max` (default 3) topics; empty input → [].
2. `lib/result-topics.test.ts` covers those semantics; `npm test` exits 0; file appears in
   `npx vitest list` (captured to a var).
3. `app/(app)/test/[id]/result/page.tsx` renders, ABOVE «Розбір питань», a summary block with heading
   containing «Найбільше помилок у темах» listing the `topWrongTopics` output (≤3), EACH with a
   one-tap `<form action={startTestAction}>` hidden `mode=TOPIC_PRACTICE` + `topicId` start.
   When there are zero wrong answered questions the block is omitted entirely.
4. Outcome headline (exam sessions): fail → the supportive corrective headline
   «Не цього разу — і це нормально. Почнімо з найслабших тем.»; pass → calm-positive
   «Складено. Тримайте форму.» (both literals in the file; rendered branch depends on `passed`).
   Non-exam sessions keep a neutral heading.
5. Unanswered honesty: in the «Розбір питань» list an unanswered question is labelled «без відповіді»
   (literal in the file) and is NOT labelled «Помилка»; the stats row separates «Помилок» (answered
   wrong) from «Без відповіді» when any unanswered exist.
6. `npm run typecheck`, `npm test`, `npm run build` exit 0.

## Constraints / decisions
- Exam SCORING semantics unchanged: unanswered still counts toward `evaluateExam` errors (pass/fail
  math untouched) — only the LABELLING and the topic summary change (UX-FINDINGS decision).
- The topic summary links use the production `startTestAction` path, mirroring /practice topic cards.
- Do not edit this task's verify.sh (frozen probe).
- Non-Goal: audit assertion for the summary (task 17).

## Plan
- [x] Write lib/result-topics.ts + test.
- [x] Rework result/page.tsx: summary block, headlines, «без відповіді» labels.
- [x] typecheck/test/build + verify.sh.

## Done
- [x] `lib/result-topics.ts` (pure `topWrongTopics`) + `lib/result-topics.test.ts` (6 cases:
      answered-wrong-only counting, wrong-desc sort, uk-locale tie-break proven with Ґ-vs-Д
      code-point inversion, max default/override, empty input). `npm test` 436/436 green,
      typecheck green, verify.sh's frozen probe (lines 13–34) run standalone → «result-topics
      probe ok»; purity greps clean.
- [x] Result page rework (Goal items 3–5): topic summary block wired to `startTestAction`
      TOPIC_PRACTICE, exam pass/fail headlines, «без відповіді» labelling + stats split;
      `getSessionState` payload gained `topicId`. verify.sh full run → PASS wave12b-09.

## Next
- (none — Goal fully met, verify.sh green end-to-end)

## Artifacts
- lib/result-topics.ts, lib/result-topics.test.ts, app/(app)/test/[id]/result/page.tsx,
  lib/server/test-engine.ts (getSessionState payload now exposes `topicId`)

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 09:22 UTC ClPcs-Mac-mini: wrote lib/result-topics.ts (pure topWrongTopics: Map
  aggregate over answered&&!correct, sort wrong desc / localeCompare(title,"uk") asc, slice max=3)
  + lib/result-topics.test.ts mirroring glass-tier.test.ts style. Verified the uk-locale tie-break
  vector externally (node: «Ґудзик».localeCompare(«Дорога»,"uk") = -1 while code points invert).
  npm test 41 files/436 green, typecheck green, verify.sh frozen probe passes standalone.
- 2026-07-02 ~09:45 UTC ClPcs-Mac-mini: reworked result/page.tsx — added «Найбільше помилок у
  темах» Card above «Розбір питань» (topWrongTopics over per-question rows, ≤3 topics, each a
  <form action={startTestAction}> with hidden mode=TOPIC_PRACTICE+topicId, SubmitButton mirroring
  /practice topic cards; omitted when wrongTopics is empty); exam h1 branches on `passed` between
  the two spec headlines (non-exam keeps «Результат»); stats row now shows «Помилок»=answered-wrong
  + a «Без відповіді» Stat when any unanswered exist; unanswered badge = neutral «без відповіді»
  (never «Помилка»). Exposed `topicId` in getSessionState's question payload (topic was already
  included; one-line additive field). Scoring untouched. Full verify.sh → PASS wave12b-09
  (greps + typecheck + npm test + build all green). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T09:27:58Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T09:29:25Z)
