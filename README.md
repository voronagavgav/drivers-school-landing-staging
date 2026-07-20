# Drivers School

Web-first platform for **preparing** for the theoretical ПДР / driving-rules exam in Ukraine.
A learning tool — **not** an official exam system. It makes no claim of official status, state
integration (МВС / ГСЦ МВС), or guaranteed passing, and does not replace mandatory practical lessons.
All bundled questions are **demo content**, labelled as such.

## Stack

Next.js 16 (App Router, Server Actions, Turbopack) · TypeScript · Tailwind v4 · Prisma 7
(libsql/SQLite for dev, Postgres-portable) · custom email+password auth (bcryptjs + signed cookie) ·
Vitest. UI in Ukrainian, mobile-first.

## Run locally

```bash
npm install
npx prisma generate          # generate the Prisma client (lib/generated/prisma)
npx prisma migrate deploy    # apply migrations -> prisma/dev.db  (see note below)
npm run db:seed              # load demo categories/topics/questions + users
npm run dev                  # http://localhost:3000
```

`.env` (already present for dev) needs `DATABASE_URL="file:./prisma/dev.db"` and a `SESSION_SECRET`.

> Migration note: this repo uses `prisma migrate deploy` (non-interactive). `prisma migrate dev`
> is interactive and fails in headless shells — see `FAILURES.md` / `CLAUDE.md`.

## Test / build

```bash
npm test                  # 29 pure unit tests (engine scoring/selection, progress/readiness, mistakes)
npm run test:integration  # end-to-end flow against the seeded DB (create→answer→finish→mistakes→progress)
npm run typecheck         # tsc --noEmit
npm run build             # production build (Turbopack)
```

## HTTP smoke test

`scripts/smoke.sh` is a manual, optional end-to-end check that hits a few core routes over HTTP
(authenticated dashboard, guarded `/admin`) against an **already-running** server. It is **not** part
of the automated verify gate and is **not** run by `npm test` — run it by hand when you want to
sanity-check a live server.

```bash
SMOKE_BASE_URL=http://localhost:3000 ./scripts/smoke.sh   # SMOKE_BASE_URL defaults to http://localhost:3000
```

Prerequisites (the script does not start anything itself):

- The dev or prod server is already running and reachable at `SMOKE_BASE_URL` (e.g. `npm run dev`).
- The DB is seeded (`npm run db:seed`) so the demo users exist.
- This shell exports the **same** `SESSION_SECRET` the server uses, so the cookies it mints
  verify against the server's auth.

## Seeded users

| Role | Email | Password |
|------|-------|----------|
| User | `user@drivers.school` | `User12345` |
| Admin | `admin@drivers.school` | `Admin12345` |
| Content manager | `content@drivers.school` | `Content12345` |

## Architecture

- `lib/test-engine/` — **pure** engine logic (selection per mode, scoring, exam evaluation). No DB.
- `lib/progress.ts`, `lib/mistakes.ts` — pure progress/readiness + mistake state machine.
- `lib/server/` — DB orchestration (`test-engine`, `progress`, `mistakes`, `saved`, `admin`) wrapping the pure logic.
- `lib/auth.ts` / `lib/rbac.ts` — auth + server-side role guards (USER / ADMIN / CONTENT_MANAGER).
- `lib/analytics.ts` — non-blocking event log + admin audit log.
- `app/(app)/` — user screens; `app/admin/` — admin panel; `app/actions/` — server actions.

## Exam rules are configurable

See `lib/constants.ts`: `DEFAULT_EXAM_QUESTION_COUNT`, `DEFAULT_EXAM_TIME_LIMIT_MINUTES`,
`DEFAULT_EXAM_MAX_ERRORS`, readiness thresholds, mistake-resolve threshold. These are preparation
defaults, **not** official legal values.

## Migrating to Postgres

Schema is Postgres-portable (no SQLite-only types; JSON stored as String). To switch: set
`DATABASE_URL` to a `postgresql://…` URL, change the datasource provider to `postgresql`, and swap
`PrismaLibSql` for `@prisma/adapter-pg`'s `PrismaPg` in `lib/db.ts`.
