# Restyle rework — operating plan

Restyle all ~733 official ПДР images to the **ref_B clean semi-realistic** look — content-faithful,
human-approved — then point the app at the approved versions. Official images are already correct, so
we INHERIT correctness and only upgrade the dated render.

> OPERATIONS PLAYBOOK = the **`restyle-pdr` skill** (`~/.claude/skills/restyle-pdr/SKILL.md`): the per-batch
> loop, the 3-tier redo recipe, the sign-paste tool, and every hard-won lesson (ZOOM before asserting,
> pure-chart handling, checkerboard whitening, name-the-real-object in redo notes, Danil's All-tab numbering,
> sequential-redo state safety). This file stays the live STATUS/RESUME log; the skill is the how-to.

## STATUS / RESUME HERE (2026-06-22)
- **BATCHES 1+2 COMPLETE: 37 approved + LIVE** on /restyled (golive applied; 697 still on official).
- **Batch 3 (14_12_0 / 14_13_0 / 14_14_0) STALLED — pending, NOT approved.** All 3 are indicator-light/beacon
  overtaking scenes; FLUX-edit clay-ifies the beacon (14_13_0), won't light the taillights (14_14_0), and
  turns the yellow indicator star-bursts white/sticker-y (14_12_0). ~5 redo rounds + a paste workaround all
  missed Danil's bar. NOTE: don't call this a hard FLUX limit — it's partly PROMPTING ("CLEAN ... 3D render"
  3D-ifies flat icons) and prompt strategies aren't exhausted; indicator issues also occurred+were fixed in
  b1 (12_16_0) and b2 (13_4_0). FRESH-SESSION PLAN (Danil chose the pipeline): (1) cheap PROMPT EXPERIMENT on
  one image — reframe star-bursts as flat vector overlays / flatter style / gen-without-lights; if it cracks
  the lights, done. (2) else BUILD a light-LAYER compositing pipeline: FLUX clean backdrop → composite the
  official light/marker layer back as real glowing lights. Then resume `batch.mjs run 20`. Consider sinking
  indicator-light Qs in the scene-ordering score.
- Batch 2 took THREE Danil review rounds (he is meticulous — catches dropped hazard lights, wrong tow-rope,
  missing sign cross, low-res pastes, non-white sign-chart bg). Budget several rounds per batch.
- Batch 2 final per-image fixes (round 1 = Danil's 8 flags, round 2 = his 7 re-flags):
  - Pure sign-charts on white → restyled set = the CLEAN OFFICIAL (no scene to restyle; fixes border/glare/
    3D-bevel definitively): `12_17_0`, `12_1_0`, `13_8_0`.
  - tier-3 sign-paste (re-verified): `12_39_0` (whole житлова-зона panel), `12_6_0` (end-of-locality red
    cross), `12_2_0` (Яблуневе entry signs).
  - gentle FLUX redo (re-verified): `12_9_1` (tow ROPE-with-orange-flags between cars — NOT a striped bar;
    + hazard stars + green motorway sign + white lead car), `13_3_0` (restored dropped REAR turn-signal
    star), `13_4_0` (flat indicator stars). restyle FLUX: `13_2_0` (fixed dark/photoreal style outlier).
  - `12_7_0` (#25): CORRECTION — its TOP sign IS a crossed end-of-locality (exit) sign; the bottom one is a
    plain entry sign. I twice wrongly concluded "no cross" from a LOW-RES full-image view; only a HIGH-ZOOM
    crop of the top sign revealed the red diagonal. Danil was right all 3 rounds. Fixed via sign-paste of the
    crossed top sign. LESSON: zoom to the sign before asserting a fine visual detail — full-image view lies.
  - Pure sign-charts (12_17_0/12_1_0/13_8_0): Danil rejected BOTH the glary standard restyle AND a raw
    official copy ("just same image"). gentle redo gives a clean flat re-render, but flat signs inherently
    look ~like the official — there's no non-glary "restyle" that visibly changes a flat sign. Open question.
  - round-3 also: 12_39_0 re-done via gentle (paste was low-res); 12_9_1 rope tightened; 13_3_0 stars cleaned.
- **Numbering:** Danil reviews on the UI "All" tab, which numbers `Object.keys(state.status)` (= worker
  COMPLETION order, NOT lastBatch order) — batch 1 = #1-17, batch 2 = #18-37. Map his # via that, but
  ALWAYS confirm the complaint against the actual pixels (numbering drifts ±1; agents hallucinate).
- **Redo-note lesson:** a redo note must describe the REAL object — I called 12_9_1's tow rope a "striped
  link" and FLUX rendered a striped barrier bar. Zoom the original first, name what's actually there.
- **LESSON:** a confirm-agent HALLUCINATED a red cross on 12_7_0; caught by viewing the official myself, and
  the REAL defect was on the adjacent image (12_6_0). When a human flags by number, verify the COMPLAINT
  against the actual pixels AND check neighbours — numbering can be off by one. Trust the official image over
  an agent on a specific visual claim. Also: pure sign-charts on white add no restyle value → SKIP, don't
  paste (paste ≈ official, risks glare/misalign).
- **TIER-3 SIGN-PASTE BUILT** (`signpaste.mjs`); validated on 12_2_0, 12_39_0, 13_8_0. Agent-estimated boxes
  can be loose → re-verify every paste; on FAIL, widen the box to fully cover the old sign (no ghosting).
- NEXT: Danil resolves 12_7_0 + glances the 5 fixes → go-live the approved → `run 20` for batch 3.
- **RESOLUTION = native only, NO upscaling.** Rejected: 2x re-edit (drifts + leaked note text), lanczos
  (artifacts/no gain), Real-ESRGAN (repaints clean 3D renders → worse). Source ~600px is the faithful
  ceiling; `reskin` serves FLUX output at original res — never re-edit or AI-upscale for resolution.
- Review UI RUNNING at http://100.110.64.90:4321 (`review-server.mjs`); survives across sessions.
- Go-live tested & reversible (`golive.mjs apply/revert/status`); batch 1's 17 are live on /restyled.
- Resume: `node scripts/restyle/batch.mjs status` → re-review the 14 in the UI → `run 20` for batch 2.

## Per-batch loop (20 images)
1. **Run** — `node scripts/restyle/batch.mjs run 20`
   (restyles next 20 pending via FLUX.2 [max] edit; scene-first ordering; saves to `public/restyled/`.)
2. **Verify (FIRST LAYER — automated)** — spawn a comparison agent per image (ORIGINAL vs RESTYLED).
   It confirms the restyle is FAITHFUL (same vehicles/colors/positions, signs present+correct+undistorted,
   markings/arrows/trajectory preserved, text readable, time-of-day unchanged, no melted/clay artifacts) —
   cosmetic style upgrade is expected & fine. On FAIL it recommends a fix tier; the orchestrator AUTO-REDOES
   (recipe below) and RE-VERIFIES, ≤2 rounds, BEFORE Danil sees the batch. Output per image:
   PASS / AUTO-FIXED / NEEDS-HUMAN.
3. **Present** — one **BEFORE | AFTER** image per scene (`cmp.mjs`) + numbered list + the agent's verdict
   per image, so Danil reviews a pre-cleaned batch (trust PASS, focus on AUTO-FIXED / NEEDS-HUMAN).
4. **Review (SECOND LAYER — Danil)** — final say, number by number: **approve** / **redo** / **skip**.
4. **Apply**
   - `node scripts/restyle/batch.mjs mark approve <n,n,...>`
   - `node scripts/restyle/batch.mjs mark skip <n,...>`  (keeps the official original)
   - redos per the recipe below, then re-present just the redone ones.
5. **Repeat** — state persists in `state.json`; next `run 20` continues.

## Review UI (`review-server.mjs`, http://100.110.64.90:4321)
One page, every BEFORE|AFTER pair, **Good / Bad→redo / Skip** buttons → write straight to `state.json`.
Tabs by status (Pending/Approved/Skipped/Redo/All). Extras: **click any image to zoom** (click again =
actual-size, scrollable); on the AFTER image, **✏️ mark** lets you drag red boxes over the bad zone.
On "Bad→redo" the boxes save to `state.regions[file]` (normalized x/y/w/h) + the note, and a marked-up
snapshot to `public/restyled/marked_<base>.png`. When processing a redo, READ note + regions + view the
marked_ snapshot to target the fix precisely (positional note for restyle, or sign-paste on that region).
Start it: `node scripts/restyle/review-server.mjs` (PORT=4321). Decisions ARE the review — read `state.json` after.

## Redo recipe (3 tiers — escalate only as needed)
1. **Restyle** + a targeted note — `batch.mjs redo <n> "fix: ..."`  (most issues)
2. **Gentle cleanup** — `batch.mjs redo <n> gentle "..."`  (sign-heavy: minimal change, signs stay faithful)
3. **Restyle + paste real sign region** — BUILT: `scripts/restyle/signpaste.mjs`. Restyle the scene, then
   composite the pixel-correct sign crop from the official back over the melted one. Strongest; for stubborn
   signs (small Cyrillic text, speed digits FLUX can't hold). Orchestration (3 steps, ~free vs a FLUX redo):
   (a) a vision agent locates each sign's tight box in BOTH images → normalised `[{from,to}]` (keep from/to
   same aspect); (b) `node scripts/restyle/signpaste.mjs <base> '<json>'` (feathered edges, backs up to
   restyled/.bak/, leaves status='restyled'); (c) re-verify agent. Validated on 12_2_0 (two Яблуневе signs).
4. **Skip** — last resort; keep the correct official original.

Hardened base prompt already: preserves time-of-day (no night→day), keeps signs/arrows flat-2D & undistorted.

## Ordering & expectations
- Scene-first: situational images (intersections, lanes, maneuvers) come early and restyle cleanly.
- Later batches hit more sign-charts / multi-picture / photo questions → expect more tier-2/3 or skips.
- Pure sign-meaning charts where FLUX can't hold the sign → skip (keep original); not every image must change.

## Sessions & context
- Run **1–3 batches per fresh session** (chat context fills from the review images).
- Resume anywhere: `node scripts/restyle/batch.mjs status` → `run 20`. The manifest is the source of truth.

## Cost
- ~$0.10 / image on flux-2-max (chosen over pro: pro is ~half price but less content-faithful).
- ~$72 base for ~716 remaining + redos. Keep BFL credits topped up (batch fails with HTTP 402 when dry).

## Go-live (when enough are approved)
- Approved restyles live at `public/restyled/<base>.png`; official untouched at `public/official-images/`.
- `golive.mjs` (to build): for every APPROVED image, set the question's `imageUrl` → `/restyled/<base>.png`.
  Non-destructive (originals kept; per-image rollback = revert imageUrl). Run incrementally or once at end.
- Verify in the real app (a few questions) before/after the flip.

## First-layer verification agent (VALIDATED 2026-06-19)
A `claude` subagent reads ORIGINAL + RESTYLED and checks faithfulness on 6 axes (vehicles count/colour/
type/position, signs present+correct+undistorted, markings/arrows/trajectory, text, time-of-day, no
artifacts); cosmetic upgrade is expected & ignored. Returns PASS/FAIL + recommended fix tier. Validated:
3/3 approved images PASSed with accurate diffs (e.g. it explicitly confirmed "tractor stays a tractor",
the exact swap the cheaper tier made). Implementation per batch: orchestrator spawns the agents in
parallel (they run in their own context — cheap for the main thread), AUTO-REDOES FAILs per recommended
tier, RE-VERIFIES (≤2 rounds), then presents PASS / AUTO-FIXED / NEEDS-HUMAN to Danil. (Can later become
a background Workflow for full hands-off fan-out; inline agent spawns are fine while Danil reviews each.)

## Open decision (Danil)
- **Go-live timing:** flip approved images live incrementally (per batch) vs all at once at the end.
- **Cadence:** how many batches per session / how often to review (flexible; ~1–3 batches per fresh session).
