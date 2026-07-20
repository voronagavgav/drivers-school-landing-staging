export const meta = {
  name: 'restyle-verify',
  description: 'Auto-verify + auto-fix a batch of restyled ПДР images on the high-issue faithfulness axes, re-verifying every fix',
  whenToUse: 'After `node scripts/restyle/batch.mjs run N`: pass `node scripts/restyle/batch.mjs verifylist` JSON as args. First-layer verifies each image vs its official on the axes FLUX most often breaks, auto-fixes FLUX-redoable FAILs (modern/gentle/restyle) and re-verifies them, and surfaces sign-composite / transparency / ambiguous ones as NEEDS-HUMAN. Then Danil does the 2nd-layer UI review.',
  phases: [
    { title: 'Verify', detail: 'one agent per image vs official on the high-issue axes (zoom-mandatory)' },
    { title: 'Fix+Reverify', detail: 'auto-fix FLUX-redoable FAILs via reskin1 + re-verify, up to 2 rounds' },
  ],
};

// VERDICT schema — forces structured output so we never parse free text.
const VERDICT = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pass: { type: 'boolean', description: 'true only if NO answer-relevant content changed (cosmetic style upgrade is fine)' },
    issues: { type: 'array', items: { type: 'string' }, description: 'each content/answer change found, most important first' },
    fix_mode: { type: 'string', enum: ['none', 'modern', 'gentle', 'restyle', 'sign-composite', 'human'], description: 'recommended fix tier if FAIL' },
    fix_note: { type: 'string', description: 'one targeted instruction describing the FIX (no on-image text) for the redo' },
  },
  required: ['pass', 'fix_mode'],
};

// The high-issue checklist comes from batch-3: the exact ways FLUX breaks these images, plus the traps that
// made first-layer agents PASS bad images. Agents MUST zoom and MUST count vehicles against the official.
function verifyPrompt(it, round) {
  return `You are a STRICT first-layer faithfulness verifier for ONE restyled Ukrainian ПДР driving-exam image${round > 1 ? ' (RE-VERIFY after an auto-fix — check the prior issue is gone AND nothing new broke)' : ''}. The OFFICIAL image is content-correct; a FLUX restyle upgraded only its visual style. cwd = /Users/clpc/drivers-school.

OFFICIAL (ground truth): ${it.official}
RESTYLED (under test): ${it.restyled}
QUESTION the image must support: "${it.q}"

A purely cosmetic style upgrade (cleaner asphalt, nicer car materials, fresher colours) is EXPECTED and fine — never FAIL for that. FAIL ONLY for a CONTENT / answer change. Zoom before asserting any fine detail — a downscaled glance lies:
  node -e 'const s=require("sharp");(async()=>{const p="${it.restyled}";const m=await s(p).metadata();await s(p).extract({left:0,top:0,width:m.width,height:m.height}).resize({width:1100}).png().toFile("/tmp/zv_${it.base}.png")})()'  // then Read it, and the official.

CHECK these axes — these are EXACTLY where FLUX breaks these images (batch-3), so scrutinise each:
1. VEHICLES — count, COLOUR, type, position. COUNT them in the official FIRST; never call a vehicle "invented/extra" without confirming it is absent from the official (an agent wrongly flagged a REAL bridge car as invented → its removal broke the image). A car colour swap (the question often names a car by colour) is a hard FAIL.
2. POSITION LABELS (А/Б/В/Г/Д circles) — same letters mapped to the SAME physical spots, same order; FLUX reorders them.
3. DISTANCE / NUMBER markers (e.g. "30м", "10м") — exact, not changed or dropped.
4. INVENTED content — NO extra cars, signs, red warning triangles, buildings, trees, or a CENTRE LINE / lane markings on a road that has none. FLUX loves adding these.
5. SIGNS — present, correct EXACT symbol (not a different sign), flat-2D, undistorted, crisp (not garbled). A wrong or garbled sign is a FAIL even if a sign is present.
6. SEMI-TRANSPARENT "ghost" cars — if the official draws candidate cars see-through, they MUST stay see-through, never solidified to opaque.
7. Translucent GRAY candidate-zones / overlays on the road — kept, not dropped.
8. VEHICLE LIGHTS & star-burst indicator MARKERS — exact colour/shape/position, flat-2D, not clay/dropped/recoloured.
9. Markings / arrows / stop-lines / trajectory / time-of-day — unchanged. No melted/fused/duplicated artifacts.

If the question hinges on a specific attribute, any change there is a hard FAIL.

Set fix_mode if FAIL:
- modern  -> default for dense labelled-position diagrams, ghost-car scenes, added centre-line, or signs FLUX rewrites (the "slightly more modern" minimal pass keeps content faithful & integrated).
- gentle  -> a dropped/melted detail (lights, markers) to restore with minimal change.
- restyle -> a pure STYLE outlier (too dark / photoreal / clay) on an otherwise-faithful image.
- sign-composite -> a sign whose exact symbol/text FLUX cannot render — needs the real sign image composited (human/tooling, see signfix.mjs).
- human   -> transparency/ambiguous cases or anything the above can't fix.
fix_note: one short instruction describing the FIX (never quote on-image text — FLUX renders quoted words).

Return the structured verdict.`;
}

const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
const items = Array.isArray(parsedArgs) ? parsedArgs : [];
if (!items.length) {
  log('no items — pass `node scripts/restyle/batch.mjs verifylist` JSON as args');
  return { error: 'no items; pass verifylist JSON as args' };
}
log(`verifying ${items.length} restyled image(s)`);

const FIX_MODES = ['modern', 'gentle', 'restyle'];

const results = await pipeline(
  items,
  // STAGE 1 — verify
  (it) => agent(verifyPrompt(it, 1), { schema: VERDICT, model: 'opus', phase: 'Verify', label: `verify:${it.base}` }),
  // STAGE 2 — auto-fix FLUX-redoable FAILs and RE-VERIFY (up to 2 rounds); else flag NEEDS-HUMAN
  async (verdict, it) => {
    if (!verdict) return { base: it.base, status: 'NEEDS-HUMAN', issues: ['verify agent returned nothing'] };
    if (verdict.pass) return { base: it.base, status: 'PASS', issues: verdict.issues || [] };
    const firstIssues = verdict.issues || [];
    let v = verdict;
    for (let round = 1; round <= 2; round++) {
      if (!FIX_MODES.includes(v.fix_mode)) {
        return { base: it.base, status: 'NEEDS-HUMAN', issues: firstIssues, fix_mode: v.fix_mode, note: v.fix_note || '' };
      }
      const note = (v.fix_note || '').replace(/"/g, "'").slice(0, 380);
      // reskin1.mjs is STATELESS -> safe to run while other items fix in parallel
      await agent(
        `Run EXACTLY this one shell command from /Users/clpc/drivers-school and report its stdout, nothing else:\n` +
        `node scripts/restyle/reskin1.mjs ${it.base} ${v.fix_mode} "${note}"`,
        { model: 'opus', effort: 'low', phase: 'Fix+Reverify', label: `fix:${it.base}:r${round}:${v.fix_mode}` }
      );
      v = await agent(verifyPrompt(it, round + 1), { schema: VERDICT, model: 'opus', phase: 'Fix+Reverify', label: `reverify:${it.base}:r${round}` });
      if (v && v.pass) return { base: it.base, status: 'AUTO-FIXED', rounds: round, fixed: firstIssues };
    }
    return { base: it.base, status: 'NEEDS-HUMAN', issues: (v && v.issues) || firstIssues, fix_mode: v && v.fix_mode, rounds: 2 };
  }
);

const clean = results.filter(Boolean);
const summary = {
  total: clean.length,
  PASS: clean.filter((r) => r.status === 'PASS').length,
  AUTO_FIXED: clean.filter((r) => r.status === 'AUTO-FIXED').length,
  NEEDS_HUMAN: clean.filter((r) => r.status === 'NEEDS-HUMAN').length,
};
log(`done: ${summary.PASS} PASS · ${summary.AUTO_FIXED} AUTO-FIXED · ${summary.NEEDS_HUMAN} NEEDS-HUMAN`);
return { summary, needsHuman: clean.filter((r) => r.status === 'NEEDS-HUMAN'), results: clean };
