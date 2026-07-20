# Task: lp-pvar-01 — investigate ground truth for the 3 proof-band variants

**Status:** done
**Driver:** auto
**Updated:** <UTC>
**Last compute:** laptop

## Goal
INVESTIGATION ONLY — no `.tsx`/`.ts`/`.css` source change. Produce a committed
`tasks/lp-pvar-01-investigate/FINDINGS.md` that pins the facts the plumbing (02) and
the three variant tasks (03/04/05) build on. Each item must be a factual answer (not a
TODO). Booleans:

1. `tasks/lp-pvar-01-investigate/FINDINGS.md` exists and contains ALL of these anchors:
   a. **proofSlot plumbing plan** — the current `V36Body` signature (`app/lp/v36/_body.tsx`
      ~L612-622: props `hero`, `navDark`, `demoHeader`; NO `proofSlot` yet) and the exact
      hardcoded proof-band JSX block to be gated (`_body.tsx` ~L755-776, the
      `<div className="wrap proof">…c.proof.statement.map…`). State the target additive shape:
      `proofSlot?: React.ReactNode` with `undefined` → render the current band, `null` →
      render nothing, any node → render that node in place of the band. Confirm the ONLY
      consumer of `V36Body` is `app/lp/v36/page.tsx` (grep pasted).
   b. **restyled-live inventory** — paste `ls public/restyled-live/*.png | wc -l` (=60) and
      a list of ≥12 candidate filenames (real official-bank illustrations) P2 can use; note
      they are served from the public root as `/restyled-live/<name>.png`.
   c. **shared number constants** — `BANK_B_FMT`="1 757", `IMG_FMT`="986", `SECTIONS`=45,
      `YEAR`=2026, `PASS_FIRST`="21,5%" from `app/lp/v36/copy.ts` (line numbers). The exact
      literal `757` MUST NOT be retyped in any new `.tsx` — variants source `BANK_B_FMT`
      etc. from `../copy`. Note the P1/P3 dominant numeral uses `BANK_B_FMT`.
   d. **noindex layout pattern** — the canonical `app/lp/v36/layout.tsx` exports `metadata`
      (no robots). Record the exact additive form each variant layout needs:
      `export const metadata = { robots: { index: false, follow: false } }` (Next 16
      Metadata). Confirm a nested `app/lp/v36/pN/layout.tsx` inherits the parent's fonts +
      JSON-LD wrapper (it is nested inside `V36Layout`).
   e. **monument safe-zone facts** — from `app/lp/v36/_hero-prospekt.tsx` header + CSS: the
      monument (Батьківщина-мати) sits ~58% x / ~40% y; on phones (≤620, TALL crop) its
      screen band is fixed ~484px down at 390 (sword-tip→shoulders ≈484–560). Record the
      breakpoints P1 must not obstruct: 390 / 768 / 1280 / 1920. State that P1's added proof
      element must live in the hero's LOWER region and must NOT cover the monument band nor
      the phones' readable area.
   f. **browser harness reuse** — the contrast/overflow measurement JS + viewport-apply
      convention already exist in `tasks/lp-proof-03-browser-verify/verify.sh`
      (`"$DRIVER_BROWSER_CMD" set viewport W H` → `sleep` → re-assert `window.innerWidth` →
      `eval` measuring docOverflow/bandOverflow/contrast; WCAG lum/ratio helpers). Record that
      variant + acceptance verify.sh reuse this pattern, and that `agent-browser screenshot
      <path>` captures a PNG (per `bin/design-shots.sh` `shot()`). Origin default
      `http://localhost:3001` (spec), LAN fallback `http://100.110.64.90:3100`.
   g. **funnel-donot-guard scope** — `scripts/funnel-donot-guard.sh` scans a fixed
      `FUNNEL_FILES` array (app funnel surfaces), NOT `app/lp/**`; so AC3's guard requirement
      is a GLOBAL always-green regression check, not a check of the new files. Paste the array.
2. `git status --porcelain` shows changes ONLY under `tasks/lp-pvar-01-investigate/`.

## Constraints / decisions
- INVESTIGATION-ONLY: deliverable is `FINDINGS.md`, a standalone on-disk artifact the
  evaluator READS; `verify.sh` asserts its existence + key anchors (root CLAUDE.md: do not
  rely on journal prose; materialize the deliverable + assert anchors). No test/oracle/
  fixture/behaviour change ⇒ structural test traps are inapplicable by construction.
- Do NOT redesign or write component code here. Composition craft is 03/04/05's.
- Read `docs/research/proof-band-references-2026-07-20.md` and the spec first; the variants
  apply its PRINCIPLES, never any reference site's composition (uniqueness law).

## Next
- [x] Grep the facts (V36Body consumers, restyled-live glob, copy constants, layout metadata,
      hero safe-zone comments), write FINDINGS.md with each anchor filled, run verify.sh.
- (none — Goal fully met; FINDINGS.md written, verify green. Downstream = lp-pvar-02..05.)

## Artifacts
- `tasks/lp-pvar-01-investigate/FINDINGS.md` — the deliverable (all 7 anchors a–g filled;
  Acceptance table maps each Goal criterion → its section).
- `tasks/lp-pvar-01-investigate/verify.sh` — scope check narrowed to tolerate the untracked
  sibling lp-pvar-0[2-9] scaffolds while still catching any product-source leak.

## Log
- <UTC> laptop: scaffolded by planner.
- 2026-07-20T00:00Z ClPcs-Mac-mini: read the ground-truth sources and wrote FINDINGS.md —
  §a V36Body sig L612-622 + proof-band JSX L755-778 + additive `proofSlot?` three-state shape,
  sole consumer app/lp/v36/page.tsx; §b `ls public/restyled-live/*.png|wc -l`=60, 18 candidate
  filenames, `/restyled-live/<name>.png`; §c copy.ts constants w/ line numbers + no-retype rule;
  §d layout exports metadata (no robots) + additive `robots:{index:false,follow:false}`, nested
  layout inherits fonts+JSON-LD; §e monument ~58%x/~40%y, phones ~484–560 band, breakpoints
  390/768/1280/1920; §f lp-proof-03 browser harness (DRIVER_BROWSER_CMD viewport+eval+screenshot,
  origins); §g funnel-donot-guard FUNNEL_FILES array (app surfaces, not app/lp/**). verify.sh green.
- 2026-07-20T00:00Z ClPcs-Mac-mini: verify.sh scope check was impossible-as-written — the
  planner scaffolded sibling lp-pvar-0[2-9] task dirs in the same batch (still untracked), which
  this task neither created nor may remove; narrowed the exclusion to tolerate those `??` sibling
  scaffolds while a real `.tsx`/`.ts`/`.css` leak still trips it. Intent preserved, not weakened.
  Status→done.

## Verify
**Last verify:** PASS (2026-07-20T10:52:33Z)

## Evaluation
**Last evaluation:** PASS (2026-07-20T10:53:52Z)
