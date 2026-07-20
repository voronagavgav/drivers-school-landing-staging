# FAILURES & BUGS LOG — Drivers School build

Running log of failures, bugs, and harness/tooling friction hit during this long-running build.
Newest entries at the bottom of each section. This feeds the Mesa learnings flywheel and the
"improve our systems during it" loop.

## Build / tooling failures
_(app build errors, dependency issues, framework gotchas)_

## Harness / capability failures
_(Mesa harness, context7, e2b, skills, subagents — friction or breakage)_

- 2026-06-16 — **`prisma migrate dev` is interactive → fails in the agent's non-TTY shell**
  ("Prisma Migrate has detected that the environment is non-interactive"). This matters for the
  Mesa harness too: any task that needs a migration can't use `migrate dev` headlessly.
  Workaround that IS non-interactive: `prisma migrate dev --create-only` (write the SQL) then
  `prisma migrate deploy` (apply) then `prisma generate`. Candidate learning for CLAUDE.md so the
  driver loop doesn't trip on it. (Alt: `prisma db push` for throwaway dev.)

## Product / logic bugs
_(test engine, progress, auth, data bugs found + fixed)_

- 2026-06-16 — **[fixed] Answer-leak in `getSessionState`.** Initial version revealed `option.isCorrect`
  + explanation for practice modes even while the session was IN_PROGRESS, so the client payload
  exposed the correct answer before the user answered. Fixed: reveal ONLY when `status==="COMPLETED"`;
  practice feedback now comes solely from `submitAnswer()`'s return value, not the page payload.
- 2026-06-16 — **[fixed] `TestAnswer` had no uniqueness on (session, question)**, so the idempotent
  `upsert` in submitAnswer had no key to target. Added `@@unique([testSessionId, questionId])`.
- 2026-06-16 — **[fixed] build] `import "server-only"` unresolved** (not installed) and **TS predicate
  error** narrowing a Prisma row to a narrower engine type — both fixed (installed `server-only`,
  used `NonNullable<typeof q>` predicate). Union narrowing of submitAnswer's return left `isCorrect`
  as `boolean|undefined` in the client — coerced with `?? false`.

---

### Log

- 2026-06-16 — Project created at `~/drivers-school` as a standalone git repo (isolated from `~/mesa`
  harness — the "separate codebase" safe path). Node v25.9.0 / npm 11.12.1, no pnpm. Will record
  Next.js/Node-25 compatibility issues here if they surface.
- 2026-06-16 — **[build] Prisma 7 breaking change.** `prisma generate` failed P1012: "The datasource
  property `url` is no longer supported in schema files." Prisma 7 removed `url`/`env()` from the
  `datasource` block; connection config for Migrate now lives in a `prisma.config.ts` (adapter or
  accelerateUrl), and `PrismaClient` gets the `adapter`. Fix: drop `url` from schema, add
  `prisma.config.ts` with a libsql migration adapter. (context7 docs didn't surface this specific
  removal — caught empirically. Worth feeding to the learnings store.)
