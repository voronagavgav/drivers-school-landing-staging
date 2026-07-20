# 00 · Master Plan — Drivers School (holistic evolution)

**Owner:** Synthesis lead · **Status:** executive plan of record · **Date:** 2026-07-01
**Repo:** `/Users/clpc/drivers-school` (branch `main`) · **Delivery:** Mesa harness (`mesa plan` → `run-all` + evaluator + verify gate), then independent real-browser audit.
**Synthesizes:** docs `01`–`05` in this folder + the Completeness & Quality critic gap list. Where the five docs forked, **this doc is canonical** and both sides are reconciled here (§6).

> Content is **official-only, DB-derived, honestly counted**: 2322 questions · 65 topics · 8 categories · 734 official images being restyled (**60 live today**). ★4.9 / testimonials are **placeholders** — never shipped as real. This plan evolves a **mature app (Waves 1–9 done)**; it is not greenfield.

---

## Executive summary

Ukraine's ПДР theory-prep market competes on *identical official content* wrapped in *ugly, ad-heavy, anxiety-inducing* shells; the international leaders are *gamey/childish* or *expensive*. **Nobody owns "calm · premium · emotionally-aware · mobile-first" for an anxious first-time exam-taker.** That empty quadrant is our defensible ground, and our north-star emotion is **competence + relief, never fear**.

We win it with three things a competitor cannot cheaply copy, delivered inside one premium **liquid-glass** shell that *also runs cool on a 2016 phone*:

1. **An honest readiness dial** — not "% of questions seen" but a **predicted probability of passing the real ТСЦ exam** (FSRS retrievability → blueprint-weighted Poisson-binomial → shrunk toward real mock scores → discounted by measured over-confidence). It is honest *by construction*: thin coverage drags it down, memory lapse decays it, bravado lowers it. It is the emotional hero of the whole app, rendered as the landing's signature **0→N% count-up** lens.
2. **A finite, test-date study ritual** — "~18 днів × 15 питань, встигаєш спокійно" — replacing an open-ended 2322-question grind with a visible finish line and a daily dose that is *also* pedagogically better (distributed practice > cramming), scheduled by an **FSRS spaced-repetition engine** that keeps the queue short and the promise ("кілька хвилин на день") honest.
3. **A first-class calm-nerves layer** — graded exposure (flash → topic → full timed mock), an optional 60-second Світлик-paced breathing ritual, mistakes reframed as *shrinking strengths*, and a hard **anti-leaderboard** stance. Zero UA competitors treat anxiety as the product.

The engine underneath is **additive**: the existing session lifecycle (`startSession → submitAnswer → finishSession`), the ТСЦ exam rules (20 Q / 20 min / ≤2 errors), the cat-B blueprint, the mistake bank, and the **stable-key content architecture** (`imageKey → /api/q-image/[key]`, idempotent upsert-by-key that preserves user progress) all stay. We add a pure FSRS library, eight new tables (all nullable/additive, hand-authored migrations), a unified queue picker, one honest-readiness function, the ported liquid-glass design system, and a PWA/offline layer — **never** breaking the stable key or the legal/demo positioning.

Delivery is five Mesa-harness waves (**10 → 14**), each green + independently **real-browser** verified before the next. This master plan resolves every fork the five source docs contained (nav set, mode taxonomy, the phantom `ExamAttempt` table, backfill strategy, readiness math), folds in the critic's gap fixes (data-export UI, empty/failure states, monetization scope, iOS push fallback, admin learning-health), and names the risks that remain open (deploy topology, Serwist × Turbopack, per-category exam rules).

---

## Table of contents

1. Product vision & positioning
2. Information architecture at a glance (canonical nav)
3. The roadmap as Mesa-executable phases (Waves 10–14)
4. Signature / unique features (the moat)
5. How anxiety-reduction + liquid-glass thread through the whole product
6. Critic-gap resolutions (fixed vs still-open)
7. Top risks
8. Top 5 decisions
9. Top 5 open questions
10. Immediate next steps — kicking off the build

---

## 1. Product vision & positioning

- **One-line product.** *Спокійна, чесна підготовка до теоретичного іспиту ПДР: застосунок сам знає, що вам повторити сьогодні, і чесно показує, наскільки ви вже готові.* (The calm, honest way to pass Ukraine's ПДР theory exam — it tells you exactly what to study today, and shows you honestly how ready you are.)
- **The wedge.** Calm · premium · emotionally-aware · mobile-first — carried by the honest dial, the finite test-date plan, and the calm-nerves layer. **Trust is the moat**: official-only content, no fabricated social proof, no dark-pattern monetization.
- **Personas** (one adaptive engine, different entry emphases — not three apps): **P1 Анна** the anxious first-timer *(primary; sets the tone of every screen)*; **P2 Тарас** the deadline-driven (justifies the finite plan + weak-spot engine); **P3 Оля** the retaker (justifies mistakes-as-strengths + the improvement narrative). **P4** the internal content manager is served by the unchanged `/admin/*`.
- **Positioning as a mechanic, not a slogan.** Over-confidence is *measured* and *discounts* the headline number (S5); the readiness is a number the user literally cannot inflate. Combined with official-only content and no fake reviews, honesty is the positioning **and** the math.
- **Rejected directions (never re-propose).** *Taste:* claymorphism; hard/saturated greens; over-colorful backgrounds; small/plushy mascot; dark/gray/muddy lenses; recurring/periodic gloss (only hover/interaction sweeps); glass-on-glass; gloss/3D past the clean "ref_B" look; sticker-look sign pastes. *Engagement:* leagues / public leaderboards / rank-vs-peers; punishing streak-loss; loss-aversion / guilt / FOMO notifications; XP economies / coins / badge walls / confetti spam; fabricated social proof.

---

## 2. Information architecture at a glance (canonical nav)

**Decision (resolves critic C1): the primary bottom nav is a 5-target glass capsule — `Головна · Навчання · Іспит · Прогрес · Профіль` — with all secondary destinations nested *inside* tabs (no "Ще" overflow sheet in the primary IA).** This keeps the two moat surfaces (Прогрес = the dial detail + 65-topic mastery map; Профіль = plan / calm / settings) top-level and one tap away, honours "≤5 targets + progressive disclosure", and avoids burying Прогрес/Профіль (which doc 04's earlier `…·Помилки·Ще` set did). Both docs 01 and 04 now cite this one list. Doc 04's bottom-sheet pattern is retained only as the tablet/edge affordance, not the primary IA.

```
┌───────────────────────────────────────────────────────────┐
│                 (reading content — opaque/solid)           │
├───────────────────────────────────────────────────────────┤
│  ⌂ Головна   ▣ Навчання   ◉ Іспит   ▤ Прогрес   ☺ Профіль  │  ← glass e1 capsule, thumb zone
└───────────────────────────────────────────────────────────┘
         (◉ Іспит subtly RAISED · green-lamp accent · never a childish FAB)
```

| Tab | Route | Nests (≤2 taps) |
|---|---|---|
| **Головна** | `/dashboard` *(EVOLVE)* | readiness dial hero · "на сьогодні" plan card · due-review nudge · weakest-topic line |
| **Навчання** | `/practice` *(EVOLVE)* | mode picker · 8 categories → 65 topic cards · **Помилки** `/mistakes` · **Збережені** `/saved` · **Знаки** `/practice/signs` (deferred) |
| **Іспит** | `/exam` *(NEW)* | ТСЦ launcher (20/20/≤2) · **Спокій** pre-exam ritual `/exam/ready` (NEW) |
| **Прогрес** | `/progress` *(EVOLVE)* | mastery map · **Readiness detail** `/progress/readiness` (NEW) · **Calibration** `/progress/calibration` (NEW) · **Історія** `/history` |
| **Профіль** | `/account` *(EVOLVE)* | Notifications · Exam-date & plan · Offline packs · **Спокій** `/calm` · **Data (export + delete)** `/account/data` (NEW, resolves G1) · Help/legal |

- **Immersive escape.** The session runner `/test/[id]` and the pre-exam ritual **hide the tab bar** — one question per screen, primary CTA anchored bottom-thumb.
- **Glass discipline.** The capsule is the only persistent glass chrome; on weak/phone tiers it is **emulated** (painted fill + gloss + rim + colored shadow, **no `backdrop-filter`**). Reading content stays opaque. Admin keeps its own top nav.
- **Full route inventory, build status (EXISTS / EVOLVE / NEW), and every flow** live in **`01-information-architecture.md`**.

---

## 3. The roadmap as Mesa-executable phases (Waves 10–14)

Priority key: **MVP / table-stakes → differentiators (the moat) → vision.** Each wave is one `mesa plan <spec> <prefix>` → `DRIVER_EVALUATE=1 mesa run-all` (verify gate `typecheck && test`, independent evaluator, learnings) → **independent real-browser audit** (`npm run audit:browser` over the real http origin + hosted PSI) → close in `PLAN.md`. Pure logic (`lib/fsrs/*`, `lib/test-engine/queue.ts`, `lib/readiness-model.ts`) ships **first + unit-tested** so the gate is real; DB wiring follows in `lib/server/*`.

### Wave 10 — SRS foundation (no UI) · MVP spine
The migration (`ReviewState`, `ReviewLog`, `TopicMastery` + the eight-table set, one `ADD COLUMN` per `ALTER`, `migrate deploy` then `generate`); pure `lib/fsrs/*` (schedule / retrievability / deriveGrade, unit-tested against reference vectors) + `queue.ts` + `readiness-model.ts`; the `submitAnswer` transaction dual-writes `ReviewState`/`ReviewLog` with **lazy state creation** (no bulk backfill → sidesteps the P2029 param cap); `ADAPTIVE_REVIEW` mode added to the union. **Verify:** loader re-run → 0 id changes / progress preserved; FSRS vectors match reference; `where id in [...]` never carries the full key list.

### Wave 11 — Adaptive loop + honest readiness · MVP + first differentiator
`startAdaptiveReview` + queue-driven session; `SPACED_REVIEW` daily due-card; exam-date `getStudyPlan` (the finite "N днів × M питань" ritual); `ReadinessSnapshot` computed on `finishSession` + nightly (exact Poisson-binomial, **server-authoritative**, never in render path); `UserStudyProfile`/`StudyDay` + detoxified streak/goal + `freezeToken` day-off; `DIAGNOSTIC` onboarding seed → first dial climax. **Verify:** dial is low at thin coverage, rises with mocks, matches recent mock pass-rate within tolerance; mistake pool reconciles with `ReviewState.relearning`. *Recommend a shadow-run of the FSRS dial beside the legacy 5-level before it becomes the hero.*

### Wave 12 — Design-system port · signature calm shell
Landing "G · Спокій · Рідке скло" tokens → Tailwind v4 `@theme` + the `:root` glass mechanics; three-tier glass strategy (full / emulated / phone) + device detection + `UserSettings` overrides; Світлик sprite on a rail; the count-up readiness dial component; opaque reading content; the **per-screen empty & failure states** (resolves G2). **Verify:** real-browser glass render (e2b Chromium) + hosted-PSI mobile budgets + a11y (axe + CTA 4.5:1 + non-colour-only signalling) + reduced-motion/transparency fallbacks.

### Wave 13 — PWA / offline / images · table-stakes parity
Serwist SW (**webpack-build path** for `next build`; **spike in isolation + no-SW fallback first** — F1); `manifest.ts` + iOS `apple-touch-icon`/meta + in-app install card; image content-negotiation `?w=&f=` **inside the existing resolver** (never fork the key) + `sharp` **build-time** AVIF prebake (≤120 KB, AVIF→WebP→JPEG); opt-in per-topic offline packs (size-confirmed, ≤50 MB budget); `/api/review-sync` + Background Sync (idempotent by `clientEventId`). **Verify:** offline reload of dashboard/mistakes; offline review → reconnect → synced (real browser); every image ≤120 KB.

### Wave 14 — Engagement + telemetry + calm-nerves + vision seeds
Notifications (`PushSubscription`/`NotificationLog` + the ≤3–4/week guard, **in-app nudge as v1 default**, Web Push as progressive enhancement — G4); confidence sampling + calibration panel; the optional 60-second breathing/reframing ritual; `/account/data` export + cascade-delete (G1); **`/admin/learning-health`** + explanation-review queue to lift the 38% REVIEWED (G5); analytics pruning job. **Vision (Tier C, sequenced after the moat proves out):** AI-tutor "поясни простіше" (verify-gated), scenario/animation loop, audio explanations, richer adaptive diagnostic, opt-in in-app calm map field.

**Deferred by name (explicitly out of the MVP union, added later as cheap presets over the same picker):** `QUICK` (5-хв micro-session), `MARATHON` (endless), `SIGN_TRAINER` (pairs with sign-corpus coverage). **Explicitly out of scope for Waves 10–14: monetization / paywall** (resolves G3 — launch free to protect the calm/trust brand; C4 "transparent subscription" stays a post-launch vision item).

---

## 4. Signature / unique features (the moat)

The 5–8 genuinely differentiating ideas — grounded in *our* positioning, not generic exam-prep tropes. Full specs in `02-features.md` §SIGNATURE and `03-learning-regimes.md`.

- **S1 · Шкала готовності — the honest, defensible readiness dial.** Predicted P(pass), rendered as the app's emotional hero (single 0→N% climax). Honest by construction; always paired with the named **bottleneck** so the % comes with the next action.
- **S2 · План до іспиту — the finite, test-date ritual.** Exam date + daily window → "~18 днів × 15 питань, встигаєш спокійно"; re-plans calmly ("ще встигаєш") when reality drifts, never scolds. The single highest-leverage differentiator.
- **S3 · Світлик — the calm messenger of readiness.** A credible, adult, literal sized-up traffic-light buddy on a rail with a reactive ground shadow; the green "go" lamp is the encouragement metaphor and the breathing pacer. **Appears at true emotional beats only** (T1) — never a scroll companion, never plushy, never confetti/guilt.
- **S4 · Візуальний рів — restyled official photos + real signs as the answer anchor.** The visual moat competitors (who paste raw images) can't cheaply match. **Degrades gracefully per key** to official images (never sticker-look); the moat deepens automatically as restyle coverage climbs from 60/734 — no app change (T2).
- **S5 · Впевненість-honesty — a readiness you literally cannot inflate.** Measured over-confidence *lowers* the number; the discount is explainable on tap ("чому не 100%?").
- **S6 · Карта тем — the finite terrain view.** Private mastery (topics Впевнено / pool covered) replaces XP/leagues entirely; honest slip-back; steers to the weakest topic, never locks.
- **S7 · Рідке скло, але спокійне — the premium calm shell as a feature.** Authentic Apple Liquid Glass, disciplined (≤2 lenses, glass = chrome only, reading = opaque), that also runs cool on a 2016 phone via the emulated tier — the connective tissue of S1–S6.

---

## 5. How anxiety-reduction + the liquid-glass identity thread through the whole product

**Anxiety-reduction is the product, not a module.** It is woven into every layer:
- *Onboarding* turns "2322 questions" into a finite personal plan and a **first win in <60s** (diagnostic → dial climax on the user's own data).
- *The dial* replaces dread-of-uncertainty with a controllable number + a next action.
- *Every answer* is question-first (retrieval is the only path to the "why"), calm-framed, two-tap grading ("Не згадав / Згадав"), never four-button self-grading.
- *Mistakes* are reframed as **shrinking strengths** ("помилки, які вже не повторяться"), grouped by topic, never red-flooded.
- *Habit* is detoxified: "days of practice", an automatic generous **вихідний** Світлик offers, no streak-panic, **no leaderboards**.
- *The exam* is graded exposure with an optional 60-second breathing ritual — the format itself is the treatment.
- *Copy* is effort/mastery language ("спокійно росте"), never scores-as-judgment; Світлик's first-person voice is capped to genuine emotional beats and notifications carry **no emoji**.

**Liquid glass is the calm identity's connective tissue — but disciplined.** Glass is the floating **control/nav layer only**; **reading content is opaque/solid at every tier**; **≤2 co-visible real-refraction lenses ever** (the dial + one hero sample), **never glass-on-glass**, never over a moving background. The **one green accent** rule holds everywhere: soft/pastel green FILL + **dark slate text** (WCAG 4.5:1) — the green never hardens to fix contrast; darken the *text* instead. On weak/phone hardware the glass is **emulated** (painted fill + gloss + rim + colored shadow, no `backdrop-filter` — the #1 GPU/heat cost), measured on **hosted PSI / a real browser**, never local M2 numbers. Full identity, tokens, and interaction language: **`04-design-system.md`** + the `pdr-design` / `liquid-glass` skills; source of truth is the live landing (`/Users/clpc/pdr-landing-site/`).

---

## 6. Critic-gap resolutions (folded fixes + what remains OPEN)

**Contradictions (were forking the build) — all resolved:**

| # | Fork | Canonical decision |
|---|---|---|
| **C1** | Nav tab set (01 vs 04) | `Головна · Навчання · Іспит · Прогрес · Профіль`; secondary nav nested in tabs; no primary "Ще" overflow (§2). |
| **C2** | Mode taxonomy (03 vs 05) | One `TEST_MODES` union: 5 legacy + `SPACED_REVIEW`, `ADAPTIVE_REVIEW` (**canonical name**; `MIXED_PRACTICE` = back-compat alias), `DIAGNOSTIC` for MVP. `QUICK`/`MARATHON`/`SIGN_TRAINER` **deferred by name**. Drop the bare `ADAPTIVE` string. |
| **C3** | Phantom `ExamAttempt` table (01/02 vs 03/05) | **No new table** — reuse `TestSession(mode="EXAM_SIMULATION", status="COMPLETED")` as the reality anchor; per-question exam correctness already in `TestAnswer`. |
| **C4** | Backfill mandatory vs lazy | **Lazy-create `ReviewState` on first answer; no bulk backfill.** Any optional seed script chunks `updateMany` ≤200 ids. Doc 03's Phase-1 mandatory-backfill verify is downgraded. |
| **C5** | Readiness math (MC vs PB) | **Exact Poisson-binomial `P(≥18/20)`**, deterministic, server-authoritative, computed on `finishSession` + nightly. Drop the `READINESS_MC_DRAWS=1500` constant; MC only if needed for blueprint *draw composition*, at a modest fixed count. |

**Gaps — all fixed in-plan:** **G1** `/account/data` (export + cascade-delete) added to the IA + Wave 14. **G2** per-screen **empty & failure** spec added to Wave 12 (calm sign-silhouette + real `alt` for q-image 404; empty-state framing for dashboard-pre-diagnostic / mistakes / saved / history; inline "не вдалося зберегти — повторити" retry buffered to the IndexedDB WAL for a mid-quiz `submitAnswer` failure). **G3** monetization **explicitly out of scope** for Waves 10–14. **G4** in-app nudge is the **v1 default** delivery channel; Web Push is progressive enhancement. **G5** `/admin/learning-health` + explanation-review queue added to Wave 14.

**Tone — both fixed:** **T1** cap Світлик first-person chatter to true emotional beats, keep functional copy neutral, **drop notification emoji**. **T2** state graceful per-key degradation; **do not headline "734 restyled" as shipped** — headline honesty/dial/calm; the restyle moat deepens automatically as coverage climbs from 60.

**Feasibility — mitigated, some tied to an open question:** **F1** Serwist × Turbopack — **spike the SW emit in isolation + ship a no-SW fallback** before Wave 13; production `next build` on the webpack path (watched RISK). **F2** `sharp` on Node-25 — **build-time prebake, commit AVIF artifacts** (not runtime-write on an unknown target); confirm a Node-25 `sharp` prebuild first (*depends on OQ1 deploy target*). **F3** P2029 — **mandate relation-filter / chunked (≤200) queries** in the queue + readiness specs; a hard verify-gate criterion. **F4** heavy `submitAnswer` transaction — keep the per-answer transaction lean (mastery/readiness recompute deferred to `finishSession`); dial stays **server-authoritative** (offline shows a calm "оновлюємо…" state, never a client number that could mismatch); Postgres cutover trigger stays *open* (OQ tied to volume + deploy target).

**Still OPEN after synthesis** (need a human/product/data decision, not resolvable by fiat): deploy/prod topology; Serwist-build viability; Web-Push-in-v1 scope; per-category ТСЦ exam rules (A/C/D/combined); readiness tuning knobs (target retention, confidence-sampling rate, shadow-run duration); Postgres cutover timing; monetization timing (post-launch). See §9 for the top 5.

---

## 7. Top risks

1. **Serwist SW × Turbopack build break (F1)** — Next 16 defaults `next build` to Turbopack; `@serwist/next` injects via webpack. *Mitigation:* isolated spike + no-SW fallback so PWA can never block release.
2. **Deploy topology unknown** — SQLite `dev.db` implies a self-hosted Node box, but Vercel tooling is around. Gates image-cache location, push-scheduler host, and Postgres timing. *Mitigation:* resolve before Wave 13; keep everything Postgres-portable (adapter swap only).
3. **The honest dial mis-calibrating** — if the number diverges from lived mock scores, it destroys the trust moat. *Mitigation:* reality-anchor shrinkage toward real mocks, calibration discount, and a **shadow-run** beside the legacy readiness before promotion.
4. **Perf on weak HW** — `backdrop-filter` heat, image weight, and a heavy per-answer transaction on single-writer SQLite. *Mitigation:* emulated-glass tier, build-time AVIF ≤120 KB, lean transaction, and **measurement on hosted PSI / real browser** — never local M2.
5. **Moat over-claim (restyle 60/734, unreviewed explanations 38%)** — the launch story must not lean on a mostly-undelivered moat or on fabricated proof. *Mitigation:* honest counts, graceful degradation, `ExplanationNotice`/`LegalDisclaimer` intact, `/admin/learning-health` review queue to lift REVIEWED coverage, ★4.9/testimonials never shipped as real.
6. **Correctness regression on the stable-key architecture** — any break of `imageKey → /api/q-image` or the idempotent upsert loses user progress. *Mitigation:* every wave's verify gate re-runs the loader → asserts 0 id changes; content-negotiation lives *inside* the resolver.

---

## 8. Top 5 decisions

1. **Canonical bottom nav = `Головна · Навчання · Іспит · Прогрес · Профіль`** — 5 targets, secondary nav nested inside tabs, no primary "Ще" overflow. Keeps the two moat surfaces (Прогрес, Профіль) top-level. *(Resolves C1.)*
2. **One canonical mode union** — 5 legacy + `SPACED_REVIEW`, `ADAPTIVE_REVIEW` (canonical; `MIXED_PRACTICE` = back-compat alias), `DIAGNOSTIC` for MVP; `QUICK`/`MARATHON`/`SIGN_TRAINER` deferred by name; no bare `ADAPTIVE`. *(Resolves C2.)*
3. **No `ExamAttempt` table; lazy-create `ReviewState`** — reuse `TestSession(mode=EXAM_SIMULATION, status=COMPLETED)` as the readiness reality-anchor; create SRS state on first answer, no bulk backfill (sidesteps P2029). *(Resolves C3 + C4.)*
4. **Readiness = exact Poisson-binomial `P(≥18/20)`, server-authoritative** — computed on `finishSession` + nightly, never in the render path; drop the MC-1500 constant. *(Resolves C5 + F4.)*
5. **Launch free — monetization out of scope for Waves 10–14** — the FSRS-honest-dial + calm liquid-glass shell is the moat, not a paywall and not a "734 restyled" headline; the image moat degrades gracefully per key and deepens as coverage climbs. *(Resolves G3 + T2.)*

---

## 9. Top 5 open questions

1. **Deploy / prod topology** (self-hosted Node box vs Vercel) — the biggest unknown; gates the image transcode-cache location (F2), the push-scheduler host (G4), and Postgres cutover timing. *Needed before Wave 13.*
2. **Serwist SW × Turbopack build viability** — will the webpack-build path hold on Next 16? De-risk with an isolated spike + a no-SW fallback before committing PWA to a wave. *(F1.)*
3. **Web Push vs in-app-only for v1** — in-app nudge is the confirmed default; is Web Push (VAPID keys + off-box recurring scheduler + installed-PWA on iOS 16.4+) in scope for this evolution or deferred to a later wave? *(G4 / doc 05 Q4.)*
4. **Real ТСЦ exam rules for categories A / C / D / combined** — we have cat-B (blueprint + 20/20/≤2); ship B honestly and label the rest "загальна практика" until the official per-category structure/time/error-thresholds are sourced. *(Doc 03 Q1.)*
5. **Readiness tuning knobs** — `FSRS_TARGET_RETENTION` 0.90 vs 0.85 (a pass-once exam favours fewer reviews but a thinner margin); the confidence-sampling rate (start ~1-in-5, tune from `ReviewLog`); and the shadow-run duration before the FSRS dial replaces the legacy readiness as hero. *(Data / small A-B.)*

---

## 10. Immediate next steps — kicking off the build

1. **Resolve OQ1 (deploy topology)** with the owner — it unblocks Wave 13's image cache + push scheduler and the Postgres question. Everything else can start in parallel.
2. **Author the Wave 10 spec** (SRS foundation, no UI) from `05-tech-architecture.md` §1–§3 + §7: the hand-authored migration for the eight tables, pure `lib/fsrs/*` + `queue.ts` + `readiness-model.ts` with reference-vector unit tests, and the lazy-write `submitAnswer` transaction. Keep tasks atomic, boolean-criteria, ≤7 criteria each.
3. **Flip the harness to evaluate mode:** set `mesa.config.json` `"evaluate": true` (it earned its keep in Waves 7/9), keep `qualityChecks: "npm run -s typecheck && npm run -s test"`.
4. **Run the wave:** `mesa plan <wave10-spec> wave10` → `DRIVER_EVALUATE=1 mesa run-all`. The planner writes task journals; the driver does increment → verify gate → independent evaluator → learnings → done.
5. **Independently re-verify before closing:** typecheck + unit + integration + `npm run build` + **`npm run audit:browser`** over the **non-localhost** http origin (the real-transport gate — a curl-minted-cookie smoke structurally cannot catch the Secure-cookie-over-http class) + hosted PSI mobile. Then close Wave 10 in `PLAN.md` and proceed to Wave 11.
6. **Run the Serwist × Turbopack spike (F1) in parallel** so the PWA wave (13) starts de-risked, and confirm a Node-25 `sharp` prebuild (F2) once the deploy target is known.

Every wave preserves the legal/demo positioning and the stable-key architecture; the harness verify gate + independent real-browser audit is the acceptance test. Route feature/build work through `mesa plan` → `run-all`, then independently verify — never hand-built ad hoc.

---

## Addendum — 2026-07-01, post-Wave-10 adversarial review (CANONICAL over §3 where they differ)

Wave 10 shipped and an independent adversarial review (5 hostile reviewers, per-finding skeptic verification
vs published FSRS-5) returned **PROCEED-WITH-CHANGES**: architecture held (C1–C5 all survived), but 18
confirmed defects (7 major) + sequencing corrections. Decisions taken (all reversible, recorded for async veto):

1. **Wave 10f (inserted): fix wave** — `specs/wave10f-review-fixes.md`. Headliners: `schedule()` used
   post-update difficulty (reference uses prior); dial math (fixed-weight mock blend → Beta anchor by counts;
   constant-vector DP degeneracy → per-block heterogeneous vector; unseen-prior honesty floor); newItemShare
   cap; the zod schema silently stripped clientEventId/latencyMs/confidence (all SRS plumbing was dead code in
   production); whole-tx idempotency; ADAPTIVE_REVIEW gated via `STARTABLE_MODES`; ReviewLog FK Cascade→Restrict.
   Keystone: **external golden-vector gate** (`reference-vectors.test.ts`, vendored from ts-fsrs@5.4.1) — the
   root failure was self-referential tests.
2. **Wave re-scope (build UI once):** **W11 = server core + admin shadow only** (SPACED_REVIEW/DIAGNOSTIC
   logic, startAdaptiveReview, getStudyPlan, finishSession recompute, nightly job, StudyDay/streak/freeze,
   profile actions, `/admin/readiness-shadow` comparing FSRS dial vs legacy readiness — no learner UI);
   **W12a = design system** (tokens, glass tiers, component kit incl. dial + capsule nav, empty/failure
   states, restyle existing surfaces); **W12b = all NEW learner surfaces** built once in the new style
   (onboarding funnel, plan card, adaptive entry, dial-as-hero — promoted only if the shadow-run is sane and
   golden vectors pass). W13/W14 unchanged.
3. **Deploy topology RESOLVED = self-hosted Node box** (§7 risk 2, §9 OQ1 closed). Nightly readiness job =
   on-box launchd/cron standalone `scripts/nightly-readiness.mjs` (idempotent, Europe/Kyiv day key, ≤200-id
   chunks). The W14 push scheduler still goes off-box per doc 05 Q4 (proc ceiling).
4. **PSI meter path (W12 gate was unrunnable — app origin is Tailscale-only):** primary = temporary
   `cloudflared` tunnel to the app origin for hosted-PSI runs during W12/W13 verification; fallback if
   tunneling fails = Lighthouse mobile 4× CPU throttle + a real weak-device check, hosted PSI deferred until
   a public origin exists. Pin the chosen mechanism in the W12a spec.
5. **Model tiering:** harness increments/planner/analyzer = Opus 4.8 (`mesa.config.json "model"`), evaluator =
   Opus 4.8 (Haiku demonstrably insufficient here: it passed all 11 Wave-10 tasks), control thread +
   wave-level adversarial review = Fable 5.
6. **Deferred with rationale:** client-supplied `reviewedAt` + per-user event-id namespacing → W13 (offline
   wave, where the contract actually bites); per-topic empirical-Bayes unseen prior → W11 (interim honesty
   floor in 10f).
