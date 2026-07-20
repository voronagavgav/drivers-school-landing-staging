# Task: wave17-06-save-progress-prompt

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T16:20Z
**Last compute:** mac-mini

## Goal
Surface a NON-BLOCKING «Зберегти прогрес і готовність» prompt to an anon visitor after they have real
progress worth saving — never on arrival, never blocking content. Neutral dismiss, no confirmshame,
fewest fields. PASS = ALL true:

1. A prompt component `components/save-progress-prompt.tsx` exists (`"use client"`, presentational —
   no server-graph imports; CLAUDE.md client-bundle law). It renders ONLY for an anon user
   (`isAnonymous` passed as a plain boolean prop computed server-side) AND only after the trigger
   condition; a real logged-in user NEVER sees it.
2. TRIGGER: it appears after `ANON_SAVE_PROMPT_THRESHOLD` (wave17-02 const) answered questions OR on a
   save-worthy event (a saved question / mistake / streak / dial render) — driven by an anon-progress
   count passed as a prop, NOT a timer. It is dismissable and does not reappear within the same session
   after dismiss (localStorage guard, e.g. `ds_save_prompt_dismissed`).
3. COPY: headline «Зберегти прогрес і готовність» (value-named, not «Створити акаунт»). The dismiss
   control reads «Не зараз» — NEUTRAL, never a confirmshaming decline («Ні, я не хочу…» is FORBIDDEN).
   The CTA links to `/register` (fewest fields — the existing register form). No repeated-nag: one
   prompt, dismiss sticks for the session.
4. NON-BLOCKING: it is a dismissable banner/card, NOT a full-screen interstitial covering the question
   loop. It must not intercept the answer/continue controls (learn from the calm-ritual overlay trap,
   CLAUDE.md wave14-14).
5. Wiring: the prompt mounts on the surfaces where anon progress accrues (test runner and/or dashboard)
   behind `isValueFirstFunnelEnabled()` AND `isAnonymous`. Flag-off or real-user → not rendered.
6. Browser-verifiable via `bin/browser-audit.sh` / `$DRIVER_BROWSER_CMD` (added assertions may live in
   wave17-14, but this task's verify.sh drives a minimal check): as an anon visitor who has answered
   ≥ threshold questions, the prompt text «Зберегти прогрес» is present in `main`; «Не зараз» dismiss
   removes it; the forbidden confirmshame string is absent from the component source.
7. `npx tsc --noEmit`, `npm test`, `npm run build` all exit 0.

## Constraints / decisions
- DESIGN CRAFT (unattended — apply directly): copy is design material — the action «Зберегти прогрес»
  keeps its name through the flow; the dismiss is direct and neutral («Не зараз»), never vague, never
  shaming. Boldness in ONE place (the save CTA); everything else quiet. Quality floor: responsive,
  visible focus ring on both buttons, respect `prefers-reduced-motion` (no springy entrance if the
  user opts out). One green accent only. Calm.
- HARD DO-NOT: no confirmshame dismiss, no repeated «зареєструйся!» nag, no exit-intent, no
  content-blocking interstitial. The prompt is an invitation, not a gate.
- Depends on: wave17-02 (threshold const, flag), wave17-04 (anon play produces progress),
  wave17-05 (register migrates it — the prompt's promise must be real).

## Plan
- [x] Build `save-progress-prompt.tsx` (anon-only, threshold-triggered, dismissable, neutral copy).
- [x] Mount it behind flag+isAnonymous on the runner/dashboard with a server-computed count prop.
- [x] verify.sh: source greps (copy present, confirmshame absent) + a browser check.
- [x] Run gates.

## Next
- [ ] (Goal met) Optional follow-up owned by wave17-14: browser-audit section proving the prompt
      shows for an anon visitor ≥ threshold and «Не зараз» dismisses it.

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T00:00Z ClPcs-Mac-mini: built `components/save-progress-prompt.tsx` — `"use client"`,
  presentational (only `@/components/ui` + pure `ANON_SAVE_PROMPT_THRESHOLD`, no server-graph imports).
  Renders null until a mount effect confirms `isAnonymous && progressCount >= threshold` and no
  `ds_save_prompt_dismissed` localStorage flag (InstallHint pattern — avoids hydration flash). Copy:
  headline «Зберегти прогрес і готовність», CTA «Зберегти прогрес» → `/register`, neutral dismiss «Не
  зараз» (no confirmshame). Non-blocking `Card`, 44px targets, global focus-visible ring, motion-safe
  entrance only. `npx tsc --noEmit` exit 0.

- 2026-07-05T16:20Z ClPcs-Mac-mini: (1) reworded the client-bundle-law doc comment to stop naming
  the literal `lib/server`/`lib/auth`/`lib/rbac`/`lib/db` tokens — the verify purity grep matched the
  COMMENT (whole-file comment-grep trap, root CLAUDE.md), causing the prior FAIL. (2) Mounted
  `SaveProgressPrompt` on the test runner page (`app/(app)/test/[id]/page.tsx`) behind
  `isValueFirstFunnelEnabled()`, passing `isAnonymous={user.isAnonymous}` and a server-computed
  `progressCount` = answered-question count. Switched the page from `requireUser()` to
  `requirePlayableUser()` so anon visitors can resolve here (byte-identical for real users / flag-off);
  the card sits BELOW the runner, non-blocking. verify.sh PASS (tsc/test/build all 0).

## Artifacts
- components/save-progress-prompt.tsx
- app/(app)/test/[id]/page.tsx


## Verify
**Last verify:** PASS (2026-07-05T15:53:48Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T15:55:50Z)
