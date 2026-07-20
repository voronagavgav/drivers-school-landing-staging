# WAVE12A — Surface Inventory (investigation)

Map for the Wave-12a restyle tasks (02–13). All counts below come from real
`grep -rn` over `components/` + `app/` on 2026-07-02. Design source of truth:
`docs/app-plan/04-design-system.md`; spec `specs/wave12a-design-system.md`.

This is a **skin + motion + interaction** port. Nothing here changes data,
routes, the `imageKey → /api/q-image/[key]` resolver, auth, or legal/demo copy.

## Legacy tokens

Old `@theme` (`app/globals.css:8–21`, road-sign **BLUE** theme) → new
04-design-system replacement (§1A tokens). Old theme is fully replaced.

| Old token | Old value | New token / value | Note |
|---|---|---|---|
| `--color-asphalt` | `#1b2430` | `--color-ink #1F2933` (`text-ink`) | primary text; NEVER `#000` |
| `--color-sign` | `#1e5bbf` (blue) | text/icon → `--color-green-deep #226157`; fills → `--color-green-soft #9AD9B8` | brand shifts blue→green |
| `--color-sign-dark` | `#17489a` | `--color-green-ink #173B30` (dark text ON green CTA) | old hover-darken is gone (see CTA rule) |
| `--color-lane` | `#f2b705` | `--color-amber #8A5E0E` (`text-amber`, contrast-safe) | accent only; rating/attention |
| `--color-danger` | `#d7263d` | `--color-warn #B4532E` (`text-warn`) + `--no-fill hsl(16 50% 93%)` | "wrong" = icon+label, never red flood |
| `--color-go` | `#1f9d55` | `--ok-fill hsl(152 46% 90%)` + `--ok-ink #0F3B2E`; text → `--color-green-deep` | correct state |
| `--color-paper` | `#f4f6f9` | `--color-field #FBFAF7` (`bg-field`) | warm off-white page field |
| `--color-card` | `#ffffff` | `--color-card #FCFDFE` (+ `--color-card-tint #F3F7F8`) | near-white reading card |
| `--color-line` | `#e3e7ee` | `--color-line #E1E7EC` | hairline borders (kept, retinted) |
| `--color-muted` | `#59626f` | `--color-muted #46515D` | secondary text (kept, darkened) |
| `--font-display` | Oswald | `Nunito` (`weight:["600","700"]`) | headings/numerals/badges/buttons |
| `--font-sans` | Manrope | `Manrope` kept (`["400","500","700"]`) | body |
| `.road` / `.road-fill` | asphalt+lane gradient bar | replaced by readiness dial / mode-tile styling | remove or repurpose progress bar |

Font wiring lives in `app/layout.tsx:2,12,15` (imports `Oswald`) — task 02 swaps
`Oswald → Nunito`, keeps `Manrope`; `display:"optional"`, subset `latin,cyrillic`.

## Token usages

Legacy Tailwind utilities still in use (count = raw `grep -rEo` occurrences;
files = `grep -rEl`). App-facing surfaces are the wave-12a target; `app/admin/**`
is token-recolor-only (utilities resolve to new values automatically once the
`@theme` block is rewritten, so admin needs no per-file edit beyond that).

| Utility | count | files (deduped) |
|---|---|---|
| `bg-sign` | 15 | components/brand.tsx, components/test-runner.tsx, components/ui.tsx, app/(app)/dashboard/page.tsx, app/(app)/practice/page.tsx, app/admin/admin-nav.tsx, app/admin/content-health/parts.tsx, app/admin/analytics/charts.tsx, app/admin/analytics/page.tsx, app/admin/questions/page.tsx |
| `text-white` | 5 | components/brand.tsx, components/ui.tsx, app/admin/admin-nav.tsx, app/admin/questions/page.tsx |
| `text-asphalt` | 116 | 38 files — all app + admin pages + components/{app-nav,brand,test-runner,account-forms,ui} |
| `bg-paper` | 26 | components/{app-nav,test-runner,ui}, app/(app)/test/[id]/result/page.tsx, app/admin/** |
| `border-line` | 52 | components/{app-nav,test-runner,ui}, app/not-found.tsx, app/(app)/test/[id]/result/page.tsx, app/(app)/onboarding/page.tsx, app/admin/** |
| `text-muted` | 143 | 38 files — app + admin pages + components/{app-nav,auth-forms,account-forms,brand,ui,test-runner} |
| `text-sign` | 21 | components/{app-nav,auth-forms,test-runner,ui}, app/page.tsx, app/(app)/dashboard/page.tsx, app/admin/** |
| `bg-danger` | 13 | components/{auth-forms,test-runner,account-forms,ui}, app/(app)/test/[id]/result/page.tsx, app/admin/** |
| `text-go` | 9 | components/{account-forms,test-runner,ui}, app/(app)/test/[id]/result/page.tsx, app/admin/content-health/parts.tsx, app/admin/questions/questions-table.tsx |
| `bg-lane` | 4 | components/ui.tsx, app/(app)/test/[id]/page.tsx, app/(app)/dashboard/page.tsx |
| `font-display` (Oswald) | 57 | 28 files — components/{brand,test-runner,ui}, app/globals.css, and every app + admin page |
| `.road` / `road-fill` | — | components/brand.tsx, components/test-runner.tsx (lines 221–222), components/ui.tsx, app/globals.css |

Because most utilities (`text-asphalt`, `text-muted`, `bg-paper`, `border-line`,
`font-display`, `text-sign`) simply re-resolve when the `@theme` block is rewritten
(task 02), the bulk of these ~600 occurrences need **no per-file change**. The
tasks that need real edits are the ones changing *structure* or *the green CTA
rule* (buttons/cards/nav/runner) — not a global find-replace.

## text-white-on-fill

The CTA-rule violation sites — `text-white` paired with a filled green/sign/danger
background. Design **HARD RULE** (§2.4): soft green fill + dark `green-ink` text;
**never white on soft green, never harden the green for contrast.** Task 08
(buttons) + task 07 (nav) + task 06 (brand) must fix these:

- `components/ui.tsx:13` — `primary: "bg-sign text-white hover:bg-sign-dark"` → `.cta-glass` (bg `hsl(152 47% 83% /.95)` + `text-green-ink`). **task 08.**
- `components/ui.tsx:15` — `danger: "bg-danger text-white hover:opacity-90"` → warn treatment (peach fill + `text-warn`, icon+label), not a red flood. **task 08.**
- `components/brand.tsx:9` — logo chip `bg-sign text-white` → green-deep/mint chip (svitlyk wordmark). **task 06.**
- `app/admin/admin-nav.tsx:37` — active tab `bg-sign text-white` → recolor with theme (admin, low priority; green pill). token recolor.
- `app/admin/questions/page.tsx:167` — inline `bg-sign … text-white` button → same as admin above. token recolor.

Non-violations (already correct pattern, tinted-fill + colored text): badge
variants in `components/ui.tsx:74–77` (`bg-go/10 text-go`, `bg-danger/10 text-danger`,
`bg-sign/10 text-sign`) — these recolor cleanly with the theme.

## Components

`components/` inventory + restyle need this wave:

- `app-nav.tsx` → **task 07**: rewrite to the **tab capsule** / bottom tab bar (e1 emulated glass, ≤5 targets ≥44×44, active = green-deep pill, `aria-current`, safe-area inset).
- `ui.tsx` → **tasks 08 + 09**: rewrite `BTN_VARIANTS` to the green CTA rule (08); restyle `Card` to opaque `.solid` surface (09); badges already fine.
- `brand.tsx` → **task 06**: Світлик wordmark/sprite — drop `bg-sign text-white` chip, use `<symbol id="svitlyk">` sprite + green-deep wordmark.
- `test-runner.tsx` → **task 10**: restyle question card (opaque `.solid`, never glass) + options (§2.3 states) + `.road` progress → readiness/mode styling; also the q-image miss placeholder (task 11).
- `account-forms.tsx` → token recolor only (uses `text-asphalt`/`text-go`/`bg-danger`).
- `auth-forms.tsx` → token recolor only (`text-sign`/`text-muted`/`bg-danger`).
- `submit-button.tsx` → inherits `ui.tsx` button restyle; token recolor only.
- `analytics-provider.tsx` → no visual surface; no change.

## Screens

`app/(app)/**/page.tsx` routes — treatment THIS wave (all **restyle-in-place**;
NO new reworks — dials, bottom-sheets, toast host, breathing screen are **W12b /
out of scope** for 12a):

- `dashboard/page.tsx` — restyle-in-place (token recolor + mode cards to painted glass-look tiles where trivial). Readiness **dial** = out of scope (W12b).
- `practice/page.tsx` — restyle-in-place (mode tiles + `bg-sign` recolor).
- `mistakes/page.tsx` — restyle-in-place; **task 11** wires `<Svitlyk/>` into the empty branch (existing copy «Помилок немає — гарна робота.»).
- `test/[id]/page.tsx` — hosts the runner; restyle flows from `test-runner.tsx` (task 10) + token recolor.
- `test/[id]/result/page.tsx` — restyle-in-place (token recolor; correct/wrong palette).
- `saved/page.tsx` — restyle-in-place (token recolor).
- `progress/page.tsx` — restyle-in-place (token recolor). Topic-map rework = out of scope (W12b).
- `history/page.tsx` — restyle-in-place (token recolor).
- `account/page.tsx` — restyle-in-place (token recolor). Glass-tier picker UI = out of scope (W12b).
- `onboarding/page.tsx` — restyle-in-place (token recolor).

Out of scope for 12a (W12b / future): bottom-sheet nav, toast host, readiness
dial, topic-map, breathing screen, glass-tier picker UI, `app/admin/**` beyond
automatic token recolor.

## Glass tier plumbing

Confirmed: `UserSettings.glassTier` **already exists** — `prisma/schema.prisma:411`,
`glassTier String @default("auto")` with documented union `auto | real | emulated |
solid` (§5.4). **NO migration and NO `prisma generate` needed** this wave.

A server-side read (task 05) resolves the tier and attaches a `body` class on the
`(app)` shell / root layout: `app/(app)/layout.tsx` (or root `app/layout.tsx`
`<body>`) applies `glass-emu` / `glass-solid` per `resolveGlassTier` (task 04),
with a client tier-detection + idle-freeze script for `"auto"` (04-design-system
§5, tier A/B/C detection: `deviceMemory`/`hardwareConcurrency`/`Save-Data`/coarse
pointer/`prefers-reduced-transparency`). Default `"auto"` → emulated-safe (tier B)
until the client script upgrades to real glass on capable devices.

## q-image miss path

Current behavior — `app/api/q-image/[key]/route.ts`: on a miss (traversal/garbage
key → null candidate, or resolver re-check fail) it returns a plain
`new Response("Not found", { status: 404 })` (lines 33, 41). No placeholder image.

Runner usage — `components/test-runner.tsx:82` computes
`imageSrc = resolveImageSrc({ imageKey, imageUrl })`, then line 227 renders it only
when truthy: `{imageSrc && (<img src={imageSrc} alt="" className="mt-3 max-h-56
rounded-lg border border-line" />)}` (line 229). So a **broken** image (valid
`imageSrc` string but 404 from the route) currently shows the browser's broken-image
glyph — the `{imageSrc && …}` guard only handles the *no-key* case, not a 404.

**Recommendation (task 11): client `onError`** — the SIMPLER option. Add an
`onError` handler on the `<img>` that swaps in a calm placeholder (Світлик "no
image" tile) and a meaningful Ukrainian `alt`, rather than extending the route's
miss path to stream a placeholder binary. Client `onError` keeps the route pure
(still honest 404 for HTTP/caching), needs no new asset endpoint, and localizes the
fallback to the one place it's shown. **Chosen: client `onError`.**
