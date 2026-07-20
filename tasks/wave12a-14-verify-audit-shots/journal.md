# Task: wave12a-14-verify-audit-shots

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** ClPcs-Mac-mini
**Artifacts:** bin/design-shots.sh, bin/browser-audit.sh (§1b), /tmp/design-shots/*.png

## Goal
Spec §E (audit extension + screenshots). Extend `bin/browser-audit.sh` with the tab-capsule assertions and
add `bin/design-shots.sh` for Danil's review. Keep the existing helper style; do not weaken existing checks.

PASS = ALL true:

1. `bin/browser-audit.sh` gains a NEW assertion that the glass TAB CAPSULE is present and the ACTIVE tab has
   `aria-current` on the dashboard: after login (already on /dashboard), it asserts a nav element with the
   5 tab labels exists AND the active tab carries `aria-current="page"`. verify.sh: `browser-audit.sh`
   references `aria-current` and at least one tab label (e.g. `Головна`).
2. The existing runner-answers assertion (2b: click option → «Правильно/Неправильно») is PRESERVED verbatim
   (spec: "runner still answers a question — existing 2b stays green"). verify.sh: `browser-audit.sh` still
   contains the 2b feedback grep (`Правильно|Неправильно`).
3. `bin/browser-audit.sh` (or this task's `verify.sh`) includes a STATIC no-`text-white`-on-green regression
   grep over `components/` + `app/` that FAILS on any pairing (spec §E item c — a static gate, NOT browser).
   Placed in THIS verify.sh so it runs in the gate.
4. `bin/design-shots.sh` exists, is `bash -n` clean, drives `"$DRIVER_BROWSER_CMD"` (NOT a hardcoded tool
   name), captures BOTH `390x844` (phone) AND `1440x900` (desktop) viewports over these 6 screens: login,
   dashboard, practice, the runner (a live `/test/<id>`), result, mistakes → PNGs under `/tmp/design-shots/`.
   verify.sh: script references `DRIVER_BROWSER_CMD`, both viewport sizes, all 6 route names, and
   `/tmp/design-shots`.
5. When a server IS reachable at the audit origin, `bin/design-shots.sh` produces ≥ 1 non-trivial PNG
   (> 3 KB) under `/tmp/design-shots/`. verify.sh runs it ONLY if the origin responds (guarded), and if it
   ran, asserts at least one `> 3 KB` PNG exists; if no server, it SKIPS this sub-check with a logged note
   (the full real run is task 15).
6. `bash -n bin/browser-audit.sh` and `bash -n bin/design-shots.sh` both exit 0 (scripts parse).

## Constraints / decisions
- Screenshots are for review, NOT a hard gate (spec §E) — so the shot GENERATION is guarded on server
  reachability; the always-on gate is script existence + parse + the static no-white-on-green grep + the
  audit-script content checks.
- Real browser assertions (aria-current, runner answers) genuinely RUN only when the LAN server is up and
  freshly built — the STALE-SERVER trap (CLAUDE.md) means the server must be restarted against the current
  build before running the audit; that full run is task 15. This task ensures the SCRIPT is correct.
- Use `env(safe-area)` / label-based selectors that match task 07's nav markup; coordinate selectors with
  `components/app-nav.tsx`.
- Non-Goal: PSI/perf runs (post-wave e2b), refraction-pixel checks (headless can't — post-wave e2b).

## Plan
- [x] Add tab-capsule + aria-current assertion to `browser-audit.sh` (keep 2b intact).
- [x] Write `bin/design-shots.sh` (2 viewports × 6 screens → /tmp/design-shots).
- [x] verify.sh: static no-white-on-green grep + script content checks + bash -n + guarded shot run.

## Next
- [ ] (task 15) Full real run against a FRESHLY-restarted LAN server: the runner/result shots
      currently skip because the running `next start` build's practice "Почати" server-action submit
      does not navigate (STALE-SERVER trap) — restart `npm run start` on the current build, then
      re-run `bin/design-shots.sh` so runner + result PNGs are captured for Danil's review.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: added §1b tab-capsule assertion block to bin/browser-audit.sh — after
  login/dashboard, reads `nav[aria-label="Основна навігація"]` html via `agent-browser get html`,
  asserts all 5 tab labels present AND `aria-current="page"` on the active tab. 2b runner-answers
  block preserved verbatim. `bash -n` clean; aria-current/Головна/2b greps pass.
- 2026-07-02 ClPcs-Mac-mini: wrote bin/design-shots.sh — mirrors browser-audit.sh helper style
  (ORIGIN arg, `AB`=$DRIVER_BROWSER_CMD, login()/nav()); `capture_at W H` sets viewport via
  `agent-browser set viewport`, tours login/dashboard/practice/runner/result/mistakes and
  `agent-browser screenshot`s each to /tmp/design-shots/<screen>-<W>x<H>.png over both 390×844 and
  1440×900. Guarded on server reachability. verify PASS: 8 non-trivial PNGs produced; runner/result
  skip gracefully (practice start-submit no-ops against the current LAN build — task 15 restart).


## Verify
**Last verify:** PASS (2026-07-02T06:46:32Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:48:44Z)
