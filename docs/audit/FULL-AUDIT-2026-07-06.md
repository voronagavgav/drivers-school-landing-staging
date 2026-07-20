# Full Repository Audit — 2026-07-06

A cross-repository hygiene audit spanning the app (`~/drivers-school`), the
landing site (`~/pdr-landing`), and the showcase (`~/pdr-showcase`). The audit
scanned six dimensions (dead code, file cruft, theme unification, structure /
connections, landing, showcase) plus a database-integrity pass.

- **Total findings:** 33
- **Applied (safe, auto-applicable):** 11
- **Held as report-only / recommendations:** 22
- **Final acceptance gate:** `npm run build` **PASSES** (exit 0), typecheck clean, 618/618 tests green.

Every applied change is behind the safety tag `pre-full-audit-2026-07-06` and is
fully reversible (see [Rollback](#rollback)).

---

## 1. What was cleaned & unified (applied changes)

### App repo — `~/drivers-school`

| Commit | Dimension | Change |
|---|---|---|
| `7d158f4` | dead-code | Removed unused `ReadinessMeter` component (+ private `READINESS_TONE` helper), unused RBAC wrappers `isAdmin`/`requireAdmin`, 6 unused constants, and 8 unused type-alias exports. 8 files, 84 deletions. |
| `856085d` | file-cruft | Removed stray git-tracked root-level `dev.db` (0 bytes, tracked in error). The real `prisma/dev.db` was left untouched. |
| `d1b128d` | theme-unification | Migrated 5 legacy color-alias families to their canonical tokens across `app/` and `components/` (`.tsx/.ts/.css`). 62 files, 299 insertions / 299 deletions. |

**Dead code (`7d158f4`) — detail.** Every one of the 18 removed symbols was
verified to appear only at its own declaration site (no external/test
references) before deletion. One documented deviation: the finding's note
claimed the `ReadinessLevel` type import was still referenced elsewhere in
`components/ui.tsx` — that was factually wrong (it appeared only on the import
line and inside the deleted block), so the now-orphaned import was also removed.
No noUnusedLocals in tsconfig, so typecheck was unaffected either way.

**Theme unification (`d1b128d`) — detail.** All five migrations are
provably neutral (byte-identical values), so rendered output is unchanged:

| Legacy alias | → Canonical | Value |
|---|---|---|
| `asphalt` | `ink` | `#1F2933` |
| `paper` | `field` | `#FBFAF7` |
| `sign` / `sign-dark` / `go` | `green-deep` | `#226157` |
| `danger` | `warn` | `#B4532E` |
| `lane` | `amber` | `#8A5E0E` |

Post-migration grep for residual `-(asphalt|sign|go|paper|danger|lane)`
utilities and `var(--color-…)` reads returned empty. Semantic prop *keys*
(`tone="danger"`, `variant="danger"`, etc.) are string literals, remain valid,
and typecheck stayed green. The alias *definitions* in `app/globals.css` were
intentionally left in place for the downstream `remove-alias-defs` recommendation
(see §3) — only their call-sites were migrated.

### Showcase repo — `~/pdr-showcase`

| Commit | Dimension | Change |
|---|---|---|
| `a8ade94` | showcase | Removed unreferenced `items.json` (12KB) — its data was inlined into `index.html`; zero remaining references. Galleries in `index.html` / `img/` unaffected. |

### Landing repo — `~/pdr-landing`

No changes applied. The single clean-delete candidate (`phone.html`) was held
back on verification because it carries a `@dsCard` DesignSync marker — deleting
it silently drops a card from the design-system gallery, making it a curated /
product call rather than neutral cruft. Baseline snapshot commit `87d614d`
("baseline before full audit") is the safety point for this repo.

---

## 2. Database findings — REPORT-ONLY (not auto-applied)

The database dimension is in **good health**; nothing was changed. Migration
integrity is clean: `prisma validate` reports the schema valid, `prisma migrate
status` reports all **11 migrations applied** and `dev.db` up to date with **zero
drift**. All 25 models and every sampled field are referenced by non-test app
code — no dead schema. No N+1 patterns: every `lib/server` loop iterates
pre-fetched arrays, multi-query loads use `Promise.all`, and the deliberate
`where:{userId}` scan + JS-join pattern dodges the libsql P2029 param cap.

The following are **recommendations only** — each would force a destructive
SQLite table REBUILD on tables holding real user data, for low benefit:

1. **Loose `categoryId` refs (no relation / FK / index).** `ProgressSnapshot.categoryId`
   (schema line 272), `ReadinessSnapshot.categoryId` (421), and
   `TopicMastery.categoryId` (349) are plain `String?` columns holding a
   `Category.id` with no Prisma relation, no DB foreign key, and no index.
   Referential integrity to `Category` is unenforced.
   *Correction to the original evidence:* the claim that no code ever queries by
   `categoryId` is inaccurate — `lib/server/mastery-readiness.ts:328` does a
   compound `where:{ userId, …(categoryId ? { categoryId } : {}) }`. The impact
   conclusion still holds because `userId` leads the filter, but the "zero
   query-by-categoryId sites" evidence was wrong.
2. **`ReviewLog` loose refs.** `ReviewLog.topicId` (line 326) and
   `ReviewLog.testSessionId` (335) are `String?` with no relation and no index.
   Real read paths are covered by `@@index([userId, reviewedAt])` and
   `@@index([userId, questionId])`; nothing queries by `topicId`/`testSessionId`.
3. **`dev.db` analytics row bloat (dev-only).** `prisma/dev.db` is 13.5 MB and
   holds ~958 `AnalyticsEvent` rows accumulated from repeated `bin/browser-audit.sh`
   runs — the known source of `analytics-dashboard.integration.test.ts` flakes.
   Self-heals via `npm run db:seed` (clears + re-imports). Not a production
   concern; **do not** hand-delete rows.
4. **WAL state (informational, no action).** The `-wal` mentioned in the brief
   has already checkpointed clean (`journal_mode=wal`, `wal_checkpoint 0|0|0`).
   No WAL bloat exists; sidecars drain automatically.

> **No schema migration was generated or applied by this audit.** Items 1–2 are
> awareness-only; adopting them is a deliberate future migration, not audit debt.

---

## 3. Held / report-only backlog (prioritized)

Ranked by value-to-risk. None was auto-applied — each requires judgment, an
ordering precondition, a cache-token bump, or touches an untracked/curated file.

### Priority 1 — safe, high-value, do soon

- **`remove-alias-defs` (theme, app · `app/globals.css`:26–33).** Delete the 7
  now-orphaned legacy alias `@theme` token definitions. **Precondition:** all 5
  alias migrations have landed (they have, in `d1b128d`) — residue grep is empty.
  This is the end-state of theme unification. Held only because its safety
  depends on that external ordering; apply as a deliberate follow-up.
- **`unused-server-functions` (dead-code, app · `lib/server/{mastery,progress,saved}.ts`).**
  Four exported server functions with zero callers (`getTopicMastery`,
  `getStudyActivity`, `getRecentReadinessScores`, one in `saved.ts`). Confirmed
  dead, but held: in `progress.ts` the dead functions are **interleaved** with
  *used* ones (`computeWeakTopicIds` 144–150 and `snapshotProgress` 174–190 are
  live), so boundary-guessing risks corrupting live code. Needs a careful,
  human-reviewed excision.

### Priority 2 — low-risk config / docs drift

- **`env-example-missing-analytics-salt` (structure, app · `.env.example`).**
  `ANALYTICS_SALT` is a hard-required production runtime key (throws in prod if
  unset) present in `.env` but undocumented in `.env.example`. Held because
  `.env.example` is git-ignored/untracked (edit not git-reversible). Recommend
  adding a commented placeholder.
- **`redundant-dep-libsql-client` (dead-code, app · `package.json`).**
  `@libsql/client` is pulled transitively via `@prisma/adapter-libsql`; the
  direct top-level pin is redundant. Held because removing it requires
  `npm install` → lockfile regen → potential resolved-version change on the live
  DB code path. Optional.
- **`env-example-bfl-api-key` (structure, app).** `BFL_API_KEY` is tooling-only
  (image-restyle scripts under `.content-import/`), never read by the app
  runtime. Correctly *not* part of the runtime `.env.example` contract; optional
  tooling-only comment.

### Priority 3 — UX / product decisions (not cleanup)

- **`orphan-nav-history-saved` (structure, app).** `/history` and `/saved` are
  real authenticated feature pages with no in-app nav link (reachable only by
  direct URL / `browser-audit.sh`). This is a **discoverability gap, not dead
  code** — consider adding nav entries rather than deleting.
- **Landing curated-gallery items (all report-only, behind protected files):**
  - `phone.html` — 60KB dead draft, but carries a `@dsCard` DesignSync marker;
    deleting drops a gallery card (curated call).
  - `variant-g.html` (STALE) + `thumb-g.png` (**6.1 MB, largest asset in repo**)
    + transitively `map-bg.html` (141KB). Retiring the `gallery.html` card
    unlocks all three. Biggest disk win available on landing.
  - `map-bg.html` (141KB) — superseded by `map-bg-frozen.html`; only stale
    `variant-g.html` still loads it.
  - `variant-b.html` — 477-byte functioning redirect stub still linked from
    `gallery.html` (not dead, just a stub).
  - `mobile-m1..m4.html` — superseded by m5/m6, reachable only via the protected
    `mobile.html` gallery.
- **Landing dead CSS (`assets/landing.css`, needs a `?v=23→24` cache-token
  bump across sibling assets):** orphaned fake-testimonial internals
  (`.tcard .quote/.who/.av/.stars`, lines ~1063–1068) and unused utilities
  (`.chip-glass/.micro-calm/.lg-content`); keep `.sr-only` (intentional a11y).

### Priority 4 — tokenization judgment calls (theme)

- **`radius-class-convention-mixing` (app).** Radius utilities mix the raw
  Tailwind scale (`rounded-lg`×51, `-xl`×15, `-md`×4, `-full`×10) with design
  tokens (`rounded-chip`×17, `-pill`×9, `-card/-glass/-tray`×1). Values are **not**
  byte-identical (chip 16 vs lg 8, etc.), so any migration moves pixels — cannot
  be done neutrally.
- **`mascot-hex-duplicates-green-soft` (app · `components/svitlyk.tsx`:46).**
  Mascot fill `#9AD9B8` equals `--color-green-soft`, but its sibling fills
  (`#FFB89A`, `#FFE08A`) have no token. Tokenizing one of three illustration
  literals is a palette-identity judgment call.

---

## 4. Disk / cruft removed (measurable)

| Item | Repo | Size |
|---|---|---|
| root `dev.db` (tracked, empty) | app | 0 bytes |
| dead code (18 symbols, 8 files) | app | 84 lines |
| `items.json` | showcase | ~12 KB |

Largest *unrealized* disk win still on the backlog: retiring landing
`variant-g` frees **~6.3 MB** (`thumb-g.png` 6.1 MB + `map-bg.html` 141 KB +
`variant-g.html`).

---

## 5. Rollback

Everything applied by this audit sits above the safety tag in each repo.

**App (`~/drivers-school`)** — reverts commits `7d158f4`, `856085d`, `d1b128d`
(plus this report commit):

```sh
git -C /Users/clpc/drivers-school reset --hard pre-full-audit-2026-07-06
```

**Showcase (`~/pdr-showcase`)** — restore the one deleted file, or revert:

```sh
git -C /Users/clpc/pdr-showcase revert --no-edit a8ade94
```

**Landing (`~/pdr-landing`)** — no changes applied; baseline snapshot is
`87d614d`.

To revert a *single* app change instead of everything, use
`git -C /Users/clpc/drivers-school revert --no-edit <sha>`, or restore one file
with `git -C /Users/clpc/drivers-school checkout pre-full-audit-2026-07-06 -- <path>`.
**Never** run `git clean`.

---

## 6. Single most important recommendation

**Land `remove-alias-defs`** — delete the 7 orphaned legacy alias token
definitions from `app/globals.css` (lines 26–33). The five migrations in
`d1b128d` already removed every consumer (residue grep is empty), so this is the
final, provably-safe step that collapses the `@theme` block to canonical tokens
only and actually *closes* the theme-unification debt. Leaving the definitions in
place re-opens the door to new code re-adopting the deprecated aliases.

---

*Generated by the FINALIZE agent of the full-audit workflow, 2026-07-06.
Acceptance gate: `npm run build` exit 0, 618/618 tests green.*
