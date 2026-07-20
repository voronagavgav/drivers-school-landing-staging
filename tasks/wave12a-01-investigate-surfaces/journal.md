# Task: wave12a-01-investigate-surfaces

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
INVESTIGATION ONLY — produce a written surface inventory that the restyle tasks (02–13) execute
against. NO source edits to `app/`, `components/`, `lib/` (except writing the report file).
Spec: `specs/wave12a-design-system.md` §A–E; design source of truth `docs/app-plan/04-design-system.md`.

PASS = ALL true:

1. `docs/app-plan/WAVE12A-SURFACES.md` exists and contains ALL of the following sections (verify.sh greps
   each heading literally):
   - `## Legacy tokens` — a table mapping every OLD `@theme` token currently in `app/globals.css`
     (`--color-asphalt`, `--color-sign`, `--color-sign-dark`, `--color-lane`, `--color-danger`,
     `--color-go`, `--color-paper`, `--color-card`, `--color-line`, `--color-muted`) → its NEW
     04-design-system replacement value/name (e.g. `--color-sign → text/icon = --color-green-deep #226157`).
   - `## Token usages` — for each legacy Tailwind utility (`bg-sign`, `text-white`, `text-asphalt`,
     `bg-paper`, `border-line`, `text-muted`, `text-sign`, `bg-danger`, `text-go`, `bg-lane`, `.road`,
     `font-display`/Oswald), the count of occurrences and the files touched (from a real `grep -rn`).
   - `## text-white-on-fill` — an explicit list of every place `text-white` is paired with a filled
     green/sign/danger button background (the CTA-rule violation sites the buttons task must fix).
   - `## Components` — each file under `components/` with a one-line note of what restyle it needs
     (app-nav → tab capsule; ui → buttons/cards/badges; brand → svitlyk wordmark; test-runner → runner;
     others → token recolor only).
   - `## Screens` — each `app/(app)/**/page.tsx` route with the visual treatment it needs THIS wave
     (restyle-in-place; NEW reworks are W12b/out-of-scope — list which are out of scope).
   - `## Glass tier plumbing` — confirmation that `UserSettings.glassTier` (default `"auto"`) ALREADY
     exists in `prisma/schema.prisma` (line ~411) so NO migration is needed, and where a server-side read
     would attach (the `(app)` shell / root layout body class).
   - `## q-image miss path` — the current behavior of `GET /api/q-image/[key]` on a miss (returns a plain
     404) and the runner's `<img src={imageSrc} alt="">` usage (`components/test-runner.tsx` ~line 227),
     with a recommendation (extend route miss path OR client `onError`) for the 404 placeholder (task 11).
     Pick the SIMPLER; state which (client `onError` is expected to be simpler).
2. Every count/file list in `## Token usages` is backed by a real grep (not invented) — spot-checkable by
   re-running the greps in verify.sh and matching at least the `bg-sign` and `text-white` file coverage.

## Constraints / decisions
- Read-only investigation. The ONLY file this task may create/modify is `docs/app-plan/WAVE12A-SURFACES.md`.
- This is the map the implementation tasks follow; keep it factual (grep output), not aspirational.
- KNOWN FACTS (from planner recon, verify before relying): `UserSettings.glassTier` exists (schema line
  ~411, default `"auto"`) → no migration; the runner `<img>` uses `alt=""` and `{imageSrc && …}`; the only
  existing empty-state copy is «Помилок немає — гарна робота.» in `mistakes/page.tsx`.
- Non-Goal: any styling change, any new component, any schema change.

## Plan
- [x] `grep -rn` legacy tokens across app/ components/ ; tabulate counts + files.
- [x] Enumerate components/ and app/(app)/**/page.tsx ; note per-surface restyle need.
- [x] Confirm `UserSettings.glassTier` in schema; inspect `/api/q-image/[key]` miss path + runner `<img>`.
- [x] Write WAVE12A-SURFACES.md with all required sections.

## Next
- [x] Report complete — all 7 sections written, verify.sh PASS. Task done.

## Artifacts
- `docs/app-plan/WAVE12A-SURFACES.md` — the surface inventory (all required sections).

## Log
- 2026-07-02 laptop: planner scaffolded task.
- 2026-07-02 ClPcs-Mac-mini: ran legacy-token greps over app/+components/ (bg-sign 15, text-white 5, text-asphalt 116, text-muted 143, font-display 57, etc.), confirmed `UserSettings.glassTier @default("auto")` at schema.prisma:411 (no migration), inspected q-image route 404 miss path + runner `<img>` at test-runner.tsx:227/229, pulled new token values from 04-design-system.md §1A. Wrote full WAVE12A-SURFACES.md (Legacy tokens, Token usages, text-white-on-fill, Components, Screens, Glass tier plumbing, q-image miss path — recommend client `onError`). verify.sh → PASS wave12a-01. Status: done.

## Verify
**Last verify:** PASS (2026-07-02T05:21:18Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T05:22:04Z)
