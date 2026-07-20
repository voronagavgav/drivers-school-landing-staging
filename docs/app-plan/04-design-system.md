# 04 — Design System & Interaction Language

**Owner:** Design-System & Interaction lead
**Scope:** Port the landing's "G · Спокій · Рідке скло" identity INTO the app (`app/(app)/*`) and define the interaction/motion language for every learner screen.
**Status:** Plan (feeds `mesa plan` → `run-all`; build is NOT hand-authored ad hoc).
**Source of truth for values:** `/Users/clpc/pdr-landing-site/assets/landing.css` (exact tokens/recipes) + the `liquid-glass` and `pdr-design` skills.

This is an **evolution** of a mature app (Waves 1–9). The current `app/globals.css` is the **old road-sign-BLUE** theme (`--color-sign:#1e5bbf`, Oswald/Manrope). It is fully **replaced** by the tokens below. Nothing here changes data, routes, the stable `imageKey → /api/q-image/[key]` resolver, auth, or the legal/demo positioning — this is skin + motion + interaction only.

---

## 0. Non-negotiables (read first — these gate every build task)

**REJECTED taste — never propose, never ship (Danil has already rejected these):**
- Claymorphism / puffy 3D blobs.
- Hard / saturated / neon greens. **The green never hardens to fix contrast** — if text on green fails 4.5:1, darken the *text* (→ `--green-ink`), never the fill.
- Over-colorful / busy backgrounds. The field is a *calm* pastel wash, low alpha.
- A small / plushy / cartoon mascot. Світлик is **literal, sized-up**, on a rail with a reactive ground shadow — **never** a free-floating scroll companion.
- Dark / gray / muddy glass lenses. Glass is **bright, clean, cool-white**.
- Recurring / periodic gloss animations. Light responds to **hover / press / one-shot reveal only** — never on a timer.
- **Glass-on-glass** (nested translucent panels). Inner panels use flat tinted fill.
- Gloss / 3D pushed past the clean **ref_B** look on restyled images; sticker-look sign pastes.

**PERF — target hardware is a WEAK ~2016 Android (Moto G-Power class, 4 GB / 4 slow cores, Slow-4G) + mid phones, NOT the M2 Pro.**
- `backdrop-filter: blur()` is the **#1 GPU/heat cost** — it re-blurs *every frame*, worst over a moving backdrop. **Emulate glass on weak devices** (drop `backdrop-filter`, keep painted fill + gloss + rim + colored shadow — visually indistinguishable at reading distance, ~zero GPU).
- **≤ 2 co-visible real-refraction lenses, ever.** Never over an animated background, never glass-on-glass.
- **Reading content is opaque/solid at every tier.** Glass is the floating **control/nav** layer only.
- Measure on **hosted PSI (mobile) / a real browser (e2b Chromium, real phone)** — never trust local M2 numbers (local Lighthouse said 98 while PSI said 66).
- Keep map/label **NAMES crisp** even when reducing map quality.

**CORRECTNESS:** images serve via stable `Question.imageKey → GET /api/q-image/[key]` (tiers: image-overrides ▸ restyled-live ▸ official-images). Add `?w=&f=` content-negotiation *inside the resolver* — never bypass or fork it.

**VERIFICATION:** "done/verified" = **driving a real browser over the real http origin** (`npm run audit:browser`, e2b Chromium) — never from typecheck/build/curl alone.

**Non-visual signalling:** every correct/wrong/mastery state carries an **icon + text label**, never colour alone (a11y + the calm brand).

---

## 1. Design tokens (Tailwind v4 `@theme` + glass `:root`)

Two layers. **(A)** Tailwind v4 `@theme` — solid semantic colours / fonts / radii / easing that become utilities (`bg-field`, `text-ink`, `rounded-glass`, `ease-calm`). **(B)** A plain `:root` block for the **glass mechanics** (HSL-part tints so alpha is tunable, elevation multi-shadows, rim, blur) consumed by hand-authored component classes in `@layer components` — the glass system does not map cleanly to utilities and must not be forced into them.

### 1A. `app/globals.css` — `@theme` (replaces the blue theme wholesale)

```css
@import "tailwindcss";

@theme {
  /* ---- palette (all ≥4.5:1 as body/UI text on opaque cards) ---- */
  --color-field:      #FBFAF7;  /* warm off-white page field           → bg-field */
  --color-ink:        #1F2933;  /* primary slate text (NEVER #000)      → text-ink */
  --color-muted:      #46515D;  /* secondary text                       → text-muted */
  --color-line:       #E1E7EC;  /* hairline borders on opaque cards     → border-line */
  --color-green-soft: #9AD9B8;  /* CTA fill / success fill              → bg-green-soft */
  --color-green-deep: #226157;  /* green text/icon on white             → text-green-deep */
  --color-green-ink:  #173B30;  /* DARK text ON the green CTA           → text-green-ink */
  --color-warn:       #B4532E;  /* "wrong" — always paired icon+label   → text-warn */
  --color-warm-ink:   #6A4A28;  /* warm secondary text                  → text-warm-ink */
  --color-amber:      #8A5E0E;  /* rating/attention amber (contrast-safe)→ text-amber */

  /* card reading surfaces (opaque) */
  --color-card:       #FCFDFE;  /* near-white reading card              → bg-card */
  --color-card-tint:  #F3F7F8;  /* faint cool tint reading card         → bg-card-tint */

  /* ---- type ---- */
  --font-display: "Nunito", system-ui, "Segoe UI", Roboto, sans-serif; /* headings, numerals, badges, buttons */
  --font-sans:    "Manrope", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; /* body */

  /* ---- radius (squircle scale; utilities rounded-tray … rounded-pill) ---- */
  --radius-tray:  34px;  /* section trays */
  --radius-glass: 30px;  /* glass panels */
  --radius-card:  22px;  /* reading cards / question card */
  --radius-chip:  16px;  /* options, chips, small cards */
  --radius-pill:  999px;

  /* ---- motion ---- */
  --ease-calm: cubic-bezier(0.16, 1, 0.3, 1);  /* → ease-calm; on nearly everything */
}
```

Notes:
- `--color-line` is nudged lighter than the landing's `210 22% 86%` to read as a hairline on the warm field; `--color-card-tint` is the opaque reading surface (landing `.solid` = `hsl(tint/.93)` baked to a solid hex for the app's opaque-first default).
- **Fonts:** swap `app/layout.tsx` from `Oswald` → `Nunito` (`weight:["600","700"]`), keep `Manrope` (`["400","500","700"]`). Subset `["latin","cyrillic"]`, **`display: "optional"`** (perf budget: ≤ 2 weights each, ≤ 90 KB woff2 total). Wire as `--font-display` / `--font-manrope`.
- `corner-shape: round` on all bordered panels. **NEVER `superellipse` on a bordered box** — Chrome drops the border (learned on the landing).

### 1B. `:root` glass mechanics (verbatim port of landing elevation system)

```css
:root{
  --glass-tint: 200 50% 97%;              /* soft cool-white, HSL parts */
  --glass-line: 0 0% 100% / .60;

  /* elevation — tinted blue-slate multi-shadow, NEVER black; light comes top-left */
  --e1-fill: hsl(var(--glass-tint) / .55);
  --e1-blur: blur(7px) saturate(160%) brightness(106%);
  --e1-shadow: 0 1px 2px hsl(210 40% 38% / .10), 0 6px 16px hsl(210 40% 38% / .12);

  --e2-fill: hsl(var(--glass-tint) / .50);
  --e2-blur: blur(10px) saturate(175%) brightness(108%);
  --e2-shadow: 0 1px 2px hsl(210 40% 38% / .10), 0 10px 30px hsl(210 42% 40% / .16), 0 2px 8px hsl(210 42% 40% / .10);

  --e3-fill: hsl(var(--glass-tint) / .28);  /* signature lens: transparent + BRIGHT (no chroma darkening) */
  --e3-blur: blur(6px) saturate(168%) brightness(133%);
  --e3-shadow: 0 2px 4px hsl(210 40% 38% / .12), 0 18px 48px hsl(210 44% 40% / .22), 0 4px 14px hsl(210 44% 40% / .14);

  /* shared rim: bright top-left bevel + shaded bottom-right — reused on ALL tiers + CTA */
  --rim:
    inset 0 1px 1px  hsl(0 0% 100% / .85),
    inset 1.5px 1.5px 2px hsl(0 0% 100% / .55),
    inset -1.5px -1.5px 3px hsl(210 45% 55% / .20);

  --float: 0 10px 34px hsl(210 40% 40% / .16);   /* opaque-card float shadow */

  /* semantic state fills (options / feedback / mastery) */
  --ok-fill:   hsl(152 46% 90%);  --ok-ink:  #0F3B2E;  /* correct  */
  --no-fill:   hsl(16 50% 93%);   --no-ink:  #7D3A1F;  /* wrong    */
  --mark-fill: hsl(158 30% 90%);                        /* option index chip */

  /* mastery ring hues: Вивчаю → Майже → Впевнено */
  --m-learn: 202 40% 62%;   --m-near: 40 62% 55%;   --m-strong: 152 44% 42%;

  /* pastel field lobes (behind glass) + per-zone pool hue */
  --anchor: 205 22% 56%;
  --zone-mint: 158 50% 80%;  --zone-sky: 202 56% 82%;  --zone-violet: 268 40% 84%;  --zone-green: 152 40% 84%;
}
```

Emulated-tier overrides (`body.glass-emu`) bump fills opaque — see §5.

---

## 2. Component library

Naming: `.glass` (+`.e1`/`.e3`) = floating control chrome; `.solid` = opaque reading surface; `.cta-*` / `.btn-*` = actions. Real refraction only via `.lens` (Chromium, `.refraction-ok`, tier-A). Each component below states **glass or solid**, its **lens budget**, and its **states**.

### 2.1 Glass nav — top bar (desktop) + **bottom tab bar (mobile, primary)**
Mobile-first, so the **bottom tab bar is the primary nav** (thumb zone). The existing `components/app-nav.tsx` (7 overflow links) is replaced.
- **Bottom tab bar** (`≤ 760px`): fixed, **e1 emulated glass** (painted `.88` tint, gloss + rim, **no backdrop-filter** — it sits over scrolling content, the worst blur case). **≤ 5 targets**, each ≥ 44 × 44 px: **Головна · Практика · Іспит · Помилки · Ще**. `Ще` opens a bottom-sheet (§2.9) for Прогрес / Збережені / Історія / Акаунт / Адмінка. Active tab: green-deep icon + label + a soft `hsl(152 46% 90%)` pill behind it; inactive = `--muted`. `aria-current="page"`. Safe-area inset (`env(safe-area-inset-bottom)`).
- **Top bar** (`≥ 761px`): e1 pill capsule (`components/brand.tsx` wordmark left, account right). Lifts **e1 → e2** on scroll via `.stuck` (JS/IntersectionObserver). Real `backdrop-filter` allowed on tier A only.
- Wordmark: replace the blue "ПДР" tile with the Світлик glyph + "Drivers School" in Nunito.

### 2.2 Question card — **solid, opaque, the reading surface**
The core study surface. **Never glass** (it is content, and it's the largest co-visible surface — glass here would blur text and blow the lens budget).
- Surface: `.solid` = `bg-card-tint`, `border-line`, `--float` shadow, `rounded-card`, `corner-shape:round`.
- Contents top→bottom: **topic kicker** (mint pill `hsl(158 44% 90%)` + `text-green-deep`), optional **image** (via `resolveImageSrc(imageKey)` → `/api/q-image/[key]?w=…&f=…`, `srcset` 360/540/720, `sizes`, explicit `width/height` to protect CLS, `loading="lazy"`, meaningful Ukrainian `alt` = sign/scene name), **question text** (Manrope 17px/1.65, `text-ink`), **options** (§2.3), post-answer **feedback + explanation** (with `ExplanationNotice` for the ~62% unreviewed).
- One question per screen. Explanation is **hidden until an answer is submitted**.

### 2.3 Answer options — liquid **hover**, NOT stacked glass
Port `.opt` exactly. Options are **flat near-opaque rows on the opaque question card** — explicitly **not** glass panels (that would be glass-on-glass and blur the label).
- Row: full-width, `≥ 44px` tall, `display:flex`, index **`.mark` chip** (A/B/C…) + label, `bg: hsl(var(--glass-tint)/.96)`, `1.5px` `hsl(210 20% 84%)` border, `rounded-chip`. Semantic **radiogroup**: arrow-key roving focus, Enter/Space, visible ≥2px focus ring.
- **Liquid behaviour = a single light-SWEEP on hover** (`.opt::after`, `linear-gradient(105deg …)`, `mix-blend-mode:screen`, `animation: liquidSweep .7s` — **`@media(hover:hover)` only**, so touch never triggers it and there's no recurring gloss). `:hover translateY(-2px)`, `:active translateY(0)`. This is the "liquid HOVER" — light response, not a glass stack.
- **States (icon + label + colour, never colour alone):**
  - `.correct`: `--ok-fill`, `green-deep` border, `--ok-ink` text, filled check in `.mark`; plays `reveal-soft` (`softglow` ring pulse, one shot).
  - `.wrong` (the user's wrong pick): `--no-fill`, `warn` border, `--no-ink` text, "×" in `.mark`, **"Неправильно" label**.
  - After submit: the correct option is always revealed even if unpicked.
- Press ripple (white dot scale 0→26 from the touch point, JS-injected) shared with CTA — reduced-motion off.

### 2.4 CTA buttons — the green rule, enforced
- **Primary `.cta-glass`:** `background: hsl(152 47% 83% / .95)`, `color: var(--green-ink)`, weight 700 (Nunito), pill, **no backdrop-blur**, box-shadow `0 6px 18px hsl(152 40% 35% / .22)` + inset rim. Hover = one diagonal **light-sweep** (`::before`, `liquidSweep .85s`, screen blend, below the text) + `translateY(-1px)`; `:active scale(.985)`; press ripple. **HARD RULE: soft green fill + dark `green-ink` text. Never white on soft green, never harden the green for contrast.** Verify 4.5:1 in the a11y gate.
- **Ghost `.btn-ghost`:** `hsl(var(--glass-tint)/.7)` + `--ink`, frosted `blur(10px)` on tier A (emulated below). Secondary actions.
- **`.btn-lg`** for the primary/"Далі" action; anchored in the **bottom thumb zone** on mobile. Min 44px; secondary controls ≥ 24px with ≥ 24px offset (WCAG 2.2 SC 2.5.8).

### 2.5 Readiness dial — **signature lens #1 (the emotional centre)**
The landing climax, promoted to the **dashboard hero**. This is **one of the ≤ 2 refraction lenses** app-wide.
- `.ready-card` = **e3 lens** (tier A: real `backdrop-filter` + `filter:url(#lg)` refraction; tier B/phone: painted e3 fill, **no backdrop-filter**, keeps gloss/rim/bloom).
- SVG semicircle `viewBox 0 0 200 120`: track `stroke hsl(158 30% 86%) width 16 round`; value arc gradient `#8FBF8E→#226157`, `stroke-dasharray:251`, animated `stroke-dashoffset` over **1.5s**.
- **Single source of truth** `.ready-num[data-target]`: JS counts `0→N%` (cubic ease-out, 1.5s) **in sync with the arc**, then `numpulse` settle + green `.bloom` fade-in — **one climax, once per reveal**. Reduced-motion → jump straight to N%.
- Under the number: plain-language state (`text-green-deep`, e.g. "Ти майже готовий") + a `.ready-cap` bottleneck line ("найслабше: Розмітка") that routes to the next action. This N% is **the honest readiness** (model in doc 02/learning-science) — never a placeholder, never the ★4.9.
- Other dashboard metrics (accuracy %, topics mastered, streak) are **visually distinct** from this dial so there is one climax, not four.

### 2.6 Topic cards (65 темы) — solid, mastery ring
A grid that "fills in" (turns 2322 questions into finite, checkable terrain). **Opaque `.solid` cards** — there are far more than 2 co-visible, so **no glass** here.
- Each card: topic title, servable count, and a **three-state mastery ring** driven by aggregate retrievability: **Вивчаю** (`--m-learn`) → **Майже** (`--m-near`) → **Впевнено** (`--m-strong`), each with a distinct **glyph + Ukrainian label** (not colour alone). Ring fills **once on reveal** from `data-pct` (IntersectionObserver).
- Chunk **8 categories → topics** (progressive disclosure; never dump 65 at once). "Continue" always routes to the weakest not-yet-mastered topic (steer, don't lock).

### 2.7 Mode cards — flat tinted (painted glass), not lenses
Quick-start tiles: **Змішана практика** (interleaved, recommended), **Пробний іспит** (20 Q / ~20 min / ≤ 2 errors), **Помилки**, **Тема**. A co-visible grid of 4 → **painted "glass-look" tiles** (fill + gloss `::after` + rim + colored shadow, **`backdrop-filter:none`** on all tiers) so we never exceed the 2-lens budget. `.lift:hover translateY(-4px)` (fine-pointer only). Each has an icon, one-line calm description, and a Світлик-voiced nudge where relevant.

### 2.8 Bottom-sheets & modals
- **Bottom-sheet** (mobile default for secondary nav, filters, "download offline", day-off offer): slide-up, drag handle, scrim behind (dims + `inert`s the page), **focus-trap**, Esc/scrim-tap/`aria-modal`. Surface: **e2 emulated glass** (painted, no backdrop-filter over content) — reading-heavy sheets (explanation detail) go **opaque `.solid`**.
- **Confirm-before-finish modal** (test runner): keep existing logic (unanswered warning); restyle to `.solid` + `.cta-glass` confirm. Centered on desktop, bottom-sheet on mobile.
- No tiny close-X's; close targets ≥ 44px.

### 2.9 Toasts — calm, never alarming
Anchored **above the bottom tab bar** (mobile) / top-right (desktop). e1 emulated-glass chip or opaque, `rounded-pill`, auto-dismiss ~4s, swipe/tap to dismiss, `aria-live="polite"`. Tones: **success** = mint tint + check; **info** = neutral; **warn** = peach `--no-fill` + icon + label. **Never a red flood, never a "streak at risk" panic.** Mistakes/day-off surface here as gentle Світлик lines.

### 2.10 Світлик reaction states
One `<symbol id="svitlyk" viewBox="0 0 100 100">` `<use>`d everywhere (rounded slate body `#475a63→#33424a`; lamps coral `#FFB89A` / amber `#FFE08A` / green `#9AD9B8`; **face on the green "go" lamp**; waving arm hidden on mini). **Literal, sized-up, on a rail** with an inverse ground shadow (`.msh`, `svShadow`) — never a scroll companion, never plushy.
States (each just swaps expression/lamp emphasis + a short line; **no confetti, no guilt, no cheerleading**):
- **idle/float** — `svFloat 4.5s`, green lamp calm. Anchored (dashboard header, screen headers), not following scroll.
- **encouraging** — green lamp brighten + `.bloom` when the dial climbs / a topic reaches Впевнено.
- **offers day-off** — amber lamp, "Відпочинь сьогодні — прогрес збережено" (forgiveness, never failure).
- **mistake-reframe** — neutral, "Помилка — це майбутнє «впевнено»"; error count shown *shrinking*.
- **breathing pacer** — pre-exam ritual (§3.7): amber→green lamp pulses at breath cadence (the pacer), "це тренування, не вирок".
- **reduced-motion / phone** — static (no float, no SVG drop-shadow), expression only.

---

## 3. Per-screen visual treatment

Global frame: `bg-field` page, calm pastel field (`body::before` radial mint/sky/peach at low alpha; **phone = static field only**, no drift/grid). Lens budget is tracked **per screen** (max 2). Reading content is always opaque.

### 3.1 Onboarding (`/onboarding`)
Anxiety-first, `< 60s to first win`. Progressive: **exam date? → category? → 3–5 easy real questions** → the readiness dial does its **first count-up climax on their first session**. Світлik guides (idle→encouraging). One lens max: the dial on the final step. Category picker = large `.solid` radio rows (not the current bare list).

### 3.2 Dashboard (`/dashboard`)
The emotional home. Order: **readiness dial (lens #1, hero)** → "continue where you left off" `.solid` card → "Світлик радить повторити N" spaced-review card (calm, not a red badge) → **mode cards** (§2.7) → topic-map teaser → streak + day-off (forgiving, "днів практики", no fire hysteria). Exactly **one lens** (the dial). All else opaque/painted.

### 3.3 Practice (`/practice`)
"Змішана практика" (interleaved, recommended) CTA on top, then **8 categories → 65 topic cards** (§2.6) with mastery rings. No lens. Opaque throughout.

### 3.4 Test runner (`/test/[id]`, practice + exam)
Pure focus. **Question card (§2.2) opaque, one question per screen.** Top: slim progress + exam **timer** + save-star + flag. Bottom thumb zone: **"Далі" `.cta-glass`**. Question **navigator grid** = bottom-sheet on mobile. Exam = no mid-test feedback (review after). Practice = inline feedback + explanation on submit. **Zero glass on reading; zero lenses** (all GPU goes to instant tap feedback).

### 3.5 Result / разбор (`/test/[id]/result`)
Score + pass/fail (exam), then full per-question review reusing the option states (§2.3). **Mistakes framed as growth** ("помилки, які вже не повторяться"), grouped by topic. Default next action = "review your mistakes". Optional small readiness delta (references the one dial, doesn't re-climax).

### 3.6 Progress (`/progress`), Mistakes (`/mistakes`), Saved (`/saved`), History (`/history`)
Opaque `.solid` lists. Progress: per-topic mastery bands + a **calibration panel** ("коли ти був впевнений, ти мав рацію у 72%") + trend sparkline — **not** a second dial (one climax rule). Mistakes/Saved reframed positive, **error count shrinking**, calm not red-flooded. Advanced analytics tucked below the fold.

### 3.7 Pre-exam calm ritual (new, optional before Пробний іспит)
A 60-second breathing screen; Світлик's amber→green lamp is the pacer (§2.10); reframing copy. Optional lens #1 here (a single calm glass panel) since nothing else competes; reduced-motion → static pacer with a numeric countdown.

### 3.8 Account (`/account`)
Settings: change password, **analytics opt-out** (keep), notification prefs (≤ 3–4/week, tied to exam date), **offline packs** ("Завантажити тему — ~X МБ", confirm before bulk). Opaque forms. Keep `LegalDisclaimer` + `ExplanationNotice` intact everywhere.

---

## 4. Motion & interaction language

Principle: **light responds to intent (hover/press/reveal), never to a clock.** Never transform a `backdrop-filter` panel a user is reading (it re-samples and softens text — animate light overlays only). **Never lower animation fps to save heat** (1:1 smoothness loss on ProMotion). All motion gated by `prefers-reduced-motion`.

- **Tap-to-feedback < 100ms** (INP budget). `:active`/ripple fire immediately, before the server round-trip.
- **Answer reveal:** explanation hidden until submit → on submit: picked option animates to correct/wrong, correct plays `softglow` (one ring pulse), `feedback` panel `fadeUp .4s`, **focus moves to the result and it's announced via `aria-live="polite"`**. This makes retrieval the only path to the explanation.
- **Correct/incorrect:** correct = mint fill + check + Світлик green-lamp brighten; wrong = peach fill + × + "Неправильно" + Світлik calm reframe (never scolding). Both icon+label.
- **Count-up (dial):** once per reveal, 1.5s cubic-out, arc + numeral in sync, `numpulse` + `bloom` settle. Reduced-motion → final value instantly.
- **Reveal-on-scroll:** `.reveal → .in` (opacity + 12px translateY, IntersectionObserver); meters/rings/streak fill **once** from `data-*`. Reduced-motion → simple 0.15s fade.
- **Route transitions:** calm cross-fade + 8–12px rise (View Transitions where cheap); never block INP.
- **Hover sweeps:** CTA / options / lens — `@media(hover:hover)` only, single-shot, screen blend below text.
- **Idle-freeze:** `html.bg-idle` after 1.2s of no input removes drift + mascot animation (`animation:none`, **not** `paused` — a paused compositor animation keeps the frame loop and backdrop-filter alive; removing it lets the GPU go quiet). JS restores on any input.
- **Haptics (optional, progressive):** `navigator.vibrate` — light single pulse on correct, soft double on wrong, tiny tick on tab change. Feature-detected (no-op on iOS Safari), respects an opt-out, never used as punishment. Pair with, never replace, visual feedback.

---

## 5. Device-tier strategy

Detect once on load, set `body` classes + `data-tier`; re-evaluate on `prefers-*` change. Order of precedence: reduced-transparency/contrast overrides > phone > emulated > full.

| Tier | Trigger | Glass | Lenses | Ambient/motion |
|---|---|---|---|---|
| **A — full** | fine pointer, `deviceMemory ≥ 8`, `hardwareConcurrency ≥ 8`, no Save-Data | real `backdrop-filter` on nav/sheets; `filter:url(#lg)` refraction | **≤ 2** (dial; +1 e.g. onboarding/ritual) | drift/field + idle-freeze |
| **B — emulated (default safe)** | `deviceMemory ≤ 4` OR `hardwareConcurrency ≤ 4` OR `Save-Data` OR coarse pointer OR `prefers-reduced-transparency` OR map off | `body.glass-emu`: **drop `backdrop-filter` on ALL panels except the lenses**; bump fills opaque (`--e1-fill:.86`, `--e2-fill:.84`); keep painted fill + gloss + rim + colored shadow | **≤ 2**, painted | reduced |
| **C — phone** | `≤ 760px` OR `pointer:coarse` | **kill ALL `backdrop-filter` incl. lenses**; opaque pastel fills `.74–.92` | **0 real** (dial painted, count-up still runs) | static field only; no drift/grid; mascot SVG shadow dropped |

Accessibility overrides (win over everything):
- **`prefers-reduced-motion: reduce`** → no float/sweeps/parallax/ripple; count-up jumps to final; reveal = plain fade.
- **`prefers-reduced-transparency: reduce`** → solid `.98` fills, all glass FX `display:none` (reuse the emulated opaque tier).
- **`prefers-contrast: more`** → `#fff` fills, `--ink` borders, gloss off, stronger text.
- All tiers: **reading content opaque; label NAMES crisp**; a `?glass=emu` / `?heat=` query toggle for cheap A/B GPU isolation before building any fix.

Perf budgets carried into build (reference device, 75th pct, hosted PSI): **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, TBT ≤ 200ms; First-Load JS ≤ 150 KB gz/route** (defer dial/map to first-interaction); **images ≤ 120 KB, AVIF→WebP→JPEG via the resolver's `?w=&f=` negotiation, srcset 360/540/720** — never bypass the stable-key resolver.

---

## 6. Migration & delivery

- Replace `app/globals.css` `@theme` (§1A) + add the `:root` glass block (§1B) + `@layer components` for `.glass/.solid/.opt/.cta-glass/.btn-ghost/.ready-card/.mode-card/.svitlyk` (ported from `landing.css`). Delete the blue road-strip theme.
- Swap fonts in `app/layout.tsx` (Nunito+Manrope), add tier-detection + idle-freeze script, add `<symbol id="svitlyk">` sprite + `#lg` refraction filter (Chromium, `.refraction-ok`).
- Rebuild `components/app-nav.tsx` → bottom tab bar + top bar; restyle `components/ui.tsx` (`Button`, `Card`→`.solid`, `Badge`), `test-runner.tsx` (options/feedback/CTA), `brand.tsx` (Світлик wordmark).
- **Route through the Mesa harness** (`mesa plan` → `run-all` + evaluator + verify gate), then **independently verify in a real browser / e2b Chromium + hosted PSI** — the a11y gate must assert CTA 4.5:1 and non-colour-only state signalling, and the perf gate must run on throttled/PSI, not local M2.

---

## 7. Token quick-reference (for build tasks)

| Purpose | Token / class |
|---|---|
| Page field | `bg-field` (`#FBFAF7`) |
| Body / secondary text | `text-ink` `#1F2933` / `text-muted` `#46515D` |
| CTA fill / text | `bg-green-soft` `#9AD9B8` + `text-green-ink` `#173B30` (**never white/hardened**) |
| Green on white | `text-green-deep` `#226157` |
| Wrong (icon+label) | `text-warn` `#B4532E`, fill `--no-fill` |
| Correct | fill `--ok-fill`, `--ok-ink` `#0F3B2E` |
| Reading surface | `.solid` (`bg-card-tint` + `--float`) |
| Control chrome | `.glass` (`.e1` chips/nav, e2 sheets, `.e3.lens` dial) |
| Primary action | `.cta-glass` (+ `.btn-lg`) |
| Radii | `rounded-tray/glass/card/chip/pill` |
| Ease | `ease-calm` |
| Mastery | `--m-learn / --m-near / --m-strong` (+ glyph + label) |
