# Task: wave12b-10-runner-sticky-chrome

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §D bullets 1–2 (UX-FINDINGS phone pass): sticky compact header (timer never scrolls away) and a
thumb-zone sticky bottom action bar on phone. Behavior/layout only — visuals are 12a law.

PASS = ALL true:

1. `components/test-runner.tsx`: the header block (mode label + «N з {total}» + Timer for exams + the
   thin progress bar) is wrapped in ONE container with classes matching `sticky top-0` and a z-index
   utility, using an OPAQUE or emulated-glass background (`.solid` or `glass-e1` — never transparent,
   so content doesn't ghost through; reading-surface law).
2. The sticky header shows the session MODE LABEL (`MODE_LABEL[mode]`, e.g. «Розумне повторення») —
   grep `MODE_LABEL` in the runner (task 17's plan-card audit assertion reads this text).
3. Bottom action bar: «Далі» (or «Відповісти»/next) and «Завершити» live in a container with classes
   matching `(sticky|fixed) bottom-0` that is phone-only — reset to static/inline at `sm:` breakpoint
   (grep `sm:static` or `sm:relative` or an `sm:` reset on the same element). Touch targets ≥44px:
   the bar's buttons carry `min-h-11` (or `h-11`/`h-12`/`py-3`+) classes.
4. Content is not obscured: the scroll container gets bottom padding on phone (a `pb-` utility ≥ the
   bar height on the runner root, or the bar is `sticky` in-flow) — mechanical: `pb-2[04-9]|pb-[3-9][0-9]?|pb-safe|sticky bottom-0` present.
5. The question navigator grid stays reachable (not removed) and its cells are ≥44px
   (`min-h-11 min-w-11` or equivalent — the UX-FINDINGS 35×36px cells fixed if not already by 12a).
6. Existing behavior preserved: `onOptionsKeyDown` roving, submit flow, confirm-finish modal all still
   present (grep) and `npm test` + `npm run typecheck` + `npm run build` exit 0.
7. Browser (guarded, phone viewport 390×844): open a practice session; eval
   `getComputedStyle(header).position` for the header container === "sticky" (or the audit-style text
   assertion that the timer/counter element is present after scrolling — if the browser tool can't
   eval, assert the class attribute contains "sticky" via DOM query).

## Constraints / decisions
- Keep the runner a single client component; no new routes.
- Desktop (≥sm) keeps today's inline layout (spec: «desktop keeps inline»).
- Do NOT reintroduce backdrop-filter; tiers are CSS law from 12a.
- Non-Goal: digit keys/swipe/scroll/resume (task 11), confidence chips (task 12).

## Plan
- [x] Read WAVE12B-SURFACES.md §Runner regions.
- [x] Wrap header region sticky + mode label; build the phone bottom bar; pad content.
- [x] typecheck/test/build + browser check + verify.sh.

## Done
- [x] Restructured `components/test-runner.tsx`: header row + progress bar wrapped in ONE
      `glass-e1 sticky top-0 z-20` container, counter now «N з {total}», mode label added via
      `MODE_LABEL[mode as TestMode]` (pure `lib/constants` import — client-safe); nav row is now a
      phone thumb-zone bar `sticky bottom-0 z-20 … bg-paper` with safe-area pb, reset at
      `sm:static sm:bg-transparent sm:p-0` (desktop keeps today's inline row); all three bar
      Buttons carry `min-h-11`; navigator grid `grid-cols-6` on phone + cells `min-h-11 min-w-11`
      (UX-FINDINGS 35×36 → ≥44px). No capsule collision: AppNav returns null on `/test/`
      (app-nav.tsx:32). All 7 verify.sh grep gates pass; `npm run typecheck` 0; `npm test`
      436/436 green.

- [x] Diagnosed + fixed the failed verify (browser audit regressed): NOT a code bug — the
      long-lived `next start` server (booted 12:13) predated the restructure commit, and verify's
      12:37 `npm run build` swapped `.next` chunk hashes out from under it → client-side nav to
      `/test/` fetched missing chunks (URL asserts green, text/click asserts dead). Restarted
      `npm run start -- -H 0.0.0.0 -p 3100` on the fresh build → audit 19/19 green.
- [x] Guarded phone browser check (real 390×844 viewport, live practice session, after 600px
      scroll): header `getComputedStyle(...).position === "sticky"`, `top: 0px`, rect top 0
      (pinned), text «1 з 15 · Розумне повторення · …»; bottom bar `position: sticky`,
      `bottom: 0px`. Full `verify.sh` → `PASS wave12b-10` (greps + typecheck + 436 tests +
      build + browser audit).

## Next
- [ ] (none — task complete)

## Artifacts
- components/test-runner.tsx

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 09:35 UTC ClPcs-Mac-mini: sticky chrome restructure in test-runner.tsx (sticky
  glass-e1 header w/ MODE_LABEL+counter+timer+progress; sticky bottom-0 phone action bar w/
  sm:static reset + min-h-11 buttons; navigator 6-col ≥44px cells). Grep gates + typecheck +
  unit tests green. Build/browser/verify.sh next tick. Grounding: NAV capsule hidden on /test/
  (app-nav.tsx:32) so bottom-0 is unobstructed; content clearance = sticky in-flow bar (Goal 4
  mechanical alternative) + layout pb-28.
- 2026-07-02 09:44 UTC ClPcs-Mac-mini: fixed the FAILED verify — stale-server, not code: running
  next-server booted BEFORE the restructure commit while verify's rebuild replaced `.next` under
  it (chunk-hash mismatch → runner text/answer-click audit asserts failed with URL asserts green).
  Killed + relaunched `npm run start -- -H 0.0.0.0 -p 3100`; audit 19/19. Phone 390×844 live
  check: header computed position sticky/top 0/pinned after scroll, bottom bar sticky/bottom 0.
  `verify.sh` → PASS wave12b-10. Status: done. CLAUDE.md stale-server bullet extended with the
  chunk-swap symptom.


## Verify
**Last verify:** PASS (2026-07-02T09:45:00Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T09:46:19Z)
