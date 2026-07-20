# Task: wave12a-12-screens-token-sweep

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §C (per-screen) + §C Toasts/badges/admin. Sweep every EXISTING learner screen + admin so page-level
markup uses the new token/component vocabulary (no leftover blue-era literals, no white-on-green), and add
the result-screen Світлик calm framing. This is a restyle-in-place sweep — NOT the W12b IA rework.

PASS = ALL true:

1. NO raw blue-era hex remains anywhere in `app/` or `components/` (the old sign blues): `#1e5bbf`,
   `#17489a`, `#1b2430` used as a literal color. verify.sh greps and FAILS on any match (tokens/aliases only).
2. WAVE-WIDE CTA RULE at screen level: NO `text-white` paired with a green/sign/danger-filled class in any
   `app/(app)/**/*.tsx` or `app/admin/**/*.tsx`. verify.sh greps and FAILS on any pairing.
3. Result screen `app/(app)/test/[id]/result/page.tsx` renders `<Svitlyk/>` (calm growth framing) and reuses
   the option/feedback states (references the `.opt`/state classes or the shared runner review), with
   mistakes framed positively (copy already present or added, e.g. «помилки, які вже не повторяться»-style).
   verify.sh: result page references `svitlyk`.
4. Each of these screens still renders through `npm run build` (no type/compile break) and uses token
   utilities (`bg-field`/`bg-card`/`text-ink`/`text-muted`/`border-line` or aliases), not ad-hoc colors:
   dashboard, practice, progress, mistakes, saved, history, account, onboarding, test/[id], result.
5. Admin is RECOLORED via tokens only (keeps its own top nav; NO redesign): `app/admin/**` has no
   white-on-green and no raw blue hex. verify.sh covered by #1/#2.
6. `LegalDisclaimer`/`ExplanationNotice`/`DemoBadge` copy is intact on the screens that had them (legal
   positioning is law). verify.sh: `не гарантує` still present somewhere under `app/` (disclaimer intact).
7. `npm run typecheck` 0; `npm run build` 0; `npm test` 0.

## Constraints / decisions
- Restyle-in-place ONLY. Do NOT rework layouts/IA (dashboard single-readiness metric, plan card, dial hero,
  onboarding funnel, sticky headers — all W12b/out-of-scope per the spec's "Out of scope" list).
- Screen-level RUNTIME verification (each page renders in a real browser at 390/1440) happens in task 15's
  full audit + the design-shots script (task 14) — this task's gate is static (compile + no legacy literals).
- Prefer applying the restyled shared components (Card/Button/Badge/.solid/.opt) over per-screen bespoke CSS.
- Non-Goal: new components, new copy beyond calm empty/growth framing, any data/route change.

## Plan
- [x] Grep+replace legacy blue literals across app/ + components/.
- [x] Fix any white-on-green at screen level; apply token utilities.
- [x] Add `<Svitlyk/>` + growth framing to the result screen.
- [x] Recolor admin via tokens (no redesign).
- [x] typecheck + build + test.

## Next
- (none — Goal met; verify PASS)

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: swept legacy blue hex (#1e5bbf/#17489a/#1b2430) across app/+components/ — ZERO matches, already clean. Fixed the two white-on-green offenders per taste law (§A/§C: soft-green fill + dark green-ink, never white): `app/admin/admin-nav.tsx:37` active tab `bg-sign text-white`→`bg-green-soft text-green-ink`; `app/admin/questions/page.tsx:167` search submit `bg-sign …text-white hover:bg-sign-dark`→`bg-green-soft …text-green-ink hover:brightness-[.97]`. Re-grep of app/(app)+app/admin now clean. Remaining: result-screen Світлik.

- 2026-07-02 ClPcs-Mac-mini: added `<Svitlyk size={88}/>` + calm growth-framing Card to `app/(app)/test/[id]/result/page.tsx` (positive mistake copy: «Кожна помилка — це тема, яку ви щойно закрили» / «ці питання вже не повторяться»; distinct copy for a clean run). typecheck 0, build 0, test 392 passed; verify.sh → PASS. Goal fully met; Status=done.


## Verify
**Last verify:** PASS (2026-07-02T06:28:58Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:30:39Z)
