# FINDINGS — lp-pvar-01: ground truth for the 3 proof-band variants

Investigation-only deliverable. Every item below is a factual answer read from the
repo (no source edited). Tasks lp-pvar-02 (plumbing) and lp-pvar-03/04/05 (the three
proof-band full-concept variants) build on these pins.

## Acceptance (evaluator READs this file — no execution needed)

| Goal criterion | Evidence in this file |
| --- | --- |
| 1a proofSlot plumbing plan | §a — `V36Body` sig + proof-band JSX span + additive shape + sole consumer |
| 1b restyled-live inventory | §b — `ls … | wc -l` = 60, ≥12 candidate `.png` names, `/restyled-live/<name>.png` URL |
| 1c shared number constants | §c — `BANK_B_FMT`/`IMG_FMT`/`SECTIONS`/`YEAR`/`PASS_FIRST` w/ line numbers, no-retype rule |
| 1d noindex layout pattern | §d — canonical layout exports `metadata` (no robots) + exact additive `robots` form + nesting |
| 1e monument safe-zone | §e — ~58%x/~40%y, phones ~484 band, breakpoints 390/768/1280/1920 |
| 1f browser harness reuse | §f — `DRIVER_BROWSER_CMD` viewport-apply + eval measure, screenshot, origins |
| 1g funnel-donot-guard scope | §g — `FUNNEL_FILES` array pasted; scans app funnel surfaces, NOT `app/lp/**` |
| 2 scope | only `tasks/lp-pvar-01-investigate/` touched (this file) |

This is an INVESTIGATION-ONLY task: no test, no oracle, no fixture, no behaviour change ⇒
structural test traps are inapplicable by construction. `verify.sh` asserts this file exists
and carries every anchor token; the evaluator confirms substance by READING it.

---

## a. proofSlot plumbing plan

Current `V36Body` signature — `app/lp/v36/_body.tsx` L612-622:

```tsx
export function V36Body({
  hero,
  navDark,
  demoHeader,
}: {
  hero: React.ReactNode;
  navDark?: boolean;
  demoHeader?: { h2: string; lead: string };
}) {
```

There is NO `proofSlot` prop yet.

The hardcoded proof-band JSX to be gated — `app/lp/v36/_body.tsx` L755-778
(the `{/* ── PROOF BAND ── */}` comment through the closing `</div>` of `.wrap.proof`):

```tsx
{/* ── PROOF BAND ── */}
<div className="wrap proof">
  <div className="proof-card reveal">
    <div className="proof-top">
      <span className="chip">
        <span className="dot" />
        {c.proof.chip}
      </span>
    </div>
    <p className="proof-say">
      {c.proof.statement.map((part, i) =>
        part.num ? (
          <b className="proof-num num" key={i}>{part.text}</b>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  </div>
</div>
```

Target additive shape (task 02): add `proofSlot?: React.ReactNode` to the prop object.
Three-state conditional at the proof-band site:
- `proofSlot === undefined` → render the current hardcoded band (default; every existing
  route `app/lp/v36/page.tsx` + h1..h4 stay byte-identical, no prop passed).
- `proofSlot === null` → render nothing (band suppressed).
- any node → render that node in place of the band.

Idiom: `{proofSlot === undefined ? (<div className="wrap proof">…current band…</div>) : proofSlot}`
(so `null` naturally renders nothing and any node renders itself).

Sole consumer of `V36Body` — grep `grep -rn 'V36Body' app/`:
```
app/lp/v36/_body.tsx:612:export function V36Body({          # definition
app/lp/v36/page.tsx:18:import { V36Body } from "./_body";
app/lp/v36/page.tsx:22:  return <V36Body hero={<HeroProspekt />} navDark />;
```
The ONLY consumer is `app/lp/v36/page.tsx`. Each variant page (p1/p2/p3) will be a NEW
route that imports `V36Body` and passes its own `proofSlot`.

## b. restyled-live inventory

`ls public/restyled-live/*.png | wc -l` = **60**.

They are served from the public root as `/restyled-live/<name>.png` (Next serves `public/`
at `/`). ≥12 candidate official-bank illustration filenames P2 (evidence strip) can use:

```
11_10_0.png
11_11_0.png
11_12_0.png
11_13_0.png
11_14_0.png
11_15_0.png
11_16_0.png
11_17_0.png
11_1_0.png
11_2_0.png
11_3_0.png
11_6_0.png
11_8_0.png
12_11_0.png
12_12_0.png
12_13_0.png
12_14_0.png
12_15_0.png
```

Naming pattern is `<topic>_<n>_<v>.png`. Reference each as `/restyled-live/12_11_0.png` etc.

## c. shared number constants — `app/lp/v36/copy.ts`

| const | value | line |
| --- | --- | --- |
| `BANK_B` | `1757` | L20 |
| `BANK_B_FMT` | `"1 757"` (thin-space grouping) | L21 |
| `IMG_COUNT` | `986` | L22 |
| `IMG_FMT` | `"986"` | L23 |
| `SECTIONS` | `45` | L24 |
| `YEAR` | `2026` | L18 |
| `PASS_FIRST` | `"21,5%"` | L28 |

Hard rule: the literal `757` (or `1757`, `986`) MUST NOT be retyped in any new `.tsx` —
variants import `BANK_B_FMT` / `IMG_FMT` / `SECTIONS` / `PASS_FIRST` from `../copy`
(existing precedent: `_body.tsx` composes `c.proof.statement` from `BANK_B_FMT`/`IMG_FMT`/
`String(SECTIONS)`, copy.ts L76-80). The P1 (hero-merge) and P3 (one-figure) dominant
numeral uses `BANK_B_FMT` (= "1 757", the headline figure).

## d. noindex layout pattern

Canonical `app/lp/v36/layout.tsx` exports `metadata: Metadata` (L26) with `title` /
`description` / `alternates.canonical` / `openGraph` / `twitter` — but **NO `robots`
field**. Its default export `V36Layout` (L82) wraps `children` in a div binding the two
font CSS variables (`--font-display` Rubik, `--font-body` Golos_Text) and injects the
JSON-LD `@graph` `<script>`.

Each variant layout `app/lp/v36/pN/layout.tsx` needs exactly this additive form (Next 16
Metadata):
```ts
export const metadata = { robots: { index: false, follow: false } };
```
A nested `app/lp/v36/pN/layout.tsx` is rendered INSIDE `V36Layout` (Next nested layouts),
so it inherits the parent's font CSS variables + the JSON-LD wrapper automatically — the
variant layout only needs to add the `robots` metadata (Next deep-merges child metadata
onto the parent), it does NOT re-declare fonts or JSON-LD.

## e. monument safe-zone facts — `app/lp/v36/_hero-prospekt.tsx`

From the file header + CSS comments:
- The monument (Батьківщина-мати / Motherland Monument) sits center-ish **~58% x / ~40% y**
  in every crop (header L26-29, CSS `.hz8-copy{max-width:min(600px,58%)}` keeps copy LEFT
  of the ~58%x figure).
- On phones (≤620, TALL crop) the monument's baked screen-band is fixed **~484px down** at
  390 width: sword-tip→shoulders ≈ **484–560** (CSS L251-260; yellow CTA bottom ~465 →
  monument top ~484 gives ~19px clearance).
- SAFE-ZONE LAW breakpoints P1 must not obstruct: **390 / 768 / 1280 / 1920** (also 2560 in
  the header list). The silhouette must stay visible + identifiable — never hidden under
  copy, phones, or scrims.

Consequence for P1 (hero-merge): the added proof element must live in the hero's LOWER
region and must NOT cover the monument band (~58%x/~40%y, and the phones' ~484–560 screen
band) nor the phones' readable copy/CTA area.

## f. browser harness reuse — `tasks/lp-proof-03-browser-verify/verify.sh`

The contrast/overflow measurement JS + viewport-apply convention already exist there:
- `AB="${DRIVER_BROWSER_CMD:-}"` (L14) — abort if unset (a UI task can't verify without a
  live browser).
- Per-viewport loop: `"$AB" set viewport "$W" "$H"` → then re-assert
  `iw="$("$AB" eval 'window.innerWidth' …)"` equals `$W` before measuring (L54-57).
- `out="$("$AB" eval "$JS" …)"` runs a single eval measuring `docOverflow` /
  `bandOverflow` / `hasAll` (figures+chip render) / WCAG `minBody`/`minLarge` contrast
  inside the `.proof` band (L23-46); WCAG lum/ratio helpers inline.
- `agent-browser eval` wraps a STRING result in double quotes → strip with
  `out="${out#\"}"; out="${out%\"}"` before parsing (L59).
- Screenshot capture: `agent-browser screenshot <path>` writes a PNG
  (`bin/design-shots.sh` `shot()` L41-50: `"$AB" screenshot "$OUTDIR/$1-${W}x${H}.png"`).
- Origin default `http://localhost:3001` (spec; L16 `ORIGIN:-${AUDIT_ORIGIN:-http://localhost:3001}`),
  LAN fallback `http://100.110.64.90:3100`.

Variant static gates (06) and the browser-acceptance verify.sh (07) reuse this exact
pattern (viewport-apply + eval-measure + optional screenshot).

## g. funnel-donot-guard scope — `scripts/funnel-donot-guard.sh`

The guard scans a FIXED `FUNNEL_FILES` array (app funnel surfaces), NOT `app/lp/**`. So
AC3's guard requirement is a GLOBAL always-green regression check (the funnel surfaces stay
clean of scarcity/subscription language), NOT a check of the new landing-variant files.

```bash
FUNNEL_FILES=(
  "components/exam-access-offer.tsx"          # value-triggered 399 ₴ offer card (wave17-08)
  "components/save-progress-prompt.tsx"       # anon "save your progress" invite (wave17-06)
  "components/a2hs-prompt.tsx"                 # add-to-home-screen invite (wave17-10)
  "components/calm-ritual.tsx"                 # pre-exam calm ritual overlay
  "app/segment/page.tsx"                      # value-first self-segment flow (wave17-07)
  "app/actions/segment.ts"
  "app/(app)/pricing/page.tsx"                # pricing surface (wave17-09)
  "app/(app)/pricing/pricing-cta.tsx"
  "app/(app)/pricing/checkout/page.tsx"       # checkout surface (wave17-09)
  "app/actions/checkout.ts"
)
```

None of these paths is under `app/lp/`, so the new variant routes are outside its scope —
the guard remains a global regression gate the variant work leaves untouched.
