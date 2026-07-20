# Task: lp-pvar-07 — browser acceptance across all 3 routes + canonical

**Status:** done
**Driver:** manual
**Evaluate:** yes
**Updated:** <UTC>
**Last compute:** laptop

## Goal
The spec's AC4 acceptance gate: drive the REAL served app over the browser for the canonical
route and all three variants, capture the evidence to a committed artifact the evaluator reads,
and confirm the per-concept structure. Runs after 02–06, against a served origin. Booleans (all
in `verify.sh`, which also tees a human-readable `BROWSER-ACCEPT.txt` + captures screenshots):

1. `$DRIVER_BROWSER_CMD` is set and the four URLs return HTTP 200 at the origin (default
   `http://localhost:3001`, override via `ORIGIN`): `/lp/v36`, `/lp/v36/p1`, `/lp/v36/p2`,
   `/lp/v36/p3`. (If the browser cmd is unset the task FAILS — a UI acceptance gate needs it.)
2. Canonical `/lp/v36`: exactly one `.proof` region whose text contains "1 757", "986", "45",
   "Офіційний банк питань" (the statement band still renders — AC2 behavioural check).
3. For EACH of the four routes, at 390 / 768 / 1440: `document.scrollWidth <= innerWidth+1`
   (no horizontal document overflow).
4. Per-concept structure (AC1):
   a. `/lp/v36/p1`: `document.querySelectorAll(".proof").length === 0` AND the hero (`.hz8`)
      text contains "1 757", "986", "45" and "Офіційний банк питань" (proof merged in hero);
   b. `/lp/v36/p2`: `.proof` contains ≥8 `img[src^="/restyled-live/"]`;
   c. `/lp/v36/p3`: exactly one `.proof` region; the element carrying "1 757" has computed
      font-size ≥2× the element carrying "986" (one dominant numeral).
5. Contrast (AC4): for `/lp/v36`, `/lp/v36/p2`, `/lp/v36/p3` (opaque-ground routes), the
   `.proof` body-text contrast ≥4.5:1 and large-text ≥3:1 measured against the effective
   rendered background (CSS-chain walk). For `/lp/v36/p1` the proof rides a PHOTO ground where a
   CSS-chain walk is invalid → contrast is judged by the EVALUATOR from the committed p1
   screenshots (this task re-captures 390/768/1280/1920 p1 PNGs and asserts they exist + are
   non-trivial), consistent with lp-pvar-05.
6. `robots noindex` is served for each variant: `curl -s <route>` HTML contains a
   `<meta name="robots" … noindex …>` (Next renders the `robots:{index:false}` metadata) for
   p1/p2/p3, and the canonical `/lp/v36` does NOT contain a noindex robots meta.
7. All evidence (per-width measurement lines for every route + the p1 screenshots) is written to
   committed files under `tasks/lp-pvar-07-browser-acceptance/` so the evaluator confirms AC4 by
   READING them (no execution needed).

## Constraints / decisions
- Production-path: drive the REAL served routes via `curl` (200 gate) + `$DRIVER_BROWSER_CMD`
  (measurements), never internal helpers.
- This is the acceptance gate, not a build task — no product code here. A failure means the
  owning variant/plumbing task (02–05) must fix it; mark this task blocked on that task.
- Reuse the contrast/overflow measurement harness + viewport-apply convention from
  `tasks/lp-proof-03-browser-verify/verify.sh` (root CLAUDE.md: `set viewport` → sleep →
  re-assert `innerWidth` → `eval`; strip the eval's wrapping quotes before parsing).
- p1 contrast-over-photo is evaluator-judged from screenshots (same rationale as lp-pvar-05):
  a CSS-chain background walk returns white over a `background-image` photo and would mis-measure.
- Origin default `http://localhost:3001`; LAN fallback `http://100.110.64.90:3100` if the app is
  only served there. Serve the FRESH build first (root CLAUDE.md stale-server trap: `next start`
  loads `.next` once — restart after any rebuild before running this gate).

## Plan
- [ ] Author verify.sh: curl-200 gate → per-route per-width overflow/contrast/structure eval →
      p1 screenshot capture → noindex-meta curl check → tee evidence.
- [ ] Serve the fresh build, run the gate; on failure, block on the owning task.

## Next
- [ ] Write verify.sh and run it against the served origin.

## Log
- <UTC> laptop: scaffolded by planner.

- DIRECTOR CLOSE (2026-07-20): dequeued per Danil's experiment-tier decision (his live review +
  director's screenshot pass replace the full browser-acceptance gate for lab variants). Static
  gates run manually instead: typecheck 0 · funnel-donot-guard PASS · all 4 routes HTTP 200 ·
  desktop screenshots of p1/p2/p3 reviewed by director. Task 06's scope was covered by the same
  manual run; run-all was stopped after 05 to save wall-time.
