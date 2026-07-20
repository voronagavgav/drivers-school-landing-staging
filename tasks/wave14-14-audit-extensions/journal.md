# Task: wave14-14-audit-extensions

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T02:05Z
**Last compute:** mac-mini

## Goal
Extend the REAL-TRANSPORT gate `bin/browser-audit.sh` with the spec-§G Wave 14 assertions. Depends on
wave14-04/06/08/09/12. PASS = ALL true:

1. New seeding helper `scripts/audit-seed-nudge.ts` (standalone tsx client like prisma/seed.ts — never
   imports lib/db): for the seeded audit user (`user@drivers.school`), (a) upserts ONE due ReviewState
   (state "review", stability > 0, dueAt in the past) on an existing published question of the user's
   selected category, and (b) DELETES the user's NotificationLog rows from the last 7 days — resetting
   the daily/weekly suppressors so REPEATED audit runs stay deterministic (a dismissed SENT card from
   the previous run would otherwise suppress today's card and flake the gate).
2. `bin/browser-audit.sh` gains, in the seeded-user section (bash-array arg style; atomic-eval clicks;
   `textContent`-based Cyrillic asserts per the house traps):
   a. runs the seeding helper, re-navigates to /dashboard → asserts the nudge card copy
      («картки на повторення») present;
   b. eval-clicks «Зрозуміло» → after reload/settle, the card copy is ABSENT (dismiss works over the
      real transport);
   c. /progress → asserts calibration section title «Калібрування впевненості» AND the insufficient
      invite «Відповідайте на питання про впевненість» (the seeded user has no confidence-bearing
      reviews unless earlier audit sections created some — if they legitimately might, assert the
      section title only and note why);
   d. /account/data → asserts «Завантажити мої дані» and «Видалити акаунт назавжди» both present;
   e. exam path: dashboard exam CTA click → «Хвилина спокою» present; eval-click «Почати одразу» →
      URL contains /test/ and the exam heading renders (a REAL session; reuses the existing
      exam-start block or replaces it compatibly — total assertion count only grows);
   f. admin section: /admin/learning-health as admin → «Здоровʼя навчання» renders; as the plain
      user → bounced (assert_url /dashboard, matching the existing RBAC assert idiom).
3. Emoji gate: verify.sh (this task) greps components/nudge-card.tsx + lib/server/nudges.ts +
   lib/nudge-policy.ts for emoji/pictograph ranges → zero matches (the §G "zero emoji in nudge copy"
   grep gate, now permanent).
4. With the LAN server RESTARTED on the current build (stale-server trap — kill + `npm run build` +
   `npm run start -- -H 0.0.0.0 -p 3100` before the run): `npm run audit:browser` exits 0, and a
   SECOND consecutive run also exits 0 (repeatability — the seeding helper's reset proves out).
5. `npm run typecheck` exits 0 (helper script compiles).
6. `bash tasks/wave14-14-audit-extensions/verify.sh` exits 0.

## Constraints / decisions
- The audit MUST stay runnable against the NON-localhost origin (cookie class) — no SW/offline asserts
  here (disjoint-origin law from wave13-01).
- Seeding helper is environment setup, not production code; it must be a no-op-safe upsert (re-runs
  fine) and touch ONLY the audit user's rows.
- Dismiss-then-absent (2b) needs a fresh nav after the action redirect — follow the existing
  post-action settle idiom in the script.
- The calm-ritual localStorage guard could suppress the overlay on the second run within a day —
  the audit must CLEAR `ds_calm_ritual_day` via eval before the exam-CTA step (pin this).
- Do not weaken/remove ANY existing assertion; the audit only grows.

## Next
- [x] Add the Wave-14 §G assertion block to `bin/browser-audit.sh` (seeded-user section): seeder run,
  nudge present → eval-click «Зрозуміло» → absent (16a/b); /progress calibration title + insufficient
  invite (16c); /account/data both actions (16d); exam «Хвилина спокою» → «Почати одразу» → /test/
  (16e, `ds_calm_ritual_day` cleared first); admin /admin/learning-health both ways (16f). Also added
  a `start_exam` helper and routed the existing §2/§11 exam-start clicks through it so the newly-added
  calm ritual is passed through (no assertion weakened; count 23→31).
- [x] Emoji gate + seeder-run wiring in `verify.sh` — already present (grep nudge-card.tsx +
  lib/server/nudges.ts + lib/nudge-policy.ts for emoji ranges; helper standalone-client checks).
- [x] LIVE STEP: restarted the LAN server on a fresh build (killed stale pids 83848/83859, `npm run
  build`, `npm run start -- -H 0.0.0.0 -p 3100`), ran `npm run audit:browser` twice — both exit 0
  (52 passed, 0 failed each incl. all 11 Wave-14 §G asserts), `verify.sh` exit 0, `npm run typecheck`
  exit 0. Goal fully met; Status → done.
- (nothing outstanding)

## Artifacts
- bin/browser-audit.sh (Wave 14 section), scripts/audit-seed-nudge.ts

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T00:00Z ClPcs-Mac-mini: read upstream context (lib/server/nudges.ts, lib/nudge-policy.ts,
  components/nudge-card.tsx, countDueReviews, ReviewState/NotificationLog schema, prisma/seed.ts).
  Wrote `scripts/audit-seed-nudge.ts` — standalone tsx client (no lib/db): upserts one DUE ReviewState
  (state "review", stability 5, dueAt=−1d) on the audit user's category's first published question, and
  deletes their last-7-days NotificationLog rows (resets emittedToday + sentLast7Days suppressors so
  REVIEW_DUE fires deterministically; seeded user has no exam date so EXAM_COUNTDOWN can't outrank it).
  Ran it (idempotent, cleared 0 rows on first run), `npm run typecheck` green.
- 2026-07-03T01:20Z ClPcs-Mac-mini: added the Wave-14 §G assertion block (#16) to
  bin/browser-audit.sh — seeder run (npx tsx scripts/audit-seed-nudge.ts), nudge present→«Зрозуміло»
  dismiss→absent (eval textContent), /progress calibration title+invite, /account/data export+delete,
  calm ritual (clear ds_calm_ritual_day → CTA → «Хвилина спокою» → «Почати одразу» → /test/), admin
  learning-health both ways (heading via eval textContent since h1 is uppercase). Added `start_exam`
  helper and routed §2/§11 exam-start clicks through it to pass the new calm-ritual overlay (no
  assertion weakened; assert count 23→31). `bash verify.sh` PASS (static gates + typecheck green).
  Remaining: the live audit-×2 run (driver's restart-server step).
- 2026-07-03T02:05Z ClPcs-Mac-mini: LIVE STEP done. Server was stale (booted 00:41:55, before the
  01:41 commit) — killed pids 83848/83859, `npm run build` green, relaunched
  `npm run start -- -H 0.0.0.0 -p 3100` (LAN origin 100.110.64.90:3100, COOKIE_SECURE unset → login
  persists over http). `npm run audit:browser` ran TWICE, both exit 0 (52 passed, 0 failed each; all
  11 Wave-14 §G asserts green both runs — nudge present→dismiss-absent, calibration title+invite,
  data export+delete, calm ritual→/test/, learning-health RBAC both ways). Repeatability confirmed
  (seeder's suppressor reset proves out). `verify.sh` exit 0, `npm run typecheck` exit 0. Status → done.



## Verify
**Last verify:** PASS (2026-07-02T22:47:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T22:53:03Z)
