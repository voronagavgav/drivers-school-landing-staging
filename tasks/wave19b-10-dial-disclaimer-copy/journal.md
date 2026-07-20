# Task: wave19b-10-dial-disclaimer-copy

**Status:** done
**Driver:** auto
**Updated:** 2026-07-12
**Last compute:** ClPcs-Mac-mini

UI HONESTY COPY (Wave 19b deliverable #4). Add one calm Ukrainian sentence under the readiness dial stating
what the number IS — an estimate of the probability of passing given current knowledge, NOT a guarantee —
consistent with the Wave-5 legal stance and the «не гарантія» verify-gate patterns. The disclaimer lives in the
shared `components/readiness-dial.tsx`, so it appears on BOTH the dashboard hero and the DIAGNOSTIC `/result`
dial (both import `ReadinessDial`).

## Goal
PASS = ALL true:

1. `components/readiness-dial.tsx` renders a disclaimer sentence INSIDE the `sufficientData === true` branch
   (structurally coupled to the number, so wherever the percent shows, the disclaimer shows — a §number-state
   surface). Copy conveys: «оцінка ймовірності скласти … за поточними знаннями, … не гарантія». Exact wording
   e.g. `Це оцінка ймовірності скласти іспит за поточними знаннями, а не гарантія.`
2. NEGATION-GATE SAFE (CLAUDE.md same-line trap): the words «гаранті…» AND the «не » token sit on the SAME
   source line (`…а не гарантія…` not wrapped across JSX lines), so a `grep 'гаранті' file | grep -v 'не '`
   style honesty gate sees the negated form. verify.sh asserts both the presence of «не гарантія» and that the
   line containing «гаранті» also contains «не ».
3. The disclaimer is QUIET secondary text (e.g. `text-xs text-muted`), NOT a bold/danger element — the ONE bold
   element on the surface stays the dial number. No animation (respects reduced-motion by being static).
4. `npm run -s typecheck` exits 0; `npm run -s build` exits 0 (client-bundle law: `ReadinessDial` is a leaf
   client component — do NOT add any server-graph import; the disclaimer is a plain string literal).
5. BROWSER (best-effort, via `"$DRIVER_BROWSER_CMD"`): log in as the seeded user, open the dashboard; if the
   dial is in the number-state, assert the dashboard `main` textContent includes «не гарантія» (via
   `$DRIVER_BROWSER_CMD ... eval 'document.querySelector("main").textContent.includes("не гарантія")'` —
   textContent is CSS-transform/comment free per CLAUDE.md). If the seeded user is not data-sufficient (dial in
   "gathering data" state), log that the number-state was not reached and rely on the source + structural gates
   (criteria 1–3) as definitive. Do NOT fail the task solely because the browser could not reach number-state.

## Constraints / decisions (frontend-design CRAFT — implementer will not fire the skill)
- Copy is design material: the sentence is calm, direct, and honest — it names what the number is and what it
  is not, in plain Ukrainian; no hedging, no fear, no marketing.
- Boldness budget: ONE bold element per surface — the dial percentage. The disclaimer is deliberately quiet
  (muted, small); it must not compete with the number or the bottleneck CTA.
- Structural devices only where they mean something: the disclaimer is a single sentence, no icon/badge/box —
  it is a footnote to the number, placed directly under/beside the dial within the same `sufficientData` block.
- Quality floor: no layout shift (the existing `min-h` hero reserves space — keep the disclaimer inside it so
  it doesn't grow the box past the reserved height on narrow screens; verify the dashboard still has no CLS
  jump); reduced-motion respected (static text); readable contrast (`text-muted` on the card surface).
- Project brand/legal stance wins on any conflict: this mirrors the existing `LegalDisclaimer` tone (never
  claims official exam status; states an estimate, not a guarantee).
- Non-goals: changing the dial math/number, the "gathering data" state copy, any recompute logic, recording ρ
  (task 09 owns inputsJson).

## Next
- [x] Add the disclaimer inside the sufficientData branch of `ReadinessDial` (quiet muted text, same-line
      negation); run typecheck + build; run the best-effort browser check against a running app.
- Goal fully met (criteria 1–4 satisfied by source + gates; criterion 5 browser is best-effort/non-fatal).

## Artifacts
- components/readiness-dial.tsx — disclaimer `<p className="mt-3 text-center text-xs text-muted">Це оцінка
  ймовірності скласти іспит за поточними знаннями, а не гарантія.</p>` inside the sufficientData branch
  (wrapped the branch in a fragment so the flex-row dial + footnote both render).

## Log
- 2026-07-12 laptop: planned. Shared ReadinessDial → covers dashboard + /result. Browser number-state is hard
  to reach organically (CLAUDE.md), so source/structure gates are definitive + browser is best-effort.
- 2026-07-12 ClPcs-Mac-mini: added honesty footnote inside the `sufficientData === true` branch — wrapped the
  branch body in a `<>…</>` fragment (was a bare `<div>`), appended a quiet `text-xs text-muted` `<p>` with the
  single-line negated phrase «…за поточними знаннями, а не гарантія.» (negation-gate safe: «гаранті» + «не » on
  one source line). No server-graph import (leaf client component). `npm run -s typecheck` 0, `npm run -s build`
  0. Negation + quiet-styling greps pass locally. Status → done.

## Verify
**Last verify:** PASS (2026-07-12T16:25:30Z)

## Evaluation
**Last evaluation:** PASS (2026-07-12T16:27:09Z)
