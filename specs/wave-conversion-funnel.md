# Wave (queued) — Value-first mobile conversion funnel

**RUN-NOW SCOPE (Danil 2026-07-05 "run them"):** build + locally verify the value-first funnel CORE
now, behind flags (Wave-16 pattern) — **T1, T2, T3, T5, T6**. **T4 (web checkout): build the flow +
entitlement-grant, but the payment-provider call is STUBBED behind `ENTITLEMENTS_ENABLED`/a dev
"simulated success" — no real LiqPay/Fondy charge** (that + the hosted-PSI perf number are the only
parts that truly need Gate 0 + a payment account, wired later). Nothing here ships publicly; it flips
live when the public origin + payment creds exist. Builds on Wave 16 (entitlement scaffold, `/pricing`,
JTBD onboarding, `ENTITLEMENTS_ENABLED` flag).

**Source of truth:** mobile-conversion research → `docs/strategy/m5-conversion-spec-2026-07-05.md`
(prioritized) + `web-design-craft.md` §9 (brand-safe tactics + DO-NOT block). **Danil decided
2026-07-05: VALUE-FIRST (defer signup)** — reverses the old "signup gate" direction.

## Mission
Turn the mobile app-home into an honest, value-first conversion funnel: visitor DOES the core action
(answers real ПДР questions, sees explanations + restyled images, gets a real readiness number) with
ZERO signup → is invited to create a FREE account only to SAVE progress → is offered the 399 ₴
one-time «доступ до іспиту» intelligence layer at a VALUE-TRIGGERED moment. No dark patterns.

Binding constraints (SETTLED): calm; one green accent; 399 ₴ ONE-TIME, not a subscription; freemium
INVERSION (all content free is the hook); the DO-NOT block below is non-negotiable.

## Tasks (spec at plan time; boolean criteria)

### T1 — Anonymous session / defer registration (P1.1, the biggest lever)
- Let a logged-OUT visitor start any practice mode + answer questions + see explanations/images,
  backed by an anonymous local/server session (cookie-scoped, no PII). Progress persists in the anon
  session. **No `/register` redirect on the first action.**
- After ~5-10 answered (configurable const) OR on a save-worthy event (mistakes/streak/dial), surface
  a non-blocking «Зберегти прогрес і готовність» prompt → account creation that MIGRATES the anon
  session's progress. Neutral «Не зараз» dismiss (no confirmshame). Fewest fields (email or one-tap).
- Server: anon→user progress migration is idempotent + own-session only (no IDOR).

### T2 — Self-segment onboarding → tailored first set (P1.4)
- ≤4 taps, NO free-text, NO signup: category (B/C/…), exam timing, confidence → open a tailored first
  question set + seed the readiness dial with real (not placeholder) data. Skippable.
- Feeds JTBD analytics (Wave 16 whitelist) — the telemetry that closes our 3×-failed JTBD research.

### T3 — Value-triggered 399 ₴ ask on the real dial (P1.5)
- After a completed session/sim renders the honest dial, offer the paid layer anchored to the user's
  REAL %: «Ти на N% — ось як дійти до 90%». Trigger on the value event, NEVER a timer/countdown.
- Single offer card (no plan grid): real proof above price → benefit (dial + FSRS plan + analytics) →
  «399 ₴ разово — доступ назавжди. Без підписки.» → honest anchor «менше за одне заняття в автошколі».

### T3b — Anon-exclude the 399₴ offer (⚠ MUST land before `VALUE_FIRST_FUNNEL` flips live)
- **Confirmed defect (Opus skeptic wave18-review, 2026-07-06 — 4 lenses, 0 rejected; report basis in
  PLAN.md Wave-18 addendum).** `app/(app)/test/[id]/result/page.tsx:61` gates the paid offer on
  `showOffer = dialReal && (isValueFirstFunnelEnabled()||isEntitlementsEnabled())` with **no
  `!user.isAnonymous` term**. Wave-18 removed the page's `requireUser()` wall (correctly, for the free
  payoff), which was the *only* thing keeping the offer from anons. An anon who accumulates
  ≥`READINESS_MIN_SEEN`(20) `ReviewState` rows then completes a DIAGNOSTIC reaches `sufficientData=true`
  → the 399₴ `ExamAccessOffer` renders to a logged-OUT visitor + `readiness_aha` fires for the anon.
  Bounded today (flag default-OFF; offer CTA→/pricing & `completeCheckout` both bounce anon → no leak),
  but it defeats the value-first invariant the instant the flag flips.
- **Criteria (boolean):** (a) `showOffer` includes `!user.isAnonymous`; (b) the `readiness_aha`
  `recordEvent` is likewise anon-gated; (c) a NEW integration test drives an anon to a **data-sufficient
  DIAGNOSTIC** finish (seed `readinessSnapshot {sufficientData:true, seenCount:READINESS_MIN_SEEN}`) and
  asserts `ExamAccessOffer` is ABSENT in the rendered tree (the negative that pins the invariant — the
  wave-18 anon test uses TOPIC_PRACTICE so it structurally can't); (d) reconcile with product-decision #3
  (does an anon see the readiness-DIAL detail *move* — the dial is one gate short of the offer). Correct
  the CLAUDE.md/​audit comments that falsely claim the offer is authed-enforced (done in CLAUDE.md).

### T4 — Web checkout (P2.2) — the deferred-from-Wave-16 payment integration
- Complete the 399 ₴ purchase on the same web origin (LiqPay/Fondy). Wallet (Apple/Google Pay)
  primary; email+card fallback; minimum fields; correct mobile keyboard types. Flip
  `ENTITLEMENTS_ENABLED` on purchase → grants EXAM_ACCESS entitlement (Wave 16 model).
- Honest money-back line («Не допомогло — повернемо гроші»), a real window, honored. Buy CTA =
  «Відкрити доступ до іспиту» + «разовий платіж, не підписка» microcopy. Never «Купити».

### T5 — PWA + A2HS + offline (P1.7)
- Web manifest (Світлик icon, theme `#FBFAF7`, standalone) + service worker caching the question
  loop/sim for offline (Wave 10f de-risked Serwist). Honest, non-blocking A2HS prompt AFTER value.

### T6 — Funnel instrumentation (P3.3) + perf floor (P1.6)
- Track rates: segment-complete → aha (answered+explanation) → readiness-aha (dial) → register → paid.
- CWV pass at p75 on hosted PSI/CrUX (LCP ≤2.5 / INP ≤200 / CLS ≤0.1), measured OFF the M2
  ([[feedback-fast-machine-hides-tbt]]). Reserve space for dial/tiles; defer heavy widgets.

## HARD DO-NOT (reject even if they lift short-term)
No countdown/«ціна діє ще»; no phantom scarcity («залишилось 3»); no fake struck-through discount; no
confirmshaming dismiss; no disguised/auto-renew subscription or pre-ticked add-ons; no exit-intent or
repeated «зареєструйся!» nags or content-blocking interstitials (also Google-penalized). Rationale:
our paid layer IS "the honest intelligence" — one perceived trick nukes the dial's credibility.
Honest is the profit-max strategy (mild dark patterns ~2× rate BUT 56% lose trust / 43% stop buying).

## Wave-review lenses (when run)
Anon→user migration correctness + no IDOR; content NEVER gated (freemium inversion holds); payment
security (server-verified entitlement grant, no client trust); DO-NOT compliance (no dark patterns in
shipped copy); perf CWV; analytics privacy whitelist.
