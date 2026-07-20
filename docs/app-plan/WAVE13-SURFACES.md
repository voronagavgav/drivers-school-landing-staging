# Wave 13 — Surface map (investigation, task wave13-01)

Line-mapped inventory of every surface the W13 tasks (02–20) touch, from a real read of the files
on 2026-07-02 (post-wave12b `main`, commit f501c02). Sources read first: `specs/wave13-pwa-offline-images.md`,
`docs/app-plan/05-tech-architecture.md` §4–§5, `docs/app-plan/SPIKES.md` (both spike verdicts positive).
Each section ends with a `DECISION:` line the implementing task consumes where the spec left a choice open.

## SW + build

**`next.config.ts` current shape (32 lines)** — everything here must survive the `withSerwistInit` wrap:

- `const root = path.resolve(import.meta.dirname)` (line 6) feeding `turbopack: { root }` (line 9) and
  `outputFileTracingRoot: root` (line 10) — the parent-dir stray-lockfile workaround; dropping either
  regresses the wrong-workspace-root bug.
- `allowedDevOrigins: ["100.110.64.90", "192.168.5.254", "clpcs-mac-mini.local"]` (line 14) — LAN/Tailscale
  dev asset loading; dev-only but must stay.
- `async headers()` (lines 18–29): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` on `/:path*` — the production security headers.
- Export is a plain `nextConfig` object (line 32). The SPIKES.md §1 recipe is a pure wrapper —
  `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js" })(nextConfig)` — so all four concerns
  survive verbatim; nothing in the current config is webpack- or Turbopack-exclusive except
  `turbopack.root` (ignored on the webpack path, harmless).

**Build script** — `package.json` line 7 is currently plain `"build": "next build"` (Next 16 ⇒ Turbopack
default). Wave13-03 must change it to `"build": "next build --webpack"`; `"dev": "next dev"` (line 6) stays
Turbopack (SW is a deliberate dev no-op per SPIKES.md §1).

**SPIKES.md §1 pins (Serwist × Next 16, VERDICT: WORKS)**: `@serwist/next@9.5.11` + `serwist@9.5.11`
(devDeps), `app/sw.ts` with `/// <reference lib="webworker" />` as **line 1** (root `tsconfig.json` lib is
`[dom, dom.iterable, esnext]` — without the per-file directive `next build`'s tsc pass fails on
`ServiceWorkerGlobalScope`; a project-wide lib change would conflict dom↔webworker `self`). Proven output:
`public/sw.js` (167 KB) emitted, full build green on `next build --webpack` (Next 16.2.9).

**Fonts are `next/font` self-hosted — CONFIRMED, no hand-listed precache URLs needed**:
`app/layout.tsx:2` imports `{ Manrope, Nunito } from "next/font/google"`; instances at lines 7–12
(Manrope 400/500/700, latin+cyrillic, `display: "optional"`) and 15–20 (Nunito 600/700). `next/font`
downloads at build time and serves the woff2 as hashed `/_next/static/media/*` assets — exactly what the
Serwist build precache manifest (`self.__SW_MANIFEST`) already covers. No Google-CDN runtime fetch exists.

**Світлик sprite is inline JSX — CONFIRMED, no asset URL**: `components/svitlyk.tsx` (103 lines) —
`SvitlykSprite` (line 16) is a hidden inline `<svg><defs>` sprite (symbol `#svitlyk` + filters `#lg`,
`#mglow`, gradient `#mbody`), mounted exactly once at `app/(app)/layout.tsx:25`; `Svitlyk` (line 66)
`<use>`s it. It ships inside the JS/HTML payload, never as a separate URL — nothing to precache.

**Install-surface contradiction (scopes wave13-05)**: the spec §B says «apple-touch-icon (exists)» — the
repo says otherwise. Root-layout `metadata` (app/layout.tsx:22–26) defines only `title` + `description` —
NO `icons`, NO `manifest`; `public/` contains no manifest, no `apple-touch-icon*`, no favicon/PNG icons at
all (only svg logos, image dirs, `sign-vectors`), and no `app/manifest.ts`/`app/icon.*` exists. Wave13-05
must create the manifest, BOTH maskable PNG icons (192+512), AND the apple-touch-icon + `apple-mobile-web-app-*`
meta from scratch — nothing exists to reuse.

DECISION: wave13-03 wraps the EXISTING `nextConfig` object unchanged (keep lines 6–30 verbatim, wrap only
the export), flips `package.json` `build` to `next build --webpack`, and copies the SPIKES.md §1 `app/sw.ts`
recipe with the line-1 webworker reference. Fonts and the sprite need ZERO `additionalPrecacheEntries` —
the only hand-added precache entry is `/~offline` (per 05-tech §4.1). Wave13-05 treats the icon surface as
greenfield (the spec's «(exists)» is wrong).

## Image pipeline

**Pure resolver — `lib/image-resolve.ts`** (no I/O, unit-testable; wave13-06/08 extend THIS file):

- Tier dirs in precedence order: `IMAGE_TIER_DIRS = [IMAGE_OVERRIDE_DIR, RESTYLED_LIVE_DIR,
  ORIGINAL_IMAGE_DIR]` = `image-overrides` ▸ `restyled-live` ▸ `official-images` (lines 14–23).
- `IMAGE_EXTENSIONS = [".png", ".jpeg", ".jpg", ".svg"]` (line 27) — tried within EACH tier, so the walk
  in `imageCandidatePaths` (lines 52–61) is tier-major, extension-minor: 3×4 = 12 ordered candidates,
  root-relative under `public/` (no leading slash).
- `SAFE_KEY = /^[A-Za-z0-9_-]+$/` (line 34) via `isSafeKey` (line 40) — a REJECT boundary (unsafe key →
  `[]` candidates, never sanitise-and-continue); excludes empty/dot/slash/percent forms by construction.
- `resolveImageSrc(question)` (line 80): `imageKey` → `/api/q-image/<key>`; else `safeImageUrl(imageUrl)`;
  else `null`. Any negotiation/srcset helper must keep this module pure (purity gates grep the whole file
  for `server-only`/`@/lib/db` tokens — see CLAUDE.md).

**Server resolver — `lib/server/image-resolve.ts`**: `resolveImageDiskPath(key)` (line 27) walks the pure
candidates, `path.resolve`s each against `PUBLIC_DIR = path.join(process.cwd(), "public")` (line 15), and
applies the containment re-check at line 31 — `abs !== PUBLIC_DIR && abs.startsWith(PUBLIC_DIR + path.sep)`
— before `existsSync`; first hit wins, else `null`. This is the ONLY fs-touching image module; wave13-06's
negotiated variant lookup belongs here, keeping fs out of the pure layer.

**Route — `app/api/q-image/[key]/route.ts`**: `runtime = "nodejs"` (line 13); awaits `params` (Next 16
Promise params, line 28); 404 on null resolve (line 33) and on a raced-away `readFile` (line 41);
`CONTENT_TYPES` map covers exactly the four extensions, unknown → `application/octet-stream` (lines 17–22,
44–45). Current caching: `Cache-Control: public, max-age=3600` — deliberately NOT `immutable` because an
override can change a key's bytes (lines 51–52). Wave13-06 adds `Vary: Accept` when it starts serving
AVIF/WebP off the same URL; today the response varies only by on-disk state.

**Per-tier file counts (2026-07-02 disk audit)**:

| tier (public/…)   | count | extensions                                |
|-------------------|-------|-------------------------------------------|
| `image-overrides` | 0     | — (dir exists, empty)                     |
| `restyled-live`   | 60    | 60 png                                    |
| `official-images` | 1078  | 898 jpeg · 178 png · 1 jpg · 1 svg        |

So the prebake input set (wave13-04) is ~1138 source files, dominated by official jpeg; the 1 svg needs a
skip branch (sharp rasterising an svg tier asset would change semantics — pass it through untouched).

**Render sites of `/api/q-image`** (grep `resolveImageSrc|q-image` over `app/ components/`): exactly ONE —
`components/test-runner.tsx:101` computes `imageSrc = resolveImageSrc(…)`, rendered as the single `<img>`
at lines 379–380 (guarded by the `imgError` placeholder state, line 82). The runner gets `imageKey`/
`imageUrl` from `app/(app)/test/[id]/page.tsx:21–22`. NO other q-image consumers exist:
`app/(app)/test/[id]/result/page.tsx` renders ZERO images (grep `img|image` → no hits), and the admin
editor preview (`app/admin/questions/question-editor.tsx:266`) renders the raw `safeImageUrl`-approved
`imageUrl` directly — it never goes through `resolveImageSrc` or `/api/q-image`.

DECISION: spec §C says «Runner + result `<img>`s», but the result page renders no question images today —
wave13-08's `srcset` scope is REDUCED to the single runner `<img>` (test-runner.tsx:379); do NOT add images
to the result page to satisfy the spec wording. The admin preview stays out of scope (raw-URL lane, not
q-image). Wave13-06 must add `Vary: Accept` alongside the existing `public, max-age=3600` (keep non-immutable
— override mutability is the documented reason), and wave13-04 skips the lone svg in `official-images`.

## WAL + sync

**Action — `submitAnswerAction` (app/actions/test.ts:54–67)**: takes one object input, zod-parses with
`submitAnswerSchema` (throws `firstIssueMessage` on reject, line 65), then calls
`submitAnswer({ ...parsed.data, userId: user.id })` (line 66). The zod fields (`lib/validation.ts:54–79`):
`sessionId` (string ≥1) · `questionId` (string ≥1) · `selectedOptionId` (string, NULLABLE, required) ·
`timeSpentSeconds` (int ≥0, optional) · `latencyMs` (int 0..600000, optional) · `confidence` (int 1..4,
optional) · `clientEventId` (string 1..**64**, optional). Zod object schemas STRIP unknown keys, so any new
replay field (e.g. a WAL `recordedAt`) must be DECLARED here or it silently never reaches the server.

**Engine — `submitAnswer` (lib/server/test-engine.ts:312–422)**: params = the same seven fields + `userId`
(lines 312–321). Whole-tx offline-replay guard HOISTED per spec §E3 at lines 340–347: inside the
`prisma.$transaction`, `clientEventId != null` → `tx.reviewLog.findUnique({ where: { clientEventId } })`;
a hit returns `true` (= replayed) and the ENTIRE tx no-ops (no TestAnswer rewrite, no mistake-bank
advance). First-attempt gate at 354–359/384 (SRS write only on the first answer per question per session);
`recordReview(tx, {…, clientEventId: params.clientEventId, easyMs, hardMs}, now)` call at 396–412 — `now`
is minted ONCE at line 334 (`new Date()`, server wall clock at receipt) and shared by TestAnswer +
recordReview + bumpStudyDay. A replay (`replayed === true`) also skips the `question_answered` analytics
event (lines 425–426).

**SRS — `recordReview` (lib/server/study.ts:67–161)**: signature `(tx: Prisma.TransactionClient,
params: RecordReviewParams, now: Date)`. `RecordReviewParams` (lines 25–37): userId, questionId, topicId?,
correct, latencyMs?, confidence?, mode, testSessionId?, clientEventId?, easyMs?, hardMs?. INNER replay
guard (belt-and-suspenders under the hoisted one) at lines 86–93 — same `findUnique({ where:
{ clientEventId } })` early-return. The ReviewLog write puts `clientEventId ?? null` at line 158.
`now` is an injected param — FSRS retrievability decays with wall clock, so an offline-replay lane that
wants the ORIGINAL answer time must thread it here (today `submitAnswer` always passes server-receipt
time; a WAL replay hours later would schedule off replay time, not answer time — wave13-10's clamp
vectors exist for exactly this).

**Uniqueness scope**: `prisma/schema.prisma:329` — `clientEventId String? @unique` on ReviewLog, GLOBALLY
unique (not per-user). That is the wave13-09 motivation: user A can today block user B's id by collision,
and test runs collide with leftover rows (see CLAUDE.md per-run-suffix learning).

**Runner failure path — `components/test-runner.tsx`**: id generator `newClientEventId()` (lines 46–56:
`crypto.randomUUID` → `crypto.getRandomValues` fallback for the plain-http LAN transport → per-tab
counter; UUID = 36 chars, well under the zod 64 cap). `choose()` (172–201) bumps `attemptRef` ONLY on a
CHANGED option (179–182), keys `eventIdRef` by `${sessionId}:${questionId}:${attempt}` (183–188) so a
re-pick of the same option reuses the id (replay, not new event), measures `latencyMs` from a
`performance.now()` question-start mark (190–191). `submit()` (206–232) snapshots args into
`submitArgsRef` (207), clears the per-question `submitError` flag (81, 208–213), and on ANY throw sets
`submitError[questionId] = true` (227–230) → inline «повторити». `retrySubmit()` (234–238) replays the
EXACT snapshot (same clientEventId → idempotent). All of this is IN-MEMORY React state/refs: a reload
loses `submitArgsRef`/`eventIdRef`/`attemptRef` (a post-reload re-answer mints a FRESH id — safe but a
new event), and there is NO background retry and NO persistence — this is the gap wave13-12's WAL fills,
reusing the same clientEventId contract.

**Every existing test asserting clientEventId values** (wave13-09 must update ALL raw-id expectations to
the `<userId>:<clientId>` form wherever the PERSISTED row is asserted):

- `lib/server/srs-review.integration.test.ts` — the heavy one: §1 `expect(log!.clientEventId).toBe(EVT_Q1_CORRECT)`
  (line 112, submitted at 94); §3 replay no-op reuses the same id (115–124); further ids at 149/166/199/214;
  §E1 `findUnique({ where: { clientEventId: EVT_QA_ACTION } })` + `.toBe` (324–344); §E2 whole-tx replay +
  `reviewLog.count({ where: { clientEventId: EVT_QB_REPLAY } }) === 1` (365–398).
- `lib/server/answer-confidence.integration.test.ts` — submits with `EVT_CONF` (line 90), asserts
  `after.log!.clientEventId).toBe(EVT_CONF)` (line 112).
- `lib/server/wave11-review-fixes.integration.test.ts` — submits with a per-run `evt` (line 105), locates
  the log via `findUnique({ where: { clientEventId: evt } })` (line 108) — a LOOKUP, so it breaks too once
  the persisted id is prefixed.
- `lib/validation.test.ts:134–147` — schema-level only (`parsed.data.clientEventId === "evt-abc"`):
  asserts the RAW client-supplied id survives zod, which stays true under server-side namespacing —
  NO update needed here.

DECISION: wave13-09 namespaces SERVER-side (`namespacedEventId` in lib/server/study.ts) — the client keeps
sending raw ≤64-char ids through the unchanged zod schema, and BOTH guards (test-engine.ts:345 hoisted +
study.ts:88 inner) plus the ReviewLog write (study.ts:158) switch to the namespaced form together, in one
task, or the guard and the write disagree and every replay double-applies. The three integration suites
above (NOT validation.test.ts) update their persisted-row expectations to `${userId}:${raw}` in the same
task. Wave13-12's WAL reuses the runner's existing id contract (same id ⇒ replay) and MUST persist the
queue (submitArgsRef's reload-loss is the documented gap), and wave13-10 threads an honest answer-time
`now` (or a clamped one) into `recordReview` rather than server-receipt time.

## Track-route patterns

The /api/track ingest is the house blueprint the wave13-10 review-sync route must mirror — a
three-layer split plus a proven integration-test technique:

**Layer 1 — pure schema module (`lib/analytics-ingest.ts`)**: no I/O, no db, no Next imports, no env
reads (salt is a PARAM — line 38 `hashIp(ip, salt)`); the doc comment at lines 1–12 states the contract
and the purity gates grep for the forbidden tokens (see CLAUDE.md). Contents: the zod WHITELIST
(`trackEventSchema` lines 71–87 — bounded strings via `boundedString(max)` line 65, object schema strips
unknown keys so a client cannot smuggle PII), the batch wrapper (`trackBatchSchema` lines 93–98 —
`.min(1)`/`.max(TRACK_MAX_BATCH_SIZE=50)`, oversize REJECTED not truncated), and the rate-limit core
REUSED from `lib/login-throttle.ts` (`recordBatch`/`isRateLimited` lines 111–126 are thin re-exports of
`recordFailedAttempt`/`isThrottled` with re-exported types, line 108). Unit tests live beside it
(`lib/analytics-ingest.test.ts`). Review-sync's analogue is `lib/review-sync.ts` (wave13-10): pure zod
batch schema + clamp logic, `now`/limits as params.

**Layer 2 — server context module (`lib/server/analytics-ingest.ts`)**: `server-only` line 1; owns
everything per-instance/env-touching — cookie names (`ANON_ID_COOKIE`/`OPTOUT_COOKIE` 21–22), the
in-memory `rateStore` Map + config (25–29, `TRACK_RATE_MAX_BATCHES=30`/`TRACK_RATE_WINDOW_SECONDS=60`
from constants), `isTrackRateLimited`/`noteTrackBatch` (35–42, check-BEFORE-work), the test-only
`_resetTrackRateStore` (45–47), `deriveTrackContext(headers, existingAnonId, env=process.env)` (73–97 —
anonymousId from the first-party COOKIE not the body, ip hashed immediately via `resolveAnalyticsSalt`,
rate key = anonId ∥ ipHash ∥ "anon"), cookie options gated on `COOKIE_SECURE==="true"` (99–116), and
opt-out/DNT (`isAnalyticsOptedOut` 122–130: cookie ∨ `dnt:1` ∨ `sec-gpc:1`).

**Layer 3 — route (`app/api/track/route.ts`)**: `runtime = "nodejs"` (23); a tiny `ack()` helper (25–30)
so EVERY exit path returns `{status}` JSON — a beacon can't probe internals. Ordered gates: opt-out FIRST,
before any work (35–37, acks 200 `opted_out` so the client stops retrying) → size cap BEFORE parse
(43–56: cheap declared `content-length` check → 413, then re-check `raw.length` after `req.text()` so a
lying header can't sneak past; parse errors → 400 with no detail leak) → `safeParse` (65–68, 400) →
rate limit before store (75–78, 429) → `getCurrentUser()` in a try/catch that NEVER drops the batch
(82–87, auth failure ⇒ anonymous) → `recordEvents` → set the minted anon cookie on the response (93–95).

**Integration-test technique (`lib/server/analytics-ingest.integration.test.ts`)**: partial-mock
`@/lib/auth` BEFORE importing it (lines 16–20: `vi.mock("@/lib/auth", async (orig) => ({ ...(await
orig()), getCurrentUser: vi.fn(async () => null) }))` — `getCurrentUser` reads `next/headers`, absent in
the vitest runtime), then a `postTrack` helper (124–137) that builds a real
`new NextRequest("http://localhost/api/track", { method: "POST", headers, body })` (cookies go in as a
`cookie` HEADER, line 130 — `req.cookies` parses it) and calls the EXPORTED `POST` directly. Per-case:
`_resetTrackRateStore()` + re-mock to null in `afterEach` (36–40), `vi.mocked(getCurrentUser)
.mockResolvedValue({ id: userId } as never)` to flip authed (199), unique `TAG`-prefixed anonymousIds for
surgical cleanup (22, 39). Route asserts read `res.status`, `res.json()`, `res.headers.get("set-cookie")`
(140–160). This exact recipe is what wave13-11 copies for the review-sync route.

DECISION: wave13-10 mirrors ALL THREE layers 1:1 — `lib/review-sync.ts` (pure zod batch schema + clamp,
injected `now`), a server context piece for anything env/instance-bound, and
`app/api/review-sync/route.ts` copying the route's gate ORDER (size-cap-before-parse with the
double-check, always-ack JSON via an `ack()` helper, auth resolved but failure-tolerant) — with ONE
deliberate divergence: review-sync REQUIRES an authenticated user (it writes ReviewLog rows), so instead
of the track route's "null user is fine" branch it rejects unauthenticated batches (still as a JSON ack,
401), and it needs no anon-cookie/opt-out lanes. Wave13-11 reuses the NextRequest/exported-POST/
partial-mock technique verbatim.

## Pack + UI hosts

**/progress «Карта тем» — `app/(app)/progress/page.tsx`**: `TopicRow` (lines 28–49) is a `<li>` wrapping
ONE whole-row `<form action={startTestAction}>` submit button (hidden inputs `mode=TOPIC_PRACTICE` +
`topicId`, chevron affordance, aria-label carries the action name — the wave12b one-tap-row consensus
fix). Rows render inside `<ul className="divide-y divide-black/5">` per band group (82–86), groups from
`getTopicMap(user.id, user.selectedCategoryId)` (55) typed `TopicBandEntry`/`TopicMapGroups`
(lib/topic-map.ts). A per-topic download affordance canNOT go inside `TopicRow`'s button (nested
interactive controls / a form inside a form are invalid HTML) — it must be a SIBLING element in the
`<li>` flex row, i.e. restructure `TopicRow` to `<li className="flex …"><form …(existing row)…/>
<DownloadButton topicId/></li>` so the practice tap target survives untouched.

**/account — `app/(app)/account/page.tsx`**: a `space-y-5` stack of `<Card className="max-w-md">` blocks,
each `SectionTitle hint=…` + a form/list (60–132: profile, exam date, daily goal, streak `<dl>`, glass
tier, password, privacy). The house pattern for wiring `server-only` actions into client forms is right
here: module-scope inline-`"use server"` wrappers adapted to the `useActionState` `(prev, formData)`
signature (21–43), passed as an `action` prop to client components from `components/account-forms.tsx`.
The wave13-13 install hint + wave13-15/16 offline-packs meter each get their own `<Card className=
"max-w-md">` + `SectionTitle` in this stack; the install hint's client component
(`components/install-hint.tsx`) needs no server action at all (standalone-detect + dismiss are
client-local), the packs meter follows the account-forms prop pattern if it needs server data.

**/mistakes + /saved loaders**: `app/(app)/mistakes/page.tsx:10` → `listMistakes(user.id, true)`
(lib/server/mistakes.ts:82–90: `userMistake.findMany` where `{userId, status:"ACTIVE"}`, include
`question: { topic, options, explanation }`); `app/(app)/saved/page.tsx:9` → `listSavedQuestions(user.id)`
(lib/server/saved.ts:5–13: `savedQuestion.findMany` where `{userId}`, include `question: { topic,
options(ordered), explanation }`). NEITHER loader filters on published/active — they show the user's own
rows even for since-unpublished questions (render-only surfaces). A pack scope built from these lists
must therefore intersect with the servable predicate below, not trust the raw list.

**Published-question predicate**: `baseWhere` in `lib/server/test-engine.ts:65–70` —
`{ isActive: true, isPublished: true, archivedAt: null, ...(categoryId ? { categories: { some: { id:
categoryId } } } : {}) }`. The same trio is already duplicated in `lib/server/topic-map.ts:29–31` (topic
map's servable filter), so precedent exists for reusing the shape rather than importing test-engine.
`getOfflinePack` (wave13-14) must apply exactly this predicate to every scope (topic pack, mistakes pack,
saved pack) so an offline pack can never leak unpublished/archived content that the live runner would
refuse to serve.

DECISION: wave13-14's `getOfflinePack` reuses the `baseWhere` PREDICATE SHAPE (isActive+isPublished+
archivedAt:null+category membership) for every scope, intersecting the /mistakes and /saved raw lists
with it; wave13-15's per-topic download affordance mounts as a SIBLING of the existing `TopicRow` form
inside the `<li>` (never nested in the row's button/form), and the /account additions are two new
`<Card className="max-w-md">` blocks following the page's inline-"use server"-wrapper pattern.

## Secure context + E2E

**Service workers require a secure context**: `navigator.serviceWorker` is only exposed on secure
contexts — `https:` origins or the loopback exceptions (`localhost`, `127.0.0.1`, `::1`). The LAN/
Tailscale audit origin `http://100.110.64.90:3100` (default in `bin/browser-audit.sh`) is a PLAIN-HTTP
non-loopback origin ⇒ NOT a secure context ⇒ `serviceWorker` is `undefined` there and registration is
impossible. No amount of flags in the app can change that; it is a platform rule.

**Consequence for the existing audit**: the LAN-IP `npm run audit:browser` run canNOT assert SW
registration, precache hits, or offline behaviour — and must not try. Its irreplaceable job stays what it
was built for (CLAUDE.md real-transport gate): the cookie-transport bug class (`Secure` cookies over
plain http), auth persistence, RBAC — precisely BECAUSE localhost would mask those. The two origins test
disjoint failure classes; neither substitutes for the other. Wave13-18's new audit blocks (manifest,
/~offline reachable as a route, q-image negotiation headers) are all plain-HTTP-safe (no SW needed —
fetch/DOM asserts only), so they run fine on the LAN origin; anything needing a REGISTERED SW is
explicitly out of the audit's scope and belongs to the Playwright E2E.

**Offline E2E origin**: `next start -p 3100` bound on localhost gives `http://localhost:3100` — a secure
context by the loopback exception — so Chromium (wave13-19 Playwright) can register `public/sw.js`,
populate the precache, flip `context.setOffline(true)`, and assert the /~offline fallback + WAL replay
end-to-end on the SAME production build the LAN audit hits.

DECISION: the wave13-19 Playwright offline E2E runs against `http://localhost:3100` (loopback secure
context — SW registers over plain http there and nowhere else in this deployment), while the existing
LAN-IP `npm run audit:browser` (`http://100.110.64.90:3100`) keeps covering the cookie-transport bug
class and gains only SW-FREE assertions from wave13-18 (manifest/offline-page/image-negotiation via
plain fetch; its SW block asserts at most that `/sw.js` is SERVED, never that it registers). No https
termination is added for wave 13.
