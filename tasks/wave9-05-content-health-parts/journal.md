# Task: wave9-05-content-health-parts

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-24
**Last compute:** ClPcs-Mac-mini

## Goal
Spec §D (presentational pieces) — the two small co-located components the content-health table needs, so
the page task (06) is pure wiring. Add `app/admin/content-health/parts.tsx`. PASS = ALL true:

1. `app/admin/content-health/parts.tsx` exists and exports `OptionDistribution` and `FlagBadge`.
2. `OptionDistribution` takes the per-option stat array
   (`{ optionKey: string; picks: number; isCorrect: boolean; pickRate: number }[]`) and renders one bar
   per option whose visual length reflects `pickRate` (the source uses `pickRate` to size a bar, e.g. an
   inline `width` percentage or a Tailwind width) AND visually marks the keyed-correct option (uses
   `isCorrect`). Pick counts/rates are shown as text too (not colour-only).
3. `FlagBadge` takes a flag (`{ kind: string; label: string }` or compatible) and renders the Ukrainian
   `label` text (NOT colour-only — the label text is always present).
4. PRESENTATIONAL ONLY: `parts.tsx` imports NONE of `server-only`, `@/lib/db`, `@prisma/client`,
   `lib/generated` (it takes plain props, so it never pulls in the server/DB layer).
5. `npm run typecheck` exits 0.

## Constraints / decisions
- Take PLAIN prop shapes (not the server module's exported types) so these components stay decoupled and
  typecheck before the page exists; the page (06) maps `getContentHealth()` rows onto these props.
- Ukrainian + mobile-first + a11y: never signal by colour alone (always render the numeric pick rate and
  the flag label text); keyed-correct option marked with a text/symbol cue, not just colour.
- Reuse `@/components/ui` primitives (e.g. `Badge`) where natural; do not duplicate base styling.
- A non-route `parts.tsx` sitting in the route folder is fine (Next only treats `page/layout/route/...`
  specially); the `page.tsx` arrives in task 06.
- Non-Goals: the page itself, the KPI strip, the nav link, any data fetching (all task 06).

## Plan
- [x] Write `app/admin/content-health/parts.tsx` with `OptionDistribution` + `FlagBadge`.
- [x] `npm run typecheck`.

## Done
- [x] Implemented `OptionDistribution` (pickRate-sized bars, isCorrect text+colour cue, pick count/rate text) and `FlagBadge` (Badge reusing `@/components/ui`, always renders Ukrainian label). Plain decoupled prop interfaces; no server/DB imports. verify.sh PASS, typecheck green.

## Next
- [ ] (none — Goal met; task 06 wires getContentHealth() rows onto these props.)

## Artifacts
- `app/admin/content-health/parts.tsx` — presentational bar + flag badge.
- `tasks/wave9-05-content-health-parts/verify.sh` — executable gate.

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-24 ClPcs-Mac-mini: added `app/admin/content-health/parts.tsx` with `OptionDistribution` + `FlagBadge`. Bars sized by `pickRate` inline width%, keyed-correct option marked via `text-go`/`bg-go` + "✓ ключ" text cue (aria-label), pick count+rate shown as text. `FlagBadge` reuses `Badge`/`cx` from `@/components/ui`, maps kind→tone, always renders Ukrainian `label`. Decoupled local prop interfaces (no server-module type imports). verify.sh PASS; typecheck exits 0. Status → done.

## Verify
**Last verify:** PASS (2026-06-23T21:06:17Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T21:07:18Z)
