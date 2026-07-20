# Drivers School — MVP spec (harness signal)

Web-first preparation platform for the theoretical ПДР / driving-rules exam in Ukraine.
**Preparation tool only** — not an official exam system; makes no claim of official status,
state integration (МВС / ГСЦ МВС), or guaranteed passing. Demo content is labelled as demo.

## Stack (chosen)
Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind v4 · Prisma 7 (libsql/SQLite dev,
Postgres-portable) · custom email+password auth (bcryptjs + signed session cookie) · Vitest.

## Scope (MVP)
- **Auth & RBAC**: register / login / logout; roles USER, ADMIN, CONTENT_MANAGER; server-side route guards.
- **Onboarding**: pick driver category; dashboard.
- **Test engine** (`lib/test-engine`, reusable, not scattered in UI) with 5 modes:
  EXAM_SIMULATION (timed, hidden explanations, max-errors), TOPIC_PRACTICE, MISTAKE_PRACTICE
  (spaced by repeat, resolves after N corrects), MIXED_PRACTICE (weak-topic priority), SAVED_QUESTIONS.
  Configurable constants: DEFAULT_EXAM_QUESTION_COUNT / TIME_LIMIT_MINUTES / MAX_ERRORS.
- **Progress**: real calc — answered/unique/correct/wrong, accuracy overall + by topic, sessions,
  unresolved/repeated mistakes, weak topics, explainable readiness estimate (5 levels + reasons).
- **Mistakes**: mistake bank; status transitions; saved questions.
- **Admin**: manage categories/topics/questions/options/explanations/images; publish/unpublish/archive;
  content versions; basic per-question performance stats.
- **Analytics**: non-blocking event log (see lib/constants ANALYTICS_EVENTS) + AdminActionLog.

## Quality bar
App runs locally; migrate + seed work; register→login→onboard→test→result→mistakes→dashboard all use
REAL data; admin can manage questions; build passes or known issues are documented. No dead MVP-critical
buttons, no fake stats. Unit tests for: result calc, answer validation, readiness, mistake-status, selection.

## Content / legal policy
Demo/sample questions only (isDemo=true, sourceType=DEMO), labelled in UI + admin. Import-ready
architecture for future official content: ContentVersion + source + reviewedStatus + isDemo + admin review.
Exam rules are configurable constants, commented — no buried legal assumptions.
