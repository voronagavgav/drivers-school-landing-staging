# Drivers School Design System

**Version:** 1.0  
**Status:** Implementation target  
**Product:** Drivers School, Ukrainian driving-theory and exam-preparation SaaS  
**Design concept:** Driving-system blueprint SaaS

This document is the implementation source of truth for the public landing page, authentication, onboarding, learning application, exam runner, progress views, pricing, offline states, and account surfaces.

## 1. Product Positioning

Drivers School is an intelligent learning platform for preparing for the theoretical driving exam. It is not a traditional driving-school brochure and is not an official government exam system.

The product value is the intelligence layer around the question bank:

- adaptive and spaced repetition;
- diagnosis of weak topics;
- an honest readiness estimate based on sufficient evidence;
- a plan tied to an exam date;
- mistake review with context;
- confidence calibration;
- topic mastery groups without leaderboards;
- exam simulation using 20 questions, 20 minutes, and a maximum of 2 mistakes;
- offline practice and installable PWA behavior;
- free question access with a one-time paid intelligence layer.

The interface must communicate precision, intelligence, trust, safety, progress, technical authority, modern education, and calm confidence.

It must not feel childish, overly feminine, cyberpunk, gaming-heavy, developer-only, government-issued, generically AI-branded, or visually noisy.

## 2. Existing Foundations

### Retain

The following existing decisions are useful and remain part of the target system:

- Manrope has strong Cyrillic coverage and remains the primary UI typeface.
- The application shell uses a maximum width of 1024px and a five-item navigation model.
- Mobile navigation remains in the thumb zone and all primary targets remain at least 44px high.
- Reading surfaces are opaque. Question text and answer options must never sit on translucent glass.
- Readiness shows an explicit insufficient-data state instead of fabricating certainty.
- Correct, wrong, warning, and mastery states always combine color with text or an icon.
- The road-progress metaphor is distinctive and should remain.
- The topic map uses meaningful mastery groups rather than percentages, ranks, or competitive scores.
- Reduced-motion, reduced-transparency, and increased-contrast preferences remain supported.
- Motion responds to user action or state change and does not run continuously without purpose.

### Replace

The following existing patterns are deprecated:

- mint green as the primary brand color;
- Nunito as the display face;
- 16px to 34px radii on cards and navigation;
- liquid-glass highlights, gloss sweeps, and large blurred field lobes;
- backdrop-filter as a brand-defining effect;
- large multi-layer shadows on routine application cards;
- decorative gradients as section backgrounds;
- inconsistent visual tokens between the landing page and authenticated application.

The previous Signal Ledger document contributed useful rules for compact data hierarchy, 8px geometry, mono metadata, restrained motion, and operational clarity. Its observability-product language, black-and-blue palette, and developer-focused framing do not carry forward.

## 3. Core Principles

### 3.1 Warm canvas, technical structure

Use warm off-white as the default reading field. Introduce graphite through navigation, readiness summaries, exam chrome, and high-value intelligence panels. Use pastel pink for active paths, selected states, route progress, and primary actions.

### 3.2 Intelligence is visible

Every intelligence feature must explain what it knows and what the learner should do next. A readiness number without evidence, a recommendation without a reason, or a locked panel without a value statement is incomplete.

### 3.3 Blueprint details support orientation

Grid lines, coordinate marks, lane dashes, route paths, measurement ticks, crosshairs, and clipped corners are decorative orientation cues. They never carry required information and never reduce text contrast.

### 3.4 Calm density

Application screens are compact enough for repeated use but never crowded. Prefer one clear primary action per surface. Avoid marketing-scale typography inside cards, dashboards, dialogs, or the exam runner.

### 3.5 Honest states

Use factual language. Never create urgency, scarcity, fake discounts, inflated readiness, guaranteed exam outcomes, or confirm-shaming. Use “Не зараз” for optional dismissals.

## 4. Color Tokens

Use these exact values. Do not introduce one-off hex values in components.

```css
:root {
  /* Canvas and surfaces */
  --color-page: #F5F3F4;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FAF8FA;
  --color-surface-muted: #ECE9EC;

  /* Graphite structure */
  --color-graphite-950: #242330;
  --color-graphite-900: #30303F;
  --color-graphite-800: #39394D;
  --color-graphite-700: #48485D;
  --color-graphite-600: #5D5B6D;

  /* Text */
  --color-text-primary: #242330;
  --color-text-secondary: #686572;
  --color-text-on-dark: #F7F3F6;
  --color-text-on-dark-muted: #C7C2CD;
  --color-text-disabled: #918D99;

  /* Brand pink */
  --color-pink-500: #F0AEE6;
  --color-pink-400: #F7C0EE;
  --color-pink-300: #FAD8F4;
  --color-pink-100: #FCECF9;
  --color-pink-ink: #3B2638;

  /* Borders and blueprint lines */
  --color-border-light: #DED9DF;
  --color-border-strong: #BDB7C0;
  --color-border-dark: rgba(242, 201, 237, 0.18);
  --color-grid-light: rgba(61, 58, 72, 0.08);
  --color-grid-dark: rgba(242, 201, 237, 0.12);

  /* Semantic states */
  --color-success: #26735A;
  --color-success-surface: #E2F3EC;
  --color-warning: #8A5E0E;
  --color-warning-surface: #F8ECD0;
  --color-error: #A84638;
  --color-error-surface: #F7E4E1;
  --color-info: #315F82;
  --color-info-surface: #E4EFF7;

  /* Mastery states */
  --color-mastery-learning: #668CA5;
  --color-mastery-learning-surface: #E5EFF5;
  --color-mastery-near: #A67B24;
  --color-mastery-near-surface: #F7EED7;
  --color-mastery-strong: #377A5B;
  --color-mastery-strong-surface: #E2F2E9;

  /* Focus and selection */
  --color-focus-light: #30303F;
  --color-focus-dark: #F7C0EE;
  --color-selection: #FAD8F4;
}
```

### 4.1 Usage rules

- Use `--color-page` for the application background.
- Use `--color-surface` for reading cards, forms, dialogs, and question panels.
- Use `--color-surface-muted` for inactive controls, placeholders, and secondary tool regions.
- Use graphite surfaces for no more than one dominant panel per application viewport.
- Use `--color-pink-500` for the primary CTA, active route, selected option before submission, and current progress.
- Text on pink is always `--color-text-primary` or `--color-pink-ink`. Never use white text on pastel pink.
- Pink is not an error color and must not replace semantic red.
- Success and wrong states retain green and red because recognition and safety are more important than palette purity.
- Do not use purple or blue gradients as a brand device.
- Do not place two large pink surfaces next to each other. Pink should identify the path, not become the entire page.

### 4.2 Contrast requirements

These pairs are approved:

| Foreground | Background | Ratio | Use |
|---|---|---:|---|
| `#242330` | `#F5F3F4` | 14.00:1 | Primary text on page |
| `#686572` | `#F5F3F4` | 5.15:1 | Secondary text on page |
| `#242330` | `#F0AEE6` | 8.76:1 | Text on primary pink |
| `#F7F3F6` | `#30303F` | 11.79:1 | Primary text on graphite |
| `#C7C2CD` | `#30303F` | 7.42:1 | Secondary text on graphite |
| `#26735A` | `#FFFFFF` | 5.70:1 | Success text |
| `#A84638` | `#FFFFFF` | 5.84:1 | Error text |
| `#8A5E0E` | `#FFFFFF` | 5.69:1 | Warning text |

All normal text must meet WCAG AA 4.5:1. Large text and essential graphics must meet 3:1.

## 5. Typography

### 5.1 Families

```css
--font-sans: var(--font-manrope), "Manrope", system-ui, "Segoe UI", sans-serif;
--font-display: var(--font-manrope), "Manrope", system-ui, "Segoe UI", sans-serif;
--font-mono: var(--font-jetbrains-mono), "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
```

- Manrope is used for display, body, navigation, buttons, forms, and numerals.
- JetBrains Mono is used only for technical metadata, timers, coordinates, question counters, measurement labels, and blueprint annotations.
- Nunito is deprecated. Do not use it in new work.
- Use tabular numerals for readiness percentages, timers, streaks, prices, question counters, and progress values.
- Letter spacing is `0` for every role. Do not use negative tracking.

### 5.2 Type scale

Use fixed sizes at each breakpoint. Do not scale type continuously with viewport width.

| Token | Desktop | Mobile | Weight | Line height | Use |
|---|---:|---:|---:|---:|---|
| `display-landing` | 64px | 44px | 600 | 1.04 | Landing H1 only |
| `display-section` | 44px | 34px | 600 | 1.10 | Landing section headings |
| `heading-page` | 32px | 28px | 600 | 1.20 | Application page H1 |
| `heading-section` | 24px | 22px | 600 | 1.25 | Major application H2 |
| `heading-card` | 18px | 18px | 600 | 1.35 | Card title, question text |
| `body-large` | 18px | 18px | 400 | 1.55 | Landing lead, onboarding lead |
| `body` | 16px | 16px | 400 | 1.50 | Default reading text |
| `body-small` | 14px | 14px | 400 | 1.45 | Supporting text |
| `label` | 12px | 12px | 600 | 1.35 | Mono metadata and status labels |
| `numeric-large` | 40px | 36px | 700 | 1.00 | Readiness, price, summary metrics |
| `button` | 14px | 14px | 600 | 1.20 | Buttons and segmented controls |

### 5.3 Text rules

- Landing H1 is limited to 2 lines on desktop and 3 lines on mobile.
- Application page titles are limited to 2 lines.
- Body copy uses a maximum readable width of 68 characters.
- Cards use sentence case. Do not uppercase card titles.
- Mono labels may be uppercase, but must remain 12px and must not exceed 32 characters.
- Avoid center-aligned paragraphs longer than two lines.
- Use bold weight once per compact surface. Metrics may be bold; surrounding copy remains regular.

## 6. Spacing and Layout

### 6.1 Spacing scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

- Default component gap: 12px.
- Default card padding: 20px on mobile, 24px at 640px and above.
- Application section gap: 24px.
- Landing section padding: 96px desktop, 64px tablet, 48px mobile.
- Form field gap: 16px.
- Label-to-control gap: 6px.
- Icon-to-label gap: 8px.
- Never use spacing values outside this scale.

### 6.2 Containers

| Surface | Maximum width | Horizontal gutter |
|---|---:|---:|
| Application shell | 1024px | 20px mobile, 32px desktop |
| Test runner | 672px | 16px mobile, 24px desktop |
| Auth and checkout | 384px | 20px |
| Onboarding | 672px | 20px |
| Landing content | 1240px | 20px mobile, 48px desktop |
| Long-form legal copy | 720px | 20px |

### 6.3 Responsive breakpoints

Use the existing Tailwind breakpoints:

- `sm`: 640px;
- `md`: 768px;
- `lg`: 1024px;
- `xl`: 1280px.

Do not add route-specific breakpoints unless content demonstrably overflows.

### 6.4 Grid rules

- Dashboard metrics: 2 columns below 640px, 4 columns from 640px.
- Practice topics: 1 column below 640px, 2 columns from 640px.
- Landing capability panels: 1 column below 768px, asymmetric 12-column grid above 768px.
- Pricing remains a single focused offer, not a three-tier comparison.
- Topic map remains a vertical grouped list.
- The exam navigator uses 6 columns on mobile and 10 columns from 640px.
- Never leave an empty grid cell purely for visual decoration.
- Do not place cards inside cards. Nested surfaces are allowed only for charts, question media, or framed tools.

## 7. Shape and Border System

```css
--radius-xs: 2px;
--radius-sm: 4px;
--radius-card: 8px;
--radius-control: 8px;
--radius-pill: 999px;
--border-standard: 1px;
--border-emphasis: 2px;
```

- Cards, dialogs, images, answer options, and inputs use 8px.
- Small technical markers use 2px or 4px.
- Text buttons use 8px unless they represent a filter, status, or compact segmented selection.
- Status chips and segmented selections may use the pill radius.
- Icon-only controls are 40px desktop and 44px touch, with either 8px corners or a circle when the symbol convention requires it.
- Do not use 16px to 34px “soft SaaS” card radii.

### 7.1 Clipped-corner detail

A technical panel may clip one top-right corner by 6px. Apply this only to non-modal intelligence panels, never to buttons, answer options, inputs, or reading cards. Required content must stay at least 16px from the clipped edge.

## 8. Blueprint Visual Language

Blueprint graphics are decorative and use CSS, canvas, or optimized bitmap assets. Do not hand-draw custom SVG icons when a Lucide icon exists.

### 8.1 Grid

- Light grid cell: 24px by 24px.
- Dark grid cell: 32px by 32px.
- Line thickness: 1px.
- Maximum opacity: 8% on light surfaces, 12% on graphite.
- A grid may cover a hero, empty-state illustration, or intelligence panel, but never the question text or answer list.

### 8.2 Road and route marks

- Lane line: 2px.
- Dash: 10px; gap: 8px.
- Route trajectory: 2px solid pink with 8px circular nodes.
- Start node: graphite outline with warm surface fill.
- Current node: pink fill with a 2px graphite border.
- Completed path may use graphite; future path uses the light border token.
- Route paths must not animate continuously.

### 8.3 Measurement details

- Measurement tick: 6px long, 1px stroke.
- Crosshair: 12px square, 1px stroke.
- Registration mark: 12px mono text, maximum 10 characters.
- Coordinate labels use Ukrainian abbreviations or neutral values, never fake technical jargon.
- Bracketed labels use the format `[ ГОТОВНІСТЬ ]`, maximum one per panel.

### 8.4 Density limits

- Maximum two blueprint motifs per section.
- Maximum one grid layer behind text.
- Decorative opacity never exceeds 12%.
- No decorative element may overlap a button, form control, question image, answer option, timer, or legal disclaimer.

## 9. Elevation and Surfaces

The system is primarily flat. Borders and surface contrast carry hierarchy.

| Level | Treatment | Use |
|---|---|---|
| 0 | No shadow | Page, full-width bands |
| 1 | `0 1px 2px rgba(36,35,48,.06)` | Routine cards and controls |
| 2 | `0 8px 24px rgba(36,35,48,.10)` | Sticky navigation, menus, raised intelligence panel |
| 3 | `0 20px 48px rgba(36,35,48,.18)` | Dialogs only |

- Do not use colored shadows.
- Do not use backdrop blur on reading surfaces.
- Glass is not a default component category.
- Graphite panels use `--color-border-dark`, not a shadow, for internal separation.

## 10. Component Specifications

### 10.1 Application shell

- Header height: 64px.
- Desktop application content width: 1024px.
- Main content top padding: 24px.
- Mobile main content bottom padding: at least 112px plus safe-area inset.
- Header uses warm surface with a 1px bottom border.
- Wordmark remains visible at every breakpoint.

### 10.2 Primary navigation

- Five destinations remain: Головна, Навчання, Іспит, Прогрес, Профіль.
- Desktop navigation sits below the header as a compact technical rail.
- Mobile navigation remains fixed to the bottom.
- Every tab is at least 44px high.
- Active tab uses pink-300 with graphite text and a 2px bottom route mark.
- Inactive tabs use secondary text and no fill.
- The exam launcher is a command, not an active route state.

### 10.3 Cards

- Background: surface.
- Border: 1px light border.
- Radius: 8px.
- Padding: 20px mobile, 24px desktop.
- Routine shadow: level 1 only.
- Card title: `heading-card`.
- Supporting text: `body-small`.
- A card has one primary purpose and no more than one primary CTA.

Variants:

- **Reading card:** white, no blueprint decoration.
- **Intelligence card:** graphite-900, inverse text, optional 8% grid.
- **Selected card:** pink-100 with a 2px pink-500 edge.
- **Semantic card:** semantic surface with matching semantic text.
- **Locked teaser:** surface-muted placeholder, lock icon, one factual value line, one quiet link.

### 10.4 Buttons

All buttons have a minimum height of 44px and a minimum horizontal padding of 16px.

| Variant | Fill | Text | Border |
|---|---|---|---|
| Primary | pink-500 | text-primary | transparent |
| Secondary | graphite-900 | text-on-dark | transparent |
| Outline | transparent | text-primary | border-strong |
| Ghost | transparent | text-primary | transparent |
| Danger | error-surface | error | error at 30% |

- Hover: translate up by 1px only on fine pointers.
- Active: scale to 0.985.
- Disabled: 50% opacity, no hover transform.
- Loading preserves the button’s width and replaces the leading icon with a spinner.
- Primary and secondary buttons may appear together. Do not place two primary buttons in one compact surface.
- Use Lucide icons for familiar commands. Icon-only controls require an accessible label and tooltip when meaning is not obvious.

### 10.5 Inputs

- Minimum height: 48px.
- Radius: 8px.
- Background: surface.
- Border: 1px border-light.
- Padding: 12px 14px.
- Label: 14px, weight 600.
- Placeholder: text-disabled.
- Focus: 2px graphite ring with 2px offset on light surfaces.
- Error: error border, error text, and a linked `role="alert"` message.
- Never communicate error by color alone.

### 10.6 Badges and metadata

- Height: 24px minimum.
- Padding: 4px 8px.
- Radius: pill.
- Type: mono label, 12px.
- Neutral badge: surface-muted with secondary text.
- Mastery and semantic badges use their dedicated tokens.
- “Демо-контент” and automatically generated explanation notices remain explicit.

### 10.7 Answer option

- Minimum height: 52px.
- Padding: 14px 16px.
- Radius: 8px.
- Default: white surface, 1px border-light.
- Hover: pink-100 on fine pointers.
- Selected before submission: pink-300 with a 2px pink-500 border.
- Correct: success-surface, success border, check icon, “Правильно”.
- Wrong: error-surface, error border, X icon, “Неправильно”.
- Option index: 28px square, 4px radius, mono or tabular numeral.
- Exam and diagnostic modes must not reveal correctness before completion.

### 10.8 Question card

- Maximum width: 672px.
- Question title uses `heading-card`.
- Question image uses its natural aspect ratio, never crops, and has an 8px frame.
- Image and options maintain a 16px gap.
- Feedback appears below options in document flow and receives focus or scroll only once.
- Save and review actions are secondary icon-and-text controls.

### 10.9 Readiness panel

- Readiness is the principal intelligence surface and may use graphite.
- Dial diameter: 140px desktop, 128px mobile.
- Ring thickness: 10px.
- Track: graphite-700 on dark or surface-muted on light.
- Value: numeric-large with tabular numerals.
- Include one evidence sentence explaining what the estimate represents.
- Insufficient data uses the road-progress component and states the exact remaining question count.
- Never show a placeholder percentage.
- The weakest-topic action is secondary, not visually stronger than the readiness value.

### 10.10 Road progress

- Height: 12px.
- Track: graphite-900.
- Center marking: 2px dashed line using pink-300.
- Fill: pink-500.
- Radius: pill because this is a linear status indicator.
- Transition: width 400ms using the standard ease.
- Include native progress semantics and a visible numeric label when precision matters.

### 10.11 Topic map

- Keep the three groups: Вивчаю, Майже, Впевнено.
- Each topic appears exactly once.
- Group color is communicated by left rail, icon, and heading, not by a full saturated card.
- Topic row minimum height: 48px.
- The entire row launches practice.
- Offline download remains a separate 44px icon action.
- Do not show ranking, competitive score, or decorative percentages.

### 10.12 Exam runner

- Prioritize question text, image, and answer options.
- Sticky exam chrome contains mode, question counter, timer when applicable, and road progress.
- Sticky chrome uses graphite with inverse text and no blur.
- Timer switches to warning only at the existing low-time threshold.
- Navigator cells remain 44px square minimum.
- Current, answered, flagged, and unanswered states each combine shape or icon with color.
- Completion confirmation uses a modal with level-3 elevation and a visible count of unanswered questions.

### 10.13 Pricing and entitlement

- Present one price and one outcome.
- Price is the only bold large numeric moment.
- State “одноразово” and “без автосписань” near the price.
- Do not use crossed-out prices, countdowns, scarcity, or subscription toggles.
- Free question access remains explicit.
- Paid value is framed as planning, readiness, repetition, and mistake intelligence.

### 10.14 Empty, loading, and offline states

- Empty states explain why the state is empty and name one next action.
- Loading skeletons use surface-muted, never animated shimmer under reduced motion.
- Offline states use the road or map metaphor and state what remains available.
- The existing mascot may appear only in supportive empty states, at a maximum size of 96px. It must remain static and secondary to the message.

## 11. Landing Page System

The public landing page is a consumer education product experience, not an operational dashboard.

### 11.1 First viewport

- Product name is visible in the header.
- H1 names the learning outcome or route.
- H1 is no more than 2 lines desktop and 3 lines mobile.
- Supporting copy is no more than 22 words.
- Exactly two CTAs: try a question and create an account.
- Use a real or generated road, intersection, navigation, or product-state bitmap as the full-bleed hero image.
- Place text over a graphite scrim with approved inverse text colors.
- Leave at least 64px of the next section visible in the initial viewport.
- Do not place stats, testimonial badges, or fake dashboard widgets in the hero.

### 11.2 Narrative order

1. Outcome and free first action.
2. How the personal route is created.
3. Smart repetition and mistake recovery.
4. Honest readiness and evidence.
5. Topic map and exam simulation.
6. Interactive real question or product proof.
7. One-time access.
8. FAQ and final free action.

### 11.3 Landing visuals

- Use authentic product captures only when they show current shipped UI.
- Use generated imagery only for environmental hero or section photography.
- Never fabricate testimonials or partner logos.
- Blueprint decoration may be stronger on the landing than in the app, but remains below 12% opacity.
- Avoid generic three-card feature rows and decorative marketing cards.

## 12. Motion

```css
--motion-fast: 120ms;
--motion-control: 180ms;
--motion-panel: 240ms;
--motion-enter: 480ms;
--motion-count: 900ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1);
```

- Button hover and press: 120ms to 180ms.
- Accordion and panel expansion: 240ms.
- Page or section entrance: maximum 480ms.
- Readiness count-up: 900ms, once.
- Progress width change: 400ms.
- Scroll animation uses transform and opacity only.
- Maximum animated translation: 24px for entrances, 2px for hover.
- No infinite floating, pulsing, rotating, or glowing decoration.
- The landing marquee may run continuously only when it carries nonessential text and stops under reduced motion.
- Never use JavaScript scroll listeners when CSS or ScrollTrigger already owns the behavior.

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- remove entrance translations;
- show final opacity immediately;
- disable count-up and marquee motion;
- preserve state changes without animation;
- never remove essential progress, status, or focus information.

## 13. Accessibility

- Normal text contrast: at least 4.5:1.
- Large text and UI graphics: at least 3:1.
- Focus ring: 2px with 2px offset; visible on every interactive element.
- Touch targets: at least 44px by 44px.
- Inputs and errors retain explicit labels and `aria-describedby`.
- Status updates use `aria-live` only when the message changes after interaction.
- Progress uses `role="progressbar"` with min, max, and current value.
- Timers use `role="timer"`.
- Dialogs trap focus and return it to the opener.
- Icons never carry meaning without an accessible name or adjacent label.
- Color is never the sole carrier of correctness, mastery, warning, or selection.
- Body text remains at least 16px on mobile.
- Layout must work at 200% zoom without horizontal scrolling.

## 14. Content and Voice

- Default language is Ukrainian.
- Tone is calm, direct, adult, and specific.
- Prefer “наступний крок”, “ще недостатньо даних”, and “повторити сьогодні” over motivational slogans.
- Explain recommendations in one sentence.
- Distinguish official questions from educational explanations.
- Never claim the platform is an official exam system.
- Never guarantee exam success.
- Avoid fear, shame, competitive ranking, urgency, scarcity, and fake social proof.
- Use en dashes or parentheses sparingly; short sentences are preferred in controls.
- Button labels name an action or outcome: “Почати план”, “Практикувати тему”, “Відкрити доступ”.

## 15. Navigation and Information Architecture

The existing route model remains valid:

- **Головна:** readiness, today’s plan, resume state, exam launcher.
- **Навчання:** adaptive review, spaced review, mixed practice, topic practice.
- **Іспит:** exam simulation launcher and active runner.
- **Прогрес:** topic map and confidence calibration.
- **Профіль:** account, preferences, offline data, privacy, and session actions.

Mistakes, saved questions, and history remain secondary destinations within the relevant parent area. Do not add them as top-level tabs.

## 16. Implementation Mapping

The target tokens should replace the current aliases as follows:

| Current token/class | Target |
|---|---|
| `--color-field` | `--color-page` |
| `--color-card` | `--color-surface` |
| `--color-card-tint` | `--color-surface-raised` |
| `--color-ink` | `--color-text-primary` |
| `--color-muted` | `--color-text-secondary` |
| `--color-line` | `--color-border-light` |
| `--color-green-soft` as brand | `--color-pink-500` |
| `--color-green-deep` as link | `--color-graphite-800` |
| `--color-warn` | `--color-error` or `--color-warning` by meaning |
| `.solid` | reading card specification |
| `.glass`, `.glass-e1`, `.glass-e2` | opaque navigation or panel surface |
| `.lens` | graphite intelligence panel |
| `.cta-glass` | primary button |
| `.btn-ghost` | outline button |
| `.opt` | answer option specification |
| `.road` | road progress specification |

### Migration order

1. Add new tokens while preserving current aliases.
2. Map Tailwind theme names to new tokens.
3. Switch display typography from Nunito to Manrope.
4. Restyle shared primitives in `components/ui.tsx`.
5. Replace glass navigation and readiness surfaces with opaque equivalents.
6. Update answer, feedback, and semantic states.
7. Apply blueprint decoration to landing and intelligence surfaces.
8. Remove deprecated glass variables only after all references are gone.

Do not migrate route-by-route with local hex values. Shared primitives and tokens move first.

## 17. Quality Checklist

Before a design change is complete, verify:

- no unapproved colors appear in CSS or Tailwind arbitrary values;
- no routine card radius exceeds 8px;
- every touch target is at least 44px;
- the page has no horizontal overflow at 390px, 768px, 1024px, and 1440px;
- the longest Ukrainian label fits its control;
- primary text and secondary text meet their contrast targets;
- pink buttons use dark text;
- semantic states include icon or text labels;
- focus is visible with keyboard navigation;
- reduced-motion shows the final state without movement;
- dark panels use inverse tokens, not ad hoc white opacity;
- decorative blueprint layers remain below 12% opacity;
- question images preserve aspect ratio;
- the exam runner remains usable at 200% zoom;
- no new top-level navigation item was added;
- pricing contains one price and no dark-pattern copy;
- legal and readiness claims remain honest;
- no fake testimonial, metric, or official affiliation appears.

## 18. Non-Goals

This system does not introduce:

- a global dark mode;
- glassmorphism;
- 3D driving simulation;
- gamified badges, levels, or leaderboards;
- animated decorative mascots;
- a new route hierarchy;
- a generic AI chat interface;
- a government-form visual language;
- a marketing palette dominated by purple.

Graphite panels are deliberate inverse surfaces inside the warm application, not a separate theme.
