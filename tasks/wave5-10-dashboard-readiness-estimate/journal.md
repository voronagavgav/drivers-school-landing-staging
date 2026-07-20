# Task: wave5-10-dashboard-readiness-estimate

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-22
**Last compute:** cloud-agent

## Goal
Spec C (UI surface) — HIGH-STAKES legal positioning. Surface the `examReadiness` estimate (wave5-09) on
the dashboard with an EXPLICIT Ukrainian disclaimer that it is an estimate from the user's OWN practice,
NOT a prediction of or guarantee for the official exam. Depends on wave5-06, wave5-07, wave5-09.

1. `app/(app)/dashboard/page.tsx` imports `examReadiness` from `@/lib/readiness` and calls it with:
   - `recentExamScores`: a real `number[]` derived from EXISTING server data (e.g.
     `getRecentReadinessScores(...)` already fetched on the page, or `getTopicMastery`/`computeProgress`
     outputs) — NOT a hardcoded array; and
   - `topicBands`: the bands from `getTopicMastery(user.id, user.selectedCategoryId)`
     (`rows.map(r => r.band)`).
2. The page renders the estimate's `band` (one of `не готовий` / `майже` / `готовий`) and `score`
   somewhere on the dashboard, using existing UI primitives.
3. An EXPLICIT Ukrainian disclaimer is rendered next to the estimate stating it is an estimate based on
   the user's practice and is NOT a guarantee/prediction of the official exam. The disclaimer text
   contains the word `гарантія`, and EVERY occurrence of `гаранті…` on the page is in a NEGATING context
   (the literal token `не` appears on the same line) — i.e. no positive guarantee claim anywhere.
4. The disclaimer references the official exam (`офіційн…`) and the user's own practice (`практик…`),
   so it cannot be read as an official-exam prediction.
5. `npm run typecheck` exits 0.
6. `npm run build` exits 0.

## Constraints / decisions
- LEGAL: never claim official-exam prediction or a pass guarantee. `гарантія` (and any `гаранті…` form)
  may appear ONLY negated. The existing readiness-card disclaimer ("…не гарантує…") stays; this adds the
  learner-facing 3-band estimate + its own negated `гарантія` disclaimer.
- Reuse the already-fetched page data where possible; if `getTopicMastery` is added to the page, it is
  one extra `await` — do not duplicate `computeProgress`'s work unnecessarily.
- Keep it additive and scoped to the dashboard; do not remove/replace the existing `ReadinessMeter`
  (internal 5-level indicator) — the two coexist (internal indicator + learner-facing estimate).
- Ukrainian copy, mobile-first, a11y; no colour-only signalling for the band.
- Manual/real-transport check: `npm run audit:browser` against the non-localhost origin.
- Non-Goal: changing `examReadiness`/`getTopicMastery`, a new route, or the internal readiness logic.

## Plan
- [x] Fetch `getTopicMastery` bands + reuse recent scores; call `examReadiness(...)` on the dashboard.
- [x] Render the band + score with the negated-`гарантія` disclaimer card.
- [x] `npm run typecheck` + `npm run build`; run verify.sh.

## Done
- [x] Wired `examReadiness({ recentExamScores: recentScores, topicBands: masteryRows.map(r => r.band) })`
      into `app/(app)/dashboard/page.tsx` — sources `topicBands` from `getTopicMastery(user.id,
      user.selectedCategoryId)` and reuses the already-fetched `getRecentReadinessScores` array.
- [x] Rendered the estimate's `score` (зі 100) + 3-band label as a `Badge` (band TEXT shown, not
      colour-only; tone via `READINESS_ESTIMATE_TONE`) in a new Card after the internal ReadinessMeter.
- [x] Added the negated-`гарантія` disclaimer referencing `практик…` + `офіційн…` ("…за вашою власною
      практикою в застосунку, а не гарантія складання офіційного іспиту…").
- [x] Verified: legal grep gates pass (only-negated `гаранті`), `npm run typecheck` 0, `npm run build` 0.

## Next
- [ ] (none — Goal met; driver re-runs verify.sh. Optional: `npm run audit:browser` against the
      non-localhost origin to confirm the estimate renders for a logged-in user.)

## Artifacts
- app/(app)/dashboard/page.tsx — adds the examReadiness estimate + negated-гарантія disclaimer.
- tasks/wave5-10-dashboard-readiness-estimate/verify.sh — wiring + disclaimer/legal + typecheck/build gate.

## Log
- 2026-06-22 cloud-agent: scaffolded by planner.
- 2026-06-22T00:00Z ClPcs-Mac-mini: wired `examReadiness` into the dashboard — added imports
  (`getTopicMastery` from `@/lib/server/mastery`, `examReadiness`/`ReadinessBand` from `@/lib/readiness`),
  one extra `await getTopicMastery(...)`, the `examReadiness({recentExamScores, topicBands})` call, a new
  estimate Card (score + band Badge, non-colour-only) and the negated-`гарантія` legal disclaimer. Confirmed
  all verify.sh grep gates (only-negated `гаранті`, examReadiness/@/lib/readiness/getTopicMastery/гарантія/
  офіційн/практик present) + `npm run typecheck` exit 0 + `npm run build` exit 0. Set Status: done.

## Verify
**Last verify:** PASS (2026-06-22T19:38:56Z)

## Evaluation
**Last evaluation:** PASS (2026-06-22T19:40:08Z)
