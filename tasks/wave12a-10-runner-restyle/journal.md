# Task: wave12a-10-runner-restyle

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Spec §C Runner visual polish. Restyle `components/test-runner.tsx` to the token/glass vocabulary WITHOUT
changing behavior. The existing answer→submit→feedback loop, roving radiogroup focus, save/flag, idempotency
(`clientEventId`/`randomUUID` guard) and exam/practice modes stay byte-for-byte functional (the
`browser-audit.sh` 2b assertion that answering renders «Правильно/Неправильно» must stay green).

PASS = ALL true:

1. Question card is the OPAQUE reading surface: the `rounded-xl border border-line bg-card` wrapper (line
   ~225) becomes the `.solid` token surface (`bg-card-tint`/`bg-card` + `border-line` + `rounded-card` +
   `--float`), no glass/backdrop-filter. verify.sh: runner uses `solid` or `bg-card-tint`/`rounded-card`.
2. Options render as calm `.opt` cards: each option `<button>` uses the `.opt` class (task 03) with
   `min-height ≥44px`, and the post-submit states use `.opt.correct`/`.opt.wrong` tints. verify.sh: runner
   references the `opt` class and a `correct`/`wrong` state class.
3. NON-COLOR-ONLY signalling preserved+visible: the ✓/✗ mark stays AND a text label «Правильно»/«Неправильно»
   is present (icon + label + color, never color alone). verify.sh greps `Правильно` and `Неправильно` and
   `✓`/`✗` still in the file.
4. Save/Flag become ≥44px icon-buttons (UX-FINDINGS): the save (★) and flag controls have explicit ≥44px
   sizing and an `aria-label` (Ukrainian). verify.sh: `min-h-[44px]`/`h-11`/`h-[44px]` present near the save/
   flag controls AND `aria-label` on them.
5. Progress bar uses the token-retinted `.road` (calm green, from task 02/09), timer chip (if present)
   recolored via tokens. verify.sh: still renders `.road`; no raw blue hex.
6. CTA («Далі»/submit) uses the primary `.cta-glass`/`Button variant="primary"` (soft-green + green-ink,
   dark ink, 44px). No `text-white` on a green fill anywhere in the runner. verify.sh: no white-on-green.
7. Focus-visible rings on options/buttons (global rule covers, or utility present). aria-checked/role=radio
   roving focus UNCHANGED. verify.sh: `role="radio"` and `aria-checked` still present.
8. `npm run typecheck` 0; `npm run build` 0; `npm test` 0; `npm run test:integration` 0-fail (the runner's
   flow tests must stay green — seed first if needed).

## Constraints / decisions
- SKIN ONLY. Do NOT touch the answer/submit/idempotency logic, the `clientEventId` generator, mode
  branching, or the roving-focus keyboard handler. A diff that changes those is out of scope and risks the
  2b regression class.
- Reading content stays opaque; zero glass on the question card; zero lenses in the runner (spec §3.4:
  all GPU goes to instant tap feedback).
- The q-image 404 placeholder + meaningful `alt` is task 11 (the runner currently renders `alt=""`); leave
  that to task 11 unless trivially co-located — if you touch the `<img>`, coordinate with task 11's gate.
- Non-Goal: sticky timer, swipe, digit keys, navigator bottom-sheet (all W12b). Inline retry on failed save
  is task 11.

## Plan
- [x] Question card → `.solid`; options → `.opt` + state classes (keep ✓/✗ + labels).
- [x] Save/Flag → 44px icon-buttons with aria-labels.
- [x] CTA → primary `Button variant="primary"` (already token soft-green + green-ink); road/timer token colors verified.
- [x] typecheck + build + unit + integration; re-run browser-audit 2b later (task 14/15).

## Next
- [ ] (task complete) Task 14/15 re-run browser-audit 2b against a fresh LAN server.

## Artifacts
- components/test-runner.tsx — question card→`.solid`, options→`.opt`/`.opt.correct`/`.opt.wrong` with `.mark` ✓/✗, save/flag→`min-h-[44px]` icon-buttons.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02T09:10Z ClPcs-Mac-mini: Restyled runner to the token/glass vocab, behavior byte-for-byte unchanged. Question card wrapper `rounded-xl border border-line bg-card`→`.solid` (opaque token surface, `--float`, no glass). Options now use the `.opt` class with `.correct`/`.wrong` state tints + the `.mark` chip carrying ✓/✗ (icon+`sr-only` label, no color-alone); pre-feedback selection = `ring-2 ring-sign`; `.opt` provides min-height 44px. Save/★ + Flag/⚐ became `min-h-[44px]` inline-flex icon-buttons (aria-labels kept). Image radius `rounded-lg`→`rounded-chip`. CTA already `Button variant="primary"` (green-soft + green-ink, no white-on-green). Left answer/submit/idempotency/roving-focus/mode branching untouched. All gates green: typecheck 0, build 0, npm test 392/392, integration 88 pass/2 skip. Verify grep gates all ok.

## Verify
**Last verify:** PASS (2026-07-02T06:11:15Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T06:13:44Z)
