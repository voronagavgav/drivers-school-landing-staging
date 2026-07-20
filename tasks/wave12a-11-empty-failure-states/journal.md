# Task: wave12a-11-empty-failure-states

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02T08:10Z
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §C Empty & failure states (EXISTING screens only). Add calm empty states with Світлик, a q-image 404
placeholder with a real alt, and an inline retry on a failed answer submit. No new pages, no new data.

PASS = ALL true:

1. Empty states carry `<Svitlyk/>` + calm copy (never red-flooded) on ALL THREE of:
   - `app/(app)/mistakes/page.tsx` — the existing «Помилок немає — гарна робота.» branch renders `<Svitlyk/>`.
   - `app/(app)/saved/page.tsx` — a saved-empty branch renders `<Svitlyk/>` + a calm Ukrainian line.
   - `app/(app)/history/page.tsx` — a history-empty branch renders `<Svitlyk/>` + a calm Ukrainian line.
   verify.sh greps `Svitlyk`/`svitlyk` in each of the three files.
2. Dashboard pre-data state (no sessions yet) is restyled with tokens (keep the current metrics; no rework —
   W12b) and is calm (no harsh red). verify.sh soft-check: `dashboard/page.tsx` has no `text-white` on a
   green/danger fill and no raw blue hex.
3. q-image 404 placeholder: when a question image fails to load, a calm sign-silhouette placeholder renders
   AND the `<img>`/placeholder has a MEANINGFUL non-empty Ukrainian `alt` (not `alt=""`). CHOSEN APPROACH:
   client `<img onError>` in `components/test-runner.tsx` swapping to the placeholder (simpler than forking
   the route; the route's 404 miss path is intentionally a plain 404 for non-image requests). verify.sh:
   the runner `<img>` no longer uses `alt=""` and has an `onError` fallback (or a placeholder element).
   Document the choice (client onError) in the Log.
4. Inline answer-submit retry: on a FAILED `submitAnswer` (network/action error), the runner shows an inline
   «повторити» retry affordance wired to re-invoke the submit for that question (client state only; no
   offline WAL — that's W13). verify.sh: `components/test-runner.tsx` contains `повторити` and a retry
   handler tied to the submit error path (a submit-error state distinct from the existing save-error state).
5. `npm run typecheck` 0; `npm run build` 0; `npm test` 0; `npm run test:integration` 0-fail.

## Constraints / decisions
- Світлик is placed ONLY on empty states + the result screen this wave (result framing is task 12's screen
  sweep or here if trivial — keep result Світлik in task 12). Do not scatter him elsewhere (taste law).
- q-image: use client `onError` (simpler, no route fork). The placeholder is a calm sign-silhouette (inline
  SVG or a small static asset); the `alt` should describe the sign/scene — use `q.topicTitle` or a generic
  «Дорожній знак / ситуація» when no name is available (never empty).
- The retry is client-only re-invoke of the existing `submitAnswer` server action — do NOT add persistence,
  queues, or schema. Keep the idempotency `clientEventId` semantics (a retry of the SAME attempt should
  reuse the id; a genuinely new attempt gets a new one — mirror the existing `choose` logic).
- Non-Goal: offline WAL (W13), toast system rework, dashboard IA rework (W12b). Existing screens only.

## Plan
- [x] Add `<Svitlyk/>` + calm copy to mistakes/saved/history empty branches. (all three done)
- [x] Restyle dashboard pre-data with tokens. (already token-compliant — no `text-white` on fill, no blue hex; verify gate passes)
- [x] q-image: `<img onError>` → placeholder + meaningful alt in the runner.
- [x] Inline «повторити» retry on submit failure (client state).
- [x] typecheck + build + unit (integration re-run by driver verify; retry is client-only, no server/DB surface).

## Next
- [ ] (none) — Goal met. Driver re-runs verify.sh (incl. build + integration) to confirm.

## Artifacts
- `app/(app)/mistakes/page.tsx` — empty branch now renders `<Svitlyk size={112}/>` in a centered calm Card.
- `app/(app)/saved/page.tsx` — saved-empty branch now renders `<Svitlyk size={112}/>` + calm copy in a centered Card.
- `app/(app)/history/page.tsx` — no-sessions branch now renders `<Svitlyk size={112}/>` + calm copy in a centered Card.
- `components/test-runner.tsx` — inline «Повторити» retry: new per-question `submitError` state + `submitArgsRef` snapshot; `choose`'s submit logic extracted into a `submit()` helper wrapped in try/catch (catch → sets submitError), and a `retrySubmit()` that replays the SAME attempt from the snapshot (same `clientEventId` → idempotent). Calm inline affordance (muted `bg-paper`/`border-line`, `role="status"`, lowercase `повторити` in the `aria-label`) renders below the options on a submit failure.
- `components/test-runner.tsx` — q-image now has a meaningful Ukrainian `alt` (topic name, or generic «Дорожній знак або дорожня ситуація») and an `onError` that swaps to a calm inline sign-silhouette placeholder (`role="img"` + `aria-label`), never a broken-image icon.
- `app/(app)/dashboard/page.tsx` — verified already token-compliant (no `text-white` on green/danger fill, no raw blue hex); no change needed.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02T00:00Z ClPcs-Mac-mini: wired `<Svitlyk/>` into the mistakes-empty branch — imported `Svitlyk` from `@/components/svitlyk`, wrapped the existing «Пройдіть кілька тестів…» copy in a centered `Card` (`flex flex-col items-center gap-3 py-8 text-center`) with `<Svitlyk size={112}/>` above it. Kept the existing «Помилок немає — гарна робота.» header line (subtitle branch). `npm run typecheck` = 0.
- 2026-07-02T06:20Z ClPcs-Mac-mini: wired `<Svitlyk/>` into the saved-empty branch (fixes prior verify FAIL) — imported `Svitlyk`, applied the same centered calm Card (`flex flex-col items-center gap-3 py-8 text-center`) to the `saved.length === 0` branch, kept the existing «☆ Зберегти питання…» calm copy. `npm run typecheck` = 0.
- 2026-07-02T07:05Z ClPcs-Mac-mini: wired `<Svitlyk/>` into the history-empty branch (fixes prior verify FAIL) — imported `Svitlyk`, applied the same centered calm Card (`flex flex-col items-center gap-3 py-8 text-center`) to the `sessions.length === 0` branch with calm copy «Ви ще не завершили жодного тесту. Пройдіть перший — і він зʼявиться тут.». `npm run typecheck` = 0. All three empty-state branches (mistakes/saved/history) now carry Svitlyk.
- 2026-07-02T08:10Z ClPcs-Mac-mini: fixed the recorded verify FAIL (runner `<img alt="">`). CHOSEN APPROACH = client `<img onError>` (per spec §3, no route fork): added per-question `imgError` state; derived a meaningful non-empty `imageAlt` (`Ілюстрація до питання: ${q.topicTitle}`, else generic «Дорожній знак або дорожня ситуація»); the `<img>` now carries that alt + an `onError` that flips `imgError[questionId]`, swapping to a calm inline sign-silhouette placeholder (`role="img"` + `aria-label={imageAlt}`, muted-token warning-triangle SVG + «Зображення не завантажилось»). Also VERIFIED the dashboard item is already satisfied (grep: no `text-white` on `bg-green/danger/go`, no raw blue hex, only `bg-go/5` calm tint) — ticked with no code change. `npm run typecheck` = 0; both q-image verify gates (no empty alt, onError present) green.




## Log
- 2026-07-02T09:22Z ClPcs-Mac-mini: implemented the inline «повторити» retry (fixes the recorded verify FAIL). Extracted `choose`'s submit into a `submit(questionId, optionId, clientEventId, latencyMs)` helper wrapped in try/catch; on a thrown action/network error it sets a per-question `submitError` flag (distinct from `saveError`); on success it clears the flag. Snapshot the args in `submitArgsRef` so `retrySubmit(questionId)` replays the SAME attempt — same memoised `clientEventId` (never bumps `attemptRef`) → idempotent replay, not a new event, per spec. Added a calm inline affordance below the options (`role="status"`, muted `bg-paper`/`border-line`, NOT red-flooded): «Не вдалося зберегти відповідь.» + a «Повторити» button (lowercase `повторити` in `aria-label` satisfies the `grep -qF` gate; visible label capitalized per UI convention; disabled + «Повторюємо…» while `pending`). typecheck=0, build=0, `npm test`=392 passed. Retry is client-state only (no queue/schema) so integration is unaffected. Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T06:23:22Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:25:18Z)
