# FINDINGS — wave6-01 investigate image content surfaces

INVESTIGATION ONLY. No product code changed. Citations are `path:line` so tasks 02–10 can rely on them.

---

## 1. Render surfaces — where a question image is shown today, and how it gets its `src`

Every render surface derives its `src` from a single nullable scalar `Question.imageUrl`, passed through
`safeImageUrl()` (`lib/sanitize.ts:17`). That function only PASSES THROUGH a same-origin root-relative
path (`/…`, not `//` or `/\`) or an `http:`/`https:` absolute URL, else returns `null`
(`lib/sanitize.ts:21-29`). It does NOT resolve, rewrite, or pick between image tiers — the stored string
IS the served path. This is the single chokepoint a tier resolver (tasks 03–05) would replace/feed.

### 1a. Test runner (the live test/exam UI) — `components/test-runner.tsx`
- Per-question field typed as `imageUrl: string | null` on `RunnerQuestion` (`components/test-runner.tsx:17`).
- `import { safeImageUrl } from "@/lib/sanitize";` (`components/test-runner.tsx:7`).
- `const imageSrc = safeImageUrl(q.imageUrl);` for the current question (`components/test-runner.tsx:67`).
- Rendered: `{imageSrc && (… <img src={imageSrc} alt="" className="mt-3 max-h-56 rounded-lg border border-line" /> …)}`
  (`components/test-runner.tsx:186-188`). Plain `<img>`, no `next/image`.

### 1b. Test page (server component that feeds the runner) — `app/(app)/test/[id]/page.tsx`
- Calls `getSessionState(id, user.id)` (`app/(app)/test/[id]/page.tsx:10`) then maps each question to the
  runner shape, copying `imageUrl: q.imageUrl` straight through (`app/(app)/test/[id]/page.tsx:21`).
- So the path the browser loads is decided upstream in `getSessionState` — this page does no image logic.

### 1c. Session-state selection (the per-question fields handed to the renderer) — `lib/server/test-engine.ts`
- `getSessionState` includes `question` (with `options`, `explanation`, `topic`) on each session question
  (`lib/server/test-engine.ts:250-258`).
- It returns each question with `imageUrl: sq.question.imageUrl` taken verbatim from the stored row
  (`lib/server/test-engine.ts:291`). No resolution / tier choice here either — just the raw scalar.
- Separately, the exam content-dedup key is `text + "||" + (imageUrl||"")`
  (`lib/server/test-engine.ts:106-111`; the cheap-scalars select at `lib/server/test-engine.ts:94-100`).
  NOTE for downstream: if a resolver changes how images are keyed/served but `imageUrl` stays the dedup
  identity, dedup behaviour is unaffected; but any move to an `imageKey` field (task 02/06) must keep a
  stable per-prompt identity here or exam dedup shifts.

### 1d. Admin question editor + live preview — `app/admin/questions/question-editor.tsx`
- Field typed `imageUrl: string | null` on the editor data (`app/admin/questions/question-editor.tsx:34`),
  held in local state `const [imageUrl, setImageUrl] = useState<string>(data.imageUrl ?? "")`
  (`app/admin/questions/question-editor.tsx:109`).
- Sanitised for preview: `const safeImage = useMemo(() => (trimmedImage ? safeImageUrl(trimmedImage) : null), …)`
  (`app/admin/questions/question-editor.tsx:111-112`).
- Free-text `imageUrl` input (`app/admin/questions/question-editor.tsx:243-246`) and a preview
  `<img src={safeImage} … />` guarded by `{safeImage && …}` (`app/admin/questions/question-editor.tsx:260-272`).

### 1e. Admin write/list paths — `app/admin/actions.ts`, `app/admin/questions/page.tsx`, `lib/server/admin.ts`
- Create + update read `imageUrl` from the form (`app/admin/actions.ts:101`, `:173`), re-sanitise with
  `safeImageUrl` and persist only the approved value, rejecting if sanitisation nulls a non-null input
  (`app/admin/actions.ts:117-118`, `:189-190`); stored at `app/admin/actions.ts:133`, `:209`.
- The questions list derives `hasImage: q.imageUrl !== null && q.imageUrl !== ""`
  (`app/admin/questions/page.tsx:137`); the admin filter maps "with/without image" to
  `where.imageUrl = { not: null }` / `null` (`lib/server/admin.ts:215-216`). New-question default
  `imageUrl: null` (`app/admin/questions/new/page.tsx:8`); edit-page seed `imageUrl: question.imageUrl`
  (`app/admin/questions/[id]/page.tsx:38`).

### 1f. Tests that pin `imageUrl` semantics (so later tasks know what they may break)
- `lib/server/admin-questions-bulk.integration.test.ts:52,62,148,159` — builds questions with `imageUrl`
  and asserts the with-image filter returns only rows where `imageUrl` is truthy.
- `lib/server/exam-blueprint.integration.test.ts:106,113-114,156` — rebuilds the same
  `text + "||" + (imageUrl||"")` content key and asserts all 20 exam questions have DISTINCT keys.

### Summary of the chokepoint
`Question.imageUrl` (one nullable string) → `safeImageUrl()` → `<img src>`, in BOTH the live runner and the
admin preview. There is exactly ONE field and ONE sanitiser between the DB and the browser today; no tier
selection exists yet. A resolver (tasks 03–05) slots in by either rewriting what `imageUrl` resolves to at
render time, or by introducing an `imageKey` (tasks 02/06) the resolver maps to a first-existing tier path.

---

## 2. Produce/serve chain — `import-official.ts`, `golive.mjs`, `public/` dirs, extensions

Two scripts produce image bytes + decide `Question.imageUrl`; both write a **root-relative** path that
the runner serves verbatim (no resolver between DB and `<img>`, per §1). Restyled bytes are a SECOND copy
under a different dir; go-live just RE-POINTS the stored string. Nothing today picks the "best" tier at
render time — that is exactly what tasks 03–07 introduce.

### 2a. Original-image producer — `scripts/import-official.ts`
- Source/dest dirs: `IMG_SRC_DIR = .content-import` (`scripts/import-official.ts:36`),
  `IMG_DEST_DIR = public/official-images` (`scripts/import-official.ts:37`).
- Idempotent reset: it `rmSync`s then `mkdirSync`s `public/official-images/` on every run
  (`scripts/import-official.ts:119-120`) — so the dir is REBUILT from `.content-import` each import.
- Image branch (per question): if the plan row has `q.image && q.image_src`, it
  `copyFileSync(.content-import/<image_src> → public/official-images/<image>)` and sets
  `imageUrl = "/official-images/<image>"` (`scripts/import-official.ts:193-195`). ELSE if a hand-authored
  SVG is registered for `"<label>:<qnum>"` in `.content-import/question-svgs/index.json`
  (`scripts/import-official.ts:70-74`), it copies that SVG into `public/official-images/<svgFile>` and sets
  `imageUrl = "/official-images/<svgFile>"` (`scripts/import-official.ts:196-200`).
- Persisted on the row at create: `imageUrl` with `sourceType:"OFFICIAL"`, `isDemo:false`
  (`scripts/import-official.ts:224-226`). There is NO `imageKey` field today — only the full `imageUrl`
  string (the basename lives only inside that path); task 06 derives `imageKey` = basename-without-ext here.
- STALE-COMMENT FLAG for task 06: the header says "Only text-only questions … are imported (image questions
  deferred)" (`scripts/import-official.ts:17`), yet the image-copy branch above is live and
  `public/official-images/` currently holds **734** files (see 2d). Whether image rows actually import
  depends on `import_plan.json` carrying `image`/`image_src`; the code PATH already supports them.

### 2b. Restyled producer + go-live re-pointer — `scripts/restyle/golive.mjs`
- Three subcommands: `apply` / `revert` / `status` (`scripts/restyle/golive.mjs:1-4`,`:11`). Uses RAW sqlite3
  (`execFileSync('sqlite3', [DB,q])`, `scripts/restyle/golive.mjs:9`; `DB = prisma/dev.db`,
  `scripts/restyle/golive.mjs:8`) — NOT Prisma, so it bypasses the generated client entirely.
- `apply` (`scripts/restyle/golive.mjs:13-29`): reads `scripts/restyle/state.json`
  (`STATE`, `scripts/restyle/golive.mjs:8`), keeps only `state.status` entries whose value is the literal
  string `"approved"` (`scripts/restyle/golive.mjs:15`). For each approved `file`: `base = file` minus a
  `.jpg/.jpeg/.png` extension (regex `/\.(jpe?g|png)$/i`, `scripts/restyle/golive.mjs:19`); requires
  `public/restyled/<base>.png` to exist or it skips+counts it missing (`scripts/restyle/golive.mjs:20`);
  then `offUrl="/official-images/<file>"`, `reUrl="/restyled/<base>.png"` (`scripts/restyle/golive.mjs:21`),
  finds `Question.id`s WHERE `imageUrl=offUrl` (`:22`), records the original in
  `scripts/restyle/golive-log.json` for revert (`:24`), and `UPDATE Question SET imageUrl=reUrl`
  (`scripts/restyle/golive.mjs:25`). Output is ALWAYS `/restyled/<base>.png` (the restyled tier is
  PNG-only, regardless of the original's extension).
- `revert` (`scripts/restyle/golive.mjs:30-35`) restores each logged id's original `imageUrl`;
  `status` (`:36-40`) counts `imageUrl LIKE '/restyled/%'` vs `LIKE '/official-images/%'`.
- GOTCHA for task 07: `apply`'s filter is an EXACT `s === 'approved'` (`scripts/restyle/golive.mjs:15`).
  Many `state.status` values are freeform reviewer notes (e.g. `"gentle redo (Danil good)"`,
  `"sign-paste: … (Danil okay)"`, `"… (Danil: keep this version)"` — see `scripts/restyle/state.json` tail),
  so those human-APPROVED-but-noted images are NOT flipped by the current `apply`. Task 07 (rewrite `apply`
  to publish into `public/restyled-live/`) must decide whether note-valued statuses count as approved.

### 2c. Approval ledger — `scripts/restyle/state.json`
- Shape: `{ status: {<srcFile>: <"approved"|freeform-note>}, lastBatch: [...], batchNum: 4, notes, regions:{} }`
  (top-level keys confirmed; `batchNum` currently `4`, `regions` empty `{}`).
- `status` has **60** entries valued exactly `"approved"` plus several freeform-note entries; its KEYS use
  `.jpeg` (106) and `.png` (3) extensions only. This is the source of truth `golive apply` reads.

### 2d. Bytes on disk + the actual extension set (resolver input for tasks 03–05)
- `public/official-images/` (original tier): **734** files — **629 `.jpeg`, 104 `.png`, 1 `.svg`**.
- `public/restyled/` (restyled bytes): **77** files — **all `.png`** (go-live always emits `<base>.png`).
- `.jpg` (the short form) is **matched defensively** by both producers (importer plan field + golive regex
  `/\.(jpe?g|png)$/i`, `scripts/restyle/golive.mjs:19`) but **zero `.jpg` files exist on disk today** — the
  real corpus uses `.jpeg`. So the extension set a resolver's candidate list must cover =
  **{ `.png`, `.jpeg`, `.jpg` (defensive), `.svg` }**, matching Goal §4.
- Tier dir summary for tasks 03–05: original = `public/official-images/`; restyled bytes = `public/restyled/`
  (current) → task 07 republishes approved into `public/restyled-live/`; override (proposed, not yet existing)
  = `public/image-overrides/`.

---

## 3. Seed/test constraints — seed.ts, seed-content test, SERVE_DEMO_QUESTIONS, demoWhere, demo topics

The seed is **demo-only** today. Several wave6 tasks (08 load official into seed, 09 retire demo topics,
10 servable-scoped counts) change what the DB holds, which directly stresses an integration test that
currently assumes "every published question is demo". This section pins those constraints with citations.

### 3a. The demo seed produces only `isDemo`/`DEMO` rows — `prisma/seed.ts`
- Header is explicit: "DEMO CONTENT ONLY … NOT official … Every question is isDemo=true / sourceType=DEMO"
  (`prisma/seed.ts:11-15`).
- Every question is created `sourceType:"DEMO"`, `isDemo:true`, `isActive:true`, `isPublished:true`
  (`prisma/seed.ts:450-453`), connected to a demo `ContentVersion` ("Демонстраційний набір ПДР v1",
  `prisma/seed.ts:391-399`, id at `:454`). **No `imageUrl` is ever set** by the seed — demo questions are
  text-only, so the seed contributes ZERO image surfaces (relevant to tasks 02–06: the seed needs no image
  field; only the official importer does).
- Counts: the `QUESTIONS` array has **25** entries (`prisma/seed.ts:39-368`; `created` increments per
  question, `:473`); `TOPICS` has **8** entries (`prisma/seed.ts:28-37`); **8** categories (B/A/C/D/T/BE/CE/DE,
  `prisma/seed.ts:402-425`); **3** users (`prisma/seed.ts:482-490`).
- Final print (a verify gate may match this exact shape): the run logs
  `Seeding Drivers School (DEMO content)…` (`prisma/seed.ts:371`) and ends with
  `` Done. ${created} demo questions, ${TOPICS.length} topics, 8 categories, 3 users. `` (`prisma/seed.ts:492`)
  — i.e. literally `Done. 25 demo questions, 8 topics, 8 categories, 3 users.` today. Task 08 (load official
  into the seed) must keep/extend this line if anything greps it; "8 categories" is a HARD-CODED literal, not
  derived, so adding/removing a category silently desyncs the message.

### 3b. The seed-content test asserts EVERY published Q is demo — and WHY task 08 breaks it
- `lib/server/seed-content.integration.test.ts` is READ-ONLY (it does NOT re-seed; the driver runs `db:seed`
  before it, header `:4-13`) and asserts three invariants over `prisma.question.findMany({ where:{ isPublished:true }})`
  (`:21-24`):
  - (a) `published.length >= 24` (`:27`),
  - (b) each published Q has EXACTLY ONE `isCorrect` option (`:31-32`),
  - (c) each published Q is `isDemo === true` AND `sourceType === "DEMO"` (`:35-36`).
- **BREAKAGE for task 08:** invariant (c) queries by `isPublished:true` with NO `isDemo` filter, so the moment
  the seed also loads OFFICIAL (`isDemo:false`, `sourceType:"OFFICIAL"`) published rows, (c) FAILS on the first
  official row. So whoever lands task 08 (`importOfficial(prisma)` called from the seed) MUST also update this
  test — e.g. scope (c) to `where:{ isPublished:true, isDemo:true }`, or assert "demo rows are demo AND at
  least one official row exists", rather than "ALL published rows are demo". Note invariant (a) `>= 24` stays
  satisfied (official only ADDS rows). This is the single test most coupled to the demo-only assumption.

### 3c. The live-pool demo gate — `SERVE_DEMO_QUESTIONS` + `demoWhere`
- `SERVE_DEMO_QUESTIONS = false` (`lib/constants.ts:46`), under a "REVERSIBLE retirement" comment
  (`lib/constants.ts:41-46`): demo rows stay seeded but are filtered out of every LIVE pool; flip to `true`
  to bring them back. It is the single intentional switch — pool code must not re-encode the decision.
- The engine applies it as `const demoWhere = SERVE_DEMO_QUESTIONS ? {} : { isDemo: false }`
  (`lib/server/test-engine.ts:60`), spread into `baseWhere` (`lib/server/test-engine.ts:62-68`) which ALSO
  requires `isActive:true, isPublished:true, archivedAt:null` and (when a category is given)
  `categories:{ some:{ id } }`. Same `baseWhere` feeds both the blueprint-exam candidate fetch
  (`lib/server/test-engine.ts:98-101`) and the legacy/practice paths.
- **Consequence (the standing data prereq):** with the flag `false` and a demo-only seed, EVERY live pool
  (exam/practice/topic/mistake/saved) is EMPTY — the DB needs OFFICIAL (`isDemo:false`) content for live modes
  to return questions (this is exactly the CLAUDE.md "BROWSER-AUDIT DATA PREREQ": run
  `npx tsx scripts/import-official.ts` before `npm run audit:browser`). Task 08 folding the importer into the
  seed is what removes this manual prereq; task 10's per-topic counts must likewise count only SERVABLE
  (official, when the flag is off) category questions, not all published rows.

### 3d. The 8 demo topic titles (task 09 retires these) — `prisma/seed.ts:28-37`
Demo topics are **Title-Case** (first letter capital, rest lowercase) — in deliberate contrast to OFFICIAL
imported topics, which are **ALL-CAPS** (e.g. `НАДАННЯ ДОМЕДИЧНОЇ ДОПОМОГИ`, `ТЕХНІЧНИЙ СТАН…`). That casing
difference is the practical signal task 09 can use to deactivate demo topics without touching official ones
(or it can match this exact list). The exact 8 titles, with `displayOrder` (`order` in the literal):
1. `Загальні положення` (order 1, `prisma/seed.ts:29`)
2. `Дорожні знаки` (order 2, `:30`)
3. `Дорожня розмітка` (order 3, `:31`)
4. `Сигнали світлофора та регулювальника` (order 4, `:32`)
5. `Проїзд перехресть` (order 5, `:33`)
6. `Швидкість руху, обгін, зупинка` (order 6, `:34`)
7. `Розташування транспортних засобів та маневрування` (order 7, `:35`)
8. `Безпека руху та обов'язки водія` (order 8, `:36`)

Created in order via `prisma.topic.create({ data:{ title, displayOrder: t.order, isActive:true }})`
(`prisma/seed.ts:433-438`). Task 09's deactivation step must be IDEMPOTENT (the seed wipes+recreates topics
each run, `:385`) and should set `isActive:false` (not delete) so existing FK references survive.

---

## 4. Resolver design inputs — three tiers + proposed dirs + extension set

Today there is NO tier resolution: `Question.imageUrl` IS the served path (§1, §2). The wave6 resolver
(tasks 03–05) replaces the single stored path with a `imageKey`→first-existing-candidate lookup. Inputs:

### 4a. The three tiers, in priority order (highest wins)
1. **override** — a human-curated one-off fix that must beat everything. PROPOSED dir: **`public/image-overrides/`**
   (does NOT exist yet; created by whoever lands the override flow). Rationale: lets an editor drop a corrected
   PNG without touching the importer or the restyle pipeline, and without a DB write.
2. **restyled-live** — the APPROVED restyled bytes published for production. PROPOSED dir:
   **`public/restyled-live/`** (does NOT exist yet; task 07 rewrites `golive.mjs apply` to publish approved PNGs
   here instead of re-pointing `imageUrl` to `/restyled/`). This decouples "restyled byte exists" (`public/restyled/`,
   §2d, 77 working PNGs) from "restyled byte is APPROVED for serving" (`public/restyled-live/`) — go-live becomes a
   file COPY into the live dir, not a raw-sqlite `UPDATE` (§2b), so the resolver—not the DB—chooses the tier.
3. **original** — the imported official byte, the always-present fallback. EXISTING dir:
   **`public/official-images/`** (§2a, §2d; 734 files). Every published official question already resolves here.

### 4b. Extension set the candidate list must cover
Per §2d (gathered there — not re-listed): **{ `.png`, `.jpeg`, `.jpg` (defensive), `.svg` }**. Real corpus is
`.jpeg` (629) + `.png` (104) + one `.svg` in `public/official-images/`; `public/restyled/` is `.png`-only; `.jpg`
is matched defensively by both producers but **zero `.jpg` files exist on disk** (§2d). A resolver keyed on a
bare `imageKey` (basename without extension) must therefore probe MULTIPLE extensions per tier, and the order
matters only where two bytes with the same stem but different extensions could coexist (not observed today, but
the override tier could introduce it — recommend a fixed probe order, e.g. `.png` before `.jpeg`, so an override
PNG of a `.jpeg` original wins deterministically).

### 4c. Resolver shape implied by §1's chokepoint
The single chokepoint is `Question.imageUrl` → `safeImageUrl()` → `<img src>` (§1 summary). Two slot-in options:
(i) keep `imageUrl` as the stored served path and have the resolver REWRITE it at render time, or
(ii) introduce `imageKey` (tasks 02/06) and have a server resolver (task 04) map key→first-existing tier path,
feeding the runner that resolved path. Task 03 (`lib/image-resolve.ts`) is the PURE candidate-path generator
(tier constants × extension set → ordered candidate list); task 04 (`lib/server/image-resolve.ts`) is the
filesystem probe (first candidate that exists under `public/`); task 05 (`resolveImageSrc`) is the render-time
glue with three-branch unit tests (override hit / restyled-live hit / original fallback). Keep tasks 03 + 05
PURE (no `fs`, no `@/lib/db`) so they unit-test without a server runtime — the FS probe is isolated in task 04
(mirror the existing pure/server split, e.g. `lib/test-engine/*` vs `lib/server/*`, per CLAUDE.md).

---

## 5. Migration directory naming + Prisma-7 ritual (migrate deploy, NEVER migrate dev)

Task 02 (`imageKey String?` + `@@index([imageKey])` on `Question`) needs a migration. The mechanics:

### 5a. Directory naming pattern under `prisma/migrations/`
Each migration is a dir named **`<timestamp>_<snake_name>/`** containing exactly **`migration.sql`**. The
timestamp is a **14-digit `YYYYMMDDHHMMSS`** stamp. The four existing entries:
`20260616173350_init`, `20260616173400_test_answer_unique`, `20260618140000_user_token_version`,
`20260618170000_analytics_granular_events` (`prisma/migrations/`). The provider is pinned to **`sqlite`** in
`prisma/migrations/migration_lock.toml`. So task 02 hand-authors e.g.
`prisma/migrations/<14-digit-ts>_question_image_key/migration.sql`.

### 5b. The exact SQL pattern to copy (nullable ADD COLUMN + CREATE INDEX)
Two existing migrations are direct templates:
- Nullable column + index, additive/data-preserving:
  `prisma/migrations/20260618170000_analytics_granular_events/migration.sql` does
  `ALTER TABLE "AnalyticsEvent" ADD COLUMN "metadata" TEXT;` (nullable, no default → existing rows untouched)
  and `CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");`. Its header notes
  **"SQLite requires one ADD COLUMN per ALTER statement."** Task 02's SQL is the same shape:
  `ALTER TABLE "Question" ADD COLUMN "imageKey" TEXT;` then
  `CREATE INDEX "Question_imageKey_idx" ON "Question"("imageKey");`.
- Index-only example: `prisma/migrations/20260616173400_test_answer_unique/migration.sql` =
  a single `CREATE UNIQUE INDEX …` (task 02's index is NON-unique — many questions can share a key / be null).
Because `imageKey` is **nullable with no default**, the change is additive and data-preserving — no reseed,
no force-reset (same property the analytics migration relied on).

### 5c. The Prisma-7 ritual (from CLAUDE.md Learnings — restated here so task 02 has it inline)
`prisma migrate dev` is **INTERACTIVE** → it FAILS in the non-TTY agent/driver shell, and adding a
column/constraint to an existing table can trip its data-loss prompt even with `--create-only`. So the ritual is:
1. **Hand-author** `prisma/migrations/<ts>_question_image_key/migration.sql` (the §5b SQL).
2. Run **`prisma migrate deploy`** (non-interactive; applies pending migrations).
3. Run **`prisma generate`** to regenerate the client into `lib/generated/prisma` (CLAUDE.md: Prisma-7
   `prisma-client` generator with explicit `output`). The schema edit (task 02) adds the field/`@@index`;
   the migration applies it to `prisma/dev.db`; `generate` makes `imageKey` visible on the typed client.
   (For throwaway dev only, `prisma db push` syncs without a migration file — but task 02 wants a committed
   migration, so use the hand-author + `migrate deploy` path.)

---

## 6. Downstream impact + ordering risks (tasks 02–10)

This investigation feeds the rest of wave6. **Task 02** adds `Question.imageKey String?` + `@@index([imageKey])`
(schema + hand-authored migration, §5). **Task 03** writes the PURE `lib/image-resolve.ts` (tier constants
override▸restyled-live▸original §4a × extension set §4b → ordered candidate paths); **task 04** writes
`lib/server/image-resolve.ts` (first-existing-candidate FS probe over `public/`); **task 05** adds
`resolveImageSrc` + three-branch unit tests, slotting into §1's `safeImageUrl`→`<img>` chokepoint. **Task 06**
edits the importer image branch (§2a) to compute `imageKey` = basename-without-ext. **Task 07** rewrites
`golive.mjs apply` (§2b) to publish approved PNGs into `public/restyled-live/` (§4a tier 2). **Task 08**
refactors the importer to export `importOfficial(prisma)` (no auto-run) so **the seed** can load official
content. **Task 09** adds the idempotent demo-topic deactivation to `prisma/seed.ts` (§3d). **Task 10**
rewrites the per-topic count in `app/(app)/practice/page.tsx` to count only SERVABLE category questions (§3c).

**Ordering risks:**
- **02 → 03/04/05/06:** the resolver and importer reference `imageKey`, so 02 (schema + migration + `generate`)
  must land first or the client lacks the field and typecheck fails.
- **06 vs §1c dedup identity:** exam content-dedup keys on `text + "||" + (imageUrl||"")` (`lib/server/test-engine.ts:106-111`).
  If task 06's `imageKey` ever REPLACES `imageUrl` as the dedup identity, keep a stable per-prompt key or
  `exam-blueprint.integration.test.ts`'s distinct-key assertion (§1f) shifts. Safest: leave dedup on `imageUrl`.
- **08 vs §3b test breakage:** the moment the seed loads official (`isDemo:false`) rows,
  `seed-content.integration.test.ts` invariant (c) ("every published Q is demo", `:35-36`) FAILS on the first
  official row. Task 08 MUST update that test in the SAME change (scope (c) to `isDemo:true`, or assert
  "demo rows are demo AND ≥1 official exists"). Invariant (a) `>=24` survives (official only adds rows).
- **07 vs §2b note-valued approvals:** `apply`'s filter is an exact `s==='approved'` (`golive.mjs:15`); many
  human-approved images carry freeform-note statuses (§2b gotcha). Task 07 must decide whether note-valued
  statuses publish into `public/restyled-live/`, or some currently-approved images silently stop serving.
- **09 topic casing:** demo topics are Title-Case, official ALL-CAPS (§3d). Task 09's deactivation must target
  only the 8 demo titles (or the casing signal) and stay idempotent (seed wipes+recreates topics each run,
  `prisma/seed.ts:385`); set `isActive:false`, never delete (preserve FK references).
- **10 vs §3c servable filter:** with `SERVE_DEMO_QUESTIONS=false`, the practice per-topic count must apply the
  same `demoWhere` (`isDemo:false`) the engine uses (`test-engine.ts:60`), else it counts unservable demo rows
  and over-reports availability.
