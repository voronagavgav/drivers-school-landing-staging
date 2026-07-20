// Single source of truth for the FLUX-edit restyle prompts. Imported by batch.mjs (run/redo), reskin1.mjs
// (stateless single-image re-edit for the automated loop), and the restyle-verify workflow's auto-fix step.
// Keep prompt wording here only — do not duplicate elsewhere.

// PROMPT — full restyle into the clean ref_B semi-realistic 3D look. Default for productive SCENE images.
export const PROMPT =
  "Restyle this Ukrainian driving-exam illustration into a CLEAN SEMI-REALISTIC 3D render of official ПДР-graphic quality. " +
  "CRITICAL: keep ALL content and layout EXACTLY — every car (and its colour), sign, road marking, arrow, coloured marker, " +
  "pedestrian and text caption stays in the SAME position; do NOT move, add or remove anything; keep all text and signs " +
  "readable and unchanged. ONLY upgrade rendering quality: crisp clean semi-realistic materials, smooth light-grey asphalt, " +
  "neat green grass, realistic-but-clean cars with subtle reflections, soft shadows. " +
  "KEEP the original TIME-OF-DAY and lighting — if the original is night/dark keep it night (headlights on), if day keep day; " +
  "do NOT turn night into day or day into night. KEEP every road SIGN and painted road ARROW perfectly FLAT, crisp and " +
  "undistorted exactly as in the original — signs are 2D, never 3D, never melted/collapsed; keep any large inset sign panel. " +
  "KEEP every vehicle LIGHT (turn-signal, brake, tail, hazard, flashing/beacon) and every star-burst or coloured INDICATOR MARKER " +
  "perfectly FLAT and 2D in its EXACT original colour, shape and position — these are flat icon overlays like signs: " +
  "NEVER render them as 3D/clay/glass objects, NEVER drop, dim, recolour (e.g. yellow→white) or move them onto the road. " +
  "Keep ONLY the text/numbers/captions that already exist in the original — do NOT add or render ANY new " +
  "words, captions, labels or instructions into the image. Remove ONLY the dated/grainy look. Keep the original framing and aspect.";

// GENTLE — light cleanup that changes as little as possible (sign-heavy / indicator-light images).
export const GENTLE =
  "Gently RESTORE and modernise this Ukrainian driving-exam illustration as a LIGHT photo cleanup/upscale: remove the dated " +
  "grainy/blurry look, sharpen, slightly cleaner fresher colours and even lighting. This is NOT a re-render: do NOT redraw, " +
  "restyle, move, distort, add or remove ANY element. Keep every road SIGN, painted arrow, road " +
  "marking, vehicle, pedestrian and text caption PIXEL-FAITHFUL and 100% correct. EVERY vehicle light (turn-signal, brake, tail, " +
  "hazard, flashing/beacon), star-burst indicator MARKER, lit lamp and coloured overlay keeps its EXACT original colour, shape and " +
  "position — flat and 2D, NEVER 3D/clay, NEVER recoloured (yellow stays yellow, not white), NEVER dimmed/dropped or moved to the road. " +
  "Keep original framing, aspect and time-of-day. " +
  "Minimal change, maximum fidelity.";

// MODERN — "slightly more modern" pass (batch-3, proven). Use when a full restyle GARBLES content: dense
// labelled-position diagrams, semi-transparent "ghost" cars, candidate-zone overlays, or scenes whose signs FLUX
// keeps rewriting. A minimal edit keeps signs/labels/ghost-cars as cleaned REAL originals INTEGRATED in-scene (no
// sticker look) where a full restyle invents/garbles them. NOTE: FLUX still tends to add a centre line — forbidden here.
export const MODERN =
  "Improve the quality of this Ukrainian driving-exam illustration and give it a cleaner, slightly more modern " +
  "look: sharper, fresher, cleaner colours and even daylight. Do NOT change, redraw, restyle or move any content; " +
  "keep every car (and its colour), road sign, road marking, painted label, letter, number, distance marker and " +
  "semi-transparent 'ghost' car EXACTLY as in the original, same position and colour. Do NOT add any centre line, " +
  "lane markings, signs, cars or other objects that are not already there; if the road has no markings keep the " +
  "asphalt plain. Keep semi-transparent cars see-through, never solid. Light quality pass only, not a redraw.";

export const BASES = { restyle: PROMPT, gentle: GENTLE, modern: MODERN };
