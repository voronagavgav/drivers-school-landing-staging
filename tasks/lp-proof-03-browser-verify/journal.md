# Task: lp-proof-03 — browser-verify the recomposed v36 proof band at 3 widths

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** <UTC>
**Last compute:** laptop

## Goal
Prove the recomposed proof band (lp-proof-02) renders correctly on the REAL served page
`/lp/v36` — a check static greps structurally cannot make (root CLAUDE.md REAL-TRANSPORT
learning). Drive the browser via `"$DRIVER_BROWSER_CMD"` against a reachable ORIGIN.
Booleans (all enforced by verify.sh, which tees its output to the artifact):

1. The app is served and `/lp/v36` returns HTTP 200 at `$ORIGIN` (default
   `http://localhost:3001`, override with `ORIGIN`/`AUDIT_ORIGIN`); `DRIVER_BROWSER_CMD`
   is set. If either is missing the task FAILs (a UI task cannot be verified without a live
   browser — do NOT vacuously pass).
2. At EACH viewport width 390 (×844), 768 (×1024) and 1440 (×900): after
   `set viewport` + settle, `window.innerWidth` equals the requested width (viewport
   actually applied — else the measurement is a lie).
3. At each width, NO horizontal overflow: `document.documentElement.scrollWidth ≤
   window.innerWidth + 1`.
4. At each width, NO text clipped inside the band: no descendant of `.proof` has
   `scrollWidth > clientWidth + 2`.
5. At each width, the band (`.proof` element) `textContent` contains ALL of «1 757»,
   «986», «45», and «Офіційний банк питань» (the three figures + chip claim render).
6. At each width, contrast within the band: the MINIMUM WCAG contrast ratio among
   band body-text elements (font-size < 24px, and < 18.66px-bold) is ≥ 4.5:1, and among
   large-text elements (font-size ≥ 24px, or ≥ 18.66px bold) is ≥ 3.0:1 — computed in
   `eval` from the element's `color` vs its effective (ancestor-resolved) background.
7. The verify stdout is captured to a committed artifact
   `tasks/lp-proof-03-browser-verify/BROWSER-VERIFY.txt` with per-width
   `ok W=<width> iw=<> docOverflow=0 bandOverflow=0 hasAll=1 minBody=<r> minLarge=<r>`
   lines the evaluator can READ (static evidence — read, do not run).

## Constraints / decisions
- This task changes NO product source — it only reads the running page and writes its own
  artifact under `tasks/lp-proof-03-browser-verify/`. `git status` for source dirs stays clean.
- Depends on lp-proof-02 being applied AND the app served on the fresh build. If the LAN
  server holds a stale build (root CLAUDE.md STALE-SERVER trap), restart it before the
  browser run — legitimate env setup, not code change.
- Contrast is computed, not eyeballed (spec AC4). The band stays on light `--bg` with
  `--ink`/`--blue-700` display + `--muted`-class prose — all existing tokens comfortably
  clear the thresholds; a FAIL means the recompose used an off-palette weak color.
- `.proof` is the stable band hook lp-proof-02 preserves on the outer container.

## Plan
- [x] Confirm ORIGIN reachable + `DRIVER_BROWSER_CMD` set; open `/lp/v36`.
- [x] Loop the three viewports: apply, assert innerWidth, eval the overflow/render/contrast
      summary; tee each line to BROWSER-VERIFY.txt.
- [x] Fail on any width that overflows / clips / misses a figure / drops below contrast.

## Next
- [x] Run verify.sh against the served `/lp/v36` and capture BROWSER-VERIFY.txt.
- All 3 widths green (390/768/1440): docOverflow=0 bandOverflow=0 hasAll=1, minBody=10.61
  minLarge=11.47 — Goal fully met. Nothing left.

## Artifacts
- tasks/lp-proof-03-browser-verify/BROWSER-VERIFY.txt — captured per-width browser evidence.

## Log
- <UTC> laptop: scaffolded by planner.
- 2026-07-20T00:00Z ClPcs-Mac-mini: served page is `next dev -H 0.0.0.0 -p 3001` (hot-reload,
  no stale-build concern); /lp/v36 → HTTP 200 with `.proof`, «1 757», «986», «45»,
  «Офіційний банк питань» all present in served HTML. Ran verify.sh: first run FAILed only
  because `agent-browser eval` wraps its string result in literal double quotes, so `minLarge`
  parsed as `11.47"` and broke the awk float compare (not a real contrast failure). Added a
  one-line quote-strip (`out="${out#\"}"; out="${out%\"}"`) — robustness fix, no check
  weakened. Re-run green across 390/768/1440 (docOverflow=0 bandOverflow=0 hasAll=1
  minBody=10.61 minLarge=11.47); BROWSER-VERIFY.txt captured. No product source touched
  (`git status app components lib` clean). Status→done.

## Verify
**Last verify:** PASS (2026-07-20T10:25:49Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T10:27:23Z)
