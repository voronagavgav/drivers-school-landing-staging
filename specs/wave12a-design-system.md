# Wave 12a — Design-system port: «Спокій · Рідке скло» tokens + component kit + restyle EXISTING surfaces

Port the landing's settled visual identity (G · Liquid Glass) INTO the app per
`docs/app-plan/04-design-system.md` (READ IT FIRST — it is the design source of truth for this wave) and
restyle every EXISTING learner surface with it. NEW surfaces (dashboard rework, plan card, dial-as-hero,
onboarding funnel, adaptive entries) are **Wave 12b — out of scope here**. The result must read as the same
calm product as https://voronagavgav.github.io/pdr-landing-preview/ — bright clean glass, one green accent,
NEVER dark/muddy.

TOKEN SOURCE OF TRUTH: `/Users/clpc/pdr-landing-site/assets/landing.css` (the live landing) — port its
palette/radii/shadow/glass variables into Tailwind v4 `@theme` in `app/globals.css` (this app has NO
tailwind config file; `@theme` IS the config — keep existing token names working or migrate all usages).
TASTE LAW (from the pdr-design skill — violations = automatic evaluator REJECT):
✓ calm pastel field · bright clean glass · ONE green accent · soft-green FILL + DARK slate text on CTAs
  (WCAG 4.5:1 — never white-on-soft-green, never harden the green) · hover/tap light response only
✗ claymorphism · hard/saturated greens · over-colorful backgrounds · dark/gray/muddy glass · periodic/idle
  gloss animation · glass-on-glass · reading content on glass (content stays OPAQUE/solid)

RULES (unchanged; CLAUDE.md is law): pure lib/ vs lib/server split; no schema changes THIS wave;
Ukrainian copy; legal positioning; tests on every change; `npx vitest list` capture-to-var; integration
tests drive production paths; additive/conservative diffs. PERF: the app targets WEAK devices/phones —
`backdrop-filter` is the #1 GPU cost. THREE glass tiers per 04-design-system: real refraction ONLY on ≤2
signature lenses on capable Chromium; **emulated glass everywhere else and on weak/phone/reduced-transparency**
(painted translucent fill + gloss + rim + colored shadow, NO backdrop-filter); solid tier for
reduced-transparency/contrast. Verification note: local headless renders the EMULATED tier faithfully but
NOT real refraction/corner-shape — real-lens verification is the INDEPENDENT post-wave step (e2b Chrome),
so per-task gates must assert tokens/markup/tier-classes, not refraction pixels.

## A. Tokens → Tailwind v4 @theme (`app/globals.css`)
- Port the landing palette (paper/field pastels, glass tint, slate ink scale, the ONE soft green + its
  dark ink pair, amber/coral accents), radius scale (incl. the pill/capsule radii), soft colored shadow
  set (never black), `--calm-ease`, and the glass elevation vars (e1/e2/e3 fill/blur/shadow/rim) as
  documented in 04-design-system.md §tokens. Keep/alias the existing app token names (`--color-sign`,
  `asphalt`, `paper`, `card`, `line`, `muted` …) so EVERY current usage keeps compiling — map them onto
  the new palette values rather than renaming app-wide.
- Global page field: the calm pastel gradient field (STATIC — no drift blobs in the app), light not busy.
- `npm run typecheck` 0; `npm run build` 0; a static grep proves the CTA rule (no `text-white` on any
  green/sign-filled button class).

## B. Glass tier infrastructure
- `components/glass.tsx` (or CSS-first in globals): `.glass-e1/.glass-e2` surfaces implementing the
  EMULATED recipe by default (fill+gloss+rim+shadow, zero backdrop-filter); a `body.glass-real` opt-up
  class adds real `backdrop-filter` frost ONLY for e1/e2 chrome on capable devices; `.lens` reserved for
  the ≤2 signature lenses (W12b's dial hero; none shipped this wave — define the class, ship zero lenses).
- Client tier detector (small, in the app shell): default EMULATED; upgrade to `glass-real` only when
  `deviceMemory>=8 && hardwareConcurrency>=8 && matchMedia('(pointer:fine)')` and no reduced-transparency/
  motion/data; `UserSettings.glassTier` override (auto|real|emulated|solid) read server-side and applied as
  the initial body class (no flash). `prefers-reduced-transparency` → solid tier kills ALL glass incl. real.
- Honor `prefers-reduced-motion`: no count-ups/sweeps/transitions beyond opacity.
- Unit-testable pure helper `lib/glass-tier.ts` (`resolveGlassTier(signals) → 'real'|'emulated'|'solid'`,
  injected signals, unit tests for the matrix incl. overrides).

## C. Component kit (restyle EXISTING components in place — no new screens)
- **App nav → the glass TAB CAPSULE** (the canonical W12 nav, master plan §2): bottom-fixed on phone
  (thumb zone, 5 targets: Головна/Навчання/Іспит(=existing exam start for now)/Прогрес/Профіль mapping to
  EXISTING routes: /dashboard, /practice, exam launcher, /progress, /account; Помилки/Збережені/Історія
  nest under their parent pages via existing links — do NOT create new pages), top capsule on ≥sm
  desktop. e1 emulated glass; active tab = soft-green pill + dark ink; ≥44px targets; aria-current;
  hidden during a running test (`/test/[id]` immersive — keep the existing in-test layout, restyled).
  The old `.nav-scroll` strip + fade hack is REPLACED.
- **Buttons/CTAs** (`components/ui.tsx`): primary = soft-green fill + dark slate text + tap light-sweep
  (`:active` only); secondary = glass-e1 pill; destructive = coral tint + dark ink. 44px min targets.
- **Cards**: reading content stays OPAQUE (`bg-card` solid); chrome/control cards may be glass-e1.
  Question card in the runner: opaque content card, calm rounded, restyled feedback states (soft green /
  soft coral tints + icons — never harsh red flood).
- **Runner visual polish** (existing behavior unchanged): option rows as calm tappable cards (≥44px),
  selected/correct/wrong tints per taste law; Save/Flag become 44px icon-buttons (UX-FINDINGS); the road
  progress bar restyled with the token palette; timer chip restyled (sticky behavior = W12b).
- **Світлик**: shared inline SVG symbol (copy the landing's `#svitlyk`) rendered ONCE in the app shell
  as a reusable `<Svitlyk/>` component; place him ONLY on: empty states (below) + the result screen
  (calm framing) — literal, sized-up, static (no float animation in-app), with ground shadow.
- **Empty & failure states** (per master plan G2, EXISTING screens only): mistakes-empty («Помилок
  немає…» + Світлик, calm), saved-empty, history-empty, dashboard-pre-data (keep current metrics but
  restyled), q-image 404 → calm sign-silhouette placeholder + real alt (extend `/api/q-image` route's
  miss path or the client `<img>` onError — pick the simpler, document), inline «не вдалося зберегти —
  повторити» retry on a failed submitAnswer (client state in test-runner; no offline WAL yet — W13).
- **Toasts/badges/admin**: recolor via tokens only (admin keeps its own top nav; no admin redesign).

## D. A11y + motion floor (existing screens)
- Focus-visible rings on all interactive restyled elements (token color); non-color-only correctness
  signalling in the runner (icons ✓/✗ beside tints); `aria-label`s preserved (the lowercase-CTA aria
  convention from CLAUDE.md stays); contrast: automated check that CTA/text token pairs meet 4.5:1
  (a pure unit test over the literal token hex pairs — parse them from globals.css or mirror constants).
- `prefers-reduced-motion` E2E-verifiable: transitions gated by the media query.

## E. Verification tasks
- Extend `bin/browser-audit.sh` (keep helper style): (a) tab capsule present + `aria-current` set on the
  active tab (dashboard); (b) runner still answers a question (existing 2b stays green); (c) NO
  `text-white`-on-green regression grep as a static gate in verify.sh (not browser).
- Screenshot task (for Danil's review, not a gate): a small script `bin/design-shots.sh` driving
  $DRIVER_BROWSER_CMD (or the playwright global) over login/dashboard/practice/runner/result/mistakes at
  390×844 AND 1440×900 → `/tmp/design-shots/*.png`, run at the END of the wave; verify.sh asserts the
  files exist + are non-trivial size.
- Full-suite gate (final verify task): typecheck 0 · unit 0-fail · db:seed + integration 0-fail · build 0
  · `npm run audit:browser` ALL assertions green over the non-localhost origin · no schema diff.

## Out of scope (W12b+): dashboard rework/single-readiness metric, plan card, dial-as-hero + lenses,
onboarding funnel changes, sticky exam header/thumb bar/swipe/digit keys, confidence UI, Ukrainian client
validation, notifications, PWA. No schema changes. No admin redesign.
