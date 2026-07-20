# Task: wave12a-06-svitlyk-sprite-component

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §C (Світлик). Port the landing's shared `<symbol id="svitlyk">` (and the `#lg` refraction filter def,
reserved for W12b lenses) into the app shell ONCE, and expose a reusable `<Svitlyk/>` React component that
`<use href="#svitlyk"/>`s it. SOURCE: `/Users/clpc/pdr-landing-site/variant-g.html` (symbol at line ~1183;
`#lg` filter at ~1164). Світлик is LITERAL, sized-up, STATIC in-app (no float animation), with a ground
shadow. He is placed by later tasks ONLY on empty states + the result screen.

PASS = ALL true:

1. `components/svitlyk.tsx` exists and exports:
   - `SvitlykSprite` — renders the inline `<svg>` holding `<symbol id="svitlyk" viewBox="0 0 100 100">…`
     (ported from variant-g.html) plus the `<filter id="lg">…` def; the sprite `<svg>` is visually hidden
     (width/height 0 or `position:absolute;overflow:hidden`) and `aria-hidden`. Mounted ONCE in the shell.
   - `Svitlyk` — a component rendering `<svg …><use href="#svitlyk"/></svg>` with a `size` prop, an inverse
     ground shadow element, `role="img"` + an `aria-label` (Ukrainian, e.g. «Світлик — спокійний помічник»)
     when decorative-off, and NO float/`animation` (static in-app per taste law).
2. `SvitlykSprite` is mounted exactly once in the `(app)` shell (`app/(app)/layout.tsx`) so `#svitlyk` and
   `#lg` are available on every app screen (verify.sh greps `SvitlykSprite` in the layout).
3. The ported symbol keeps the landing's structure markers (verify.sh greps `id="svitlyk"` and `id="lg"`
   in `components/svitlyk.tsx`, and greps `viewBox="0 0 100 100"`).
4. NO in-app float animation on Світлик: `components/svitlyk.tsx` contains no `svFloat`/`animation:` on the
   `<use>`/wrapper (static; the SVG drop-shadow may be present but reduced-motion/phone drops it — that's
   task 13's gate, not here). verify.sh: no `svFloat` and no `animation-name` in the `Svitlyk` render path.
5. `npm run typecheck` exits 0 and `npm run build` exits 0.

## Constraints / decisions
- ONE sprite, `<use>`d everywhere — do not inline the full SVG per placement (bytes + a11y). The landing
  already proved this pattern (`#svitlyk` `<use>`d 4×).
- Static in-app: Danil's taste law forbids a floating scroll companion. Ground shadow OK; float animation
  not. Colors from the doc: slate body `#475a63→#33424a`, lamps coral/amber/green, face on the green lamp.
- `#lg` filter is defined-but-unused this wave (0 lenses shipped, per task 03). Ship the def; apply it to
  nothing.
- Non-Goal: placing Світлик on screens (tasks 11 result/empty do that); reaction-state variants beyond a
  simple static render (W12b). A single calm expression is enough this wave.

## Plan
- [x] Copy `<symbol id="svitlyk">` + `<filter id="lg">` from variant-g.html into `components/svitlyk.tsx`.
- [x] Export `SvitlykSprite` (hidden, mounted once) + `Svitlyk` (`<use>` + ground shadow + aria).
- [x] Mount `SvitlykSprite` in `app/(app)/layout.tsx`.
- [x] typecheck + build.

## Next
- [ ] (none — task complete; driver re-runs verify.sh)

## Artifacts
- `components/svitlyk.tsx` — `SvitlykSprite` (hidden `<defs>`: `#svitlyk` symbol + `#lg`/`#mglow`/`#mbody`) + `Svitlyk` (`<use>` + inverse ground shadow + role/aria, static).
- `app/(app)/layout.tsx` — mounts `<SvitlykSprite/>` once in the shell.

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: ported `<symbol id="svitlyk">` + `#lg`/`#mglow` filter defs + `#mbody` gradient from variant-g.html:1164-1200 into `components/svitlyk.tsx` (JSX-attr conversion: stop-color→stopColor, flood-*→flood*, color-interpolation-filters→colorInterpolationFilters, stroke-*→stroke*, etc.). Dropped the landing's `.mbody`/`.marm`/`.msh` CSS classes so NO float animation binds (static in-app taste law). Added `Svitlyk` component (`<use href="#svitlyk"/>` + inverse radial ground shadow, `size`/`decorative`/`label` props, role="img"+aria-label when not decorative). Mounted `<SvitlykSprite/>` once in `app/(app)/layout.tsx`. typecheck 0, build 0. All verify.sh grep gates satisfied. Status→done.
- 2026-07-02 ClPcs-Mac-mini: FIX verify FAIL — the static-in-app gate `grep -qE 'animation-name|animation:'` false-matched the literal `animation-name` in a DOC COMMENT (line 64: "No float / `animation-name`"); reworded to "No float / motion keyframes". `grep -nE 'svFloat|animation-name|animation:' components/svitlyk.tsx` now clean. Status→done.


## Verify
**Last verify:** PASS (2026-07-02T05:50:38Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:51:28Z)
