# Wave 17 — Anonymous value-first funnel: Architecture Decision Record

**Status:** pinned (2026-07-05)
**Scope:** INVESTIGATION ONLY. This doc records the architecture the rest of Wave 17
(tasks 02–14) builds against. No product code is changed by task 01. Downstream tasks
may not silently override a decision here — a justified deviation must be logged in the
deviating task's journal.

## Context

Danil reversed the signup-gate into a **value-first** funnel (2026-07-05): a logged-out
visitor must be able to *play a real question loop and see their readiness dial move*
before being asked to create an account. Today the app blocks this at two guard layers —
`app/(app)/layout.tsx` calls `requireUser()` (→ redirect `/login`) and every action in
`app/actions/test.ts` calls `requireUser()`. The whole funnel ships behind an env flag and
must add **zero PII** for anonymous visitors.

The decisions below are grounded in repo facts (verified 2026-07-05):
- No `middleware.ts`; auth is enforced at the layout + action level only.
- `lib/auth.ts`: cookie `ds_session`, HMAC-signed stateless payload
  `userId:tokenVersion:expiry`, `httpOnly:true`, `secure` iff `COOKIE_SECURE==="true"`,
  `maxAge = 30 days` (`MAX_AGE_SECONDS`).
- Analytics `ds_anon` cookie (httpOnly, 1y) is minted in `lib/server/analytics-ingest.ts`
  — a DISTINCT concept; it is NOT overloaded for play sessions.
- Entitlement flag is env `ENTITLEMENTS_ENABLED` via `isEntitlementsEnabled()`
  (`lib/entitlements.ts`, exact-string `=== "true"` opt-in).
- `startSession({ userId, mode, categoryId, topicId? })` and `submitAnswer({ …, userId })`
  (`lib/server/test-engine.ts`) need only a `userId` — they touch no auth surface.
- `registerAction` (`app/actions/auth.ts`) creates a `User`, calls `createSession`, records
  `user_registered`, redirects `/onboarding` — this is the migration hook point.

---

## Anon-session model

**Decision: mint a lazy anonymous `User` row.** Add `isAnonymous Boolean @default(false)` to
the existing `User` model. On a logged-out visitor's *first play action*, the resolver
(`requirePlayableUser()`, below) creates a `User` with `isAnonymous = true` and issues the
anon-play cookie. There is **no separate `AnonSession` table**.

**Why an anon `User` row, not an `AnonSession` table:** every gameplay/progress FK already
points at `User.id`. Reusing the `User` row means the entire engine and progress stack work
**UNCHANGED** — zero new joins, zero engine edits, and the register-time migration becomes a
one-row in-place update (see Migration & IDOR) instead of a cross-table row reassignment.
The following FKs therefore keep working byte-for-byte against an anon user id:
`TestSession.userId`, `TestAnswer` (via `TestSession`), `ReviewState.userId`, `ReviewLog`,
`UserMistake`, `SavedQuestion`, `UserStudyProfile`, `ReadinessSnapshot`, `TopicMastery`,
`StudyDay`, `AnalyticsEvent.userId`.

**Fields the anon user row carries (the no-PII guarantee):** `id`, `role = "USER"`,
`isAnonymous = true`, `tokenVersion` (default), `selectedCategoryId` (nullable, set when the
visitor picks a category), timestamps. It carries **NO `email` and NO `passwordHash`**.
`email` is `String?` / `passwordHash` is `String?` (or made nullable in task 02) so an
anon row is legal without them; uniqueness on `email` is unaffected because anon rows leave
it `NULL`. No email → no PII stored for anonymous visitors.

**Garbage collection** of stale never-converted anon rows is a **Non-goal** for this wave
(see below); rows simply accumulate until a later GC task lands.

---

## Cookie & identity

**Decision: a new, distinct cookie `ds_anon_play`**, separate from both `ds_session` (real
auth) and the analytics `ds_anon` (behavioural id). Overloading either would either leak
play state into analytics or force anon rows through the real-auth token path.

**Scheme: reuse the HMAC-signed stateless scheme from `lib/auth.ts`.** The cookie value is a
signed `anonUserId:tokenVersion:expiry` payload (same signer/verifier family as `ds_session`,
just a different cookie name and — being an anon identity — its own issue/verify helpers in
`lib/server/anon-session.ts`). We do **not** use a DB-lookup opaque token: the stateless HMAC
scheme is already implemented, needs no session table, and makes forgery infeasible without
the server secret. Possession of a validly-signed `ds_anon_play` cookie IS the anon identity.

**Attributes:**
- `httpOnly: true` (JS cannot read it).
- `secure: process.env.COOKIE_SECURE === "true"` (identical policy to `ds_session`; off by
  default so LAN/http play works, per the REAL-TRANSPORT learnings).
- `maxAge`: 30 days (reuse `MAX_AGE_SECONDS`), `sameSite: "lax"`, `path: "/"`.
- Carries **NO PII** — only the opaque anon user id + token version + expiry.

Once a visitor registers (converts), the anon-play cookie is cleared and a normal
`ds_session` cookie is issued for the (now real) same user id.

---

## Unblock strategy

**Decision: introduce one resolver `requirePlayableUser()` in `lib/server/anon-session.ts`**
that returns a real OR anon `SessionUser`, and route the play path through it — *only when the
flag is on*.

Exactly two guard layers change:
1. **`app/(app)/layout.tsx`** — the `requireUser()` at the shell boundary. When
   `VALUE_FIRST_FUNNEL` is on, the shell must not hard-redirect a logged-out visitor who has
   (or is about to get) an anon session on a playable route. The layout resolves the current
   user leniently (real user, else existing anon user, else render the shell for an
   about-to-be-anon visitor) so the page can render the question loop. Non-playable/manage
   routes still require a real user.
2. **Every `requireUser()` in `app/actions/test.ts`** (6 call sites: `startTestAction`,
   `submitAnswerAction`, and siblings) — replaced with `requirePlayableUser()`, which mints
   the anon `User` + issues `ds_anon_play` lazily on first play if none exists yet.

`requirePlayableUser()` logic (flag ON): return the real `ds_session` user if present; else
verify `ds_anon_play` and return that anon user; else mint a fresh anon `User`
(`isAnonymous:true`), issue `ds_anon_play`, return it.

**Flag-OFF is byte-for-byte the old behavior.** When `VALUE_FIRST_FUNNEL !== "true"`,
`requirePlayableUser()` delegates straight to `requireUser()` — same redirect to `/login`,
same `SessionUser` shape, no anon row minted, no cookie issued. The layout likewise falls
back to its current `requireUser()` path. This makes the whole funnel a no-op when the flag
is off and preserves the existing auth-guard browser-audit assertions.

---

## Migration & IDOR

**Decision: CONVERT-IN-PLACE.** On register, the anon `User` row is upgraded into the real
user — set `email`, `passwordHash`, `isAnonymous = false`, and bump `tokenVersion` on the
**SAME row**. No child rows are reassigned; every `TestSession`/`ReviewState`/`UserMistake`/…
already points at that id, so all accumulated progress and readiness carry over automatically
and there is **no cross-user row-reassignment surface**.

The convert path is `claimAnonSession` (task 05), invoked inside `registerAction`
(`app/actions/auth.ts`) at its existing hook point:
- **Identity comes from the cookie only.** `claimAnonSession` reads and verifies the
  `ds_anon_play` cookie server-side to learn *which* anon id to convert. It **never** takes a
  target anon-id from the request body or a form field. An attacker cannot claim another
  visitor's anon session because doing so would require forging that visitor's HMAC-signed
  cookie (infeasible without the server secret) — possession-of-signed-cookie == own session.
- **Idempotency.** Convert only proceeds if the cookie resolves to a row that is still
  `isAnonymous = true` and has no email. If there is no valid anon cookie, or the row is
  already a real user, register falls back to creating a fresh `User` exactly as today. Re-
  running register/convert is therefore a no-op on an already-converted row — no double
  charge of the same anon id, no orphaned data.
- After convert, clear `ds_anon_play` and issue `ds_session` for the same id (`createSession`
  with the bumped `tokenVersion`), then continue the existing redirect to `/onboarding`.

If `VALUE_FIRST_FUNNEL` is off, `registerAction` behaves exactly as today (no cookie read, no
convert) — create a brand-new `User`.

---

## Flag gating

**Decision: one env flag `VALUE_FIRST_FUNNEL`, exact-string `=== "true"` opt-in**, mirroring
`isEntitlementsEnabled()`. Add `isValueFirstFunnelEnabled()` (proposed in `lib/entitlements.ts`
or a sibling flag module) so every surface checks the flag the same way.

Surfaces that gate on `VALUE_FIRST_FUNNEL`:
- `requirePlayableUser()` — anon minting vs. `requireUser()` fallback (task 04).
- `app/(app)/layout.tsx` — lenient shell resolution vs. hard `requireUser()` (task 04).
- `claimAnonSession` inside `registerAction` — convert-in-place vs. fresh create (task 05).
- The save-progress prompt, segment onboarding, and value-ask offer card
  (tasks 06/07/08) — shown only in the anon funnel.
- Funnel analytics fire points (task 11) and the wave-17 browser audit (task 14).

**The Wave-16 entitlement flag `ENTITLEMENTS_ENABLED` governs the T4 grant SEPARATELY.** The
checkout stub + entitlement upsert (task 09) stays behind `ENTITLEMENTS_ENABLED`
(`isEntitlementsEnabled()`), independent of `VALUE_FIRST_FUNNEL`. The funnel can be on while
the paid grant remains gated until payment creds + Gate 0 land — the two flags are
orthogonal.

---

## Non-goals

Explicitly deferred out of Wave 17 (do not implement here):
- **Real payment charge** — task 09 stubs the charge; no PSP integration, no real money.
- **Hosted-PSI / real CWV numbers** — the perf-floor task (12) reserves layout space; it does
  not chase a measured Lighthouse/PSI score on hosted infra.
- **Public ship** — the funnel stays flag-gated; no marketing/public rollout this wave.
- **P2.5 SEO / JSON-LD** structured data.
- **P3.1 streak** mechanics beyond what already exists.
- **P3.2 reverse-trial** entitlement model.
- **Anonymous-user garbage-collection job** — stale never-converted anon `User` rows
  accumulate; a GC/retention job is a later wave.

---

## Task map

Each downstream task and the single decision here it depends on:

| Task | Deliverable | Depends on decision |
| --- | --- | --- |
| **wave17-02** schema anon+session flags | `isAnonymous` on `User` (+ nullable `email`/`passwordHash`) | *Anon-session model* |
| **wave17-03** anon-session lib | `lib/server/anon-session.ts` — sign/verify `ds_anon_play`, mint anon user | *Cookie & identity* |
| **wave17-04** unblock anon play | route `startTestAction`/`submitAnswerAction` + layout through `requirePlayableUser()` | *Unblock strategy* + *Flag gating* |
| **wave17-05** anon→user migration | `claimAnonSession`, reads anon id from cookie only, convert-in-place | *Migration & IDOR* |
| **wave17-06** save-progress prompt | «Зберегти прогрес і готовність» / «Не зараз» component | *Flag gating* (anon-only surface) |
| **wave17-07** segment onboarding (anon) | new `/segment` vs anon-capable `/onboarding` scaffold | *Unblock strategy* (anon shell access) |
| **wave17-08** value-ask offer card | offer card interpolating real `dialPercent` into «Ти на N%…» | *Anon-session model* (readiness on anon row) |
| **wave17-09** checkout stub grant | `completeCheckout` stubbed charge + server-side entitlement upsert | *Flag gating* (`ENTITLEMENTS_ENABLED`, separate) |
| **wave17-10** PWA manifest / A2HS | `theme_color` → `#FBFAF7`, verify served manifest | independent (perf/PWA) |
| **wave17-11** funnel analytics | funnel-stage event names in `ANALYTICS_EVENTS` + fire points | *Flag gating* (gated surfaces) |
| **wave17-12** perf floor | reserved space / min-height / skeletons on funnel surfaces | *Non-goals* (no real CWV number) |
| **wave17-13** DO-NOT copy compliance | guard script with allowed-negation carve-out | independent (copy guard) |
| **wave17-14** browser audit (funnel) | wave-17 audit section using existing helpers + eval/textContent | *Unblock strategy* + *Flag gating* |
