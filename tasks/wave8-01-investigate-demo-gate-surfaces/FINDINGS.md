# FINDINGS — wave8-01: demo serving-gate surface map

Investigation-only artifact. It enumerates every `SERVE_DEMO_QUESTIONS` / `demoWhere`
site under `lib/` and `app/`, classifies each as production code vs comment-only, and
hands tasks 02–06 an exact cleanup map. **No production/test code is changed by this task.**

Scope of the §D-5 grep is `lib/` + `app/` ONLY. A repo-wide sweep confirms there are NO
matches outside those two trees: the generated Prisma client, `prisma/` and `scripts/`
migration comments, and `tasks/` journals are explicitly out of scope. Later tasks must
NOT widen the scope.

Classification grep used:

```
grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/
```

---

## (a) PRODUCTION-CODE sites — four files to edit in §A-removal

These are the **four production files** the §A removal must touch:
`lib/constants.ts`, `lib/server/test-engine.ts`, `lib/server/mastery.ts`,
`app/(app)/practice/page.tsx`.

### 1. `lib/constants.ts` — the single source of the gate (edit FIRST)
- `:41–46` — the whole `// ---- Demo question gating (REVERSIBLE retirement) ----` block,
  ending in `export const SERVE_DEMO_QUESTIONS = false;` (line 46). Removing this export
  is the root edit; every other production site imports from here.
- **Typecheck-ordering constraint:** removing the export breaks every importer. The four
  production importers are edited in the same wave; the one *test* importer
  (`demo-retired.integration.test.ts`, see below) must be DELETED before/with this removal
  or the integration build fails to compile.

### 2. `lib/server/test-engine.ts` — the canonical pool filter
- `:8` — `SERVE_DEMO_QUESTIONS,` in the `@/lib/constants` import list (drop the line).
- `:57–60` — comment + `const demoWhere = SERVE_DEMO_QUESTIONS ? {} : { isDemo: false };`.
  Replace `demoWhere` with the unconditional `{ isDemo: false }` inlined into `baseWhere`.
- `:66` — `...demoWhere,` spread inside `baseWhere` → becomes `isDemo: false,`.
- `:125` — `...demoWhere` inside the MISTAKE_PRACTICE `where` → `isDemo: false`.
- `:142` — comment referencing the gate (`A saved DEMO question is also withheld …`).
- `:148` — `(SERVE_DEMO_QUESTIONS || !q.isDemo)` in the SAVED_QUESTIONS `.filter(...)` →
  simplifies to `!q.isDemo`.

### 3. `lib/server/mastery.ts` — **the spec-PROSE-MISSED production site** ⚠️ KEY DISCOVERY
The Wave-8 spec §A prose does NOT list `mastery.ts`, but the §D-5 grep gate
(`grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/` must return zero production hits)
WILL fail unless it is also cleaned. It carries its own copy of the live-pool filter so
mastery `coverage` totals match what `startSession` serves:
- `:3` — `import { SERVE_DEMO_QUESTIONS } from "@/lib/constants";` (delete the import).
- `:27` — doc-comment phrase `… incl. the SERVE_DEMO_QUESTIONS gate` (scrub the token).
- `:39` — `const demoWhere = SERVE_DEMO_QUESTIONS ? {} : { isDemo: false };`.
- `:44` — `...demoWhere,` spread inside `liveWhere` → `isDemo: false,`.

### 4. `app/(app)/practice/page.tsx` — per-topic servable count
- `:7` — `import { SERVE_DEMO_QUESTIONS } from "@/lib/constants";` (delete).
- `:20–23` — comment describing the mirror of `baseWhere + demoWhere`, then
  `const demoWhere = SERVE_DEMO_QUESTIONS ? {} : { isDemo: false };`.
- `:29` — `...demoWhere,` spread inside the `findMany` `where` → `isDemo: false,`.

> After removal, the four sites should hard-filter `isDemo: false` unconditionally
> (demo rows stay seeded but are never served), and the §D-5 grep over `lib/`+`app/`
> must find NO `SERVE_DEMO_QUESTIONS` / `demoWhere` tokens in production code.

---

## DELETE-TARGET — not comment-only: `demo-retired.integration.test.ts` (task 02)

`lib/server/demo-retired.integration.test.ts` is the ONLY surviving file outside the four
production files that has a real CODE dependency on the constant — it is not comment-only:
- `:4` — `import { SERVE_DEMO_QUESTIONS } from "@/lib/constants";`
- `:7` — comment naming the gate.
- `:80` — `const itDemoOff = SERVE_DEMO_QUESTIONS ? it.skip : it;` (live use in test wiring).

This entire suite exists to assert the reversible-gate behaviour. Once the gate is gone its
premise is moot, and its `import { SERVE_DEMO_QUESTIONS }` would be a compile error the
moment the export is removed. **Therefore it must be DELETED before/with the constant
removal** (this is task wave8-02; it is a hard prerequisite of the §A constant edit in
task wave8-03 — confirm 02 is done first).

---

## (b) COMMENT-ONLY sites — surviving integration tests (task 04 scrub)

These suites mention the token ONLY inside comments (no `import`, no live use). They keep
their throwaway OFFICIAL fixtures and pass unchanged; task 04 just scrubs the stale
comment references so the §D-5 grep stays clean:

| File | Line(s) | Nature |
|------|---------|--------|
| `lib/server/engine.integration.test.ts`            | `:8`        | comment |
| `lib/server/finish-idempotency.integration.test.ts`| `:8`        | comment |
| `lib/server/due-mistakes.integration.test.ts`      | `:30`       | comment |
| `lib/server/progress-volume.integration.test.ts`   | `:40`       | comment |
| `lib/server/exam-short-pool.integration.test.ts`   | `:37`       | comment |
| `lib/server/mixed-weak-topics.integration.test.ts` | `:28`       | comment |
| `lib/server/saved-excludes-unpublished.integration.test.ts` | `:32` | comment |
| `lib/server/access-control.integration.test.ts`    | `:45`, `:115` | comment |

(The §D-5 grep gate must end with zero hits across `lib/`+`app/`, so these comment
mentions of `SERVE_DEMO_QUESTIONS` must also be reworded — e.g. "demo questions are not
served to live pools" — without the literal token.)

---

## (c) Shared OFFICIAL-fixture helper candidates (task 05)

Integration suites that hand-roll a throwaway OFFICIAL (`isDemo: false` /
`sourceType: "OFFICIAL"`) question fixture — candidates to adopt the §C shared helper.
Confirmed via `grep -rlnE 'isDemo:\s*false|sourceType:\s*"OFFICIAL"' lib/server/*.integration.test.ts`:

- `access-control`
- `analytics-dashboard`
- `engine`
- `due-mistakes`
- `exam-blueprint`
- `mixed-weak-topics`
- `finish-idempotency`
- `exam-short-pool`
- `progress-volume`
- `saved-excludes-unpublished`

Also surfaced by the grep (create OFFICIAL fixtures but for narrower purposes; the helper
may or may not fit them — task 05's call): `admin-label-consistency`, `content-upsert`.
`demo-retired` is excluded (being deleted in task 02).

The §C helper module (task 05) drafts the shared OFFICIAL-question factory and adopts it
first in the **engine** suite, then fans out to the rest.

---

## (d) PRESERVE list — must NOT be removed this wave

This wave removes ONLY the serving-gate token, never the underlying data model. Keep ALL
of the following intact:

1. **`Question.isDemo` column** (`prisma/schema.prisma`) — demo rows stay seeded; the
   production filter still references `isDemo: false`.
2. **`Question.sourceType` column** and the **`DEMO` value in `SOURCE_TYPES`**
   (`lib/constants.ts:38` — `["DEMO", "OFFICIAL", "CUSTOM"] as const`). The `DEMO` enum
   member stays; only the `SERVE_DEMO_QUESTIONS` gating block (`:41–46`) is removed.
3. **The `lib/validation.ts` refine** (`:99–110`): `sourceType` enum + `isDemo` boolean
   with `.refine((q) => (q.sourceType === "DEMO") === (q.isDemo === true), …)` enforcing
   `sourceType==="DEMO" ⇔ isDemo===true`. This invariant is unrelated to serving and must
   be preserved.

---

## Summary for tasks 02–06

- **02** — delete `lib/server/demo-retired.integration.test.ts` (real code dep; must go
  before the constant export is removed).
- **03** — remove `SERVE_DEMO_QUESTIONS` and inline `isDemo: false` across the FOUR
  production files (`lib/constants.ts` first, then `test-engine.ts`, `mastery.ts`,
  `practice/page.tsx`). `mastery.ts` is the spec-missed site the §D-5 grep forces.
- **04** — scrub comment-only token mentions in the eight surviving integration suites.
- **05** — build the shared OFFICIAL-question fixture helper; adopt in `engine` first.
- **06** — verify: §D-5 grep returns zero `lib/`+`app/` hits; full integration suite green.
- **PRESERVE** throughout: `isDemo`/`sourceType` columns, the `DEMO` `SOURCE_TYPES` value,
  and the `lib/validation.ts` `sourceType==="DEMO" ⇔ isDemo` refine.
