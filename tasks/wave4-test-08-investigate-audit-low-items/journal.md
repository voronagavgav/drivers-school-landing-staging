# Task: wave4-test-08-investigate-audit-low-items

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** ClPcs-Mac-mini

## Goal
INVESTIGATION ONLY (no production code, no commits beyond this journal). Spec D: "Address remaining
AUDIT.md Low items that are cheap and safe (per its Wave column)." Determine the AUTHORITATIVE shortlist
of Low items that (a) are still unaddressed in the current code, and (b) are cheap AND safe to fix
without a schema change or behavior regression. "Done" = `## Findings` records a per-item verdict.

1. Findings enumerate EVERY `Low`-severity row in `AUDIT.md`'s findings table, and for each records a
   verdict: `ALREADY DONE` (with the file:line proving it), `DEFER` (too risky/large or out of Wave 4
   scope, with reason), or `FIX IN WAVE 4` (cheap + safe).
2. Findings explicitly confirm the status of these specific Low items by reading the current code:
   - Security headers (`next.config.ts`) — confirm whether a `headers()` block already exists
     (`X-Frame-Options`/`nosniff`/`Referrer-Policy`) ⇒ likely ALREADY DONE.
   - `SESSION_SECRET` fallback (`lib/auth.ts:13-15`, `secret()`) — confirm it still silently falls back
     to `"dev-only-insecure-secret"` with NO production guard ⇒ candidate FIX (handled by task 09).
   - Mistakes copy hardcoding "Двічі" vs `MISTAKE_RESOLVE_THRESHOLD` (`app/(app)/mistakes/page.tsx:17`,
     `lib/constants.ts:73`) ⇒ candidate FIX (handled by task 10).
   - Save-toggle reconcile / seed `isSaved` from server (`components/test-runner.tsx`) — record whether
     `saved` is seeded from server state and whether `toggleSave` reverts on action failure; judge
     cheap-vs-risky.
   - MISTAKE/SAVED pools not category-scoped (`lib/server/test-engine.ts`) — the AUDIT fix is "decide +
     document"; record whether a clarifying decision/comment already exists.
   - Empty-pool buttons / `searchParams.empty` (`app/(app)/dashboard/page.tsx`) — AUDIT says "None
     required"; record as DEFER (no change).
3. Findings state which items tasks 09 and 10 already cover, and list any ADDITIONAL cheap+safe item (if
   any) the driver believes should be fixed — but do NOT create new tasks; only recommend. The default
   Wave 4 D scope is tasks 09 + 10 unless an item is both clearly cheap AND clearly safe.
4. Findings confirm NO item on the FIX list requires a Prisma schema change (Wave 4 is no-schema-change).

## Constraints / decisions
- READ-ONLY. Edit only this journal's `## Findings`. Do not change source files.
- Be CONSERVATIVE: when in doubt about safety or size, mark `DEFER` with a one-line reason. "Cheap and
  safe" is the bar; a UX change that needs new server plumbing (e.g. seeding `isSaved` through
  `getSessionState`) is NOT cheap — DEFER it.
- Non-Goal: implementing any fix (tasks 09/10 do the confirmed ones). Do not re-open prior-wave tasks.

## Plan
- [x] Read `AUDIT.md` Low rows + each referenced file at the current HEAD.
- [x] Record a per-item verdict (ALREADY DONE / DEFER / FIX IN WAVE 4) with file:line evidence.

## Done
- [x] Enumerated all 6 `Low`-severity AUDIT rows, read each referenced file at HEAD, recorded a
      per-item verdict with file:line evidence in `## Findings`.

## Next
- [ ] (none — Findings complete; Goal met. Default Wave 4 D fix scope = tasks 09 + 10.)

## Findings

The AUDIT findings table has exactly **6 `Low`-severity rows** (AUDIT.md lines 19–24). Verified each
against current HEAD. Note: several AUDIT file:line refs have drifted (the code was refactored after the
audit); current line numbers are given below.

### L1 — Security / session: SESSION_SECRET silent fallback → **FIX IN WAVE 4 (task 09)**
- AUDIT ref `lib/auth.ts:13-15`. **Confirmed STILL PRESENT** at `lib/auth.ts:13-15`:
  `function secret() { return process.env.SESSION_SECRET ?? "dev-only-insecure-secret"; }` — no
  production guard; an unset secret in prod yields forgeable cookies.
- Cheap + safe (a startup/throw guard, no schema change). **Covered by task 09**
  (`wave4-test-09-session-secret-prod-guard` → pure `lib/session-secret.ts` helper). On the FIX list.

### L2 — Security / headers: no security headers → **ALREADY DONE**
- AUDIT ref `next.config.ts`. **Already fixed** at `next.config.ts:18-29`: an async `headers()` block now
  sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` on `/:path*`. (Strict script/style CSP deliberately
  omitted per the inline comment — Tailwind/Turbopack inline assets.) No action needed.

### L3 — UX / dead control: save-toggle reconcile + seed `isSaved` from server → **DEFER**
- AUDIT ref `components/test-runner.tsx:84-90,157-159` (drifted). **Confirmed STILL TRUE** at current
  `components/test-runner.tsx`:
  - `saved` state is `useState<Record<string, boolean>>({})` (line 47) — **not seeded from server**.
    The `RunnerQuestion` interface (lines 13–22) has **no `isSaved` field**, and `startSession` /
    `getSessionState` (`lib/server/test-engine.ts`) never project saved-state — so an already-saved
    question shows "☆ Зберегти" until clicked.
  - `toggleSave` (lines 119–125) writes optimistic local state then `await toggleSaveAction(...)` with
    **no try/catch and no revert** — a thrown action leaves the star stuck toggled.
- **Verdict DEFER.** Seeding `isSaved` is NOT cheap: it requires new server plumbing (add `isSaved` to
  the `getSessionState` projection + `RunnerQuestion` + the page that builds it). The revert-on-failure
  half is small but cosmetic/low-value and out of the minimal Wave 4 D scope. No task covers it; per the
  CONSERVATIVE constraint ("seeding `isSaved` through `getSessionState` is NOT cheap — DEFER it"), defer.

### L4 — UX / copy: mistakes page hardcodes "Двічі" vs `MISTAKE_RESOLVE_THRESHOLD` → **FIX IN WAVE 4 (task 10)**
- AUDIT ref `app/(app)/mistakes/page.tsx:17-18` vs `lib/constants.ts:66`. **Confirmed STILL TRUE**:
  `app/(app)/mistakes/page.tsx:17` hardcodes `"...Двічі поспіль відповівши правильно, ви закриєте
  помилку."`; the constant is `MISTAKE_RESOLVE_THRESHOLD = 2` at **`lib/constants.ts:73`** (drifted from
  :66 — line 66 is now the login-throttle comment). If the constant changes the copy silently lies.
- Cheap + safe (string interpolation, no schema change). **Covered by task 10**
  (`wave4-test-10-mistakes-copy-threshold`). On the FIX list.

### L5 — Correctness: MISTAKE/SAVED pools not category-scoped → **DEFER**
- AUDIT ref `lib/server/test-engine.ts:62-91`. **Confirmed STILL UNSCOPED** at
  `lib/server/test-engine.ts:63-93`: `MISTAKE_PRACTICE` queries
  `prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } })` and `SAVED_QUESTIONS` queries
  `prisma.savedQuestion.findMany({ where: { userId } })` — neither applies the `categories: { some: { id }
  }` clause that `baseWhere` (lines 54–59) gives exam/topic/mixed. **No clarifying decision/comment
  exists** (the only nearby comments concern spaced ordering and unpublished/archived filtering).
- **Verdict DEFER.** The AUDIT fix is "decide + document, and if per-category, filter the pool."
  Filtering would be a **behavior change** (changes which questions appear → regression risk), so not
  "clearly safe." A doc-only comment affirming "mistakes/saved are intentionally global" would be
  cheap+safe, but it's a product decision and no task covers it. Conservatively DEFER; *optional*
  recommendation below.

### L6 — UX: empty-pool buttons / `searchParams.empty` → **DEFER (no change required)**
- AUDIT ref `app/(app)/dashboard/page.tsx:33-39,82-86` (drifted). **Confirmed safe** at current
  `app/(app)/dashboard/page.tsx:38-44,95-99`: `empty` is used only as a key into the `EMPTY_NOTICE` map
  (line 95) — a lookup, never rendered as raw input, so XSS-safe. AUDIT's own suggested fix is "**None
  required**." Mode buttons can still be pressed on an empty pool, falling back to the `?empty=MODE`
  banner — acceptable by design. **DEFER (no change).**

### Summary
| # | AUDIT row | Verdict | Covered by |
|---|---|---|---|
| L1 | Security/session — SESSION_SECRET fallback | **FIX IN WAVE 4** | task 09 |
| L2 | Security/headers | **ALREADY DONE** (`next.config.ts:18-29`) | — |
| L3 | UX — save-toggle reconcile/seed | **DEFER** (needs server plumbing — not cheap) | — |
| L4 | UX/copy — "Двічі" hardcode | **FIX IN WAVE 4** | task 10 |
| L5 | Correctness — MISTAKE/SAVED not category-scoped | **DEFER** (behavior-change risk; "decide+document") | — |
| L6 | UX — empty-pool buttons | **DEFER** (no change required per AUDIT) | — |

**Authoritative cheap+safe Wave 4 D shortlist = {L1, L4} = tasks 09 + 10.** No ADDITIONAL item is both
clearly cheap AND clearly safe, so no new task is recommended (the driver creates none here).
- *Optional, non-blocking:* if a one-liner is wanted, L5's "document the intentional global behavior"
  could be a one-line code comment in `lib/server/test-engine.ts` (no behavior change) — but it is a
  product decision, so it is left as a recommendation, NOT placed on the FIX list.

**Schema check (Goal item 4):** NEITHER FIX-list item touches Prisma. Task 09 adds a pure
`lib/session-secret.ts` (env read + throw); task 10 interpolates an existing constant into JSX. **No
`schema.prisma` change is required for any FIX-list item** — consistent with the Wave 4 no-schema-change
rule.

## Artifacts
- (this journal's Findings section) — the cheap+safe Low-item shortlist driving tasks 09–10.

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: Read all 6 `Low` AUDIT rows + referenced files at HEAD
  (`next.config.ts`, `lib/auth.ts`, `app/(app)/mistakes/page.tsx`, `lib/constants.ts`,
  `components/test-runner.tsx`, `lib/server/test-engine.ts`, `app/(app)/dashboard/page.tsx`). Recorded
  per-item verdicts in `## Findings`: L1 (SESSION_SECRET fallback) FIX→task09, L2 (security headers)
  ALREADY DONE (`next.config.ts:18-29`), L3 (save-toggle reconcile/seed) DEFER (needs server plumbing),
  L4 (mistakes "Двічі" copy) FIX→task10, L5 (MISTAKE/SAVED not category-scoped) DEFER (behavior-change
  risk), L6 (empty-pool buttons) DEFER (no change required). Confirmed cheap+safe shortlist = {L1,L4} =
  tasks 09+10; no additional item recommended; no FIX-list item needs a Prisma schema change. Status→done.

## Verify
**Last verify:** PASS (2026-06-17T16:26:33Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T16:27:44Z)
