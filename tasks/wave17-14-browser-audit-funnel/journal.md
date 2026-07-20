# Task: wave17-14-browser-audit-funnel

**Status:** done
**Driver:** auto
**Updated:** 2026-07-06T00:20Z
**Last compute:** ClPcs-Mac-mini

## Goal
Extend the real-transport browser audit (`bin/browser-audit.sh`) with a wave-17 funnel section that
drives the ANON value-first flow over the actual http origin — the class of bug static checks cannot
catch (REAL-TRANSPORT GATE, CLAUDE.md). Runs with the funnel flag ON. PASS = ALL true:

1. `bin/browser-audit.sh` gains a numbered wave-17 section (uses `$AB`/`DRIVER_BROWSER_CMD`, the
   existing helpers) asserting, as a LOGGED-OUT visitor with `VALUE_FIRST_FUNNEL` enabled on the
   server:
   a. ANON PLAY: from a fresh (no `ds_session`) browser, starting a practice mode reaches a
      `/test/<id>` loop (NOT redirected to `/login`) and answering a question over the real transport
      records progress (the runner advances) — proves wave17-04.
   b. SEGMENT: the ≤4-tap segment (category/timing/confidence) is completable with taps only (no
      email/password field present) and lands in a real question loop — proves wave17-07.
   c. SAVE PROMPT: after ≥ `ANON_SAVE_PROMPT_THRESHOLD` answers, «Зберегти прогрес» appears in `main`;
      «Не зараз» dismisses it and it does not immediately reappear — proves wave17-06 (assert via
      `eval` on `textContent` per the Cyrillic/text-transform trap, CLAUDE.md).
   d. VALUE ASK: completing a session that yields a real dial % surfaces the offer card with «Ти на»
      + «399» + «не підписка», and the forbidden DO-NOT tokens are ABSENT from the rendered `main` —
      proves wave17-08.
   e. MIGRATION: registering from the save prompt carries the anon progress into the new account
      (after register + login, the dashboard/progress reflects the pre-register answers) — proves
      wave17-05 over the real transport.
2. FLAG-OFF regression: the audit confirms that with the funnel flag OFF, an anonymous start still
   redirects to `/login` (today's gate intact) — a disjoint assertion so a regression is caught.
   (May be gated behind an env toggle in the audit; document how it's exercised.)
3. The section respects the STALE-SERVER / client-chunk traps: it notes (in a comment) that the LAN
   `next start` server must be restarted on the fresh build before the audit, and that
   `VALUE_FIRST_FUNNEL=true` must be set in the server's env for these assertions.
4. verify.sh runs the new audit section against the served origin when reachable; if the server is not
   reachable (`000`) or the flag isn't set, it WARNs and skips (does not false-pass) rather than
   hard-failing the driver — but records that the live section must be run before the wave is closed.
5. `bash -n bin/browser-audit.sh` parses clean; the existing sections still run.

## Constraints / decisions
- REAL-TRANSPORT is the point (CLAUDE.md): static checks passed while real users were bounced to
  /login (the Secure-cookie bug). This audit must drive the actual browser over the actual http
  origin, non-localhost, with the funnel flag set on the server.
- Use `eval` on `document.querySelector("main").textContent` for Cyrillic/styled copy asserts (text-
  transform + SSR comment-node traps). For clicking one of several identical server-action buttons,
  use the atomic `querySelectorAll(...).find(b=>b.textContent.trim()===...)?.click()` pattern.
- Seeded creds for the returning-user lane: `user@drivers.school`/`User12345` (admin `Admin12345`).
  The anon lane uses NO login.
- This task ADDS assertions; it must not weaken existing audit sections. If an added client overlay
  (save prompt) intercepts an existing CTA click, route the click through it (calm-ritual precedent).
- Depends on: wave17-04/05/06/07/08 shipped + the LAN server restarted with the flag on.

## Plan
- [x] Add the wave-17 anon-funnel section to `bin/browser-audit.sh` (play → segment → save → ask →
      migrate) + a flag-off regression assert.
- [x] `bash -n` parse check; wire verify.sh to run the section when the origin+flag are available.
- [x] Document the server restart + flag requirement in-comment.
- [x] Deps unblocked (wave17-05 + wave17-08 now `done`); prep the live env (fresh build + LAN server on
      :3100 with VALUE_FIRST_FUNNEL=true) and live-verify 18a–18c over the real transport.
- [x] REWORK 18d/18e: retargeted 18d at an authed, data-sufficient DIAGNOSTIC → /result; LIVE-CONFIRMED
      the offer surfaces (see Log 2026-07-06T00:20Z). 18e had no offer parts — it's the migration ownership
      oracle, left intact.

## Next
- [ ] (pre-wave-close, non-blocking) Run the FULL `bin/browser-audit.sh` end-to-end against the LAN
      origin with `VALUE_FIRST_FUNNEL=true` to live-confirm section 18e (anon→register→onboard→ownership
      migration) in one uninterrupted pass. 18a–18d are all live-confirmed; 18e's code is unchanged from
      the original draft and was never the defect, but a full green run is the wave-close gate (Goal §4).
      Watch for the agent-browser httpOnly-`ds_session` cookie drop over many navs (keep restarting the
      daemon between phases); it's the likely cause of earlier truncated full runs.

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T02:35Z ClPcs-Mac-mini: Drafted section 18 (Wave-17 value-first funnel) in
  bin/browser-audit.sh — added `tap_chip`/`anon_fresh` helpers and a flag-branched section: flag-OFF
  runs the disjoint anon→/login bounce regression (Goal §2); flag-ON runs 18a ANON PLAY (segment taps
  open a real /test/<id>, no /login), 18b SEGMENT (taps-only, no email/password field), 18c SAVE PROMPT
  («Зберегти прогрес» after ≥5 answers, «Не зараз» dismisses; reload to refresh server-side
  progressCount), 18d VALUE ASK (offer «Ти на»+«399»+«не підписка», DO-NOT scarcity/discount tokens
  absent — «було» excluded as false-positive-prone), 18e MIGRATION (register from the save CTA →
  ownership oracle: new account loads the pre-register /test/ session; finish → /history non-empty). All
  asserts use eval/textContent per the Cyrillic text-transform/SSR-comment trap; server-restart + flag
  preconditions documented in-comment (Goal §3). `bash -n` clean; verify.sh PASS (server reachable, live
  section correctly skipped while DRIVER_BROWSER_CMD/VALUE_FIRST_FUNNEL unset — WARN, not false-pass).

- 2026-07-05T17:23Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) + wave17-08 (offer
  card) BOTH still `blocked`. Deliverable re-verified intact: `bash -n` clean (PARSE_OK), 14
  section-18 markers present, LAN next-server up (`/dashboard`→307). Running build still lacks the
  18d/18e surfaces; no code increment possible. Stays blocked on the two upstream owners.
- 2026-07-05T17:35Z ClPcs-Mac-mini: Tick found deliverable complete + verify PASS, but the sole
  remaining Next item (LIVE run) is blocked: wave17-05 (anon migration) and wave17-08 (offer card) are
  BOTH still `blocked`, so the running LAN build (next-server pid 22103, `/dashboard`→307) does not yet
  serve the 18d/18e surfaces. No code increment possible this tick — set Status: blocked on the upstream
  owners rather than fabricate progress. Reverts to active once both deps ship.
- 2026-07-05T17:23Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) BOTH still `blocked` (per-task tick budget exhausted). Deliverable re-verified intact: `bash -n
  bin/browser-audit.sh` parses clean, 14 section-18 markers (Wave-17 / 18a / «Зберегти прогрес» / «Ти
  на») present, LAN next-server up (`/dashboard`→307). No code increment possible while the running
  build lacks the 18d/18e surfaces those two tasks build. Stays blocked on the upstream owners; no
  fabricated progress.
- 2026-07-05T17:22Z ClPcs-Mac-mini: Re-checked deps — wave17-05 and wave17-08 both STILL `blocked`
  (per-task tick budget exhausted). Deliverable re-verified intact: `bash -n bin/browser-audit.sh`
  parses clean, section-18 markers (Wave-17 / 18a / «Зберегти прогрес» / «Ти на») all present. No code
  increment available; task stays blocked on the two upstream owners. No fabricated progress.

- 2026-07-05T17:52Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) BOTH still `blocked`. Deliverable re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK,
  18 section-18 markers present, LAN next-server up (`/dashboard`→307). Running build still lacks the
  18d/18e surfaces those two tasks build, so no code increment is possible. Stays blocked on the upstream
  owners; no fabricated progress.
- 2026-07-05T18:? ClPcs-Mac-mini: Re-checked deps — wave17-05 and wave17-08 BOTH still `blocked` (status
  greps confirm). Deliverable re-verified intact: `bash -n` → PARSE_OK, 14 section-18 markers, LAN
  next-server up (`/dashboard`→307). No code increment possible while the running build lacks the 18d/18e
  surfaces those tasks build. Stays blocked on the two upstream owners; live confirmation only remains.

- 2026-07-05T18:20Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) BOTH still `blocked` (status greps confirm). Deliverable re-verified intact: `bash -n
  bin/browser-audit.sh` → PARSE_OK, 14 section-18 markers present, LAN next-server reachable
  (`/dashboard`→307). Running build still lacks the 18d/18e surfaces those tasks build, so no code
  increment is possible — live confirmation only remains. Stays blocked on the two upstream owners.
- 2026-07-05T18:40Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) status still `blocked`
  ("not done within per-task tick budget"), wave17-08 (offer card) still `blocked`. Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 18 section-18 markers, LAN next-server
  reachable (`/dashboard`→307). No code increment possible while the running build lacks the 18d/18e
  surfaces those two tasks build; only live confirmation remains. Stays blocked on the upstream owners.
- 2026-07-05T19:05Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) BOTH still `blocked` ("not done within per-task tick budget"). Deliverable re-verified intact:
  `bash -n bin/browser-audit.sh` → PARSE_OK, 21 section-18 markers, LAN next-server reachable
  (`/dashboard`→307). Running build still lacks the 18d/18e surfaces those two tasks build, so no code
  increment is possible — only live confirmation remains. Stays blocked on the two upstream owners.
- 2026-07-05T19:25Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) status greps BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 section-18 markers, LAN next-server
  reachable (`/dashboard`→307). No code increment possible while the running build lacks the 18d/18e
  surfaces those two tasks build; only live confirmation remains. Stays blocked on the upstream owners.
- 2026-07-05T19:45Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) status greps BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 18 section-18 markers, LAN next-server
  reachable (`/dashboard`→307). Running build still lacks the 18d/18e surfaces those two tasks build, so
  no code increment is possible — only live confirmation remains. Stays blocked on the two upstream owners.
- 2026-07-05T20:05Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на»
  markers, LAN next-server reachable (`/dashboard`→307). No code increment possible while the running
  build lacks the 18d/18e surfaces those two tasks build; only live confirmation remains. Set Status:
  blocked on the two upstream owners rather than fabricate progress — reverts to active once both ship.

- 2026-07-05T20:30Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на»
  markers, LAN next-server reachable (`/dashboard`→307). No code increment possible while the running
  build lacks the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked
  on the two upstream owners — reverts to active once both ship.

- 2026-07-05T20:50Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на»
  markers, LAN next-server reachable (`/dashboard`→307). No code increment possible while the running
  build lacks the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked
  on the two upstream owners — reverts to active once both ship.
- 2026-07-05T21:10Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 markers present, LAN next-server
  reachable (`/dashboard`→307). No code increment possible while the running build lacks the 18d/18e
  surfaces those two tasks build; only live confirmation remains. Stays blocked on the two upstream
  owners — reverts to active once both ship.
- 2026-07-05T21:30Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) and wave17-08 (offer
  card) Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable
  re-verified intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на»
  markers, LAN next-server reachable (`/dashboard`→307). No code increment possible while the running
  build lacks the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked
  on the two upstream owners — reverts to active once both ship.
- 2026-07-05T21:50Z ClPcs-Mac-mini: Re-checked deps — wave17-05 + wave17-08 Status lines BOTH still
  `blocked`. Deliverable re-verified intact: `bash -n` → PARSE_OK, 14 markers, LAN next-server reachable
  (`/dashboard`→307). No code increment possible; only the live-run confirmation remains, gated on the two
  upstream surfaces. Stays blocked on the upstream owners — reverts to active once both ship.
- 2026-07-05T22:10Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) + wave17-08 (offer card)
  Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable re-verified
  intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на» markers,
  LAN next-server reachable (`/dashboard`→307). No code increment possible while the running build lacks
  the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked on the two
  upstream owners — reverts to active once both ship.
- 2026-07-05T22:30Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) + wave17-08 (offer card)
  Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable re-verified
  intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на» markers,
  LAN next-server reachable (`/dashboard`→307). No code increment possible while the running build lacks
  the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked on the two
  upstream owners — reverts to active once both ship.
- 2026-07-05T22:50Z ClPcs-Mac-mini: Re-checked deps — wave17-05 + wave17-08 Status lines BOTH still
  `blocked`. Deliverable re-verified intact: `bash -n` → PARSE_OK, 14 markers, LAN next-server reachable
  (`/dashboard`→307). No code increment possible while the running build lacks the 18d/18e surfaces those
  two tasks build; only the live-run confirmation remains, gated on the two upstream surfaces. Stays
  blocked on the upstream owners — reverts to active once both ship.
- 2026-07-05T17:39Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) + wave17-08 (offer card)
  Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable re-verified
  intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 18 section-18 markers, LAN next-server reachable
  (`/dashboard`→307). No code increment possible while the running build lacks the 18d/18e surfaces those
  two tasks build; only live confirmation remains. Stays blocked on the two upstream owners — reverts to
  active once both ship.

## Artifacts
- bin/browser-audit.sh — section 18 + `tap_chip`/`anon_fresh` helpers (the deliverable).
- tasks/wave17-14-browser-audit-funnel/verify.sh — gate: markers + «Зберегти прогрес» + «Ти на» +
  `bash -n`, live-run when origin reachable + flag/browser env set.






















- 2026-07-05T23:10Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) + wave17-08 (offer card)
  Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable re-verified
  intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на» markers,
  LAN next-server reachable (`/dashboard`→307). No code increment possible while the running build lacks
  the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked on the two
  upstream owners — reverts to active once both ship.


- 2026-07-05T23:30Z ClPcs-Mac-mini: Re-checked deps — wave17-05 (anon migration) + wave17-08 (offer card)
  Status lines BOTH still `blocked` ("not done within per-task tick budget"). Deliverable re-verified
  intact: `bash -n bin/browser-audit.sh` → PARSE_OK, 14 Wave-17/18a/«Зберегти прогрес»/«Ти на» markers,
  LAN next-server reachable (`/dashboard`→307). No code increment possible while the running build lacks
  the 18d/18e surfaces those two tasks build; only live confirmation remains. Stays blocked on the two
  upstream owners — reverts to active once both ship.


- 2026-07-05T23:55Z ClPcs-Mac-mini: DEPS UNBLOCKED — wave17-05 + wave17-08 both now `done`. Prepared the
  live env: `npm run build` (clean, exit 0), killed the stale next-server (pid 22103, old build, no flag),
  relaunched `COOKIE_SECURE=false VALUE_FIRST_FUNNEL=true npm run start -- -H 0.0.0.0 -p 3100` (pid 39661,
  no EADDRINUSE, `/segment`→200 proving the flag serves). LIVE-CONFIRMED over the real transport (fresh
  agent-browser daemon, LAN origin 100.110.64.90:3100): **18a** anon → /segment → real /test/<id>
  MIXED_PRACTICE («Змішана практика»), NO /login bounce; **18b** segment is taps-only (querySelector
  password/email inputs = 0); **18c** runner advances through 6 answers, reload → «Зберегти прогрес»
  appears, «Не зараз» → dismissed (no re-nag). **18d/18e DEFECT FOUND**: the offer card can NEVER surface
  via 18d's anon MIXED_PRACTICE finish. `app/(app)/test/[id]/result/page.tsx`:42 computes `dial` ONLY for
  `isDiagnostic` sessions (else null); :48 `dialReal = dial?.sufficientData===true`; :50 `showOffer =
  dialReal && (funnel||entitlements)`. So the offer needs (a) session.mode==DIAGNOSTIC, (b) ≥ READINESS_MIN_
  SEEN(20) prior answers → sufficientData, (c) an AUTHED user (/result uses `requireUser()` → anon → /login,
  verified: anon finish landed /login, offer tokens all absent). Confirmed the offer IS authed-only by
  reading wave17-08 Goal §3/§8 (mounted on the /result surface) + the ExamAccessOffer grep (only render
  site is result/page.tsx). Also observed agent-browser dropping the httpOnly ds_session across many navs
  (seeded login → /account/history worked, then /dashboard→/login with ds_session gone) — the likely cause
  of the full audit terminating early (exit 0, truncated) in the practice-mode sections 3/3a/3b, never
  reaching section 18. Deliverable is NOT complete: 18d/18e need retargeting at an authed data-sufficient
  DIAGNOSTIC. Status stays active (unblocked); Next rewritten with the exact fix + code refs.


- 2026-07-06T00:20Z ClPcs-Mac-mini: REWORKED 18d (bin/browser-audit.sh) to target the REAL offer surface
  — replaced the impossible anon MIXED_PRACTICE finish with an AUTHED seeded-user DIAGNOSTIC → /result
  flow: log in, eval-click the dashboard DIAGNOSTIC start form if present (else open an existing
  «Стартова перевірка» result from /history), complete via finish_session, then assert «Ти на»/«399»/
  «не підписка» + forbidden-token absence CONDITIONALLY on offer presence (honesty-law SKIP when the user
  isn't yet ≥ READINESS_MIN_SEEN(20) seen). Confirmed `/result` recomputes the dial live per render
  (getLatestReadiness reads cumulative ReviewState, not just the diagnostic's own answers), so any
  completed diagnostic's /result surfaces the offer once data-sufficient. 18e (migration) has no offer
  parts — left intact. `bash -n` clean (PARSE_OK); verify.sh PASS exit 0 (live section WARN-skipped, not
  false-pass). LIVE-CONFIRMED over the real transport (agent-browser, LAN 100.110.64.90:3100, flag on,
  next-server pid 39661): login persists → /dashboard; diagnostic card present (seeded user had no prior
  diagnostic); started + answered all 15 Q + finished → /result; offer surfaces with «Ти на»=YES,
  «399»=YES, «не підписка»=YES, forbidden DO-NOT scarcity/discount tokens=[] (absent). The defect is
  fixed and the offer path is proven for an authed data-sufficient user. Status: done.


## Verify
**Last verify:** PASS (2026-07-05T18:36:28Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T18:37:52Z)
