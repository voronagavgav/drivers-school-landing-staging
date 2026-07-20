# Task: wave19d-01-topic-stratum-mapping

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-13
**Last compute:** laptop

INVESTIGATION ONLY (no code change). Derive the data-driven **section → official-stratum** mapping for
the official ТСЦ cat-B blueprint (spec `specs/wave19d-blueprint-and-release.md` Deliverable 1, source
`docs/research/OFFICIAL-EXAM-STRUCTURE-2026-07-13.md`). The official draw is 4 strata:
**ПДР 10 · безпека руху 4 · будова/експлуатація 4 · домедична 2** (sum 20). Below the 4 strata NO finer
official quota exists — the fine ПДР sections (знаки/розмітка/перехрестя…) fold into the ПДР-10 stratum,
and any section not clearly belonging to безпека/будова/домедична folds into ПДР (the remainder). The
deliverable is a committed `FINDINGS.md` table mapping every live cat-B section number → its stratum, so
task 03 can wire the blueprint from a decided mapping instead of guessing.

The наказ section is the top-level number in a question's stable `questionKey` (`q_<section>_<qnum>`,
`sectionFromQuestionKey`, lib/content-key.ts). Topic titles + sections are inspectable in the live
`prisma/dev.db` (see the query in verify.sh). Known anchors (from dev.db at plan time): §31 ТЕХНІЧНИЙ СТАН
ТЗ, §33 ДОРОЖНІ ЗНАКИ, §34 ДОРОЖНЯ РОЗМІТКА, §35 ОСНОВИ БЕЗПЕЧНОГО ВОДІННЯ, §36 ОСНОВИ ПРАВА, §37 НАДАННЯ
ДОМЕДИЧНОЇ ДОПОМОГИ, §38 ЕТИКА ВОДІННЯ, §39 ЄВРОПРОТОКОЛ, §44 кат-B ЗАГАЛЬНІ, §45 кат-B БУДОВА І ТЕРМІНИ,
§46 кат-B ЮРИДИЧНА ВІДПОВІДАЛЬНІСТЬ, §47 кат-B БЕЗПЕКА. Sections §1–§30, §32 are ПДР core.

## Goal
PASS = ALL true:

1. `tasks/wave19d-01-topic-stratum-mapping/FINDINGS.md` exists and contains a table with one row per
   distinct official section number that appears in a PUBLISHED cat-B question on the live dev.db,
   assigning each to exactly one of the 4 strata `{pdr, safety, structure, medical}` (the block keys task
   03 will use). No section is unassigned; no section is in two strata.
2. FINDINGS.md assigns the mandatory anchors as: **§37 → medical**; **§31 → structure** (будова/
   експлуатація) and **§45 → structure**; **§35 → safety** (безпека руху) and **§47 → safety**; every ПДР
   core section §1–§30, §32, §33 (знаки), §34 (розмітка) → **pdr**. Sections whose stratum is genuinely
   ambiguous (§36 право, §38 етика, §39 європротокол, §44 кат-B загальні) are assigned with a one-line
   justification each; the DEFAULT for anything not clearly безпека/будова/домедична is **pdr** (the
   remainder/fallback stratum) — state this rule explicitly.
3. FINDINGS.md records the official stratum QUOTAS **pdr 10 · safety 4 · structure 4 · medical 2** (sum 20)
   verbatim from the source doc, and confirms the quota is FIXED (not ranged) for all four.
4. FINDINGS.md includes, for each stratum, the count of PUBLISHED cat-B questions the live dev.db has for
   its assigned sections (the availability figures task 04's integration test needs), captured from the
   real query — proving every stratum has ≥ its quota available.
5. FINDINGS.md names its evidence source (dev.db query output + `OFFICIAL-EXAM-STRUCTURE-2026-07-13.md`),
   and explicitly notes this is INVESTIGATION-ONLY: no lib/app/schema file is modified by this task.
6. `verify.sh` exits 0: it re-runs the dev.db section-inventory query, asserts FINDINGS.md exists and
   contains the four stratum keys + the `10 · 4 · 4 · 2` quota figures + the §37→medical / §31→structure /
   §35→safety anchor rows. (No git code-untouched gate: the tree already carries unrelated pre-wave dirty
   files; the "no code" constraint is honoured by convention, the artifact is the gated deliverable.)

## Constraints / decisions
- INVESTIGATION-ONLY: the ONLY deliverable is FINDINGS.md (+ verify.sh). Do NOT edit lib/exam-blueprint.ts
  or any code — that is task 03. Materialize the finding as a concrete on-disk FILE (not journal prose)
  so the static evaluator inspects a real artifact, not narrative (see project CLAUDE.md learnings).
- The mapping is by SECTION NUMBER (drift-immune questionKey source), NOT Topic.displayOrder (which drifts
  +101 on the live seed). Task 03 keys blocks on `sections`, so this table is the section→block decision.
- ПДР is the REMAINDER stratum (task 03's `remainderKey`), so its "sections" list is derived by EXCLUSION;
  FINDINGS.md still lists which sections fall to it for auditability.
- Non-goals: implementing the blueprint (03), the composer/recompute wiring (04), any correction math.

## Acceptance (evaluator reads these — no execution needed)
| Goal | criterion | where READ |
|------|-----------|------------|
| 1 | one row per observed section → exactly one of {pdr,safety,structure,medical}, none unassigned/double | FINDINGS.md "Section → stratum table" (43 rows) |
| 2 | anchors §37→medical, §31/§45→structure, §35/§47→safety, §1–§30/§32/§33/§34→pdr; ambiguous §36/§38/§39/§44/§46 justified; default=pdr stated | FINDINGS.md table `note` col + "Fallback / remainder rule" |
| 3 | quotas 10·4·4·2 (sum 20) verbatim + FIXED | FINDINGS.md "Official stratum quotas" section |
| 4 | per-stratum pub availability ≥ quota (medical 59, structure 50, safety 177, pdr 1471) | FINDINGS.md "Stratum membership + availability" + PREVERIFY-OUTPUT.txt |
| 5 | evidence source named + INVESTIGATION-ONLY note | FINDINGS.md "Evidence sources" + header |
| 6 | verify.sh exits 0 | ran locally EXIT=0 (see Log) |

This is an INVESTIGATION-ONLY task: no test, no oracle, no fixture, no behaviour ⇒ structural verify
traps are inapplicable by construction. Availability figures are the live query output (PREVERIFY-OUTPUT.txt),
cross-checked against the wave19b 6-way split (folds law+general into pdr; same 1757 total).

## Artifacts
- `tasks/wave19d-01-topic-stratum-mapping/FINDINGS.md` (the deliverable)
- `tasks/wave19d-01-topic-stratum-mapping/PREVERIFY-OUTPUT.txt` (static query evidence)

## Next
- [ ] (none — deliverable complete; task 03 consumes FINDINGS.md)

## Log
- 2026-07-13 laptop: planned. Anchors + section list confirmed against live dev.db at plan time.
- 2026-07-13 ClPcs-Mac-mini: ran the dev.db section-inventory query (43 sections, 1757 published cat-B
  questions), decided each section's stratum against the official 4-strata doc, wrote FINDINGS.md (section
  table + quotas 10·4·4·2 + stratum availability medical 59 / structure 50 / safety 177 / pdr 1471, all
  ≥ quota + explicit pdr-remainder/default rule) and PREVERIFY-OUTPUT.txt (static query evidence).
  verify.sh exits 0. Status→done.

## Verify
**Last verify:** PASS (2026-07-13T12:43:12Z)

## Evaluation
**Last evaluation:** PASS (2026-07-13T12:44:02Z)
