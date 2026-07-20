# Proof-band audit through the `design-taste-frontend` lens — trial run

Date: 2026-07-20. Lens under trial: `.agents/skills/design-taste-frontend/SKILL.md`
(this REPLACES the usual impeccable pass for this run; the point is to compare lenses).
Subject: three proof-band variants of the canonized v36 «Проспект» landing.

- p1 — proof MERGED into the dark photo hero (glass plate, `1 757` primary)
  → `http://localhost:3001/lp/v36/p1`
- p2 — evidence strip of real question illustrations, numbers as captions
  → `http://localhost:3001/lp/v36/p2`
- p3 — one dominant numeral `1 757`, outcome-framed
  → `http://localhost:3001/lp/v36/p3`

Only the PROOF PRESENTATION differs; hero + rest of page are shared. Checked at
1440×900 and 390×844 (real viewport, nav-rail confirmed collapsing at 390).

Hard overrides respected (NOT flagged, per instructions): lucide icons, GSAP over
Motion, «—» тире as correct UA punctuation, real numbers (1 757/986/45/21,5%),
road palette #1E5BD6/#F5B301/#12996B, Rubik/Golos.

---

## 1. Design Read + dial settings (skill §0 / §1)

**Design Read (§0.B):** *Reading this as a consumer app-marketing landing for
Ukrainian learner-drivers, with a playful-but-honest, road-native language,
leaning toward a locked bespoke design system (road palette + Rubik display /
Golos body + real in-app screenshots in phone frames). A trust-first constraint
(official content, legal-honesty voice, «а не демо» register) tempers the
playfulness — so this is NOT a pure Awwwards-playful brief; it sits between
"consumer landing" and "trust-first commerce".*

Mode (§11): **redesign — preserve** (v36 is canonized; this is a narrow A/B of one
region), so dials are read off the existing page, not the greenfield baseline.

**Dials for this brief:**

| Dial | Value | Reasoning |
|---|---|---|
| `DESIGN_VARIANCE` | **6** | Playful pulls up (asymmetric left-set photo hero, overlapping phones), honesty/trust pulls down. The proof zone specifically is a single unified statement, not chaos. Below the 8 baseline. |
| `MOTION_INTENSITY` | **5** (page) / **1** (proof) | Hero has GSAP entrance + ambient bob + pointer bloom (~6). The proof bands are deliberately STATIC — a correct local choice; a proof "fact" should not wobble. |
| `VISUAL_DENSITY` | **3** | Proof is airy: one card, one statement, generous whitespace. Page overall ~4. |

The two dials that matter for judging the proof region are DENSITY=3 (favours the
one-statement treatments) and MOTION=1 (all three correctly ship static proofs, so
the reduced-motion + "motion motivated" boxes are vacuously green for the region).

---

## 2. Per-variant audit

### p1 — proof merged into the hero glass plate

**Verdict (own terms):** the most conceptually ambitious "one fact rides the hero"
idea, executed about as cleanly as the technique allows (the plate supplies its OWN
dark fill so contrast over the photo never depends on a CSS-chain walk). But under
this lens it is the ONLY variant that trips a *hard structural* rule: it turns an
already-overloaded hero into a six-element stack.

Findings, ranked:

1. **HERO STACK DISCIPLINE — violation (§4.7, "max 4 text elements").** The shared
   hero already carries kicker(eyebrow) + h1 + sub + 2 CTAs + availability note.
   p1 adds the proof plate as a **6th** text element. The rule's banned list names
   this exact move: *"trust micro-strip ('Used by...'), pricing teaser ... all of
   those move to dedicated sections directly below the hero."* The proof plate IS a
   trust micro-strip, and p1 puts it inside the hero. This is the single biggest
   lens finding in the whole trial.
2. **HERO FITS VIEWPORT — miss (§4.7).** At 1440 the plate lands ~450–500px down
   (below the CTAs, which are already near the fold). The plate's whole selling
   point is "the fact rides the hero," yet it is not in the initial viewport — you
   scroll to reach it, same as a band below. So the concept's payoff is not
   actually delivered at desktop.
3. **Middle-dot ration — at the limit (§9.F).** The subordinate line `986 з
   ілюстрацією · 45 розділів` uses exactly one `·` (within the "max 1 per line"
   ration — OK). Worth logging only because the shared kicker above it already
   spends two (`ПДР · Категорія B · у твоїй кишені`); the region itself is clean.
4. **Weakest-contrast moment across the three (§4.5 button/contrast intent).** The
   third-tier claim line `Офіційний банк питань 2026` is ~#AFC2E6 on the plate's
   translucent navy over a photo. It passes by eye (text-shadow carries it) but it
   is the lowest-emphasis, lowest-margin text in any of the three proofs.

Strengths under the lens: single dominant figure = correct hierarchy (§4.4/§4.9);
self-supplied ground over a photographic bg is the right way to honour the contrast
intent when a CSS-chain walk is invalid; static (§5, motion-motivated satisfied).

### p2 — evidence strip of real question illustrations

**Verdict (own terms):** the variant most aligned with the skill's *strongest*
content law — §4.8 "landing pages are visual products; show real assets." It leads
with real restyled official illustrations and lets the numbers CONFIRM as captions.
On the skill's image axis this is the textbook-correct proof.

Findings, ranked:

1. **Real-asset-first proof — strength (§4.8).** Real restyled official images, no
   fake-screenshot divs, no hand-rolled SVG, numbers pinned as captions rather than
   floating as tiles. This is exactly what §4.8 asks for and what most AI proof
   bands fail. Net positive.
2. **Horizontal strip = the right "breadth" component (§4.9).** A scroll strip is
   the skill's named alternative to a long grid ("carousel / marquee for
   breadth"). Verified it scrolls WITHIN itself (scrollWidth 1936 > clientWidth 314
   at 390), never overflowing the document — satisfies §3.E responsive discipline.
3. **Missing desktop scroll affordance — minor (polish).** At 1440 the strip shows
   ~4½ tiles with the last one hard-clipped at the right edge and NO fade/arrow cue
   (the shared nav-rail uses a `mask-image` fade for exactly this; the p2 strip does
   not). The clipped tile can read as "cut / broken" rather than "scrollable." One
   fade mask fixes it.
4. **Copy honesty — strength (§4.9 copy self-audit).** `Кілька справжніх
   ілюстрацій...` and the caption are carefully scoped ("a few, such as these"),
   never implying the shown handful IS the 986 or that restyle coverage is total.
   Clean.
5. **No pills/credits on the images (§9.F).** Images speak alone; caption sits
   OUTSIDE/below. Avoids the "Plate · Brand" overlay Tell. Strength.

### p3 — one dominant numeral, outcome-framed

**Verdict (own terms):** the purest hit on the skill's central anti-slop thesis —
"one number at headline weight beats a row of co-equal stat tiles." Cleanest
typographic hierarchy of the three, zero structural violations.

Findings, ranked:

1. **Hierarchy — strength (§4.4/§4.9).** One display numeral (blue-700, ~8.6rem)
   with everything else demoted to quiet prose. This is the exact opposite of the
   "stat-tile dashboard" the skill (and the old lens) bans. Textbook.
2. **Outcome-framed copy — strength (§4.9).** `Стільки офіційних питань ... може
   випасти тобі на іспиті` → `Рівно стільки. Усі вони — тут, у тебе в кишені.`
   reads natural and honest, frames the number as the reader's own exam surface
   rather than a brag. Passes copy self-audit.
3. **Decorative status dot on the chip — Tell (§9.F).** The green `.dot` before the
   `Офіційний банк питань 2026` chip is a decorative status dot; §9.F/§9.G ration
   these to real semantic state only. Shared with p2 (both reuse the `.chip`
   primitive). Small, but it is a genuine skill finding.
4. **Chip ↔ lead redundancy — minor.** The chip label `Офіційний банк питань 2026`
   is immediately restated by the lead (`Стільки офіційних питань...`) and again by
   the claim line (`Справжній офіційний банк`). Three "official bank" beats in one
   short band; the chip could go (the headline alone categorises the section — the
   skill's preferred move under EYEBROW RESTRAINT).

---

## 3. Comparative ranking (this lens)

1. **p3** — best. Purest expression of the skill's core thesis (one number >
   tile row), cleanest hierarchy, no structural rule broken, honest/static. Its
   only findings are cosmetic (a decorative dot, a redundant chip).
2. **p2** — strong and most on-brief for §4.8 (real assets AS the proof); loses to
   p3 only on added moving parts (a scroll component whose desktop clip lacks an
   affordance) and the same shared decorative-dot chip.
3. **p1** — most ambitious, but the only variant that violates a HARD rule (hero
   stack discipline) and whose concept (proof in the hero) is undercut by
   hero-fits-viewport (the plate is below the fold anyway). Best-executed *version*
   of a move the lens says not to make.

Note the tension worth surfacing to Danil: p1 exists BECAUSE he asked for the proof
to ride the hero. This lens's verdict is precisely that that instinct fights the
hero-discipline rules — a useful, specific disagreement rather than a vague "meh."

---

## 4. META — lens comparison (the point of the trial)

### 4.a Findings the OLD lens (generic anti-slop bans) would ALSO have caught

- **p3's win / "not a stat dashboard."** Our standing "no stat-tile dashboards" ban
  already rewards one-number-over-tiles and would have flagged any co-equal tile
  row. Full overlap.
- **p2's real-asset strength.** "Real assets only" is already a house law; the old
  lens praises p2's real illustrations identically.
- **p1's over-photo contrast.** "Contrast floors" already puts eyes on the plate's
  faint third-tier line. Overlap.
- **Decorative green dot.** Adjacent to the old "no eyebrows" reflex, though the old
  lens states it less precisely than §9.F does.

### 4.b NEW value this skill added (old lens would likely MISS)

- **HERO STACK DISCIPLINE as a mechanical cap (max 4 text elements; tagline/trust-
  strip below CTAs banned).** This is the trial's biggest payoff: it names *exactly*
  why p1's "merge proof into hero" is risky (a 6-element hero) and reframes the
  whole p1-vs-band decision. A generic "no dashboard / real assets / contrast"
  checklist has no rule that fires here.
- **HERO FITS VIEWPORT** — the observation that p1's proof is below the fold anyway,
  so the concept doesn't pay off. New, and decisive for the ranking.
- **Middle-dot rationing (§9.F, ≤1 per line)** — gives a countable handle on the
  `·` separators; the old lens never counted dots.
- **The DESIGN READ + DIALS scaffold** — forcing an explicit DENSITY/MOTION target
  for a *proof zone* is structure the old lens doesn't provide, and it's what makes
  "all three correctly ship static proofs" a clean, reasoned pass rather than a
  gut call.
- **§4.9 "breadth needs the right component"** — validated p2's scroll strip as a
  deliberate, correct pattern (and pinpointed the missing fade), instead of just
  "carousel, sure."

### 4.c Skill rules that MISFIRED / were noise for THIS brief

- **§9.G EM-DASH BAN — biggest misfire.** Fires on every «—» in the copy
  (`повторити — з твоїх`, `986 питань — з ілюстрацією`, `Усі вони — тут`), all of
  which are correct Ukrainian тире. Left unchecked, this rule alone would generate
  three false "Pre-Flight Fail"s. A non-English brief breaks this rule's core
  assumption.
- **§4.9 fake-precise numbers** — would eye 21,5% / 986 / 45 as "AI spec
  aesthetics"; every one is real DB/official data. Misfire (override).
- **§3.C icons ("discouraged: lucide-react", one-family-Phosphor)** and **§3.A/§5
  "use Motion, never mix GSAP"** — moot against the locked lucide+GSAP identity.
- **§6.C / §8 DARK MODE mandatory + "test both modes"** — this is a single locked
  LIGHT brand theme with intentional dark hero/footer color-blocks; the "dual-mode
  by default" mandate doesn't apply to a brand-locked marketing page.
- **§4.11 THEME LOCK — needs human judgment, near-misfire.** A naive read flags the
  dark hero → light proof → dark footer → dark paid-pricing card as "walking into a
  different website mid-scroll." Here it is the established color-block identity
  (§4.11's sanctioned exception), not drift. The rule would false-flag without the
  override context.
- **§2.A "reach for an official design system" + §4.8 "image-gen tool / picsum
  first"** — both push toward generic/borrowed material; this brief is a deliberately
  bespoke system with real official imagery. Misfire.
- **§4.3 ANTI-CENTER BIAS (avoid centered when variance>4)** — would nudge the
  centered proof cards off-center; but a single-statement proof is exactly §4.3's
  own "centered OK for a single-message" override. Soft misfire.

### 4.d One-line trial takeaway

The taste lens earned its keep on ONE finding the old lens structurally cannot make
— **hero stack discipline**, which reframes the entire p1 decision — plus a cleaner
scaffold (Design Read + dials) for judging a proof zone. Its cost is a cluster of
rules (em-dash ban, dark-mode mandate, icon/animation defaults, fake-precise
numbers, official-system reach) that MISFIRE on a Ukrainian, brand-locked,
real-asset brief and must be suppressed by the override list every time. Net: keep
it for the structural/hero/hierarchy rules; the anti-Tell + a11y half overlaps what
we already enforce, and its typographic/i18n defaults are actively wrong here.
