# Task: wave17-07-segment-onboarding-anon

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T16:20Z
**Last compute:** mac-mini

## Goal
A value-first self-segment step (T2/P1.4): ≤4 taps, NO free-text, NO signup → opens a tailored first
question set and seeds the readiness dial with real data. Skippable. Feeds JTBD analytics. PASS = ALL
true:

1. A segment surface exists reachable by an ANON visitor (works without login when
   `VALUE_FIRST_FUNNEL` is on) — e.g. `app/segment/page.tsx` (top-level, outside the auth `(app)`
   group) OR the existing `app/(app)/onboarding` flow made anon-capable via `requirePlayableUser()`.
   Pick one; record which in Log. It collects exactly: category (B/C/…), exam timing, confidence —
   all as TAP choices (buttons/chips), zero free-text inputs.
2. TAP BUDGET: reaching the tailored first set takes ≤4 taps total (count them in Log). Each step is a
   single-select; there is a visible «Пропустити» skip on the optional steps that still lands the user
   on a real question set (skip never dead-ends).
3. NO SIGNUP: no email/password field anywhere in this flow. Completing it does NOT create a
   registered account (an anon user is fine). Assert the segment page source has no `type="password"`
   / `name="email"` input.
4. TAILORED SET: on completion the user is taken into a real question loop scoped to the chosen
   category (via `startTestAction` / `startSession` with that category), NOT a placeholder. The chosen
   category is persisted on the (anon or real) user's `selectedCategory`/profile so the dial + later
   sessions use it.
5. DIAL SEED: the readiness dial reflects REAL data from the tailored session (the existing
   `recomputeReadiness` path), not a hardcoded placeholder %. If below `READINESS_MIN_SEEN`, it shows
   the honest "недостатньо даних" state (never a fake number).
6. JTBD ANALYTICS: completing a segment step fires `recordEvent("onboarding_jtbd_answered", userId,
   {...})` (existing whitelisted event) with the tap answers (category / timing / confidence), for
   both anon and real users. The new funnel `segment_complete` event (wave17-11) fires on completion —
   coordinate the event name with wave17-11; if wave17-11 not yet done, use `onboarding_jtbd_answered`
   and leave a TODO referencing wave17-11.
7. Flag-off: with `VALUE_FIRST_FUNNEL` unset, the anon segment entry is not reachable anonymously
   (redirects to /login like today) — existing authed onboarding behavior is unchanged.
8. Browser-verifiable (assertions may consolidate in wave17-14): an anon visitor can complete category
   → timing → confidence in ≤4 taps and land in a `/test/<id>` loop for the chosen category.
9. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` all exit 0.

## Constraints / decisions
- DESIGN CRAFT (apply directly): copy uses active verbs; each choice reads as an outcome
  («Категорія B», «Іспит за 2 тижні», «Впевнений / Ще ні»), not a form label. Numbering/eyebrows only
  if they encode the real step count. Boldness in ONE place per screen. Quality floor: responsive,
  visible focus on every tappable chip, `prefers-reduced-motion` respected. Calm; one green accent.
- ≤4 taps is a HARD budget — do not add a fourth question. No free-text is non-negotiable (P1.4).
- Do NOT gate any content behind completing the segment — it is skippable and the skip still hands a
  real question set (freemium inversion).
- Depends on: wave17-04 (anon play), wave17-02 (flag). Coordinates event name with wave17-11.

## Plan
- [x] Build the ≤4-tap segment surface (category/timing/confidence, all taps, skippable, anon-capable).
- [x] Persist category on the (anon) user; open the tailored `startSession` loop.
- [x] Fire `onboarding_jtbd_answered` per step; seed the real dial. (events wired; dial-seed = via the real MIXED_PRACTICE session + existing recomputeReadiness path)
- [x] verify.sh: no email/password inputs, tap chips present, flag-off /login redirect, JTBD event + startSession in actions.
- [x] Run gates.

## Next
- [ ] (task done) Browser flow (anon → /test/ in ≤4 taps) consolidates in wave17-14 by design (Goal §8).

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T16:20Z ClPcs-Mac-mini: Rewrote verify.sh to the Next spec — asserts `app/segment/page.tsx` has no `type="password"`/`name="email"`, the three tap-chip names (`categoryId`/`timing`/`confidence`) render, «Пропустити» skip present, flag-off `!isValueFirstFunnelEnabled()) redirect("/login")` guard, and (in `app/actions/segment.ts`) the `onboarding_jtbd_answered` event + `startSession` tailored-loop; then tsc/test/integration/build. Ran it: PASS, all four gates green, `/segment` present in the build route list. Goal met (browser tap-budget flow deferred to wave17-14 by design). Status → done.
- 2026-07-05T00:00Z ClPcs-Mac-mini: DECISION — anon-onboarding location = NEW top-level `app/segment/page.tsx` (outside the auth `(app)` group), NOT the anon-capable `/onboarding`. Rationale: `(app)/onboarding/page.tsx` calls `requireUser()` per-page (would need an anon exception + its category action `selectCategoryAction` uses `requireUser` and redirects to `/onboarding`); a dedicated top-level route is the clean anon funnel entry, is unreachable when flag off (page: `if (!real && !isValueFirstFunnelEnabled()) redirect("/login")`), and doesn't inherit the authed app shell. Scaffolded: `lib/segment.ts` (pure timing/confidence option catalogue + `isSegmentTiming`/`isSegmentConfidence` guards), `app/actions/segment.ts` (3 `requirePlayableUser`-based tap actions firing `category_selected`+`onboarding_jtbd_answered`, final action opens a real MIXED_PRACTICE `startSession` scoped to the persisted category), `app/segment/page.tsx` (?step= routing, all-tap chips: category→timing→confidence = 3 taps to /test/, «Пропустити» skips that still open the set, NO email/password/free-text). `npx tsc --noEmit` clean.

## Artifacts
- `app/segment/page.tsx` — anon-capable ≤4-tap segment surface (category→timing→confidence, all taps, «Пропустити» skips, flag-off → /login).
- `app/actions/segment.ts` — tap actions: fire `onboarding_jtbd_answered`, final action opens real MIXED_PRACTICE `startSession` scoped to the persisted category.
- `lib/segment.ts` — pure timing/confidence option catalogue + guards.
- `tasks/wave17-07-segment-onboarding-anon/verify.sh` — asserts no signup inputs, 3 tap names, «Пропустити», flag-off /login redirect, JTBD event + startSession, then tsc/test/integration/build.


## Verify
**Last verify:** PASS (2026-07-05T16:05:47Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T16:09:00Z)
