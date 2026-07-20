# Task: wave17-08-value-ask-offer-card

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-05T19:10Z
**Last compute:** ClPcs-Mac-mini

## Artifacts
- `components/exam-access-offer.tsx` — the offer-card component.
- `app/(app)/test/[id]/result/page.tsx` — mount site (value-trigger gate + `readiness_aha` fire).

## Goal
The value-triggered 399 ₴ ask (T3/P1.5 + P2.1 + P2.3): a SINGLE honest offer card anchored to the
user's REAL readiness %, surfaced only after the dial renders on a completed session/sim — never on a
timer, never blocking content. PASS = ALL true:

1. An offer-card component `components/exam-access-offer.tsx` exists (`"use client"`, presentational —
   no server-graph imports). It receives the user's REAL `dialPercent` (int) as a prop and renders the
   anchored headline «Ти на N% — ось як дійти до 90%» using that real number (N interpolated from the
   prop, NOT a literal). If data is insufficient, it shows no fabricated % (renders the honest
   under-threshold copy or does not surface the ask).
2. SINGLE OFFER, no plan grid: real-proof line at top → benefit line («чесна готовність + план FSRS +
   аналітика помилок») → price «399 ₴ разово — доступ назавжди. Без підписки.» (price from `PRICE_UAH`
   constant, not a literal 399) → honest anchor «менше за одне заняття в автошколі». Exactly one price;
   no struck-through "was" price.
3. TRIGGER = VALUE EVENT, not a timer: the offer is mounted on the post-session/sim result surface
   (`app/(app)/test/[id]/result/page.tsx`) and/or the dashboard dial, conditioned on the dial having
   rendered a real number — there is NO setTimeout/countdown/interval driving its appearance. Assert
   no timer APIs in the component source.
4. BUY CTA copy = outcome-named «Відкрити доступ до іспиту» (or «Отримати чесний прогноз») — NEVER
   «Купити». Microcopy beside it «разовий платіж, не підписка». The CTA routes to the checkout
   surface (wave17-09) / `/pricing`; if wave17-09 not yet built, route to `/pricing` and TODO it.
5. HARD DO-NOT (assert absence in the component source): no countdown/«ціна діє ще»; no «залишилось N»
   / «X купують»; no fake struck-through «було»; no «SALE»/«знижка»; no auto-renew/subscription
   wording; the word «Купити» must NOT be the buy CTA.
6. Gated behind `isEntitlementsEnabled()` AND/OR `isValueFirstFunnelEnabled()` per the ADR — with both
   flags off, the offer card does NOT render (zero visual change; the wave-16 flag-off inertness
   property holds). Assert flag-off render is empty.
7. Fires the funnel `readiness_aha` event when the dial renders and the paid-ask impression event when
   the offer is shown (coordinate names with wave17-11; if not ready, use existing whitelisted events
   + TODO).
8. Browser-verifiable (consolidated in wave17-14): after completing a session that produces a real
   dial %, the offer card shows «Ти на» + the real % + «399» + «не підписка»; the forbidden tokens are
   absent from the rendered `main`.
9. `npx tsc --noEmit`, `npm test`, `npm run build` all exit 0.

## Constraints / decisions
- DESIGN CRAFT (apply directly): the offer is the ONE bold element on the result screen; everything
  else quiet. Real proof above price (real numbers ONLY — no fabricated testimonials/ratings). Copy is
  honest and direct. Quality floor: responsive, visible focus on the CTA, `prefers-reduced-motion`
  respected. One green accent; calm. The dial's credibility is the product — one perceived trick nukes
  it, so the DO-NOT block is absolute here.
- The anchor % MUST be the user's real computed `dialPercent` (existing readiness model) — never a
  placeholder or rounded-up marketing number.
- Do NOT build the checkout/payment here (wave17-09) — this task is the OFFER surface + honest copy +
  value-trigger only.
- Depends on: wave17-02 (flag), the existing readiness dial + `PRICE_UAH`. Coordinates CTA target with
  wave17-09 and event names with wave17-11.

## Plan
- [x] Build `exam-access-offer.tsx` (real-%-anchored, single offer, honest copy, outcome CTA).
- [x] Mount on the result/dial surface conditioned on a real dial + the flag (no timer).
- [x] verify.sh: source greps for required copy + DO-NOT token absence + real-% interpolation.
- [x] Run gates.

## Next
- [ ] DONE — Goal met. Browser-verify (§8) is consolidated in wave17-14 (offer «Ти на»/399/«не підписка»
      shown after a diagnostic finish with a real dial; forbidden tokens absent). Nothing else to do here.

## Log
- 2026-07-05T19:10Z ClPcs-Mac-mini: MOUNTED `<ExamAccessOffer>` on the diagnostic result surface
  (`app/(app)/test/[id]/result/page.tsx`). Value-trigger only: `dialReal = dial?.sufficientData === true`
  gates BOTH the `void recordEvent("readiness_aha", user.id)` fire (spec §7 — fires when the real dial
  number renders) AND `showOffer = dialReal && (isValueFirstFunnelEnabled() || isEntitlementsEnabled())`
  (spec §3/§6 flag gate decided SERVER-side; both flags off ⇒ no offer). Offer rendered inside the
  existing `isDiagnostic` block after «Ось з чого почати», passing REAL `dial.dialPercent`/
  `dial.sufficientData` — no timer. `readiness_aha` already whitelisted in ANALYTICS_EVENTS; recordEvent
  is fire-and-forget so a re-visit re-fires (acceptable, matches house fire-and-forget pattern).
  verify.sh GREEN end-to-end: tsc 0, npm test, npm run build all pass. Goal fully met → Status: done.
- 2026-07-05T18:40Z ClPcs-Mac-mini: FIXED failed verify (whole-file-grep trap, again). verify.sh line
  15 `grep -q 'Купити'` and line 19 `grep -Eq '…|countdown|…'` scan the RAW source, so my own doc
  comments that NAMED the forbidden tokens they avoid («…no «Купити»…», «…no countdown/scarcity…»)
  false-tripped both gates. Reworded the two comments to prose that avoids the literal bytes («buy verb»
  / «ticking-clock or scarcity nudge»). Confirmed: no «Купити», no timer token in source; all required
  copy greps green; `npx tsc --noEmit` → 0. Source-grep gates now clean.
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T18:20Z ClPcs-Mac-mini: FIXED failed verify — line 6 gate greps the WHOLE source for
  `lib/server|@/lib/db|@/lib/rbac|@/lib/auth`, and my doc comment named those tokens literally (the
  whole-file-grep trap, root CLAUDE.md 1st learning). Reworded the comment to prose («any server-only
  graph (data layer, auth, rbac, request-scope helpers)»). Source grep now CLEAN; `npx tsc --noEmit` → 0.
- 2026-07-05T00:00Z ClPcs-Mac-mini: Built `components/exam-access-offer.tsx` — `"use client"` presentational
  leaf, imports only React + pure `@/lib/constants` (PRICE_UAH) + client `track` + `LinkButton` (no
  server-graph). Real-%-anchored headline «Ти на {dialPercent}% — ось як дійти до 90%» (N interpolated
  from prop, not literal); single offer (benefit «чесна готовність + план FSRS + аналітика помилок» →
  price «{PRICE_UAH} ₴ разово — доступ назавжди. Без підписки.» → anchor «менше за одне заняття в
  автошколі»); outcome CTA «Відкрити доступ до іспиту» + microcopy «разовий платіж, не підписка»,
  routes to `/pricing` (ctaHref prop, wave17-09 checkout TODO). Renders null when `!sufficientData` (no
  fabricated %). Fires freeform `track("paid_ask_shown")` impression on mount (TODO(wave17-11) name
  reconcile). No setTimeout/countdown/scarcity/«Купити»/«SALE»/struck-«було». `npx tsc --noEmit` → 0.




## Verify
**Last verify:** PASS (2026-07-05T18:08:22Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T18:10:06Z)
