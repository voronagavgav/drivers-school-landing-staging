# Task: lp-pvar-06 — static gates: typecheck, funnel guard, copy laws, canonical byte-identity

**Status:** done
**Driver:** auto
**Updated:** <UTC>
**Last compute:** laptop

## Goal
The non-browser half of the spec's acceptance (AC2 code-diff scope + AC3). Runs after 02–05.
Purely static/scripted; no server needed. Booleans (all in `verify.sh`):

1. `npm run -s typecheck` exits 0.
2. `bash scripts/funnel-donot-guard.sh` exits 0 (global regression — the guard scans the app
   funnel surfaces, not `app/lp/**`, so this proves the variants didn't break a guarded surface).
3. Copy laws pass on ALL new variant files (`app/lp/v36/p1/**`, `p2/**`, `p3/**`):
   a. the literal `757` appears in NO new `.tsx` file (grep `-rIF 757 … --include=*.tsx` empty);
   b. every line containing «підписк…» also contains «не » or «без » (case-explicit Cyrillic
      classes: `[Пп]ідписк`, `[Нн]е`, `[Бб]ез`);
   c. every line containing «гаранті…» also contains «не » on that line;
   d. «ГСЦ МВС» appears in NO new file.
4. Canonical route code-diff scope (AC2):
   a. `git diff --exit-code app/lp/v36/_hero-prospekt.tsx` exits 0 (zero diff);
   b. `git diff app/lp/v36/_body.tsx` is ADDITIVE-only: it adds the `proofSlot` optional prop +
      the slot conditional (+ optionally new CSS class names) and removes NO pre-existing
      `.v36 .proof` / `.proof-card` / `.proof-say` / `.proof-num` rule (those tokens still present);
      the diff has no removed non-blank product line other than the exact proof-block lines that
      were wrapped into the `undefined` branch (verify by re-asserting the default band still
      renders those classes);
   c. `git diff --stat app/lp/v36/page.tsx` shows 0 changed lines (canonical page untouched);
   d. `git diff app/lp/v36/copy.ts` shows 0 changed lines (shared copy/constants untouched).
5. Each variant route has a noindex `layout.tsx`: `app/lp/v36/p{1,2,3}/layout.tsx` each contains
   `index: false` in its exported metadata.
6. Diff-scope (AC5): `git status --porcelain` (staged+unstaged, excluding the task dirs
   `tasks/lp-pvar-*`) touches ONLY paths under `app/lp/v36/` — no file outside `app/lp/v36/**`
   is modified by the whole variant effort.

## Constraints / decisions
- This task authors NO product code — it is a verification gate. If a gate fails, the fix lands
  in the owning task (02–05), not here. If a gate itself is genuinely impossible/mis-specified,
  correct the gate and document why in the Log (root CLAUDE.md legit-gate-edit precedent).
- The funnel guard is a GLOBAL always-green check here (it does not scan `app/lp/**`); its role
  is to prove no guarded funnel surface regressed. See lp-pvar-01 FINDINGS §g.
- Grep hygiene (root CLAUDE.md): ERE only; case-explicit Cyrillic classes (BSD grep -i does not
  case-fold Cyrillic); no `|| true` masking a real check; scope purity greps to the new dirs.

## Plan
- [ ] Author verify.sh running typecheck + guard + copy-law line greps + canonical byte-identity
      + noindex-layout presence + diff-scope.
- [ ] Run it; if a gate reveals a real defect in 02–05, mark this task blocked on that task.

## Next
- [ ] Write verify.sh and run it after 02–05 land.

## Log
- <UTC> laptop: scaffolded by planner.
