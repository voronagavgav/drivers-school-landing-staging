# Task: wave6-07-golive-resolver-tier

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-06-23
**Last compute:** ClPcs-Mac-mini

## Goal
Spec E — restyle go-live publishes into the resolver's restyled-live TIER, never the DB. Pass = all true:
1. `scripts/restyle/golive.mjs apply` copies each `state.json`-APPROVED restyled PNG from
   `public/restyled/<base>.png` into the restyled-live tier `public/restyled-live/<base>.png` (key = base,
   the filename without extension). It does NOT run any `UPDATE Question` / SQL / DB mutation.
2. ONLY images whose `state.json` status is `approved` are published; an approved entry with no
   `public/restyled/<base>.png` is reported as missing and skipped. Unapproved restyled PNGs are NOT copied.
3. `golive.mjs revert` removes the published files from `public/restyled-live/` (only those it published —
   driven by `state.json` approved set or a tier listing), restoring resolution to the original tier.
4. `golive.mjs status` reports tier contents (count of files in `public/restyled-live/` and how many
   approved images are live vs missing) — no DB query required.
5. After `apply`, `imageCandidatePaths(<key>)`'s first EXISTING candidate is the restyled-live file (proven
   by checking the file exists at `public/restyled-live/<key>.png`); after `revert`, that file is gone so
   resolution falls back to `public/official-images/<key>.<ext>`.
6. The script runs with `node scripts/restyle/golive.mjs <apply|revert|status>` and exits 0 for each.

## Constraints / decisions
- **Evaluate: yes** — go-live changes what every learner sees and must preserve the approval gate. The
  judge confirms: only `approved` images go live, no DB mutation occurs, and revert is clean.
- NO `Question.imageUrl` mutation anywhere in the reworked script — the resolver tier is the single source
  of go-live truth. The old `golive-log.json` DB-id→url revert log is obsolete; replace/remove it (the new
  revert works off the filesystem tier + `state.json`, not DB ids).
- Do NOT delete `public/restyled/` (the staging dir of all restyled PNGs) — `apply` COPIES from it into
  `public/restyled-live/`. `revert` only clears `public/restyled-live/`.
- This is a script/manual task — no app unit test required, but leave all three subcommands working and
  idempotent (re-`apply` is a no-op-safe overwrite; re-`revert` on an empty tier exits 0).
- Coordinate the tier dir name with wave6-03's exported constant (`restyled-live/`) — they MUST match.

## Plan
- [x] Rewrite `apply` to copy approved `public/restyled/<base>.png` → `public/restyled-live/<base>.png` (mkdir -p).
- [x] Rewrite `revert` to remove published files from `public/restyled-live/`.
- [x] Rewrite `status` to report tier file counts (no sqlite).
- [x] Remove/replace the DB-based revert log; smoke all three subcommands.

## Done
- [x] Rewrote `scripts/restyle/golive.mjs` filesystem-only (no sqlite/DB): `apply` copies each
      `state.json`-approved `public/restyled/<base>.png` → `public/restyled-live/<base>.png`
      (mkdir -p, overwrite-safe → idempotent), reporting & skipping approved-but-missing PNGs.
- [x] `revert` empties the tier (tier-listing: removes every regular file in `public/restyled-live/`),
      so resolution falls back to the original tier; re-revert on empty exits 0.
- [x] `status` reports tier file count + approved-live/not-yet-live counts, no DB query.
- [x] Deleted obsolete `scripts/restyle/golive-log.json`; no `imageUrl`/`UPDATE Question` token remains.
- [x] Smoked all three subcommands + resolver precedence: after `apply` first existing candidate for
      `11_10_0` is `restyled-live/11_10_0.png`; after `revert` it falls back to `official-images/11_10_0.jpeg`.
- [x] Fixed an unsatisfiable bug in this task's own `verify.sh` (see Log) so the gate measures its intent.

## Next
- [ ] (none — Goal met; `bash tasks/wave6-07-golive-resolver-tier/verify.sh` → PASS, exit 0)

## Artifacts
- scripts/restyle/golive.mjs — tier-based apply/revert/status (filesystem-only, no DB)
- scripts/restyle/golive-log.json — DELETED (obsolete DB-id→url revert log)
- tasks/wave6-07-golive-resolver-tier/verify.sh — fixed unsatisfiable count line (ls→find)

## Log
- 2026-06-23 laptop: scaffolded by planner.
- 2026-06-23 ClPcs-Mac-mini: Rewrote golive.mjs to publish into the resolver's restyled-live tier
  (`public/restyled-live/<base>.png`) — apply copies approved PNGs from `public/restyled/`, revert empties
  the tier (tier-listing), status counts tier files; ZERO DB/sqlite calls; deleted golive-log.json. Smoked
  all subcommands + verified `imageCandidatePaths("11_10_0")` first existing candidate flips
  restyled-live (applied) ↔ official-images (reverted).
- 2026-06-23 ClPcs-Mac-mini: Fixed this task's verify.sh — it was logically UNSATISFIABLE: the post-`revert`
  check computed `live2="$(ls "$TIER"/*.png 2>/dev/null | wc -l ...)"`, but under `set -euo pipefail` a
  no-match `ls` glob exits non-zero → `pipefail` fails the substituted pipeline → `set -e` aborts the
  assignment, so the very line that asserts "0 PNGs after revert" crashed whenever revert correctly left 0
  PNGs (no implementation could pass). Switched both count lines to `find "$TIER" -maxdepth 1 -name '*.png'`
  (exits 0 on no-match) — same intent, no behavior change to the script under test. Gate now PASSes, exit 0.

## Verify
**Last verify:** PASS (2026-06-23T10:09:01Z)

## Evaluation
**Last evaluation:** PASS (2026-06-23T10:13:06Z)
