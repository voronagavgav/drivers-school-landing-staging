# Drivers School — Feature Set (Evolution Plan)

> **Doc:** `docs/app-plan/02-features.md` · **Owner:** Product Lead · **Status:** planning input for `mesa plan` → `run-all`
> **Scope:** a holistic *evolution* of a mature app (Waves 1–9 done), not a greenfield build. Everything here is either **Exists** (keep/port), **Enhance** (rework an existing surface), or **New**.

## 0. Positioning & non-negotiables (read first)

**The wedge.** The Ukrainian ПДР market competes on *identical official content* with *ugly, ad-heavy, anxiety-inducing* UX. The international leaders compete on *engagement* but skew *gamey/childish* or *expensive*. **Nobody owns "calm, premium, emotionally-aware, mobile-first" for a first-time, anxious exam-taker.** That is our defensible ground. Our north-star emotion is **competence + relief**, never fear.

**One-sentence product:** DMV-Genie credibility + a James-May spaced-repetition / test-date engine + a TestBuddy-style calm-nerves layer, delivered in a premium liquid-glass mobile shell — a combination no UA app offers and no international leader has localized.

**Guardrails every feature MUST honor** (these are load-bearing, not style notes):

- **Design (settled taste):** calm pastel + Apple Liquid Glass; **ONE** green accent; CTA = soft/pastel green FILL + **dark slate** text (WCAG 4.5:1 — never white on soft green, never harden the green). Liquid glass is the **floating control/nav layer only**; reading CONTENT stays opaque/solid. **≤2 co-visible refraction lenses, never glass-on-glass.** «Світлик» = literal sized-up traffic-light buddy on a rail with a reactive ground shadow — **never** small/plushy, never a free-floating scroll companion.
- **REJECTED — never re-propose:** claymorphism; hard/saturated greens; over-colorful backgrounds; small/plushy mascot; dark/gray/muddy lenses; recurring/periodic gloss (only hover/interaction sweeps); glass-on-glass; gloss/3D past the clean "ref_B" look; sticker-look sign pastes. **Engagement-side rejects:** leagues / public leaderboards / rank-vs-peers; punishing streak-loss; loss-aversion/guilt/FOMO notifications; abstract XP economies, coins, badge walls, confetti spam; **fabricated social proof** (the ★4.9 + testimonials are PLACEHOLDERS — never ship as real).
- **Perf:** target HW = **weak / ~2016-era + phones**, judged on **hosted PSI (mobile)**, not local M2 numbers. `backdrop-filter` blur is the #1 GPU/heat cost → **emulate glass on weak devices** (drop backdrop-filter, keep painted fill + gloss + rim + colored shadow); real refraction on ≤2 signature lenses only, never over the moving map. Budgets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; first-load JS ≤150 KB gz/route; images ≤120 KB (AVIF-first). Keep map/label NAMES crisp even when reducing map quality.
- **Correctness:** images serve via **stable `Question.imageKey` → `GET /api/q-image/[key]`** with resolver tiers `image-overrides ▸ restyled-live ▸ official-images`; loader is **idempotent upsert-by-key** and **preserves user progress**. New learning state (FSRS) is keyed on stable `questionId` / `imageKey`, **never array index**. Schema changes ship as **hand-authored migrations** (`migrate deploy`). Never weaken `LegalDisclaimer` / `ExplanationNotice` (only ~38% of explanations are REVIEWED).
- **Content honesty:** official-only, DB-derived (2322 questions · 65 topics · 8 categories · 734 restyled photos). Never fabricate counts, reviews, or pass-rate claims.
- **Verification:** "done/audited" = **drive a real browser over the real transport** (e2b Chromium / real phone / hosted PSI), never static typecheck/build/curl alone.

**Priority key:** `P0` = required for the evolved-app launch · `P1` = fast-follow differentiator · `P2` = future/vision.
**Status key:** `Exists` · `Enhance` · `New`.

---

## Tier A — MVP / Table-stakes (Основа)

*If any of these is missing or feels dated, we are not credible against the free official floor (`pdr.infotech.gov.ua`). Most already exist as logic — the Tier-A work is largely **porting them into the calm liquid-glass identity** and hardening mobile/offline.*

### A1. Ported design identity — «Спокій · Рідке скло» shell · `P0` · Enhance
- **Purpose:** make the app *look and feel* like the landing — calm pastel + liquid glass + Світлик — instead of the current road-sign-blue theme.
- **Spec:** port the landing's `@theme` tokens (warm off-white `#FBFAF7`, `--ink #1F2933`, the three green roles, glass tiers e1/e2/e3, rim, sweep) into Tailwind v4. Nav = e1 pill capsule that lifts e1→e2 on scroll. Reading cards = `.solid` opaque. Auto device-tiering (`glass-emu` on `deviceMemory≤4` / `hardwareConcurrency≤4` / coarse pointer / reduced-transparency). All motion behind `prefers-reduced-motion`.
- **Interactions:** hover/press light-sweeps only (no recurring gloss); press ripple on CTAs/options; idle-freeze after 1.2s.

### A2. Онбординг — ask, don't dump · `P0` · Enhance
- **Purpose:** turn "2322 questions" from a mountain into a finite, personal plan in under a minute.
- **Spec:** pick **category** (existing radio) → add **exam date (optional)** and **daily window**. Output a plain-language finite plan ("~18 днів × 15 питань — встигаєш спокійно"). Progressive disclosure — hide admin/analytics depth. Feeds A3 + Signature S2.
- **Interactions:** 3 calm steps, large tap targets, skippable; **first win in <60s** (see S1).

### A3. Головна / dashboard — readiness-first home · `P0` · Enhance
- **Purpose:** the emotional center — one honest number + one next action.
- **Spec:** hero = **Шкала готовності** (S1). Below: resume-in-progress, "**Світлик радить повторити N**" spaced-review nudge (calm, not a red badge), **Дні практики** counter (detoxified, S-engagement), weakest-topic bottleneck line, recommended next action routing to the weakest not-yet-mastered topic. Retire the internal 5-level meter from the learner view (keep it in admin/analytics).
- **Interactions:** dial count-up plays once on reveal; single climax; everything else static-fill-once.

### A4. Практика — modes spine · `P0` · Exists→Enhance
- **Purpose:** the standard study formats every competitor has, done calmly.
- **Spec (modes, existing engine `lib/server/test-engine.ts`):**
  - **Змішана практика** (MIXED) — now **interleaved by default** (draws across topics/categories; adjacent-but-different items) once a topic hits "Майже".
  - **За темами** (TOPIC) — single-topic drill; lower-anxiety first pass; per-topic servable counts (existing).
  - **За білетами** (ticket sets) — **New** convenience mode over the official blueprint sampling.
  - **Мої помилки** (MISTAKE) and **Збережені** (SAVED) — existing pools.
- **Interactions:** one question per screen; question-first (reveal hidden until answered).

### A5. Пробний іспит — real ТСЦ simulator · `P0` · Exists→Enhance
- **Purpose:** the credibility bar — behave exactly like the real exam.
- **Spec:** 20 questions / ~20 min / **pass = ≤2 errors**, using the official cat-B **blueprint** (`lib/exam-blueprint.ts`) topic sampling + content-dedup; **live timer; NO mid-test feedback** (review comes after). Confirm-before-finish with unanswered warning (existing). Persists as an `ExamAttempt` (see S1 storage) — the ground-truth readiness anchor.
- **Interactions:** result screen = score + pass/fail + **full per-question розбір**; default post-mock CTA = "Робота над помилками".

### A6. Розбір / explanation surface — question-first active recall · `P0` · Enhance
- **Purpose:** make retrieval the **only** path to the explanation (the testing effect *is* the product).
- **Spec:** answer tap **required** before explanation unlocks; then show *why*, anchored on the **restyled official photo/sign**. Options = semantic radiogroup, near-opaque, correct=`hsl(152 46% 90%)`+green-deep, wrong=`hsl(16 50% 93%)`+warn (icon+label, never color-only). Keep `ExplanationNotice` for the ~62% auto-generated explanations; keep `LegalDisclaimer`.
- **Interactions:** after submit, **move focus to the result and announce via `aria-live`**; arrow-key roving focus (existing).

### A7. Прогрес & Історія · `P0` · Exists→Enhance
- **Purpose:** honest per-topic mastery + a reviewable record.
- **Spec:** **Прогрес** = the 65-topic mastery map (see S6) + accuracy/coverage; advanced analytics tucked here (progressive disclosure). **Історія** = last-N completed sessions, reviewable **offline** (A9).
- **Interactions:** meters fill once on reveal from `data-w`.

### A8. Мобільна ергономіка & a11y (WCAG 2.2 AA, uk-UA) · `P0` · Enhance
- **Purpose:** usable by an anxious thumb on a cheap phone at 200% zoom.
- **Spec:** answer rows full-width **≥44×44**; primary "next" anchored in the **bottom thumb zone**; ≤5 bottom-nav targets; `:active` feedback <100ms; meaningful **Ukrainian `alt`** (sign name / scene, not filenames); Slavic pluralization (питання/питань); `<html lang="uk">`; focus ring ≥2px; skip-link; reduced-motion / reduced-transparency / more-contrast fallbacks. Verify with axe-core + VoiceOver + TalkBack on real HW.

### A9. Офлайн + PWA — «Додати на головний екран» · `P0` · New
- **Purpose:** match the incumbents' full-offline expectation; own the home-screen.
- **Spec:** `manifest.json` (uk name, `standalone`, calm theme, maskable 192/512 **Світлик** icons) + iOS `apple-touch-icon`/meta; Serwist SW (Webpack build path — Next 16 caveat). Standalone launch **resumes at dashboard**. **Opt-in per-topic download** ("Завантажити тему — ~X МБ", confirm before bulk); Мої помилки / Збережені / last-N tests fully reviewable offline; attempt state in IndexedDB, background-sync when online; calm (non-alarming) offline banner. Cache budget ≤50 MB.

### A10. Restyled images served fast (image content-negotiation) · `P0` · Enhance
- **Purpose:** the 734 restyled photos are the visual moat — but PNGs avg 342 KB are fatal on Slow-4G.
- **Spec:** extend the resolver (do **not** break the stable key): `GET /api/q-image/[key]?w={360,540,720}&f={avif,webp}` (or `Accept`). **AVIF-first (~40–70 KB), WebP ≤90 KB, JPEG safety net, hard cap 120 KB.** `srcset` 360/540/720 + `sizes`, `loading="lazy"`, explicit width/height (protect CLS). Pre-transcode corpus with `sharp`, cache by `imageKey+w+f`. Real signs + restyled photos always crisp.

---

## Tier B — Differentiators (Наш рів / the moat)

*These are where we win. All lean into the calm identity, Світлик, restyled visuals, the honest dial, and anxiety-reduction as the **product**, not decoration. Several sit on top of a new **FSRS learning engine** (see S1 storage) — that engine is the differentiator's spine.*

### B1. FSRS spaced-repetition engine (invisible spine) · `P0` · New
- **Purpose:** "fewer reviews, same retention" — keep the daily queue **short and honest** across 2322 items; produce the retrievability that the dial needs.
- **Spec:** FSRS (Difficulty·Stability·Retrievability), **not** SM-2. Per-`userId×questionId` **`ReviewState`** (`stability`, `difficulty`, `dueAt`, `lastReviewedAt`, `state`, `reps`, `lapses`, `lastGrade`, `lastConfidence`, `lastLatencyMs`) + append-only **`ReviewLog`** (grade 1–4, elapsed, prior S/D, confidence, latency, mode) for the optimizer + calibration + mistakes. Ship **default weights** until ≥~1000 reviews, then per-user fine-tune. **R computed on demand** (never store stale). Grades stored 1–4 but **UI collapses to two taps** ("Не згадав / Згадав" → Again/Good); Hard/Easy derived from latency+confidence (four-button self-grading raises anxiety).
- **Interactions:** invisible — surfaces only as calm nudges and the dial.

### B2. Робота над помилками — mistakes as shrinking strength · `P1` · Enhance
- **Purpose:** errors are the highest-yield cards; reframe shame → progress.
- **Spec:** any wrong answer **or low-confidence-correct** (lucky guess) auto-enters the **Помилки** pool, FSRS-scheduled as relearning; leaves only after **N=2 spaced** correct recalls (not one immediate re-tap). Rename route framing to "**помилки, які вже не повторяться**"; show the error count **shrinking**; group by topic so the pattern is visible.
- **Interactions:** default post-mock CTA; calm, never red-flooded.

### B3. Впевненість — confidence calibration · `P1` · New
- **Purpose:** low performers over-predict; overconfidence is dangerous for pass/fail.
- **Spec:** on **some** items (not all — friction), ask "**Наскільки впевнені?**" (1–4) *before* reveal. Periodic **calibration panel**: "Коли ти був упевнений, ти мав рацію у 72%." The measured gap **discounts the readiness %** so overconfidence can't inflate it.
- **Interactions:** a two-tap confidence chip pre-answer; the panel lives in Прогрес.

### B4. Спокій перед іспитом — test-nerves micro-module · `P1` · New
- **Purpose:** explicit anxiety treatment (graded exposure + relaxation + reframing) — **zero** UA competitors do this.
- **Spec:** optional **60-second breathing screen** using Світлик's **amber→green lamp as the pacer**, offered before a Пробний іспит; reframing prompt ("це тренування, не вирок"); an "exposure ladder" framing (flash quiz → topic test → full mock). Effort/mastery language throughout ("спокійно росте"), never scores-as-judgment.
- **Interactions:** pure light/lamp animation (no text-blur transforms); fully skippable; reduced-motion → static.

### B5. Розбір зі Світликом — the calm "why" loop · `P1` · Enhance
- **Purpose:** DMV-Genie-style instant "why" + scenario clarity, kept calm (not point-farming).
- **Spec:** each item = question → answer → **restyled photo/sign anchor** → plain-language reason. Where an explanation is REVIEWED, surface the `legalReference`; where auto-generated, keep the orientational notice. (AI-tutor deepening = C-tier S-item, gated on cost/accuracy.)
- **Interactions:** "чому?" expands inline; no leaving the question.

### B6. Detoxified habit layer — Дні практики + Вихідний · `P1` · Enhance
- **Purpose:** keep the *retention* value of streaks, strip the *anxiety*.
- **Spec:** "**days of practice**" counter (calm, near Світлик — no fire-emoji, no "AT RISK" modals). **Forgiveness from day one:** an automatic, generous "**вихідний**" Світлик *offers* ("Відпочинь сьогодні — прогрес збережено"). Tiny user-adjustable **daily goal** (10–15 Q), sold as the science-backed way to remember. **No leagues, no leaderboards, no rank-vs-peers, no XP economy.** The only "opponent" is yesterday's self and the exam.
- **Interactions:** streak never triggers a panic state; day-off is a gentle card, not a purchase.

### B7. Kind notifications — few, warm, exam-date-timed · `P1` · New
- **Purpose:** re-engage without the notification-fatigue churn.
- **Spec:** **≤3–4/week**, tied to the user's chosen window and **exam date** (never a broken streak). Voice = Світлик, low-pressure ("Готовий до 10 знаків сьогодні? 🟢"), never guilt/FOMO. Granular per-category mute center.
- **Interactions:** opt-in; web-push where supported; respects DNT/quiet hours.

### B8. Карта тем — 65-topic mastery map · `P1` · Enhance
- **Purpose:** turn a scary 2322-question mountain into finite, checkable terrain.
- **Spec:** grid of 65 topics behind the 8 categories; each shows a three-state ring **Вивчаю → Майже → Впевнено** driven by that topic's **aggregate retrievability** (not "questions seen"). **Steer, don't lock** (anxious users hate hard gates): "continue" always routes to the weakest not-yet-mastered topic. Honest **slip-back** (a topic can fall to "Майже" as stability lapses).
- **Interactions:** rings fill once on reveal; tap a topic → its practice.

---

## SIGNATURE / UNIQUE FEATURES (the 5–8 that define us)

*These are the genuinely differentiating ideas — grounded in **our** positioning (calm liquid glass, Світлик, restyled official visuals, honest dial, anxiety-first), not generic exam-prep tropes. If we build only these well, we win the white-space.*

### S1. Шкала готовності — the honest, defensible readiness dial · `P0` · Enhance→New engine
**Purpose:** replace exam dread (which is mostly *uncertainty*) with a credible, controllable plan: "you're at 84%, ~30 хв від 90%."
**Why it's ours:** everyone shows "% of questions seen"; we show the **predicted probability of passing the real exam**, and we make it the emotional hero of the *whole app*, rendered as the landing's signature **0→N% count-up** lens (e3, single climax).
**Spec (honest by construction):**
1. Per-question pass-probability `p_i` = FSRS **retrievability R** for seen items (adjusted by the user's **calibration slope**, B3); **unseen** items get a conservative prior (~0.5–0.6) so thin coverage **drags the number down automatically** — no separate penalty.
2. **Blueprint-weighted simulation:** sample 20-Q exams the way the real test samples the 8 categories / 65 topics; readiness = **P(≥18 correct)** via Poisson-binomial / Monte-Carlo over the drawn `p_i`.
3. **Reality anchor:** shrink toward the recent **`ExamAttempt`** pass-rate so the dial never diverges from what the user actually scores.
It **falls** when coverage is thin, **decays** as stability lapses, and is **discounted** by measured overconfidence. Always paired with the **bottleneck** ("найслабше: Розмітка, Проїзд перехресть") so the % comes with the next action. Store `ExamAttempt` + derived cached `TopicMastery`.
**Interactions:** one dial, one climax (count-up ease-out 1.5s in sync with the arc); other metrics (accuracy, ring, goal) are visibly distinct so we never fake a second climax. `prefers-reduced-motion` → jumps to final.

### S2. План до іспиту — the finite, test-date ritual · `P0` · New
**Purpose:** convert anxiety into a **calm, finite "few minutes a day" ritual with a defined endpoint** — the single highest-leverage differentiator (adapted from James May, given a Ukrainian anxiety-first face).
**Why it's ours:** paired with S1, "~18 днів × 15 питань, встигаєш спокійно" replaces an open-ended 2322-question grind with a visible finish line and a daily dose that is *pedagogically* better (distributed practice > cramming).
**Spec:** from exam date + daily window, generate a day-by-day plan from the FSRS queue (`overdue × (1−R) × topic-weakness`); adapts as reality drifts; if the user falls behind, it **re-plans calmly** ("ще встигаєш"), never scolds. Surfaces "сьогодні: 12 нових + 8 повторити."
**Interactions:** a calm plan strip on Головна; tapping "почати сьогодні" launches exactly today's dose.

### S3. Світлик — the calm messenger of readiness · `P0` · New
**Purpose:** the **relatedness** channel — encouragement, not coercion; the green "go" lamp face is the natural, on-brand encouragement metaphor.
**Why it's ours:** a credible, adult, literal sized-up traffic-light buddy vs the field's ugliness *and* vs Zutobi's childish gamification.
**Spec:** Світлик celebrates the dial climbing, **offers** the вихідний (B6), frames mistakes as fixed (B2), paces the breathing ritual (B4), nudges spaced reviews (B7). He rides his **rail with a reactive ground shadow** — never a scroll-following plushy, never guilt/panic/confetti. Single `<symbol>` `<use>`d at sizes (hero/mini/final); flight + inverse shadow animation; dropped on phones / reduced-motion.
**Interactions:** appears at emotional beats only; his lamp is also the breathing pacer.

### S4. Візуальний рів — restyled official photos + real signs as the answer anchor · `P0` · Enhance
**Purpose:** a visual moat competitors (who paste **raw** official images) cannot cheaply match.
**Why it's ours:** the 734 clean semi-realistic **ref_B**-style restyled photos + crisp real Ukrainian signs are *the* thing that makes explanations feel premium and trustworthy.
**Spec:** every розбір is anchored on the restyled image via the stable resolver + AVIF negotiation (A10); **no sticker-look pastes, no gloss/3D past ref_B**. Meaningful uk `alt`. As restyle coverage grows (currently 60 live / 734 target), the moat deepens automatically through `restyled-live` — no app change (idempotent by key).
**Interactions:** tap-to-zoom the sign/scene; image always ≤ its display box (≤720 CSS px).

### S5. Впевненість-honesty — a readiness you literally cannot inflate · `P1` · New
**Purpose:** turn "trust via honesty" from a slogan into a *mechanic*.
**Why it's ours:** in a market full of ad-walls, dark-pattern stat-expiry, and fake ★4.9s, we take the credibility high ground by **measuring** overconfidence and letting it *lower* the headline number.
**Spec:** the confidence-calibration slope (B3) discounts `p_i` in S1; the calibration panel is framed as a *skill you improve* ("твоя впевненість стала точнішою"). Combined with **official-only content, no fabricated reviews, and transparent/non-weekly monetization** (see C-tier), honesty is the positioning *and* the math.
**Interactions:** the discount is explainable on tap ("чому не 100%?") — anxiety-reducing transparency.

### S6. Карта тем — the finite terrain view · `P1` · Enhance
**Purpose:** competence + autonomy over path; make "what's left" tangible and non-threatening.
**Why it's ours:** a private **mastery** signal (topics Впевнено / pool covered) replaces XP/leagues entirely — the SDT competence lever, on-brand for anxious learners.
**Spec:** as B8, but called out as signature because it is the anti-leaderboard: **no comparison to anyone**, honest slip-back, steers to the weakest topic. Rendered as a calm pastel grid, rings fill once.
**Interactions:** the map *is* the navigation into practice.

### S7. Рідке скло, але спокійне — the premium calm shell as a feature · `P0` · Enhance
**Purpose:** the aesthetic itself is a differentiator — it instantly signals "credible, modern, not childish" in a field of dated clutter.
**Why it's ours:** authentic Apple Liquid Glass, disciplined (≤2 lenses, glass = chrome only, reading = opaque), that **also runs cool on a 2016 phone** via the emulated-glass tier — a combination the incumbents can't fake and the gamey leaders don't want.
**Spec:** glass on nav/controls/dial only; **emulated glass** auto-on for weak HW; real refraction reserved for the two signature lenses (S1 dial + hero sample); measured on hosted PSI, not local. This is the connective tissue of S1–S6.

---

## Tier C — Future / Vision (Майбутнє)

*Deferred: higher effort, cost, or accuracy risk. Sequenced after the moat proves out.*

### C1. Пояснює Світлик — AI tutor "поясни простіше" · `P2` · New
- **Purpose:** DMV-Genie-style on-demand clarification for the ~62% not-yet-reviewed explanations.
- **Spec:** a bounded "explain this differently" action grounded **strictly** in official content + the reviewed explanation (retrieval-guarded, no hallucinated law). **Gated on cost + an accuracy/verification control** (grounded-gen also acts as a free data audit — mine conflict flags to catch answer-key errors, but **never auto-apply**). Keep the legal/orientational notice.
- **Risk:** correctness. Ship only behind a verify gate.

### C2. Сценарії — scenario/animation loop · `P2` · New
- **Purpose:** Zutobi's 4-step scenario clarity for intersection/right-of-way traps, kept calm.
- **Spec:** short built-from-restyled-assets scenario cards (summary → visual → scenario quiz → why); **no memes, no robot-voice childishness**. Reuse the restyle pipeline aesthetic.

### C3. Аудіо-пояснення — audio explanations · `P2` · New
- **Purpose:** the UA-premium differentiator (vodiy/Green Way) — hands-free review.
- **Spec:** TTS or recorded uk audio on REVIEWED explanations only; offline-cacheable. Accessibility win.

### C4. Прозора підписка — transparent, non-weekly monetization · `P2` · New
- **Purpose:** monetize without becoming the thing users hate.
- **Spec:** **no ad carpet-bombing, no interstitials mid-study, no weekly billing, no surprise recurring charges, no dark-pattern stat-expiry.** A generous free tier (the official floor is free) + an honest one-time/seasonal unlock for depth (full explanations/audio/offline packs). Pricing framed plainly. **Never** ship the placeholder ★4.9/testimonials as real social proof.

### C5. Офлайн-пакети + full corpus AVIF · `P2` · New
- **Purpose:** true full-offline parity (~37 MB corpus at ~50 KB AVIF).
- **Spec:** opt-in bulk packs (confirm size), background prefetch on Wi-Fi, per-category granularity; never eager-download.

### C6. Стартовий зріз — richer adaptive diagnostic · `P2` · Enhance
- **Purpose:** DMV-Genie "we'll figure out what you don't know" — seed FSRS state fast.
- **Spec:** a short adaptive diagnostic that sets initial `p_i` across topics so S1/S2 are meaningful from session one (the <60s first-win already seeds the dial; this deepens it).

### C7. Живий калм-фон (opt-in) — the landing map field in-app · `P2` · New
- **Purpose:** carry the landing's signature pastel/map atmosphere into the app for capable devices.
- **Spec:** **opt-in only**, gated OFF on weak HW/phones; names stay crisp; never under a glass panel users read; `?heat=` A/B toggle to isolate GPU cost before shipping.

---

## Cross-cutting acceptance (applies to every feature)

- **Perf gate:** each route passes hosted-PSI mobile budgets (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, first-load JS ≤150 KB gz); heavy widgets (dial anim, any map) deferred to first-interaction.
- **A11y gate:** WCAG 2.2 AA verified with axe-core + VoiceOver + TalkBack on real HW; non-color-only signalling; 200% zoom / OS large-text with no horizontal scroll.
- **Correctness gate:** stable `imageKey`/`questionKey` resolver intact; FSRS keyed on stable ids; hand-authored migrations; user progress preserved across content re-imports.
- **Taste gate:** no rejected direction reintroduced (checklist in §0); glass discipline (≤2 lenses, no glass-on-glass, reading opaque); CTA soft-green-fill + dark-text at 4.5:1.
- **Verification gate:** signed off only after **driving a real browser over the real transport** — never static/build/curl alone.
- **Delivery:** built via the Mesa harness (`mesa plan` → `run-all` + evaluator + verify gate), then independently verified.

## Open questions (decide before/at `mesa plan`)

1. **FSRS schema migration** — add `ReviewState` / `ReviewLog` / `ExamAttempt` / cached `TopicMastery` as **new** tables (safest, preserves progress) vs. extending existing `UserMistake`/`ProgressSnapshot`. Migration must be hand-authored (`migrate-dev` is broken here). *Recommend: new tables, keyed on stable `questionId`.*
2. **Readiness cutover** — do we run the new FSRS-derived dial in **shadow** alongside the legacy 5-level readiness for a period to sanity-check the number before it becomes the app's hero?
3. **Confidence-tag frequency (B3/S5)** — what % of items ask "наскільки впевнені?" to get a usable calibration slope without adding anxiety-inducing friction? (start ~1-in-5, tune from `ReviewLog`.)
4. **Notifications transport** — web-push (needs the PWA/SW from A9) vs. in-app-only for v1; iOS web-push support/quiet-hours defaults.
5. **AVIF transcode ownership (A10)** — build-time `sharp` prebake of 734 images vs. on-demand-cache-on-first-request; where does the cache live (repo vs. runtime disk vs. CDN)?
6. **Restyle coverage dependency** — S4's moat scales with the restyle backlog (60/734 live). Does the evolution ship gated on a coverage threshold, or degrade gracefully to official-images per key (it already does via the resolver)?
7. **Monetization timing (C4)** — is a paywall in scope for this evolution at all, or explicitly deferred to keep the calm/trust brand clean during launch?
8. **Offline write-conflict policy** — IndexedDB attempts vs. server on reconnect: last-write-wins vs. merge; how to keep FSRS state consistent after offline sessions.
