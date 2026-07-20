# Drivers School — Image Style Spec (LOCKED)

The canonical visual style for **all generated question images and product illustration**.
Evolved from the matte-iso baseline through user-driven refinement (add color → full-bleed → realism,
not clay) and locked on exemplar **`merge_b`**: full-bleed realistic-PBR intersection under warm golden
daylight, shot from an elevated near-orthographic isometric so the whole traffic situation reads in <1s.

Proof exemplars (committed): scene `public/demo-images/proof_scenario.png` (= merge_b,
https://files.catbox.moe/yrleft.png) · object `public/demo-images/proof_hero.png` (= warm_hero,
https://files.catbox.moe/s39bpn.png). Exploration history in `.content-import/style_eval/DECISIONS.md`.

## The recipe
- **Framing** — **full-bleed**, edge-to-edge continuous little world; the scene fills the whole frame with
  NO empty studio margins. (Object-on-studio framing was rejected — it floated and read cold.)
- **Camera** — elevated **isometric / high three-quarter aerial**, looking down ~40°, **near-orthographic**
  (low perspective distortion) so the WHOLE intersection is simultaneously visible and reads at a glance like
  a clean diagram. Keep buildings **low** so nothing occludes the scene. Single objects: gentle eye-level
  three-quarter, centered, on a small grounded patch.
- **Materials** — **REALISTIC physically-based** surfaces: textured asphalt, real grass & foliage, realistic
  car paint with clearcoat, refined building facades with real glass windows. Premium product-visualization
  realism (octane/redshift quality). **NEVER toy / clay / plasticine / low-poly.**
- **Lighting** — **warm golden daylight** from high upper-left, sun kept **fairly high** (short, soft natural
  shadows — NOT a low late-afternoon sun, NOT long dramatic shadows). Warm ~4800K white balance, warm
  cream-gold sky, gentle warm ambient bounce. Sunny and inviting — **NEVER overcast, flat-grey, or cold.**
- **Palette — colorful but calm world.** Green grass verges/landscaping, a small **blue car**, road-sign blue
  `#1e5bbf`, lane amber `#f2b705`, signal green `#1f9d55`, slate `#1b2430` detail. Saturated color reads as
  deliberate accents on warm neutral asphalt — never large oversaturated fields.
- **Composition** — clean and **uncluttered**: a few elements with generous spacing, all non-overlapping and
  simultaneously readable. Intersection centered; calm, never busy.

## Reusable FLUX 2 prompt template
Generate with `node .content-import/gen_demo_image.mjs "<prompt>" <name> max` (FLUX.2 [max], BFL direct,
~$0.07/image, cost-logged to `.content-import/bfl_spend.log`).

```
Photorealistic premium 3D render of {SUBJECT}, filling the entire frame edge to edge as a continuous little
world. STRICT elevated isometric high three-quarter AERIAL view looking down ~40°, near-orthographic
projection with low perspective distortion, the whole scene fully visible and readable at a glance like a
clean top-down-ish diagram, buildings kept low so nothing occludes. Lit by warm GOLDEN sunlight from high
upper-left (sun kept fairly high, NOT a low late-afternoon sun), warm ~4800K white balance, warm cream-gold
sky, gentle warm ambient bounce, short soft natural shadows — sunny golden and inviting, NOT overcast, NOT
flat grey, NOT cold, NOT long dramatic shadows. REALISTIC physically-based materials (textured asphalt, real
grass and foliage, realistic car paint with clearcoat, refined low building facades with real glass windows),
high-end product-visualization realism, NOT toy, NOT clay, NOT plasticine, NOT low-poly. Clean and
uncluttered, a few elements with generous spacing; a small blue car; sparing road-sign blue (#1e5bbf), lane
amber (#f2b705) and signal green (#1f9d55) accents; crisp sharp detail, octane/redshift quality. No rendered
words or letters on signs — use real road-sign pictograms or leave faces blank. 1:1, no watermark.
```

For a SINGLE object (sign / signal / hazard), swap the framing line for: *"centered, gentle eye-level
three-quarter view, on a small grounded patch of realistic asphalt with a hint of grass, warm cream studio
backdrop"* — keep the same warm-golden light + realistic-PBR material rules. (See `proof_hero`.)

## DO
- **Full-bleed** continuous world, edge to edge — no empty studio margins.
- **Elevated near-orthographic iso** — whole situation graspable in <1s; buildings kept low.
- **Realistic PBR** materials everywhere (asphalt/grass/paint/glass); premium product-viz realism.
- **Warm golden daylight**, high sun, short soft shadows; warm cream-gold sky.
- Colorful but calm: green landscaping, blue car, blue/amber signs as **accents**.
- Light the relevant signal lamp (softly emissive).
- **Sign faces: real ПДР pictograms from `public/sign-vectors/` (composite them in), or leave blank** — never
  let FLUX render words (it produces gibberish).

## DON'T
- ✗ Toy / clay / plasticine / low-poly materials (the look we deliberately moved off).
- ✗ Cold / flat-grey / overcast light (drifts back to the rejected `real_clean`).
- ✗ Low cinematic late-afternoon angle with long shadows / tall occluding buildings (`warm_golden`'s flaw).
- ✗ Object-on-studio floating island framing (rejected — sterile, cold).
- ✗ Gibberish/English text on signs ("SLOW"/"AHEAD"/"A1").
- ✗ Busy/cluttered scenes; oversaturated color fields; near-top-down (kills the 3D read); grime/cracks.

## Lineage (documented)
Baseline R1 (matte-iso, neutral gray studio) → +color (warm world) → +full-bleed → +realism (drop clay).
Rejected along the way: gray studio (cold), object-on-studio (floating), clay/toy (`colorful_world` —
charming but not premium), `real_clean` (realistic but cold/flat), `warm_golden` (warm but low cinematic
angle). Winner `merge_b` resolves all four refinements at once.
