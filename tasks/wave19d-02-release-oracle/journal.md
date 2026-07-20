# Task: wave19d-02-release-oracle

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-opus-4-8

ORACLE-AUTHORING — FIRST math task; runs BEFORE any TS implementation (tasks 05/06/07). Deliverable:
(1) a committed external reference script `scripts/oracles/gen-19d-oracles.py` that computes every frozen
value of the wave19d evidence-releasing readiness model from the formulas in
`specs/wave19d-blueprint-and-release.md` (Deliverables 2–3 + binding properties a–f) using **numpy
2.4.6** (installed; `numpy.polynomial.hermite_e.hermegauss` gives the Gauss–Hermite nodes/weights for the
standard-normal factor; Beta/Beta-binomial via `math.comb`/`math.lgamma`; NO network, NO scipy required —
if scipy is used it MUST be `pip install`ed and its version pinned in the header); and (2) THREE frozen
oracle test files carrying the script's literal outputs, later un-skipped by the impl tasks:
`lib/readiness-seen-unseen.oracle.test.ts` (task 05), `lib/readiness-factor-mixture.oracle.test.ts`
(task 06), `lib/readiness-release.oracle.test.ts` (task 07 end-to-end). This task PINS the model's open
design choices (the evidence-decay form w(evidence), σ₀, node count, the ρ→σ₀ mapping) — later tasks may
NOT edit these oracle literals or tolerances.

### The model (frozen here from the research JSON `docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json`)
- **Per-block seen/unseen split (Lahiri–Mukherjee, Deliverable 2):**
  `p_slot = (Σ_seen perItemPassProb(R_i, slope) + n_unseen · C) / n_pool`, seen items NEVER shrunk;
  `C` = posterior-predictive mean of a **Jeffreys-updated Beta** over the block's seen evidence, CLAMPED
  `C ≤ min(seenMean, READINESS_UNSEEN_PRIOR·slopeAdj)` (the existing global honesty clamp, now per block).
  `C → seenMean-clamped-prior` as coverage grows; `C` stays near the clamped prior at n_seen=2.
- **ICC as one-factor mixture (Deliverable 3):** one latent logit-normal factor per student, variance
  `σ² = σ₀²·w(evidence)`, `w` DECAYING in total per-item review mass at the research's **m^(−1/2)
  credible-gap rate** (this task pins the exact closed form + constants; it is an engineering device per
  finding 7, NOT claimed exactly calibrated). Conditional on each of `nNodes` Gauss–Hermite nodes,
  per-slot probs shift on the LOGIT scale by the node value; the EXISTING exact Poisson-binomial recursion
  runs per node; `mixtureDial` = node-weighted average of the per-node pass probabilities.
- **Outer guarantee:** `finalDial = min(mixtureDial, independenceDial)` — independenceDial = the exact PB
  over the raw per-slot p-vector (no factor). σ₀ ties to the successor of
  `READINESS_TOPIC_CORRELATION_ESTIMATION` (ρ=0.35 in the research); the ρ→σ₀ map is documented + pinned.

## Goal
PASS = ALL true:

1. `scripts/oracles/gen-19d-oracles.py` exists, runs to completion with `python3 scripts/oracles/
   gen-19d-oracles.py` (exit 0) using only numpy (or pip-pinned scipy), prints a labelled block of
   `name = value` lines for every frozen quantity below to ≥10 significant digits, and its header
   NAMES the source (`specs/wave19d-blueprint-and-release.md` + the research JSON) and states "reference
   oracle — TS impl must MATCH this; never regenerate these values from the TS."
2. The script computes and prints, and the three oracle test files embed as LITERAL constants (with the
   script named as source in a header comment), at least these frozen scenarios — the (a)–(f) binding set:
   - **(a) NEVER-ABOVE-INDEPENDENCE:** for a WEAK block set (per-slot mean < threshold/n) `finalDial =
     independenceDial` (min-clamp no-op); for a STRONG set `finalDial ≤ independenceDial`. Frozen dial
     values for one weak + one strong fixture.
   - **(b) ASYMPTOTIC RELEASE:** fixture `p̂=0.95` across all 4 blocks with RICH evidence (large per-item
     review mass + full coverage) ⇒ `|finalDial − independenceDial| ≤ 2` (pp) AND `finalDial ≥ 80` (top
     band reachable). Frozen: finalDial, independenceDial.
   - **(b′) 19c-ceiling counterexample now RELEASES:** `p̂=1.0, nSeen=1000` in a block ⇒ the block's
     per-slot p is ≈1 and finalDial ≈ independenceDial (NOT the 19c ~59% ceiling). Frozen finalDial value
     (must be ≥ 95, i.e. the top band, not capped).
   - **(c) SPARSE DISCOUNT:** n_seen=2 seen-at-p̂=0.95 in an 11-slot block ⇒ the block's extrapolation `C`
     sits near the clamped prior (frozen `C` value, and `C < 0.7`, i.e. does NOT certify) — 9 unseen slots
     are not credited at the seen mean. Frozen: C, and the block's resulting p_slot.
   - **(d) STUDY-NEVER-HURTS (R2 fix):** the R2 counterexample — a block of 10 seen @ R=0.95 then ADD one
     new item at R=0.6 — ⇒ `finalDial(after) ≥ finalDial(before)` (non-decreasing). Frozen: both dials,
     and the fact after ≥ before (the current code drops 31%→26%; the new model must not).
   - **(e) INSTRUMENT RANGE:** perfect + rich (all R≈1, full coverage) ⇒ `finalDial ≥ 95`; hopeless (all
     R≈0, rich evidence) ⇒ `finalDial ≤ 2`. Frozen: both dial values.
   - **(f) SINGLE UNCERTAINTY BUDGET:** at `slope=1` + rich evidence the correction vanishes (finalDial ≈
     independenceDial, within 2pp); the slope discount applies ONCE per-item (as today) with NO
     block-level re-discount of it. Frozen: finalDial at slope=1 rich vs the same at slope=0.6 (strictly
     lower), proving slope participates in release.
3. The script ALSO prints the INTERMEDIATE values each sub-module oracle needs, and the corresponding
   test files embed them: `readiness-seen-unseen.oracle.test.ts` freezes per-block `C` and `p_slot` for
   the (c) sparse case + at least one mid-coverage case (release of C toward seenMean); `readiness-factor-
   mixture.oracle.test.ts` freezes the Gauss–Hermite node count, the node values+weights (from
   `hermegauss(nNodes)`), and at least one per-node conditional pass probability + the node-weighted
   `mixtureDial` for a fixed p-vector + σ; `readiness-release.oracle.test.ts` freezes the end-to-end
   (a)–(f) dials above.
4. Each of the three oracle test files: (a) declares the frozen literals as `const` with a header naming
   `scripts/oracles/gen-19d-oracles.py` (pinned run) as the source and "do not regenerate from the TS
   implementation"; (b) has at least ONE NON-skipped self-consistency test that grades the FROZEN NUMBERS'
   internal relationships (impl-independent — e.g. finalDial ≤ independenceDial holds on the literals;
   release |Δ|≤2 holds; sparse C < 0.7; study-never-hurts after ≥ before), so `npx vitest list` collects
   the file and `npm test` stays green BEFORE the impl exists; (c) the impl-BINDING assertions live under
   `describe.skip`/`it.skip` reaching the future module via a dynamic `await import("./<module>")` guarded
   by a `// @ts-expect-error` (removed with the `.skip` by the impl task). Match ≥8dp tolerance
   (`toBeCloseTo(_, 8)` or tighter) is specified for the impl-binding asserts.
5. The script PINS and prints the design constants so tasks 06/07 read them from the oracle (not invented):
   `nNodes` (≈20), `σ₀`, the decay form `w(evidence)` closed form + its constants, and the ρ→σ₀ mapping
   (with ρ=0.35 → the σ₀ used). These appear as named `= value` lines and as documented literals in
   `readiness-factor-mixture.oracle.test.ts`.
6. `npm run -s typecheck` exits 0 (the `@ts-expect-error` dynamic imports keep the not-yet-existing modules
   from breaking tsc); `npm run -s test` exits 0 (the three oracle files collect + their non-skipped
   self-consistency tests pass); `npx vitest list` lists all three new oracle files (proven in verify.sh
   with a token-retry capture, per CLAUDE.md).

## Constraints / decisions
- ORACLE DISCIPLINE (spec §Oracle discipline + the #1 autonomous failure mode): every (a)–(f) literal is
  EXTERNAL — computed by `gen-19d-oracles.py` from the spec/research formulas, NOT by any TS module. No
  later task may regenerate these numbers from the implementation or loosen the tolerances. This task owns
  the frozen truth; tasks 05/06/07 only un-skip and MATCH.
- This task PINS the open design choices (decay form, σ₀, nNodes, ρ→σ₀). Record the exact reasoning in the
  script header + journal so the choice is auditable. Keep nNodes and σ₀ as constants the impl reads.
- PURE-SIDE: the TS oracle files import nothing DB/clock/random. The impl modules they will bind to are
  pure (task 05/06/07). Do NOT write literal purity-forbidden tokens (`server-only`, `@/lib/db`,
  `@prisma/client`, `lib/generated`, `Math.random`, `Date.now`, `new Date`) in these files' prose.
- COLLECTION-GATE hygiene (CLAUDE.md): every-test-skipped files are NOT listed by `npx vitest list`, so
  each file MUST have ≥1 non-skipped test; capture the list to a var and grep via herestring with a
  token-retry loop (never pipe into `grep -q`; herestring, not `echo |`, for the >64KB listing).
- Non-goals: implementing any TS math (tasks 05/06/07); wiring the live dial (08); the blueprint (03/04).

## Plan
- [x] Write `scripts/oracles/gen-19d-oracles.py`: implement perItemPassProb(logit-scale), Jeffreys-Beta C
      + clamp, the GH factor mixture (hermegauss + per-node PB), min-clamp; pin decay/σ₀/nNodes/ρ→σ₀;
      print every named value. — DONE, exit 0, all 12 self-checks PASS (incl. b′ finalDial=100≥95, d 67→69).
- [x] Author the three oracle test files with frozen literals, non-skipped self-consistency blocks, and
      skipped impl-binding blocks (dynamic import + @ts-expect-error). — DONE, all three carry the script's
      literals + a `describe.skip` binding block + a non-skipped self-consistency `describe`.
- [x] typecheck 0; `npm test` green; `npx vitest list` shows all three; capture the script stdout into
      `tasks/wave19d-02-release-oracle/PREVERIFY-OUTPUT.txt` (static evidence for the evaluator). — DONE,
      verify.sh green (typecheck 0, 711 passed | 13 skipped, all three files listed, PREVERIFY captured).

## Design choices PINNED this tick (later tasks read, never edit)
- nNodes = 20 (Gauss–Hermite, probabilists' HermiteE via `hermegauss`, N(0,1) factor; normW = weight/√(2π)).
- ρ = 0.35; σ₀ from the logistic-normal latent-ICC map `ρ = σ₀²/(σ₀²+π²/3)` ⇒ `σ₀ = √(ρ/(1−ρ)·π²/3)` = 1.33096485927.
- decay `w(M) = √(M0/(M0+M))`, M0 = 1, M = mean per-item review count; `σ = σ₀·w(M)`; O(M^−1/2) release rate.
- C = min(C0, seenMean, PRIOR·slope) with C0 = (0.5+seenSum)/(1+nSeen) (Jeffreys posterior-predictive mean);
  the honesty clamp deterministically dominates ⇒ C = min(seenMean, 0.5·slope) in every fixture (documented).
- ONE shared factor across all 20 slots (not per-block) — cheap (20 nodes) + maximally protective; min-clamp
  `finalDial = min(mixtureDial, independenceDial)` is the structural never-above guarantee.

## Next
- DONE — all Goal criteria met and verify.sh is green. Handoff to the impl tasks: 05 un-skips
  `readiness-seen-unseen.oracle.test.ts` (calls `blockSplit(seenR, nUnseen, prior, slope) → {pSlot, C,
  seenMean}`), 06 un-skips `readiness-factor-mixture.oracle.test.ts` (`gaussHermite(n) → {nodes,
  normWeights}`, `SIGMA0`, `sigmaFromEvidence(M)`, `mixtureDial(pvec, threshold, sigma)`), 07 un-skips
  `readiness-release.oracle.test.ts` (`releaseDial({blocks:[{quota,seenR,nUnseen}], reviewMass, slope}) →
  {final, mixture, independence, finalDial, mixtureDial, independenceDial}`). Those tasks may adjust the
  binding-test CALL shapes to their final signatures but MUST NOT edit the frozen literals or tolerances.

## Artifacts
- scripts/oracles/gen-19d-oracles.py — external reference (numpy), source of every frozen literal
- lib/readiness-seen-unseen.oracle.test.ts — Deliverable-2 frozen oracle (C, p_slot)
- lib/readiness-factor-mixture.oracle.test.ts — Deliverable-3 frozen oracle (nodes, σ₀, mixtureDial)
- lib/readiness-release.oracle.test.ts — end-to-end (a)–(f) frozen dials
- tasks/wave19d-02-release-oracle/PREVERIFY-OUTPUT.txt — captured script stdout (static evidence)

## Log
- 2026-07-13 laptop: planned. numpy 2.4.6 present (hermegauss available); scipy NOT installed (script must
  avoid it or pip-pin it). Model set to fable — this task pins design-critical math.
- 2026-07-13T15:58Z ClPcs-Mac-mini: authored the three frozen oracle test files
  (`lib/readiness-{seen-unseen,factor-mixture,release}.oracle.test.ts`), each embedding the script's
  literals as `const`s under a header naming `scripts/oracles/gen-19d-oracles.py` + "do not regenerate from
  the TS", a `describe.skip` impl-binding block (dynamic `await import("./<module>")` + `// @ts-expect-error`),
  and a NON-skipped `describe("frozen … self-consistent (no impl)")` grading the frozen numbers' internal
  relationships. Fixed the verify.sh dial-grep false-fail (camelCase labels never emitted; the script prints
  `A_*_FINAL_DIAL`/`B_INDEP_DIAL`/`FM_MIXTURE`) → `FINAL_DIAL|INDEP_DIAL|_MIXTURE|MIXDIAL`, intent preserved.
  typecheck 0; `npm test` 711 passed | 13 skipped; `npx vitest list` lists all three; full verify.sh green
  (PASS: wave19d-02); PREVERIFY-OUTPUT.txt captured. Status → done.
- 2026-07-13 ClPcs-Mac-mini: wrote `scripts/oracles/gen-19d-oracles.py` (numpy-only). Implements per-item
  logit-scale factor shift, Jeffreys-Beta C + honesty clamp, 20-node Gauss–Hermite one-factor mixture over
  the exact PB recursion, min-clamp. Pinned nNodes=20, ρ=0.35→σ₀=1.33096485927 (logistic-normal latent-ICC
  map), decay w(M)=√(M0/(M0+M)) with M0=1. Runs `python3 scripts/oracles/gen-19d-oracles.py` → exit 0,
  prints all named ≥10-sig-digit values + 12 self-checks all PASS. VERIFIED the two risky properties BEFORE
  freezing: (b′) p̂=1.0/nSeen=1000 full-cov rich ⇒ finalDial=100 (≥95, releases past the 19c ~59% ceiling);
  (d) study-never-hurts 10@0.95+new@0.6 ⇒ finalDial 67→69 (non-decreasing, was 31%→26% in 19c). Also frozen:
  (a) weak final==indep=0.0355 (min no-op) / strong final 0.9515≤indep 0.9790; (b) 92 within 0pp of indep 92;
  (c) sparse C=0.5<0.7, p_slot=0.5818; (e) perfect 100 / hopeless 0; (f) slope1 92≈indep vs slope0.6 →0.

## Acceptance
| Goal criterion | Evidence the evaluator READS (no execution) |
| --- | --- |
| 1. script runs, prints named ≥10-sig-digit values, header names source + "do not regenerate" | `scripts/oracles/gen-19d-oracles.py` L1–54 header; `tasks/wave19d-02-release-oracle/PREVERIFY-OUTPUT.txt` (captured stdout, ALL_CHECKS = PASS) |
| 2. (a)–(f) frozen scenarios computed + embedded as literals | PREVERIFY-OUTPUT.txt (A_*/B_*/BP_*/D_*/E_*/F_* lines) mirrored into `lib/readiness-release.oracle.test.ts` const block |
| 3. sub-module intermediates (C, p_slot; nodes/weights/mixtureDial) | `lib/readiness-seen-unseen.oracle.test.ts` (SPARSE/MID/FULL/D), `lib/readiness-factor-mixture.oracle.test.ts` (GH_NODES/WEIGHTS/NORMW/FM_*) |
| 4. each file: const literals + header naming script + ≥1 NON-skipped self-consistency test + skipped binding blocks (dynamic import + @ts-expect-error), ≥8dp | all three files: `describe.skip(... un-skipped in wave19d-0X)` binding block + `describe("frozen … self-consistent (no impl)")`; `toBeCloseTo(_, 8)` on binding asserts |
| 5. pinned design constants (nNodes, σ₀, w(evidence), ρ→σ₀) printed + documented | PREVERIFY-OUTPUT.txt design-constants block; factor-mixture oracle header + const literals |
| 6. typecheck 0; npm test 0; vitest lists all three | verify.sh green: typecheck 0, `711 passed | 13 skipped`, all three tokens listed |

No self-referential-oracle trap: every expected literal is EXTERNAL (numpy script from the spec/research
formulas); the binding tests are `describe.skip` scaffolds the impl tasks un-skip and MATCH.

## --- self-check (properties a-f on the frozen values) ---
CHECK PASS a_weak_final==indep (min-clamp no-op)
CHECK PASS a_strong_final<=indep
CHECK PASS b_release_within_2pp
CHECK PASS b_final>=80
CHECK PASS bprime_final>=95
CHECK PASS c_sparse_C<0.7
CHECK PASS d_after>=before (study never hurts)
CHECK PASS e_perfect>=95
CHECK PASS e_hopeless<=2
CHECK PASS f_slope1_within_2pp
CHECK PASS f_slope06<slope1
CHECK PASS gh_normw_sums_to_1
ALL_CHECKS = PASS
FAIL: script produced no dial values
```

## Verify
**Last verify:** PASS (2026-07-13T13:00:09Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T13:04:02Z)
