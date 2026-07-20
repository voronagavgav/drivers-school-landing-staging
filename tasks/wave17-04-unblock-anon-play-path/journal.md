# Task: wave17-04-unblock-anon-play-path

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-05T18:42Z
**Last compute:** mac-mini

## Goal
Let a logged-OUT visitor start a practice loop + answer questions + see explanations WITHOUT signup,
by routing the play entry points through `requirePlayableUser()` — but ONLY when
`VALUE_FIRST_FUNNEL` is on. Flag-off behavior is byte-for-byte identical to today (hard `/login`
gate). Content is NEVER gated (freemium inversion). PASS = ALL true:

1. `app/actions/test.ts`: `startTestAction` and `submitAnswerAction` (and the other play actions
   needed to complete a loop — `finishTestAction`, `extendSessionAction`, `setAnswerConfidenceAction`,
   `toggleSaveAction`) resolve the acting user via `requirePlayableUser()` (from
   `lib/server/anon-session.ts`) INSTEAD of `requireUser()`/`getCurrentUser()`. No other logic
   changes; anon and real users flow through the SAME `startSession`/`submitAnswer` engine calls.
2. `app/(app)/layout.tsx`: when `VALUE_FIRST_FUNNEL` is on, the shell renders for an anon user instead
   of redirecting `/login`; when off, it still `requireUser()`-redirects. The nav (`components/app-nav.tsx`)
   must not break for an anon user — pass a plain `canManage:false` and an anon-appropriate label.
   (Compute server-side; do NOT import server-graph helpers into a client component — CLAUDE.md rule.)
3. FLAG-OFF INERTNESS (the safety gate): with `VALUE_FIRST_FUNNEL` unset, an unauthenticated
   `startTestAction`/`submitAnswerAction` call still redirects `/login` and the `(app)` layout still
   redirects `/login`. Prove with an integration test toggling the env both ways.
4. Integration test `lib/server/anon-play.integration.test.ts` drives the REAL server actions
   (`startTestAction`, `submitAnswerAction`) — NOT internal helpers — with NO logged-in user and the
   flag ON (stub `next/headers` cookies + `getCurrentUser`→null; `vi.stubEnv`):
   a. `startTestAction` for a startable mode against a throwaway `createOfficialQuestion` category
      creates a `TestSession` owned by a freshly-minted `isAnonymous:true` user (assert the session's
      user row `isAnonymous:true`), and does NOT throw NEXT_REDIRECT to /login.
   b. `submitAnswerAction` records a `TestAnswer` for that anon session (real transport path).
   c. With the flag OFF, the same `startTestAction` (no session) throws NEXT_REDIRECT (→ /login).
   d. Cleanup deletes the anon user (cascades sessions/answers) + the fixture.
5. Content parity: an anon user's `startSession` pool uses the SAME `SERVABLE_QUESTION_WHERE` /
   published set as a real user (no reduced/teaser pool) — assert the anon session's question count
   equals a real user's for the same throwaway category.
6. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` all exit 0.

## Constraints / decisions
- FREEMIUM INVERSION IS LAW: never gate content. An anon user sees the same questions, explanations,
  and restyled images as a registered user. The only thing anon lacks is saved/cross-device progress.
- Flag-off = zero behavior change. The `requireUser()` gate must remain fully intact when the flag is
  off — this is the rollback path and the wave-review's #1 lens.
- Do NOT build the save-progress prompt here (wave17-06) or migration (wave17-05). This task ONLY
  unblocks the play path behind the flag.
- Watch the STALE-SERVER + client-chunk traps (CLAUDE.md): after editing a client component, restart
  the LAN server before any browser audit.
- Depends on: wave17-03 (`requirePlayableUser`).

## Plan
- [x] Swap `requireUser()`→`requirePlayableUser()` in the play actions. (start/submit done; finish/extend/save pending)
- [x] Make `(app)/layout.tsx` flag-aware (anon-friendly when on, guard when off).
- [x] Ensure app-nav renders for anon (plain props — layout now passes `canManage:false`/«Гість» when anon).
- [x] Route the remaining play-loop actions through the anon-aware resolver.
- [x] Write anon-play integration test (flag on: anon plays; flag off: redirects).
- [x] Run gates incl. build.

## Next
- (none — Goal fully met; all six PASS items satisfied and every gate green.)

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T00:00Z ClPcs-Mac-mini: routed `startTestAction` + `submitAnswerAction` through
  `requirePlayableUser()` (import from `@/lib/server/anon-session`); real users unchanged, flag-off
  still `requireUser()`-redirects. `npx tsc --noEmit` exits 0.
- 2026-07-05T16:05Z ClPcs-Mac-mini: made `app/(app)/layout.tsx` flag-aware — new `resolveShellUser()`
  returns the real user, else (flag on) the read-only `getAnonUser()` (nullable, NO mint on mere
  visit), else `requireUser()` (unchanged /login gate). Nav gets plain props when anon
  (`canManage:false`, «Гість»). Fixes the "layout not flag-aware" verify FAIL; `tsc --noEmit` green.
- 2026-07-05T18:42Z ClPcs-Mac-mini: routed the remaining play-loop actions through the anon-aware
  resolver — `finishTestAction`/`extendSessionAction`/`toggleSaveAction` now `requirePlayableUser()`;
  `setAnswerConfidenceAction` (returns `{error}`, never redirects) resolves
  `getCurrentUser() ?? (flag ? getAnonUser() : null)` so flag-off keeps the byte-for-byte «Увійдіть…»
  string. `removeSavedAction` (Saved screen, not play loop) keeps `requireUser()`. Wrote
  `lib/server/anon-play.integration.test.ts` driving the REAL `startTestAction`/`submitAnswerAction`
  with no session: flag ON → TOPIC_PRACTICE session on a fresh `isAnonymous:true`/no-PII user (→ /test/,
  not /login) + `submitAnswerAction` records a TestAnswer + content parity (anon totalQuestions ==
  real user's for the same topic); flag OFF → /login redirect, no anon cookie. Gates ALL green:
  `tsc --noEmit`, `npm test` (608), `npm run test:integration` (224 + 2 skip), `npm run build`. Status→done.


## Artifacts
- `app/actions/test.ts` — all play-loop actions route through `requirePlayableUser()` (or the
  anon-aware non-redirecting resolver for `setAnswerConfidenceAction`).
- `app/(app)/layout.tsx` — flag-aware shell (prior tick).
- `lib/server/anon-play.integration.test.ts` — drives the real actions; anon plays (flag on),
  /login gate intact (flag off), content parity.


## Verify
**Last verify:** PASS (2026-07-05T15:44:56Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T15:48:27Z)
