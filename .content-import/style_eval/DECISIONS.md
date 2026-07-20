# Image-style decision state (resume note)

> **RESOLVED 2026-06-19 — style LOCKED on exemplar `merge_b`.** All open refinements settled:
> color-the-world ✅, full-bleed ✅ (beat object-on-studio), realism-not-clay ✅, warm golden daylight ✅.
> Canonical spec rewritten in `/STYLE.md`; proof exemplars swapped (proof_scenario=merge_b https://files.catbox.moe/yrleft.png,
> proof_hero=warm_hero https://files.catbox.moe/s39bpn.png). The notes below are the historical trail.

Self-contained handoff so a FRESH session can continue without the long exploration transcript.

## Where we landed
Locked direction: **premium Apple-keynote 3D · matte soft-touch · elevated isometric · instantly readable.**
Full spec in `/STYLE.md` (recipe R1, chosen by a unanimous 3-judge panel; see `style_eval/panel_result.json`).

User refinements ON TOP of the locked spec:
1. **Add color — less gray.** Winning approach = keep the matte-iso recipe but use a **soft warm off-white/cream
   background** (NOT cold gray, NOT pure white) and **color the world**: brand-blue car, green landscaping/grass
   on the corners, blue + amber sign faces. (Tinted blue/mint backgrounds were rejected — they compete with the
   blue accent / go mono-hue.) Reference: `color_colorful_world` → https://files.catbox.moe/fyn2ix.png
2. **Full-bleed framing question (OPEN).** User asked for the scene to fill the whole frame (no empty studio
   margins). Samples to decide between:
   - object-on-soft-studio (calmer, more "product"): proof_scenario https://files.catbox.moe/87ignd.png
   - full-bleed world: https://files.catbox.moe/ib6itb.png
   - full-bleed city block: https://files.catbox.moe/fqss77.png

## OPEN micro-decisions for the user
- Framing: **full-bleed scene** vs **object-on-soft-studio**.
- Background: soft **cream/warm** (recommended) vs neutral gray (current STYLE.md).

## Once decided → finalize
1. Update `/STYLE.md`: set background = soft warm cream + add the "color the world" rules + chosen framing.
2. Re-render the 2 proof exemplars (`proof_scenario`, `proof_hero`) in the final variant; replace in `public/demo-images/`.
3. Commit the STYLE.md update.

## Then: actual image PRODUCTION (the big task — do in a fresh session)
- Generate question/UI images with `node .content-import/gen_demo_image.mjs "<prompt>" <name> max`
  (FLUX.2 max via BFL; key in `.env`; per-image cost logged to `.content-import/bfl_spend.log`).
- Use the `{SUBJECT}` prompt template in STYLE.md.
- SIGN FACES: never let FLUX render sign text. Composite real ПДР pictograms from `public/sign-vectors/`
  (85 official SVGs, `index.json` maps sign№→file) onto blank sign faces, or keep faces blank.
- Wire chosen images into the UI (separate frontend task).

## Tooling / state (all committed)
- `STYLE.md` — locked spec + prompt template + dos/donts.
- `.content-import/gen_demo_image.mjs` — generator (canonical flux-2-pro/max, no -preview, cost-logged).
- `public/sign-vectors/` — 85 official sign SVGs + index.json.
- `.content-import/question-svgs/` — authored-SVG diagram mechanism (importer wires these to questions).
- BFL spend so far this exploration: ~$2.52 (logged).

## Refinement (latest): MORE REALISM, less clay
User: full-bleed scenes looked too clay/toy and drifted from the premium original. Fix = realistic PBR
materials (textured asphalt, real grass/foliage, realistic car paint + buildings), refined geometry — drop
"toy/low-poly/clay" wording; keep elevated-iso + colorful-world + soft daylight + brand accents.
- Best sample (realistic + clean + readable): https://files.catbox.moe/q3gmc1.png  (real_clean)
- Fuller/busier realistic: https://files.catbox.moe/j97qtj.png  (real_world)
NOTE for final STYLE.md: replace "premium toy-realistic" with "realistic physically-based materials, premium
product-visualization realism"; keep soft WARM daylight (real_world's light went flat/overcast — specify warm
soft key, gentle contrast). Prefer the real_clean balance (realistic but not visually busy).

## Near-final recipe (for STYLE.md once user confirms)
full-bleed continuous scene · elevated isometric near-orthographic · REALISTIC PBR materials · colorful world
(blue car, green landscaping, blue/amber signs) · soft warm daylight, gentle contrast · brand accents · real
ПДР sign pictograms composited (no FLUX sign text).
