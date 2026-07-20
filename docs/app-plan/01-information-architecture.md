# 01 · Information Architecture — Drivers School (EVOLVED)

> **Scope.** Holistic IA & app structure for the *evolution* of the existing mature app (Waves 1–9),
> not a greenfield build. Every screen below is tagged **`EXISTS`** (ship-as-is or restyle only),
> **`EVOLVE`** (keep the route, materially rework), or **`NEW`**.
> Detailed regime/mode specs live in **`03-study-regimes.md`**; visual identity in the `pdr-design` skill
> and the landing source of truth (`/Users/clpc/pdr-landing-site/`).
> Content is **official-only, honestly counted** (2322 questions · 65 topics · 8 categories · 734 restyled
> photos). ★4.9 / testimonials are **placeholders** — the IA never surfaces them as real.

---

## 1 · Core value proposition (one line)

> **Спокійна, чесна підготовка до теоретичного іспиту ПДР: застосунок сам знає, що вам повторити
> сьогодні, і чесно показує, наскільки ви вже готові.**
> *(The calm, honest way to pass Ukraine's ПДР theory exam — it tells you exactly what to study today,
> and shows you honestly how ready you are.)*

The wedge (from the competitive brief): every UA competitor sells the *same* official question bank in
ugly, ad-heavy, anxiety-inducing shells; the international leaders are gamey/childish or expensive. We own
the empty quadrant — **calm · premium · emotionally-aware · mobile-first** — carried by an **honest
readiness dial** (evidence-based confidence, not a fake number), an **FSRS-driven "few minutes a day" plan
with a finite endpoint**, and a genuine **calm-nerves layer**. Trust is the moat: official-only content,
no fabricated social proof, no dark-pattern monetization.

---

## 2 · Primary personas & top jobs-to-be-done

| # | Persona | Who | Top JTBD (verbatim intent) |
|---|---------|-----|----------------------------|
| **P1** | **Анна — the anxious first-timer** *(primary; the audience)* | 19–28, never sat the exam, scared of failing, studies on her phone in short bursts | 1) "Tell me I *can* pass — with evidence, not a slogan." · 2) "Just tell me what to do **today** — don't dump 2322 questions on me." · 3) "Let me *feel* the real exam format until it stops being scary." · 4) "When I get one wrong, don't shame me — help me fix it." |
| **P2** | **Тарас — the deadline-driven** | Has a booked ТСЦ date in N days, time-poor, pragmatic | 1) "Give me a **finite plan to my date** — 'X days × Y questions, встигаєш спокійно'." · 2) "Surface exactly my weak spots so I don't waste time." · 3) "Fast daily sessions I can do on the bus, offline." |
| **P3** | **Оля — the retaker** | Failed once (or a mock), confidence dented | 1) "Fix precisely what I got wrong, don't re-teach what I know." · 2) "Rebuild belief with proof I'm improving (dial climbing, mistakes shrinking)." |
| **P4** | **Content manager** *(secondary, internal)* | Admin / CONTENT_MANAGER role | 1) "Keep the official content correct & published." · 2) "Spot bad questions from real answer data (wrong-key, low-discrimination)." *(Served by the existing `/admin/*` area — unchanged by this evolution.)* |

Design consequence: **P1 sets the tone for every screen** (progressive disclosure, calm framing, no
competition), **P2 justifies the test-date plan + weak-spot engine**, **P3 justifies mistakes-as-strengths
+ the improvement narrative**. All three are served by the *same* adaptive engine with different entry
emphases — not three separate apps.

---

## 3 · Sitemap / screen inventory

Grouped by area. Route paths reflect the current Next App-Router layout (`app/(app)/*`, `app/admin/*`,
public root). **Bold tag** = build status.

### A · Public / unauthenticated (marketing + auth)
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Landing (liquid-glass identity) | `/` | **EVOLVE** | Current `app/page.tsx` is the *old blue* plain page; port the live "G · Спокій · Рідке скло" landing as the marketing entry. Logged-in users still redirect to `/dashboard`. |
| Login | `/login` | **EXISTS → restyle** | Re-skin to pastel/glass tokens; keep custom-auth flow + `COOKIE_SECURE` behaviour. |
| Register | `/register` | **EXISTS → restyle** | Same. |
| Forgot / reset password | `/forgot-password` | **NEW (deferred)** | No email infra today — placeholder in sitemap; flagged as an open question (§7). |

### B · Onboarding (first-run funnel — anxiety-reducing)
The current single-screen category radio (`/onboarding`) **EVOLVES** into a short, calm, multi-step funnel.
Each step is a sub-route/state under `/onboarding`:
| Step | Route/state | Status | Purpose |
|------|-------------|--------|---------|
| Welcome / promise | `/onboarding` (step 1) | **NEW** | Світлик greeting; one-sentence promise ("спокійно, крок за кроком"). No signup wall beyond auth. |
| Category | `/onboarding/category` | **EXISTS → EVOLVE** | Keep `selectCategoryAction`; make it step 2 of the funnel, not the whole thing. |
| Exam date (optional) | `/onboarding/date` | **NEW** | "Коли іспит?" → produces the finite plan ("~18 днів × 15 питань"). Skippable (autonomy). |
| Daily goal | `/onboarding/goal` | **NEW** | User-adjustable small goal (default 10–15). Replaces the hard-coded 20. |
| Diagnostic mini-quiz | `/onboarding/diagnostic` | **NEW** | ~5–8 easy real questions → **first-win < 60 s**, seeds the dial + weak-spot signal. |
| First readiness reveal | `/onboarding/ready` | **NEW** | The dial's **0→N% count-up climax** on *their own* first data. Hands off to Home. |

### C · Core app — bottom-tab destinations (authenticated)

**Tab 1 · Головна (Home)**
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Home / today | `/dashboard` | **EVOLVE** | Richest existing screen. Rework hero → **honest readiness dial** + **"сьогодні" plan card** (due reviews, resume, one recommended action). Keep streak/goal but *detoxify* (see §6). Demote the internal 5-level meter + sparkline into a "деталі" disclosure. |

**Tab 2 · Навчання (Study hub)**
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Study hub / mode picker | `/practice` | **EVOLVE** | Becomes the home of *all* regimes (§6) + category→topic browse, not just topic cards. |
| Topics by category | `/practice` (grouped) | **EVOLVE** | Chunk **65 topics behind the 8 categories** — never dump the full list. Servable-count logic already exists. |
| Mistake bank | `/mistakes` | **EXISTS → EVOLVE** | Reframe as **«помилки, які вже не повторяться»**, show the count *shrinking*. Reachable here and from Home's due card. |
| Saved questions | `/saved` | **EXISTS → restyle** | Bookmark pool. |
| Road-signs drill | `/practice/signs` | **NEW (optional)** | Niche competitor parity (sign-only drilling); leverages restyled sign images. Detail in doc 03. |

**Tab 3 · Іспит (Mock exam — center, emphasized)**
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Exam launcher | `/exam` | **NEW** | Dedicated home for the ТСЦ simulator (20 Q · 20 min · ≤2 errors) — today exam is only startable via a dashboard form action. Shows format, last result, blueprint note. |
| Pre-exam calm ritual | `/exam/ready` | **NEW** | Optional 60-s breathing screen (Світлик amber→green pacer) + reframing ("це тренування, не вирок"). Skippable. |

**Tab 4 · Прогрес (Progress)**
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Progress / mastery grid | `/progress` | **EXISTS → EVOLVE** | The **65-topic map that fills in** (Вивчаю → Майже → Впевнено). Weak-first ordering already present. |
| Readiness detail | `/progress/readiness` | **NEW** | The dial expanded: bottleneck topics, coverage, the honest model's inputs. |
| Confidence calibration | `/progress/calibration` | **NEW** | "When you felt sure, you were right 72% of the time." Feeds the honest dial. |
| History (attempts) | `/history` | **EXISTS → restyle** | Last 50 completed sessions; source of the reality-anchor. |

**Tab 5 · Профіль (Profile & settings)**
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Account | `/account` | **EXISTS → EVOLVE** | Change password + analytics opt-out already here; add the surfaces below. |
| Notifications & study window | `/account/notifications` | **NEW** | ≤3–4/week, tied to exam date not streak; granular mutes. |
| Exam date & plan | `/account/plan` | **NEW** | Edit date/goal post-onboarding; re-derives the finite plan. |
| Offline packs | `/account/offline` | **NEW** | Opt-in per-topic download (size-warned; ≤50 MB cache budget). PWA install card (iOS instructions). |
| Спокій — calm-nerves module | `/calm` | **NEW** | Breathing, reframing, "you're ready" — the TestBuddy-style white-space differentiator. Reachable from Profile, Home, and pre-exam. |
| Help / FAQ / legal | `/account/help` | **EVOLVE** | Fold `LegalDisclaimer` + explanation-notice policy + FAQ here. |

### D · Cross-cutting full-screen (no tab bar — immersive)
| Screen | Route | Status | Notes |
|--------|-------|--------|-------|
| Session runner (all modes) | `/test/[id]` | **EXISTS → EVOLVE** | One-question-per-screen, radiogroup, image via resolver, navigator, timer, save/flag. Bottom-anchored **«Далі»** in the thumb zone; tab bar hidden. **Flag-for-review needs persistence** (currently client-only). |
| Result / разбор | `/test/[id]/result` | **EXISTS → EVOLVE** | Score, pass/fail, full per-question review + explanation. Add the **calm post-mock hand-off** ("review your mistakes" as default next action) + dial delta. |

### E · Admin (RBAC-gated; structurally unchanged by this evolution)
`/admin` overview · `/admin/questions` (+`/new`, `/[id]`) · `/admin/topics` · `/admin/categories` ·
`/admin/content-versions` · `/admin/analytics` · `/admin/content-health` — **all EXISTS**. Only inherit the
new token/theme; no IA change. (New admin "replace-by-key" UI stays out of scope — override files cover it.)

---

## 4 · Navigation model (mobile-first)

**Primary = a bottom glass **nav capsule** tab bar** (ported from the landing's `e1` nav pill), **5 targets**
— the research ceiling — living in the **thumb zone**, each ≥44×44 px:

```
┌─────────────────────────────────────────────┐
│                (reading content — opaque)     │
│                                               │
├─────────────────────────────────────────────┤
│  ⌂ Головна   ▣ Навчання  ◉ Іспит  ▤ Прогрес  ☺ Профіль │  ← glass e1 capsule, fixed
└─────────────────────────────────────────────┘
        (◉ Іспит is subtly RAISED / green-lamp accent, never a childish FAB)
```

- **Glass discipline.** The capsule is the *only* persistent glass chrome. On weak/phone tiers it uses
  **emulated glass** (painted pastel fill `.86–.92` + gloss + rim + colored shadow, **no `backdrop-filter`**);
  real refraction is reserved for the ≤2 signature lenses (readiness dial, hero quiz), **never** on the moving
  nav or over the map. Reading content behind it stays **opaque/solid**. Active tab = green-deep icon + label
  (non-colour-only: label always shown).
- **Center emphasis.** `◉ Іспит` is the graded-exposure centerpiece (the primary anxiety treatment + the
  readiness ground-truth), so it gets a raised pill with the Світлик green-"go" accent — calm, not gamey.
- **Immersive escape.** The runner (`/test/[id]`) and pre-exam ritual **hide the tab bar** — full attention,
  one question per screen, primary CTA anchored bottom-thumb.
- **Tablet / desktop.** ≥980 px the capsule may dock **top** (landing pattern) or become a **left rail**;
  content column caps ~1160 px. Same 5 destinations.
- **Secondary nav lives *inside* tabs**, not in the bar: Mistakes/Saved/Signs under **Навчання**;
  Readiness/Calibration/History under **Прогрес**; Notifications/Plan/Offline/Calm/Help under **Профіль**.
  This keeps the bar at 5 and honours progressive disclosure (advanced analytics tucked away).
- **Admin** keeps its **own top nav** (breadcrumbed) — a separate surface, no tab bar.
- **Global furniture:** Світлик appears **on a rail** at signature moments only (Home hero beside the dial,
  the result screen, the pre-exam pacer) — never a free-floating scroll companion. PWA standalone launch
  **resumes at `/dashboard`**, not the landing.

---

## 5 · Key user flows

### 5.1 Onboarding (first run)
`Register/Login → /onboarding` welcome (Світлик promise) → **category** (`selectCategoryAction`) → **exam
date?** (skippable) → **daily goal** (default 10–15) → **diagnostic mini-quiz** (~5–8 easy real Qs → first
win <60 s) → **first readiness reveal** (dial 0→N% count-up climax on *their* data) → **`/dashboard`** with a
ready-made "сьогодні" plan. No feature dump; advanced surfaces revealed later.

### 5.2 A daily study session (the "few minutes a day" ritual — P2/P1)
`/dashboard` → **«На сьогодні»** card shows the FSRS-scheduled queue ("Світлик радить повторити 8 знаків") →
tap **Почати** → `/test/[id]` (interleaved, one-per-screen, answer-first-then-explanation) → per-item calm
feedback anchored on the restyled photo/sign → finish → tiny dial nudge + "готово на сьогодні / вихідний
доступний" → back to Home. Short, finite, non-punitive.

### 5.3 Taking a mock exam (graded exposure — all personas)
`◉ Іспит` → `/exam` launcher (format reminder: 20 Q · 20 min · ≤2 errors, blueprint-sampled) → optional
`/exam/ready` **60-s breathing ritual** → `/test/[id]` in exam mode (live timer, **no mid-test feedback**,
navigator + confirm-before-finish + unanswered warning) → `/test/[id]/result` (score, pass/fail, full разбор,
**dial delta**, reality-anchor updates readiness) → default next action = **«Опрацювати помилки»**.

### 5.4 Reviewing mistakes (P3 core)
Entry from Home due-card **or** Навчання → `/mistakes` (grouped by topic, framed as *shrinking*, calm not
red-flooded) → **Опрацювати помилки** → `/test/[id]` MISTAKE_PRACTICE (FSRS relearning; a mistake leaves the
pool only after **N=2 spaced** correct recalls, not one immediate re-tap) → result shows the error count
drop. Saved questions follow the same shape from `/saved`.

### 5.5 A first-time **anxious** user's first 5 minutes (P1 — the make-or-break)
1. **0:00** Landing promises calm + credibility (real signs, real photos, honest dial) — *no* fake reviews.
2. **0:30** Register → immediately into `/onboarding`; Світлик: "Ми пройдемо це спокійно, крок за кроком."
3. **1:00** Pick category (familiar, low-stakes). Exam-date step is **skippable** — no pressure.
4. **1:30** Goal step frames small dose as *the science-backed way to remember*, flattering competence, not guilt.
5. **2:00** **Diagnostic**: 5–8 *easy* real questions — she gets several right → immediate mastery signal.
6. **3:30** **First readiness reveal**: the dial counts **0→N%** — a concrete, controllable number ("Ти вже
   на 41% — і я покажу найкоротший шлях далі"), replacing dread with a plan. Bottleneck named, not hidden.
7. **4:30** Home shows a *finite, tiny* "на сьогодні" (e.g. "10 питань — ~4 хв"). She finishes one calm
   session, sees the dial tick up, and Світлик offers a **guilt-free вихідний** if life happens. First
   session ends on **competence + relief**, never fear.

---

## 6 · Study regimes / modes at a glance

*(Full mechanics, FSRS state, selection scoring, and copy live in **`03-study-regimes.md`**.)*

| Regime | UA label | Status | One-line intent |
|--------|----------|--------|-----------------|
| Smart daily queue | **Щоденне повторення** | **EVOLVE** (from `due-mistakes` + `MISTAKE_PRACTICE`) | FSRS-scheduled "few minutes a day" — *about-to-forget* items across topics. The ritual. |
| Mixed / interleaved | **Змішана практика** | **EXISTS (MIXED_PRACTICE)** | Weak-spot-priority, deliberately adjacent-but-different — the recommended default once a topic hits "Майже". |
| Topic drill | **Практика за темою** | **EXISTS (TOPIC_PRACTICE)** | Single-topic first pass — lowers anxiety, chunked behind the 8 categories. |
| Mock exam | **Пробний іспит** | **EVOLVE (EXAM_SIMULATION)** | ТСЦ format (20/20/≤2), blueprint-sampled, timed, no mid-test feedback — graded exposure + readiness ground-truth. |
| Mistakes | **Робота над помилками** | **EXISTS (MISTAKE_PRACTICE)** | Relearning pool; resolves after N=2 spaced corrects; shown *shrinking*. |
| Saved | **Збережені питання** | **EXISTS (SAVED_QUESTIONS)** | User bookmarks. |
| Flash warm-up | **Швидка розминка** | **NEW** | ~5-question low-stakes exposure rung — the gentlest ladder step for P1. |
| Sign drill *(optional)* | **Дорожні знаки** | **NEW** | Sign-only drilling on the restyled sign corpus (competitor parity). |
| Calm-nerves *(non-quiz)* | **Спокій** | **NEW** | Breathing / reframing / "you're ready" — anxiety treatment as a first-class regime, unique in UA. |

**Guardrails (from engagement + learning-science briefs, binding on doc 03):** honest readiness = predicted
**P(pass)** (FSRS retrievability, blueprint-weighted, mock-anchored, calibration-discounted) — *never* "%
seen"; **no leagues / leaderboards / rank-vs-peers** (top anxiety driver, no proven benefit); streaks kept
but **detoxified** (framed "days of practice", automatic **вихідний** forgiveness, no red at-risk panic);
XP recast as **private mastery** (topics mastered / pool covered), only opponent = yesterday's self; two-tap
grading ("Не згадав / Згадав"), not four-button self-grading. Storage stays on **stable `questionId` /
`imageKey`** — never break the resolver/upsert architecture.

---

## 7 · Open questions (for later docs / owner)

1. **Schema for FSRS.** The honest-readiness model needs new per-user×question `ReviewState` (DSR) +
   append-only `ReviewLog` + `ExamAttempt` + cached `TopicMastery`. These are additive migrations
   (`migrate deploy`, one `ADD COLUMN` per statement) — but they're the biggest new build. Confirm this
   lands in the data-model doc, and whether we backfill from existing `TestAnswer`/`UserMistake`.
2. **Exam-date without email/push.** Notifications assume a delivery channel; today there's no email/push
   infra and iOS Safari can't rely on `beforeinstallprompt`. Is the plan in-app nudges + PWA only for v1?
3. **`Іспит` as its own tab vs a mode.** Promoting the mock to a 5th destination emphasizes graded exposure
   but costs one slot. Alternative: fold it under Навчання and give slot 3 to **Спокій**. Which serves P1 better?
4. **Sign drill & Flash warm-up** are proposed NEW regimes — in or out for the first evolution wave?
5. **Explanations are only ~38% REVIEWED.** The AI-Tutor "explain this to me" idea (DMV Genie) is attractive
   but risky against unreviewed content + the legal posture — defer, or scope tightly?
6. **Forgot-password** has no backend — keep it in the sitemap as deferred, or drop until email exists?
