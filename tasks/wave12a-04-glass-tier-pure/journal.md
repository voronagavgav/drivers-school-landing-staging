# Task: wave12a-04-glass-tier-pure

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop
**Evaluate:** yes

## Goal
Spec §B. PURE, unit-testable tier resolver `lib/glass-tier.ts` exporting
`resolveGlassTier(signals) → 'real' | 'emulated' | 'solid'`. Signals are INJECTED (no DOM reads) so it is
deterministic and testable. The decision MATRIX + its PRECEDENCE come from `04-design-system.md` §5
(the NAMED external source) — the golden vectors below are frozen from that table BEFORE implementation and
the test must reproduce them exactly (anti-self-grading oracle).

### Signals shape (input)
```ts
type GlassSignals = {
  override: "auto" | "real" | "emulated" | "solid";   // UserSettings.glassTier
  deviceMemory: number;         // GB (navigator.deviceMemory; default 4 when unknown)
  hardwareConcurrency: number;  // logical cores (default 4 when unknown)
  pointerFine: boolean;         // matchMedia('(pointer:fine)')
  saveData: boolean;            // navigator.connection.saveData
  reducedMotion: boolean;       // prefers-reduced-motion: reduce
  reducedTransparency: boolean; // prefers-reduced-transparency: reduce
  contrastMore: boolean;        // prefers-contrast: more
  viewportWidth: number;        // px (phone ≤ 760)
};
```

### Precedence (from §5, exact order — accessibility overrides win over everything)
1. `reducedTransparency === true` OR `contrastMore === true` → `"solid"` (a11y beats even an explicit `real` override).
2. `override === "solid"` → `"solid"`.
3. `override === "emulated"` → `"emulated"`.
4. `override === "real"` → `"real"` (explicit user opt-up forces real even on weak signals).
5. `override === "auto"` → `"real"` IFF ALL of: `deviceMemory >= 8` AND `hardwareConcurrency >= 8` AND
   `pointerFine === true` AND `saveData === false` AND `reducedMotion === false` AND `viewportWidth > 760`;
   otherwise `"emulated"`.

PASS = ALL true:

1. `lib/glass-tier.ts` exists, exports `resolveGlassTier` (function) and the `GlassSignals` type.
2. PURITY: `lib/glass-tier.ts` contains NONE of these tokens anywhere (incl. comments): `server-only`,
   `@/lib/db`, `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date`, `window`,
   `navigator`, `document`, `matchMedia` (signals are injected; no DOM reads in the pure fn).
3. `lib/glass-tier.test.ts` exists, is INCLUDED in the unit suite (`npx vitest list` shows it), and asserts
   ALL of these FROZEN golden vectors (base = `{override:"auto", deviceMemory:16, hardwareConcurrency:8,
   pointerFine:true, saveData:false, reducedMotion:false, reducedTransparency:false, contrastMore:false,
   viewportWidth:1440}` → expected `"real"`; each row overrides base):
   - base → `"real"`
   - `hardwareConcurrency:4` → `"emulated"`
   - `deviceMemory:4` → `"emulated"`
   - `pointerFine:false` → `"emulated"`
   - `saveData:true` → `"emulated"`
   - `reducedMotion:true` → `"emulated"`
   - `viewportWidth:390` → `"emulated"` (phone)
   - `viewportWidth:760` → `"emulated"` (phone boundary: ≤760 is phone)
   - `deviceMemory:8, hardwareConcurrency:8, viewportWidth:761` → `"real"` (capability + phone boundaries)
   - `reducedTransparency:true` → `"solid"`
   - `contrastMore:true` → `"solid"`
   - `override:"real", deviceMemory:4, hardwareConcurrency:2, pointerFine:false, viewportWidth:390` → `"real"`
   - `override:"real", reducedTransparency:true` → `"solid"` (a11y beats explicit real)
   - `override:"emulated", deviceMemory:16, hardwareConcurrency:16, pointerFine:true` → `"emulated"`
   - `override:"emulated", reducedTransparency:true` → `"solid"`
   - `override:"solid", deviceMemory:16, hardwareConcurrency:16` → `"solid"`
4. `npm run typecheck` exits 0.
5. `npm test` exits 0 with ZERO failures.

## Constraints / decisions
- PURE module: NO DOM/navigator/matchMedia reads — the shell (task 05) reads the browser signals and PASSES
  them in. This keeps the matrix unit-testable and deterministic.
- The oracle is `04-design-system.md` §5 + the frozen vectors above; the implementer may NOT edit the vectors
  to match a buggy implementation (that would be self-grading — the whole point of freezing them here).
- Defaults for unknown `deviceMemory`/`hardwareConcurrency` (→ 4) are decided by the SHELL (task 05) when it
  builds the signals; the pure fn trusts its inputs.
- Non-Goal: reading `UserSettings`, setting body classes, DOM detection (all task 05).

## Plan
- [x] Write `lib/glass-tier.ts` (type + resolver per the precedence).
- [x] Write `lib/glass-tier.test.ts` with the 16 frozen vectors.
- [x] typecheck + `npm test` + `npx vitest list` inclusion.

## Next
- [x] Implement `resolveGlassTier` per the 5-step precedence. (done — Goal met)

## Log
- 2026-07-02 laptop: planner scaffolded task; froze the §5 matrix as golden vectors.
- 2026-07-02T08:38Z ClPcs-Mac-mini: wrote `lib/glass-tier.ts` (`GlassSignals` type + `resolveGlassTier`
  per the 5-step §5 precedence, a11y-first) and `lib/glass-tier.test.ts` (16 frozen golden vectors,
  base+override table). typecheck 0, vitest 16/16 pass, `vitest list` includes the file. Purity verified:
  none of the forbidden tokens (incl. `matchMedia` — reworded the pointerFine JSDoc to avoid it). Status→done.

## Artifacts
- lib/glass-tier.ts — pure `resolveGlassTier(signals) → 'real'|'emulated'|'solid'` + `GlassSignals`.
- lib/glass-tier.test.ts — 16 frozen §5 golden vectors.

## Verify
**Last verify:** PASS (2026-07-02T05:38:29Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:39:19Z)
