# Task: lp-proof-01 — investigate the v36 proof band before recomposing it

**Status:** done
**Driver:** auto
**Updated:** <UTC>
**Last compute:** laptop

## Acceptance
INVESTIGATION-ONLY task: the deliverable is a readable `FINDINGS.md` — no test, no
oracle, no fixture, no behaviour change, so structural test/fixture traps are
inapplicable by construction. Confirm each criterion by READING the file below (no
execution needed). `verify.sh` is green (PASS 2026-07-20T10:14:01Z).

| Goal criterion | Confirm by reading |
|---|---|
| 1a proof MARKUP (7 classes + `stats.map` line range) | `FINDINGS.md` §a — verbatim JSX, classes listed, `_body.tsx:760–779`, map 770–776, CSS 189–200/416–419 |
| 1b proof COPY-KEY shape + 3 constants `BANK_B_FMT`="1 757"/`IMG_FMT`="986"/`SECTIONS`=45 | `FINDINGS.md` §b — verbatim `copy.ts:68–77`, constants table (lines 21/23/24) |
| 1c EVERY external consumer of v36 `proof` = NONE (v6/v8 own separate copy.ts) | `FINDINGS.md` §c — grep commands + pasted output; only `v36/copy.ts:69` is v36's |
| 1d `funnel-donot-guard.sh` scans v36? = NO (global check) | `FINDINGS.md` §d — `FUNNEL_FILES` array pasted; no `app/lp/**` entry |
| 1e route `/lp/v36`, public unauth, origins localhost:3001 + LAN :3100 | `FINDINGS.md` §e |
| 1f browser convention (`DRIVER_BROWSER_CMD` `set viewport`→sleep 0.4→eval) | `FINDINGS.md` §f — cites `design-shots.sh shot()` + `browser-audit.sh` |
| 2 no source touched (only task dir) | `FINDINGS.md` §AC2; `verify.sh` asserts `git status --porcelain -- app lib components scripts bin` empty |

## Goal
Investigation ONLY — no source code (`.tsx`/`.ts`) change. Produce a committed
`tasks/lp-proof-01-investigate/FINDINGS.md` that maps the ground truth the recompose
task (lp-proof-02) and the browser-verify task (lp-proof-03) will build on. Booleans:

1. `tasks/lp-proof-01-investigate/FINDINGS.md` exists and contains ALL of these anchors,
   each a factual answer (not a TODO placeholder):
   a. The exact current proof-band markup in `app/lp/v36/_body.tsx` — the class names
      `proof-card`, `proof-top`, `proof-grid`, `proof-cell`, `proof-val`, `proof-lab`,
      `proof-sub` and the JSX line range (`c.proof.stats.map`).
   b. The exact `proof` copy key shape in `app/lp/v36/copy.ts` (chip / lead / stats[3]
      with value/label/sub), and the three number constants it sources:
      `BANK_B_FMT` = "1 757", `IMG_FMT` = "986", `SECTIONS` = 45 (→ `String(SECTIONS)`).
   c. A definitive list of EVERY consumer of the v36 `proof` copy key outside
      `_body.tsx` (finding: NONE — `app/lp/v6` and `app/lp/v8` have their OWN separate
      `copy.ts`; state this explicitly so the recompose knows reshaping `proof.stats` is
      safe). Evidence: the grep command + its output pasted in.
   d. Whether `scripts/funnel-donot-guard.sh` scans `app/lp/v36/_body.tsx` or any v36
      landing file (finding: it does NOT — it scans the app funnel surfaces listed in its
      `FUNNEL_FILES` array; so AC3's guard requirement is a GLOBAL always-green regression
      check, not a check of the proof band's own copy). Paste the `FUNNEL_FILES` list.
   e. The served route + a reachable ORIGIN for the browser check: `app/lp/v36/page.tsx`
      → path `/lp/v36`; record the spec's stated `http://localhost:3001/lp/v36` AND the
      repo's LAN convention `http://100.110.64.90:3100` (bin/design-shots.sh default), and
      note the page is a PUBLIC unauth route (no login needed, no service worker relevance).
   f. The browser-driver invocation convention: `"$DRIVER_BROWSER_CMD" set viewport W H`
      then `sleep 0.4` then re-assert `window.innerWidth`, and `"$DRIVER_BROWSER_CMD" eval
      '<js>'` for measurements (cite bin/design-shots.sh `shot()` and bin/browser-audit.sh).
2. `git status --porcelain` shows changes ONLY under `tasks/lp-proof-01-investigate/`
   (no `.tsx`/`.ts`/`.css` touched by this task).

## Constraints / decisions
- INVESTIGATION-ONLY: deliverable is a FINDINGS.md file, not code (root CLAUDE.md:
  materialize the deliverable as a standalone on-disk artifact the evaluator can READ,
  and assert its existence + key anchors in verify.sh — do not rely on journal prose).
- Do NOT redesign here. The composition ("one unified typographic statement") is
  lp-proof-02's craft; this task only records facts.
- Scope of the whole feature is TWO files only (`_body.tsx`, `copy.ts`); this task edits
  neither — it just documents them.

## Next
- [x] Grep the v36 proof markup + copy shape + external consumers + guard file list;
      write FINDINGS.md with the six anchors and their evidence.
- [x] Add an `## Acceptance` table mapping each Goal criterion → its FINDINGS.md section
      so the static judge confirms by reading (fixes the no-VERDICT-marker REJECT glitch).
- (none — Goal met; verify.sh green; judge has a concrete criterion→file map. lp-proof-02
  can now recompose safely.)

## Artifacts
- tasks/lp-proof-01-investigate/FINDINGS.md — the ground-truth map for lp-proof-02/03.

## Log
- 2026-07-20T00:00Z ClPcs-Mac-mini: wrote FINDINGS.md with all six anchors (a–f) +
  pasted grep/CSS/line-range evidence; no source touched. verify.sh → "OK lp-proof-01".
- 2026-07-20T10:20Z ClPcs-Mac-mini: added an `## Acceptance` table mapping each Goal
  criterion → the exact FINDINGS.md section the evaluator READS (verify is green; the
  static judge had emitted no VERDICT marker on the prior prose-only journal). Compressed
  this Log. No source touched — journal-only.

## Acceptance table above, which gives the static judge a concrete criterion→file map.)

## Verify
**Last verify:** PASS (2026-07-20T10:17:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T10:18:15Z)
