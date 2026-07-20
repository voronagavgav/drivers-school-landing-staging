# UX findings — full desktop journey, real transport (2026-07-02 night run)

Source: an exploratory real-browser UX pass over http://100.110.64.90:3100 (register → onboarding →
every mode → exam → mistakes/saved/progress/history/account → edge paths), 1440×900. Phone pass in a
separate section when it lands. Screenshots: /tmp/ux-desktop/. **FIXED-TONIGHT items are done and
verified (extended audit 16/16); everything else feeds Waves 11–12 specs — do NOT hand-patch ahead
of the waves.**

## Fixed tonight (verified)
1. **BLOCKER — answering was completely broken over real HTTP**: unguarded `crypto.randomUUID()`
   (wave10f-11's client change) is undefined in insecure contexts → every option click threw → nothing
   submitted; every exam scored 0/20. Fixed with the guarded generator (mirrors `lib/client/track.ts`);
   `bin/browser-audit.sh` extended with the one assertion that actually ANSWERS a question (now 16
   assertions). Lesson relearned: URL-level assertions structurally cannot catch interaction breakage.
2. Onboarding defaulted to category **A (мотоцикли)** — silent mis-onboarding; now defaults to **B**.
3. Global 404 was English/unbranded Next default → localized branded `app/not-found.tsx`.
4. Ukrainian copy: `Состав → Склад` (BE/CE/DE category descriptions; seed + live DB).

## Deferred → Wave 11 (server core) — spec inputs
- **Two disagreeing readiness numbers on the dashboard** (ring: «0 · Недостатньо даних» vs card:
  «40 зі 100 · не готовий» for a 0-answer user). The honest-dial work replaces this — the W11/W12 spec
  MUST include: one readiness metric, and below the data threshold show «ще недостатньо даних — зробіть
  N питань» with a progress bar toward the threshold, never a hard number+verdict.
- **First recommended action for a brand-new user is the timed pass/fail exam** — anti-calm. The W11
  plan card should make the first action a no-stakes practice set (graded exposure per the master plan).
- **Post-fail tone mismatch**: after 0/20, the recommendation reads congratulatory («Тримайте темп…»).
  Recommendation copy must branch on the actual outcome.
- **Result screen**: add «3 теми з найбільшою кількістю помилок — почніть звідси» atop «Розбір питань»
  (fail → finite corrective plan).
- **/mistakes vs /history disagree** on unanswered exam questions (history: «20 помилок», mistakes:
  empty). Decide: unanswered = mistake? (Recommend: no — but the result screen should then say
  «не відповіли», not «помилок».)
- **analytics-dashboard integration suite is top-N-fragile** under real traffic (fixture displaced by
  378 explorer events; purged + green). W11 chore: make fixtures noise-proof (unique window or higher counts).

## Deferred → Wave 12 (design/UI) — spec inputs
- **Number keys 1–4** should select answer options (arrow+Enter works today; digits focus the nav).
- **Reload mid-test drops to Q1** (session resumes, index is client-only) — persist current index.
- **Native browser validation is English** on register/login («Please fill out this field») —
  Ukrainian client-side validation in the W12b forms.
- Two identical «Почати симуляцію» buttons stacked on the dashboard — consolidate in the W12 dashboard.

## Ideas (moat-aligned, from observed behavior)
- **Warm-up gate**: for brand-new users, front the exam CTA with a ~5-question розминка (calm-nerves).
- **One-tap daily plan**: turn the passive «0/20 денна ціль» bar into «Сьогоднішній план: 20 питань
  (≈8 хв)» assembling due-SRS + weak-topic questions — the bounded daily loop the master plan promises.
- **Insecure-context self-check** (DONE as audit assertion 2b — keep it forever).

## Content data
- Option text artifact: «…має перевагу у русі.».» (trailing `».`) in a ПЕРЕВАГИ МАРШРУТНИХ ТЗ question —
  batch a content-override pass for transcription artifacts (grep options for `.».` / `»."` patterns).
- Topic title «…ТРАНСПОРТНИХ СОСТАВІВ» — verify against official ГСЦ МВС wording BEFORE editing (may be
  the official source's own term).

## What already works well (don't break in W12)
Timer, save/unsave flow, change-password (incl. session invalidation), calm result review + legal
disclaimers, graceful bad-test-id handling, restyled images via /api/q-image, page loads all <1s.

---

# PHONE pass (390×844, real transport) — same night

**Verdict: genuinely well-built for phone.** 0 console errors, 0 horizontal-scroll pages, all screens
card-based (zero tables), loads ~1.3s, reload-mid-test keeps state, landscape fine.

## Fixed tonight (verified: input 16px at 390px, audit 16/16 on the new build)
1. All inputs were 14px → iOS zoom-on-focus on every field (register/login/account). Now `text-base`
   (16px) on phone, `sm:text-sm` keeps the desktop look.
2. Header nav (7 links, 620px) clipped at 390px with ZERO scroll affordance — Збережені/Історія/Акаунт
   invisible. Interim: right-edge fade mask (`.nav-scroll`, ≤560px) as a "scrolls →" cue.

## Deferred → Wave 12 (these ARE the W12b runner/nav redesign inputs)
- Bottom tab capsule replaces the horizontal nav strip (the canonical W12 nav — the fade is interim).
- STICKY exam header: timer + N/20 + progress (timer scrolls off exactly when reading options).
- Thumb-zone sticky action bar for Далі/Завершити (currently mid-screen).
- Swipe left/right between questions (the 20-cell grid is a poor phone pager).
- Save/Flag links are 20px tall (smallest targets in the app) → 44px icon buttons.
- Question-grid cells 35×36 → ≥44px.
- Auto-scroll to explanation (or sticky «Далі») after answering — feedback can render below the fold.

# Phone-first LANDING variant (task 4c) — shipped to preview
https://voronagavgav.github.io/pdr-landing-preview/phone.html?v=6 — dedicated single-column phone
experience (emulated glass, static field, no map/blobs, sample-question-as-hero, vertical journey,
sticky thumb-zone CTA dock, data-app hand-off parity). Verified 360/390/414: no h-scroll, 0 errors.
Taste-checked against pdr-design rules (calm/bright/green-fill+dark-text/literal Світлик) — PASSES.
NOTE for the pre-production honesty pass: «Тисячі вже склали з першого разу» exists on BOTH pages
(pre-existing approved copy) — unverifiable claim, revisit alongside ★4.9/testimonials before indexing.
