# Task: wave13-19-offline-e2e-playwright

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
The offline E2E the audit tool can't do (spec §F): Playwright `context.setOffline(true)` proves the
fallback renders and an offline answer lands EXACTLY ONCE after reconnect. PASS = ALL true:

1. `playwright` is an exact-pinned devDependency (grep: no `^`); NOT in dependencies; chromium
   installed via `npx playwright install chromium` (the increment runs it; verify re-runs it —
   idempotent).
2. `scripts/offline-e2e.mjs` exists; `npm run e2e:offline` runs it. Default origin
   `http://localhost:3100` — DECISION: localhost is a secure context, so the SW registers over plain
   http; the cookie-transport bug class stays covered by the LAN-IP audit (wave13-18). The script
   fails fast with an actionable message when the origin is down (curl-000 class check).
3. Script flow (plain playwright API, no @playwright/test harness), printing machine-readable lines:
   a. login with the seeded creds (`user@drivers.school` / `User12345`); assert landing on
      /dashboard;
   b. await `navigator.serviceWorker.ready` (bounded ~15s) → print `E2E_SW=active`, else FAIL;
   c. visit /dashboard again (warm the SW), `context.setOffline(true)`, `page.reload()` → assert the
      rendered content contains «Ви офлайн» → print `E2E_OFFLINE_FALLBACK=PASS`;
   d. `setOffline(false)`; start a PRACTICE session via the real UI (the /practice form → runner);
      capture the sessionId from the `/test/<id>` URL → print `E2E_SESSION_ID=<id>`;
   e. `setOffline(true)`; answer the current question (atomic-eval click per the CLAUDE.md flake
      lesson); assert the queued copy «Збережемо, щойно з'явиться мережа» appears → print
      `E2E_QUEUED=PASS`;
   f. `setOffline(false)`; wait for the drain (poll up to 30s for the queued state to clear or the
      queue count to hit 0) → print `E2E_SYNCED=PASS`;
   g. exit 0 only if every step passed; non-zero otherwise.
4. EXACTLY-ONCE (the point of the whole wave): after a passing script run, verify.sh extracts
   `E2E_SESSION_ID` and asserts via sqlite3 against `prisma/dev.db`:
   `SELECT COUNT(*) FROM ReviewLog WHERE testSessionId = '<id>'` returns EXACTLY `1`, and
   `SELECT COUNT(*) FROM TestAnswer WHERE testSessionId = '<id>'` returns EXACTLY `1` — not 0 (lost)
   and not 2 (double-applied by the page-drain/Background-Sync race).
5. `npm run e2e:offline` exits 0 on this box against a production build on :3100 (verify.sh builds +
   restarts the server first, same recipe as wave13-18).
6. `npm run typecheck` + `npm test` exit 0 (no app-graph changes expected — script only).
7. `bash tasks/wave13-19-offline-e2e-playwright/verify.sh` exits 0.

## Constraints / decisions
- One deterministic script beats a test-runner harness here: it prints evidence lines the verify gate
  parses, and the DB is the oracle for exactly-once (UI can't see duplicates).
- Answer exactly ONE question while offline (a single queued item keeps the count-oracle sharp).
- The SW intercepts fetches, so `setOffline` must be on the CONTEXT (network layer) — precached
  responses still serve; that asymmetry is exactly what step (c) asserts.
- If step (e)'s answer click races a React re-render, use the atomic
  `[...document.querySelectorAll("button")].find(...)?.click()` eval pattern (CLAUDE.md wave12b-17).
- The seeded user accumulates ReviewLog rows across runs — that's why the oracle counts BY SESSION
  ID (per-run isolation), never by user.
- Non-Goals: no CI wiring, no multi-browser matrix, no offline-pack E2E (structural gates + audit
  cover packs; keep this script to the two spec-§F flows).

## Plan
- [x] Pin playwright devDep + install chromium.
- [x] Write scripts/offline-e2e.mjs (steps a–g); run against a fresh prod server; verify.sh.

## Done
- [x] playwright 1.61.1 exact-pinned devDep; chromium-1228 installed; scripts/offline-e2e.mjs
      scaffolded (origin fail-fast + steps a–b) + `npm run e2e:offline`; a–b PASS live on :3100
      (`E2E_LOGIN=PASS`, `E2E_SW=active`); stub fail keeps exit non-zero until c–g land.
- [x] Steps c–d implemented: offline reload → «Ви офлайн» fallback asserted (textContent poll),
      back online → MIXED_PRACTICE start via hidden-input-targeted form click → session id captured
      from `/test/<id>`. Live on :3100: `E2E_OFFLINE_FALLBACK=PASS`,
      `E2E_SESSION_ID=cmr3sdwkk00b4g4gerkbr9b7y`; stub fail keeps exit non-zero until e–g land.
- [x] Steps e–g implemented; stub fail dropped. Full run exits 0 (all six evidence lines), and
      verify.sh (fresh build + server restart + DB exactly-once oracle + typecheck + 523 unit
      tests) printed `PASS wave13-19`. Oracle for session cmr3sojhr0042e4gexdt4d6b3:
      ReviewLog=1, TestAnswer=1 — exactly once, despite the reconnect hard-reload racing the drain.

## Next
- (none — Goal met; verify.sh printed `PASS wave13-19` on this box 2026-07-02 17:45 UTC)

## Artifacts
- scripts/offline-e2e.mjs — the offline E2E driver

## Log
- 2026-07-02 planner: task authored from spec §F; localhost-origin decision recorded (secure context).
- 2026-07-02 17:34 UTC ClPcs-Mac-mini: `npm i -D -E playwright` → 1.61.1 (exact, devDep only);
  `npx playwright install chromium` → chromium-1228 (verified via --dry-run). Scaffolded
  scripts/offline-e2e.mjs: origin fail-fast (fetch, curl-000 class), step (a) login via
  input[name=email/password] + waitForURL **/dashboard, step (b) `navigator.serviceWorker.ready`
  raced against 15s timeout; added `e2e:offline` npm script. Live run on :3100: E2E_LOGIN=PASS,
  E2E_SW=active, then intentional stub-fail (c–g pending) → exit 1. verify.sh stays red by design
  until c–g land (its setOffline/E2E_SESSION_ID greps + full-flow run need the real steps).
- 2026-07-02 17:36 UTC ClPcs-Mac-mini: implemented steps c–d. (c) warm /dashboard → context-level
  `setOffline(true)` → reload → `waitForFunction(textContent.includes("Ви офлайн"))` (SW router
  catch serves precached /~offline content; URL stays /dashboard). (d) `setOffline(false)` →
  /practice → click the MIXED_PRACTICE form's button located via its hidden
  `input[name=mode][value=MIXED_PRACTICE]` (several forms share «Почати») → `waitForURL(/\/test\/
  [^/]+$/)` → session id from pathname. Live run on :3100: E2E_LOGIN=PASS, E2E_SW=active,
  E2E_OFFLINE_FALLBACK=PASS, E2E_SESSION_ID=cmr3sdwkk00b4g4gerkbr9b7y, then intentional stub-fail
  (e–g pending) → exit 1. verify.sh setOffline/E2E_SESSION_ID greps now green; full-flow gates
  (E2E_QUEUED/E2E_SYNCED + DB oracle) stay red by design until e–g land.
- 2026-07-02 17:45 UTC ClPcs-Mac-mini: implemented steps e–g. (e) context `setOffline(true)` →
  ONE atomic eval clicks the first `[role=radiogroup] [role=radio]` option (wave12b-17 pattern) →
  `waitForFunction(textContent.includes("Збережемо, щойно з'явиться мережа"))` → E2E_QUEUED=PASS.
  (f) FIRST ATTEMPT FAILED: `setOffline(false)` → "Execution context was destroyed" — CDP
  `Network.requestWillBeSent` initiator traced the reload to the @serwist/next chunk:
  its auto-register client installs `window.addEventListener("online", () => location.reload())`
  (serwist `reloadOnOnline`, default true). Kept the app as-built (the reload is what auto-recovers
  the offline fallback page; the reload-vs-drain race is exactly what the DB oracle checks) and made
  the poll reload-tolerant: `.catch(() => -1)` on the evaluate, retry each 500ms tick; WAL count
  polled via raw `indexedDB.open("ds-offline")`/`wal` store (queued chip is per-render state that
  never re-checks the WAL — the count is the real drain oracle) → E2E_SYNCED=PASS. (g) stub fail
  removed; exit 0 = every step passed. Live run exit 0; sqlite oracle for
  cmr3sojhr0042e4gexdt4d6b3: ReviewLog=1, TestAnswer=1. Full verify.sh (build + fresh :3100 server +
  script + oracle + typecheck + 523 unit tests): `PASS wave13-19`. Also added an `E2E_DEBUG=1`
  framenavigated logger (kept — cheap, guarded). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T17:47:52Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T17:49:30Z)
