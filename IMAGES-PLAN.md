# Question images — plan & handoff

> ⏸️ **PARKED 2026-06-19.** Decision (Danil): STOP generating images for image-less questions — it was
> the hardest possible starting point and a bad initial scope. The 734 official images stay as-is.
> Everything below is preserved as a reference record (style, pipeline, auditor findings) IF we ever
> revisit, but it is NOT active work. Decorative-imagery style (`merge_b`, `/STYLE.md`) remains valid.

## Goal (locked with user 2026-06-19)
Generate images ONLY for currently **image-less** questions, and ONLY for the subset where an
illustration **genuinely adds value** (scenario/situation questions). NOT all questions, NOT the
ones that already have official images.

## Current state
- Total published Qs: **1707** · already have official image: **734** (`/official-images/*.jpeg`) ·
  **no image: 973**. The 734 official images STAY (out of scope here).
- Image-worthy subset of the 973 = TBD (needs a classification pass; rough keyword guess ~100+, but
  judgment per-question is required — many "priority/turn/maneuver" texts benefit, definitional ones don't).

## Style — LOCKED 2026-06-19: clean semi-realistic (ref_B)
Target = the official ПДР look: **elevated 3/4 PERSPECTIVE, clean SEMI-REALISTIC 3D**, light-grey
smooth asphalt + white dashed markings, neat green grass, simple low buildings, realistic-but-clean
cars with subtle reflections, BRIGHT EVEN neutral daylight, soft shadows. NOT iso top-down, NOT
clay/toy/low-poly, NOT golden-hour/dark, NOT photoreal-gritty.
Refs: ref_B `https://i.imgur.com/UV6OEk7.jpeg` (locked) · ref_A `https://i.imgur.com/e8FnknN.jpeg`
(cartoon alt, rejected) · official `public/official-images/8_1_6_0.jpeg`, `1_23_0.jpeg`.
Matched output: `reskin_refB_match` `https://files.catbox.moe/fiqy7c.png` (from the left-turn blocking).

### Working re-skin recipe (proven)
FLUX.2 [max] EDIT (`input_image`) re-cameras AND re-skins in one pass — the prompt controls BOTH the
camera (iso→perspective) and materials. Locked prompt gist: *"clean semi-realistic 3D driving-exam
illustration, elevated 3/4 PERSPECTIVE high horizon (not isometric/top-down), simple four-way
crossroads, cars each in its lane in current relative positions, realistic light-grey asphalt + white
dashed markings, green grass, simple low buildings, realistic-but-clean cars w/ subtle reflections,
bright even daylight, soft shadows; NOT low-poly/clay/toy/golden/dark; no text, no signs."*

### AUDITOR GATE (Danil 2026-06-19) — adopt as mandatory pipeline stage
A SEPARATE vision auditor agent rechecks every generated image vs the question + correct answer:
CORRECTNESS (car positions/directions/layout make the right answer true) + QUALITY (no melted/fused
cars, wrong/dup markings, artifacts). FAIL ⇒ auto-regenerate ⇒ re-audit (loop until PASS or N tries).
Auditor criteria MUST include (added after misses): (a) the "Ви" car is APPROACHING the conflict point
— before the stop line / crosswalk, NOT already in or through the intersection; (b) the correct
side/arm (left vs right, which perpendicular road); (c) approach DIRECTIONS (who faces whom). Earlier
auditors passed images where the blue car was mid-crossing — add an explicit "is your car before the
intersection?" check.
Proven: a `claude` subagent (Read the PNG + question/answer) FAILED both demo images on correctness —
it caught that the perspective re-camera had moved the cars to wrong positions. Cheap (vision in the
subagent's own context). This is the verify gate the rest of the project already uses.

### ITERATIVE EDIT LOOP — VALIDATED, PRIMARY APPROACH (Danil's idea, 2026-06-19)
Don't one-shot. Generate the scene, then refine the SAME image with small SURGICAL FLUX edits
(`gen_reskin.mjs`, single `input_image`), fixing ONE auditor complaint per pass, re-auditing each time,
until PASS — converges in a few passes ("few goes"). PROVEN both directions:
- COLOUR fix: give-way opponent blue→red in ONE edit → auditor PASS, ship-ready (rest of scene preserved).
- GEOMETRY fix: left-turn cars perpendicular+both blue → ONE edit → two cars head-on, blue+white →
  auditor PASS. (ex2_giveway_v2, ex2_leftturn_v2.)
Caveat: each edit re-renders the whole frame, so colours/style drift slightly per pass — keep it to a
FEW passes; anchor style to a master example if drift grows. This SUPERSEDES the "must composite sprites
/ controlled 3D" conclusion as the PRIMARY path; sprite-composite/3D stays a fallback if a scene won't
converge. Cross-image consistency (same blue "Ви" everywhere) → test a final "match this canonical car"
surgical pass. Production loop:
  blocking/reskin → auditor → [surgical edit → auditor]×N until PASS → overlay answer arrows/markers → done.

### MULTI-REF COLOR BLEED (auditor finding 2026-06-19)
Passing a canonical blue car as `input_image_2` for consistency made FLUX render the OTHER cars blue
too (the reference identity/colour bled onto all vehicles) — auditor saw two blue cars in all 3 scenes,
breaking "Ви vs opponent" readability; geometry also still scrambled in 2/3. So multi-ref ≠ a clean
consistency fix. CONCLUSION (3rd round of evidence): per-image FLUX cannot hold correctness + per-car
colour + layout together. Production must COMPOSITE fixed per-vehicle sprites (blue "Ви", red, white,
truck, bus…) at known positions — or render in controlled 3D — with FLUX only for the backdrop. Auditor
gate stays mandatory.

### RE-CAMERA REJECTED for production (auditor evidence)
FLUX.2 edit re-cameraing iso→perspective is UNSAFE for correctness: it reinterprets the layout and
moves cars (equal-roads → head-on instead of right; left-turn → perpendicular cross-traffic). It also
varies STYLE per image (Danil: "style differs from your previous example"). So production must NOT
re-camera. Instead: author the blocking ALREADY in a perspective projection and re-skin WITHOUT
re-camera (preserve geometry), OR render in controlled 3D — plus ONE fixed style prompt + canonical
assets for uniform look/cars. The auditor gate stays on regardless.

### CONSISTENCY REQUIREMENT (Danil 2026-06-19) — drives the architecture
Recurring elements MUST be identical across every slide: the blue car ("Ви") looks the SAME in all
blue-car images; red car consistent; trucks/buses/tow-rig/pedestrians each consistent; lane markings
("street linings") consistent + correct. Per-image FLUX re-skin CANNOT do this — it redraws each
vehicle/marking differently every render. So the pipeline must shift:
- **Canonical asset library**: render each vehicle ONCE in ref_B style (blue car, red car, white car,
  truck, bus, tow setup, pedestrian…), at the orientations needed (N/S/E/W or a few 3/4 angles), with
  clean cut-outs; reuse the SAME sprite in every scene. Likewise a consistent road/markings template.
- **FLUX provides only the environment backdrop** (roads/grass/buildings) — OR render the whole scene
  in a controlled 3D engine (three.js/Blender) for perfect consistency (decide in build; 3D gives the
  strongest consistency + correctness + the overlay coords for free).
- Vehicles/markings/signs/answer-markers are all the CONTROLLED layer — never FLUX-redrawn per image.
This ALSO resolves the overlay-alignment consequence below (we place the cars, so we know their coords).

### CONSEQUENCE for the overlay step (made moot by the consistency requirement above)
Re-cameraing to perspective means FLUX chooses the final geometry, so the iso authored coords NO LONGER
map for precise overlay (arrows/stars/labels/signs). Two fixes: (a) author the blocking already in a
PERSPECTIVE projection and re-skin WITHOUT re-camera (preserve camera) → coords stay known; or
(b) detect car/sign positions in the re-skin output (vision) then place the overlay. Decide in the build.

## Pipeline (proven this session)
Correctness is non-negotiable (the image IS the question). Raw text-to-image hallucinates layout, so:
1. Author/define the correct scene (car positions/colors, signs, answer-relevant elements).
2. Render the photoreal scene (FLUX.2). For tight geometry, the **authored→FLUX.2 edit (`input_image`)
   re-skin** trick holds layout while adding realism (`.content-import/gen_reskin.mjs`).
3. **Overlay the annotation layer** (direction-stars, arrows, labels, real sign vectors from
   `public/sign-vectors/`) — this is what the official images do, and it carries the answer precisely.
4. **Verify** each output against the question's correct answer (real options in DB).

## Remaining steps (do OFF the heavy main thread — fresh session / background)
1. **Classify** the 973 image-less Qs → image-worthy subset (LLM pass; output a candidate list + reason).
2. **Lock the question-image style** on 1–2 real subset questions (user sign-off) before scaling.
3. **Generate** for the subset: scene → annotation overlay → verify → wire `Question.imageUrl`.

## Decorative style (separate, DONE)
Locked on `merge_b`; spec in `/STYLE.md`. FLUX premium-3D for non-load-bearing imagery only.
