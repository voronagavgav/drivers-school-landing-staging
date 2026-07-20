# FINDINGS — lp-proof-01: the v36 proof band, ground truth for recompose (lp-proof-02) + browser-verify (lp-proof-03)

Investigation only — no source touched. This file is the readable deliverable; every
anchor below is a factual answer with pasted evidence, so the evaluator confirms by
READING, not by running anything.

---

## a. Current proof-band MARKUP — `app/lp/v36/_body.tsx`

The JSX lives inside `<main id="main">` immediately after the swappable hero slot,
at **lines 760–779** (`{/* ── PROOF BAND ── */}` … closing `</div>`). The
`c.proof.stats.map` loop is at **lines 770–776**. Verbatim:

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
    <div className="proof-grid">
      {c.proof.stats.map((s) => (
        <div className="proof-cell" key={s.label}>
          <div className="proof-val num">{s.value}</div>
          <div className="proof-lab">{s.label}</div>
          <div className="proof-sub">{s.sub}</div>
        </div>
      ))}
    </div>
  </div>
</div>
```

Class inventory (all seven present): **`proof-card`**, **`proof-top`**,
**`proof-grid`**, **`proof-cell`**, **`proof-val`**, **`proof-lab`**, **`proof-sub`**
(plus the outer wrapper `proof` and the shared `chip`/`dot`/`num`/`reveal` utility
classes).

Their CSS lives in the same file's `STYLES` string under `/* ── PROOF BAND ── */`
at **lines 189–200**, with responsive overrides for the band at **lines 416–419**
(≤620px: `proof-grid` becomes one column, the `proof-cell + proof-cell::before`
vertical divider hides, cells gain a top hairline). Key rules:
- `.proof-grid` = `grid-template-columns:repeat(3,1fr);gap:14px;` (a fixed 3-up grid).
- `.proof-cell + .proof-cell::before` draws the vertical `var(--line-soft)` divider
  between the three cells.
- `.proof-val` = display font, `clamp(2rem,5vw,3rem)`, weight 800, color `--blue-700`.

**Consequence for lp-proof-02:** the markup is HARD-CODED to exactly three cells via
`grid-template-columns:repeat(3,1fr)` and the `stats.map` — a "one unified
typographic statement" recompose must reshape BOTH the `proof-grid`/`proof-cell` CSS
and this JSX loop together, or reshape `proof.stats` and let the map follow.

---

## b. Current proof COPY-KEY shape — `app/lp/v36/copy.ts`

The `proof` key is at **lines 68–77**. Verbatim:

```ts
// ── PROOF BAND (real numbers as friendly badges — no fake press) ────────────
proof: {
  chip: `Офіційний банк питань ${YEAR}`,
  lead: "Справжній банк, а не демо:",
  stats: [
    { value: BANK_B_FMT, label: "офіційних питань", sub: "категорія B" },
    { value: IMG_FMT, label: "питань із зображеннями", sub: "з ілюстраціями до відповіді" },
    { value: String(SECTIONS), label: "розділів у банку", sub: "усі теми категорії" },
  ],
},
```

Shape = `{ chip: string; lead: string; stats: { value, label, sub }[3] }`.
**Note:** `lead` ("Справжній банк, а не демо:") is defined in copy but is **NOT
rendered** by the current `_body.tsx` markup (a. above renders only `chip` + the
three `stats`) — a recompose may surface it or drop it.

The three number constants it sources (declared at **copy.ts lines 20–24**, all REAL,
extracted from `prisma/dev.db`, hard-coded — the landing is DB-free at runtime):

| constant      | value       | line | note |
|---------------|-------------|------|------|
| `BANK_B_FMT`  | `"1 757"`   | 21   | thin-space grouping of `BANK_B = 1757`; cat-B question count |
| `IMG_FMT`     | `"986"`     | 23   | `IMG_COUNT = 986`; questions with images |
| `SECTIONS`    | `45`        | 24   | numeric; rendered via `String(SECTIONS)` → `"45"` |

Provenance comment (copy.ts lines 10–15): `SELECT COUNT(*) … JOIN _QuestionCategories
qc ON qc.B=q.id WHERE qc.A='<cat B id>' AND isPublished AND isActive AND archivedAt
IS NULL`. **lp-proof-02 must keep these three figures verbatim** (spec §"values stay
verbatim").

---

## c. EVERY consumer of the v36 `proof` copy key outside `_body.tsx` — finding: **NONE**

Each `app/lp/v*` landing owns a SEPARATE `copy.ts` with its OWN `proof` key, consumed
only by its OWN `page.tsx`. **v6 and v8 (named in the spec/verify) have their own
independent `copy.ts` files** — reshaping v36's `proof.stats` cannot affect them.

Evidence — v6/v8 have their own copy files (own inode, own mtime):
```
$ ls -la app/lp/v6/copy.ts app/lp/v8/copy.ts
-rw-r--r-- 1 clpc staff 13357 Jul 16 16:01 app/lp/v6/copy.ts
-rw-r--r-- 1 clpc staff 13635 Jul 16 16:53 app/lp/v8/copy.ts
```

Evidence — nothing imports v36's copy across module boundaries:
```
$ grep -rn "v36/copy" app --include="*.tsx" --include="*.ts"
(no cross imports)
```

Evidence — every other `proof:` / `copy.proof.*` match is inside a DIFFERENT version's
own directory (each `vN/page.tsx` reads its sibling `vN/copy.ts`), e.g. `v6/page.tsx`
reads `v6/copy.ts`, `v8/page.tsx` reads `v8/copy.ts`, likewise v2/v3/v7/v26/v27/v29/
v30/v34/v35. The v36 `proof` key is referenced by exactly ONE file:
```
$ grep -rn "\.proof\.\|proof\.stats\|proof:" app/lp --include="*.tsx" --include="*.ts" | grep -v "app/lp/v36/_body.tsx"
app/lp/v6/copy.ts:168:  proof: {
app/lp/v8/copy.ts:170:  proof: {
app/lp/v6/page.tsx:748:          <Heading title={copy.proof.title} keyWord={copy.proof.key} />
app/lp/v6/page.tsx:752:            {copy.proof.stats.map((s) => (
app/lp/v7/copy.ts:145:  proof: {
app/lp/v8/page.tsx:927:          {copy.proof.stats.map((s) => (
app/lp/v7/page.tsx:568:            {copy.proof.stats.map((s, i) => (
app/lp/v36/copy.ts:69:  proof: {           ← the ONLY v36 hit; consumed only by v36/_body.tsx:770
app/lp/v30/copy.ts:75:  proof: {
app/lp/v2/copy.ts:148:  proof: {
app/lp/v3/copy.ts:135:  proof: {
app/lp/v29/page.tsx:788:            {copy.proof.stats.map((s, i) => (
app/lp/v27/copy.ts:252:  proof: {
app/lp/v26/copy.ts:247:  proof: {
app/lp/v35/page.tsx:509:            {C.proof.stats.map((s) => (
app/lp/v34/page.tsx:430:                {COPY.proof.stats.map((s) => (
… (all other matches are each version reading ITS OWN sibling copy.ts)
```
Only `app/lp/v36/copy.ts:69` is v36's; its single consumer is `app/lp/v36/_body.tsx:770`
(`c.proof.stats.map`, where `c = COPY` from `./copy`). Note the v6/v8/v7/etc. proof
SHAPES differ from v36's anyway (v6 has `title`/`key`/`freshness`/`body`; v7/v8 have
`heading`/`badge`/`note`), further proving they are independent.

**⇒ Reshaping v36's `proof.stats` (or the whole `proof` key) is SAFE — no external
consumer, no shared type.**

---

## d. `scripts/funnel-donot-guard.sh` — does it scan the v36 landing? finding: **NO**

The guard scans ONLY the wave-17 app-funnel surfaces listed in its `FUNNEL_FILES`
array (`scripts/funnel-donot-guard.sh` lines 35–46). It does **not** reference
`app/lp/v36/_body.tsx` or ANY `app/lp/**` landing file. Verbatim `FUNNEL_FILES`:

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

The guard is a repo-wide dark-pattern compliance gate over the app funnel (offer/save/
a2hs/calm-ritual/segment/pricing/checkout + the `app/actions/test.ts` freemium-inversion
check). **⇒ If AC3 of the recompose requires `guard:funnel` green, that is a GLOBAL
always-green regression check, NOT a check of the proof band's own copy** — the proof
band is out of the guard's scope entirely, so it stays green regardless of how
lp-proof-02 reshapes the band (as long as no wave-17 funnel surface regresses).

---

## e. Served route + reachable ORIGIN for the browser check

- **Route:** `app/lp/v36/page.tsx` → path **`/lp/v36`**. The page (verbatim) renders
  `<V36Body hero={<HeroProspekt />} navDark />` — the proof band is inside `V36Body`.
- **PUBLIC unauth route:** it is under `app/lp/` (NOT the `(app)` shell), so **no
  login is needed** and there is **no service-worker relevance** (SW only registers on
  a secure context; irrelevant here — this is a plain public marketing page). No
  `requireUser`/`requireContentManager` on the path.
- **Origins to use (lp-proof-03):**
  - Spec-stated dev origin (spec §4, `specs/lp-proof-band.md:52`): **`http://localhost:3001/lp/v36`**.
  - Repo LAN convention (default `ORIGIN` in `bin/design-shots.sh:21` and
    `bin/browser-audit.sh:23`): **`http://100.110.64.90:3100`** → `/lp/v36`.
  - Both scripts take `ORIGIN` as `$1` (`ORIGIN="${1:-http://100.110.64.90:3100}"`),
    so lp-proof-03 can point at whichever server is actually running; the served path
    is `/lp/v36` on either.

---

## f. Browser-driver invocation convention (cite `bin/design-shots.sh` `shot()` + `bin/browser-audit.sh`)

Both scripts resolve the driver as `AB="${DRIVER_BROWSER_CMD:-agent-browser}"`
(`design-shots.sh:22`, `browser-audit.sh:24`). The viewport-then-measure convention
from `design-shots.sh` `shot()` (lines 39–45):

```bash
# `set viewport` on a cold start / across navigations silently didn't stick, so desktop layouts
"$AB" set viewport "$W" "$H" >/dev/null 2>&1
sleep 0.4   # give responsive layout a beat to recompute at the new width
got="$("$AB" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
```

So the canonical measurement sequence is:
1. `"$DRIVER_BROWSER_CMD" set viewport W H` — set the width/height.
2. `sleep 0.4` — let responsive layout recompute.
3. re-assert with `"$DRIVER_BROWSER_CMD" eval 'window.innerWidth'` (pipe through
   `tr -dc '0-9'`) to confirm the viewport actually stuck before trusting a shot/measure.
4. All DOM measurements go through `"$DRIVER_BROWSER_CMD" eval '<js>'` (e.g.
   `document.querySelector('.proof-grid').getBoundingClientRect()`), NOT `get text`
   — per root CLAUDE.md, `get text` applies CSS `text-transform`/inserts SSR comment
   nodes, so measurements + text asserts should use `eval` + `textContent`.

`bin/browser-audit.sh` shares the same `AB`/`ORIGIN` helper style and a
server-reachability preflight (`say "server not reachable at $ORIGIN … npm run start
on :3100"`, line 177) — lp-proof-03 should mirror that preflight before measuring.

---

## AC2 — this task touched no source

Deliverable is this single `FINDINGS.md` under `tasks/lp-proof-01-investigate/`; no
`.tsx`/`.ts`/`.css` edited. `verify.sh` asserts `git status --porcelain -- app lib
components scripts bin` is empty.
