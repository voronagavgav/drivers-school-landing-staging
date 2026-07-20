# Task: wave13-18-audit-extensions

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
Extend `bin/browser-audit.sh` with the wave-13 real-transport assertions (spec §F) and keep the whole
audit green against the LAN origin. PASS = ALL true:

1. Manifest assertion: `curl "$ORIGIN/manifest.webmanifest"` → HTTP 200, body parses as JSON
   (`node -e 'JSON.parse(...)'`), and contains `"standalone"` and `"/dashboard"` → counted PASS lines.
2. Offline-fallback assertion: navigate UNAUTHENTICATED to `$ORIGIN/~offline` → URL still contains
   `/~offline` (no /login bounce) and the page textContent (via `$AB eval` — textContent, not
   `get text`, per the text-transform trap) contains «Ви офлайн».
3. q-image negotiation assertions against the known restyled key `11_10_0`:
   - `Accept: image/avif` + `?w=540` → `content-type: image/avif`, body size ≤ 122880 bytes,
     `cache-control` contains `immutable`;
   - `Accept: */*` (same URL) → `content-type: image/png`, NO `immutable`.
   When the AVIF variant is missing on the box, the FAIL message must name the fix
   (`npm run prebake:images`) — actionable, not mysterious.
4. SW assertion is BEST-EFFORT by design: `$AB eval '"serviceWorker" in navigator'` — over the http
   LAN IP (NOT a secure context) this is legitimately unavailable, so the script records an
   informational `SKIP` line (not FAIL) when false/undefined, and only asserts registration when the
   API exists. The REAL registration + offline assertions live in wave13-19 over localhost. A comment
   in the script states this.
5. Bash hygiene in the new block: ERE only (`grep -E`), optional curl args built as ARRAYS, counts
   via `find`-not-`ls`, no pattern beginning with `--` passed without `-e`.
6. Full `npm run audit:browser` exits 0 against a production server RESTARTED on the current build
   (stale-server trap: verify.sh must restart the `next start -H 0.0.0.0 -p 3100` tree after
   building, then run the audit).
7. All pre-existing assertions unchanged and passing (the new checks only ADD pass/fail lines).
8. `bash tasks/wave13-18-audit-extensions/verify.sh` exits 0.

## Constraints / decisions
- MUST keep the non-localhost origin default (cookie-transport class); do not weaken or remove any
  existing assertion.
- The ≤120KB body assertion is the wave's ONLY real-encoder transport check (the integration test
  uses dummy bytes) — it closes the loop between wave13-04's bake and wave13-06's routing.
- Server restart in verify.sh is legitimate environment setup (CLAUDE.md stale-server bit); kill the
  existing `next-server` tree, `npm run build`, relaunch, wait for readiness (curl-000 loop), then
  audit.
- Non-Goals: no Playwright here (19); no offline simulation (the audit tool can't kill the network
  reliably — spec §F says so explicitly).

## Plan
- [x] Add the four assertion blocks to bin/browser-audit.sh.
- [x] Restart server + full audit green; verify.sh.

## Done
- [x] Wrote the four wave-13 §F blocks in bin/browser-audit.sh (sections 12–15): manifest
      (200 + node JSON.parse + "standalone" + "/dashboard", 3 PASS lines), q-image negotiation
      against key 11_10_0 (AVIF ct + ≤122880-byte body + immutable; */* → PNG + NOT immutable;
      AVIF-miss FAIL names `npm run prebake:images`), SW best-effort (eval `"serviceWorker" in
      navigator` → SKIP line on insecure LAN origin, registration assert only when API exists,
      comment points at wave13-19 localhost E2E), unauthenticated /~offline (assert_url no
      /login bounce + eval textContent «Ви офлайн»). Hygiene: curl args as arrays, ERE greps,
      no leading-`--` patterns.
- [x] Ran verify.sh end-to-end: rebuild, restarted the `next start -H 0.0.0.0 -p 3100` tree,
      full `npm run audit:browser` GREEN — 40 PASS / 0 FAIL incl. all new §F lines (manifest ×3,
      q-image negotiation ×5 with AVIF 9536B ≤ 122880 + immutable vs PNG non-immutable, SW SKIP
      on insecure LAN origin as designed, /~offline no-bounce + textContent-eval «Ви офлайн»).
      `PASS wave13-18`.

## Next
- (none — Goal met; verify.sh green)

## Artifacts
- bin/browser-audit.sh — extended real-transport gate (new sections 12–15)

## Log
- 2026-07-02 planner: task authored from spec §F; SW-on-LAN-IP is a documented SKIP (secure context).
- 2026-07-02T12:00Z ClPcs-Mac-mini: added sections 12–15 to bin/browser-audit.sh. Verified: `bash -n`
  clean; all 9 static verify.sh greps satisfied (dry-run via `bash -c`, zsh-trap avoided); curl blocks
  smoked LIVE against http://100.110.64.90:3100 — manifest 200+JSON+standalone+/dashboard, AVIF
  negotiation 200/image/avif/9536B/immutable, */* → image/png without immutable, /~offline 200
  unauthenticated. Browser-eval blocks (SW skip, offline textContent) exercise on the next tick's
  full audit run.
- 2026-07-02T17:27Z ClPcs-Mac-mini: ran verify.sh end-to-end — build green, killed + relaunched
  `next start -H 0.0.0.0 -p 3100`, full audit against http://100.110.64.90:3100: 40 PASS / 0 FAIL
  + 1 designed SKIP (serviceWorker API absent on insecure LAN origin). New §F lines all green:
  manifest 200/JSON/standalone//dashboard, AVIF 9536B ≤ 122880 + immutable, */*→PNG non-immutable,
  /~offline stays put + «Ви офлайн» via eval textContent. verify.sh printed `PASS wave13-18`.
  Goal fully met → Status: done.


## Verify
**Last verify:** PASS (2026-07-02T17:29:54Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T17:31:41Z)
