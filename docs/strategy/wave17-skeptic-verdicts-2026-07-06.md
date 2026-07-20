# Wave 17 — Adjudicated Skeptic-Review Verdicts

**Repo:** `/Users/clpc/drivers-school` @ `main` (d33c26b) · **Reviewed:** 2026-07-06
**Scope:** Value-first mobile conversion funnel, all behind `VALUE_FIRST_FUNNEL` (default OFF); stub checkout behind `PAYMENT_STUB` (default OFF); real payment deferred to Gate 0.
**Method:** Each finding independently re-read against current source. The two "major" production-path findings the control thread had leaned toward "by-design" were re-verified line-by-line in code, not rubber-stamped.

---

## 1) TL;DR

**14 findings adjudicated:** `CONFIRMED_REAL: 8` · `BY_DESIGN: 3` · `KNOWN_DEFERRED: 2` · `FALSE_POSITIVE: 1`.

**Headline — the earlier hand-adjudication did NOT hold. The skeptics overturned it on the funnel's core payoff path.** The prior "by-design" instinct correctly described the *offer card* (authed + diagnostic + data-sufficient — genuinely unreachable by anon, by design) but wrongly extended that cover to the **entire `/test/[id]/result` page** and the **readiness dial**. I confirmed in code that `result/page.tsx:22` calls `requireUser()` while every step that leads there (`finishTestAction`, the test runner's finish button, the `COMPLETED → /result` redirect) is anon-capable via `requirePlayableUser`. So an anonymous visitor plays the whole free loop and is then hard-walled to `/login` at the exact value-payoff moment — score, honest-stats card, per-question review, and the readiness dial (none of which are the paid intelligence layer). **That is the funnel breaking on its own designed path the moment the flag flips on, not a by-design gate.** The CLAUDE.md learning that defends "/result requireUser intentional" conflates offer-card unreachability (real, by design) with whole-result-page unreachability (a real bug); the ADR's own Context ("play a real question loop *and see their readiness dial move* before being asked to create an account") is contradicted by the implementation, with no logged deviation.

Two further genuine production-path defects the earlier pass had not isolated: a **500 + orphan-row on cookieless direct-nav to `/test/[id]`** (cookie mutation in a render, which Next 16 forbids), and **`/pricing` is the one non-playable route missing its own auth re-assert** so it becomes anon-reachable flag-on. Plus an **analytics undercount** (`activation_aha` never fires for guided/diagnostic-first users — the exact core cohort Wave 17 exists to instrument).

**Net:** the wave is safe *today* (flag default OFF — zero live impact), and none of this is a Gate-0/payment concern. But three of the CONFIRMED_REAL items are cheap, isolated, flag-independent fixes that should land before `VALUE_FIRST_FUNNEL=true`; the anon-dial product question needs Danil's call and belongs on the Gate-0 list (where it currently is not). The stub-checkout, three-flag gating, `readiness_aha` render-fire, and the "no payment line item" findings are correctly by-design / already-tracked.

---

## 2) Verdict table

| # | Finding | Verdict | Matters? | Action |
|---|---------|---------|:--:|--------|
| 1 | Anon hard-walled to `/login` at test **result page** — the funnel's own value payoff | **CONFIRMED_REAL** (major) | ✅ | fix-now |
| 2 | Anon never reaches the **readiness dial** (`/result` `requireUser` bounces at the dial moment; contradicts ADR) | **CONFIRMED_REAL** (minor) | ✅ | fix-at-gate0 |
| 3 | `/test/[id]` mints anon + sets cookie **during render** → 500 + orphan row on cookieless direct-nav (flag on) | **CONFIRMED_REAL** (minor) | ✅ | fix-now |
| 4 | `activation_aha` keyed on global `TestAnswer` count `===1` never fires for onboarding/diagnostic-first users | **CONFIRMED_REAL** (minor) | ✅ | fix-now |
| 5 | `/pricing` is the only non-playable `(app)` route missing its own auth guard → anon-reachable flag-on | **CONFIRMED_REAL** (minor) | ✅ | fix-now |
| 6 | Anon User-row minting is unbounded / un-rate-limited / un-GC'd | **KNOWN_DEFERRED** (major) | ➖ | fix-at-gate0 |
| 7 | Checkout test (e) "grant still writes" assertion is vacuous (stale row from test (a)) | **CONFIRMED_REAL** (minor) | ➖ | add-test |
| 8 | Checkout suite claims server-authoritative grant but never adversarially exercises it | **CONFIRMED_REAL** (nit) | ➖ | add-test |
| 9 | T5 self-segment validators + server actions have no test coverage | **CONFIRMED_REAL** (minor) | ➖ | add-test |
| 10 | `readiness_aha` fires per-render with no once-guard (asymmetric with `activation_aha`) | **BY_DESIGN** (nit) | ➖ | document-only |
| 11 | Stub checkout (T7) intentionally unlinked, gated by `PAYMENT_STUB` | **BY_DESIGN** (nit) | ➖ | document-only |
| 12 | Three-flag funnel gating: incoherent states are dev-only + production-safe; deviation IS logged | **BY_DESIGN** (nit) | ➖ | document-only |
| 13 | Flag-ON HTTPS prod-audit gate is a correctly-deferred Gate-0 note | **KNOWN_DEFERRED** (nit) | ➖ | fix-at-gate0 |
| 14 | "No payment line item" — real payment IS documented as a Gate-0 carry in PLAN.md + ADR | **FALSE_POSITIVE** (none) | ❌ | no-action |

---

## 3) CONFIRMED_REAL defects

### #1 — Anon hard-walled to `/login` at the result page (MAJOR · fix-now · SAFE) ⭐ overturns the earlier "by-design"

**Independently verified in code.** `app/(app)/test/[id]/result/page.tsx:22` is `const user = await requireUser();` → `lib/rbac.requireUser` redirects to `/login` when there is no `ds_session`. An anon holds only `ds_anon_play`, so `/result` bounces them.

The anon reaches `/result` through the wave's **own** anon-capable path, all confirmed:
- Play path everywhere uses `requirePlayableUser` — `test/[id]/page.tsx:14`, and `finishTestAction` (`app/actions/test.ts:124-130`) which is anon-capable and ends with `redirect(\`/test/${id}/result\`)`.
- The test runner's finish button is not anon-gated; `test/[id]/page.tsx:17` also redirects `COMPLETED → /result`.

So the anon plays the entire free loop, taps finish, and is bounced to `/login` at the payoff. Critically, the walled content is **the free value, not the paid layer**: score, the honest-stats card, and the per-question review («Розбір питань»). For an anon MIXED_PRACTICE finish `isDiagnostic=false → dial=null → showOffer=false`, so the offer card isn't even the issue — the whole result page is.

**Why the by-design cover is wrong:** the ADR (`docs/strategy/wave17-anon-funnel-adr.md`) "Unblock strategy" enumerated exactly the sites to convert — the layout + the 6 actions in `app/actions/test.ts`. The result **page** is neither, and was never converted. The CLAUDE.md learning defends offer-card unreachability (correct) but the same reasoning does not license walling the free result page. No logged deviation reconciles it; the anon-play integration test drives only `submitAnswer`, never `finish → result`, so the wall was never exercised.

**Fix-now-safe:** yes. Convert `/result` to resolve identity leniently (real user, else `getAnonUser()`), scope the offer/paid surfaces as they already are, and let the anon see their own free result. Small, isolated, flag-independent.

---

### #2 — Anon never reaches the readiness dial (MINOR · fix-at-gate0 · needs Danil's call)

Same root cause as #1, but the resolution is a **product decision**, not a mechanical patch — hence separated and routed to Gate 0. Verified: `ReadinessDial` mounts on exactly two surfaces, `/result` (line 112) and `/dashboard` (line 235), and both pages are `requireUser`. `readiness_aha` fires at `result/page.tsx:49` inside the walled page, so it can never fire for an anon. Sharper than the finding stated: for DIAGNOSTIC mode the runner withholds inline feedback during play, so an anon who plays the diagnostic (the *only* loop that feeds the dial) gets zero payoff — nothing during the loop, login wall after.

The ADR's **Context** promises the anon dial verbatim; its **Decisions** never operationalize a dial surface for anon. That internal ADR contradiction was never reconciled. Resolution is either (a) fix ADR wording to "dial is a post-registration reward," or (b) let anon reach a read-only dial. **Not fix-now-safe** (product call). Flag-gated + blocked-on-Danil for Gate 0, so no live harm today — but it should be surfaced onto the Gate-0 list, not left dismissed as by-design.

---

### #3 — `/test/[id]` mints anon + sets cookie during render → 500 + orphan row (MINOR · fix-now · SAFE)

**Verified.** `test/[id]/page.tsx:14` calls `requirePlayableUser()` in a Server Component render → `getOrCreateAnonUser()` (`lib/server/anon-session.ts:116`) → for a visitor with no valid `ds_anon_play` cookie, runs `prisma.user.create(...)` **then** `setAnonCookie()` → `cookies().set()`. Next 16 forbids cookie mutation outside a Server Action / Route Handler (render phase ≠ action phase → `ReadonlyRequestCookiesError`). The throw propagates unhandled → **500**; and because `prisma.user.create` runs *before* the throwing `set`, every such hit also **leaks an orphan anonymous User row**.

The sibling layout (`app/(app)/layout.tsx`, `resolveShellUser`, lines 15-20) deliberately uses read-only `getAnonUser()` "WITHOUT minting a row" — the page diverges from a pattern the codebase already knows.

**Reachability:** happy path is safe (`startTestAction` is a Server Action → mints + sets cookie in the action phase, then redirects; the subsequent render finds the cookie and never calls `set`). The crash requires reaching `/test/<id>` with no/expired/invalid cookie: a shared/bookmarked test link opened by a fresh visitor, cleared cookies, a new device, or a 30-day-expired cookie. Genuinely reachable flag-on.

**Fix-now-safe:** yes. On the page, resolve identity read-only (real user or `getAnonUser`); when null, `notFound()`/redirect instead of minting — never `set()` a cookie in a render.

---

### #4 — `activation_aha` never fires for onboarding/diagnostic-first users (MINOR · fix-now · SAFE)

**Verified.** `test-engine.ts:472-484` fires `activation_aha` only when `showsImmediateFeedback(session.mode) && question.explanation` AND `prisma.testAnswer.count({ where: { testSession: { userId } } }) === 1`. `showsImmediateFeedback` (256-258) is **false** for DIAGNOSTIC and EXAM_SIMULATION. But the `TestAnswer` upsert (397-416) writes a row for **all** modes incl. DIAGNOSTIC — the feedback guard only gates the returned payload and the aha event, not the write. `onboarding/page.tsx` presents a DIAGNOSTIC CTA as the guided new user's first action, so a guided user accrues ~15 diagnostic answer rows before any practice; when they later reveal an explanation in practice, `count >= 16`, so `activation_aha` **never fires**. The event's own comment (line 468) states the intent is "the FIRST answered question whose explanation is revealed" — which `count===1` contradicts.

Anon `/segment` MIXED_PRACTICE users fire correctly, but the **guided-onboarding authed cohort — the core funnel cohort — is systematically missed.** An analytics undercount, not a user-facing break, but it corrupts the very funnel-stage metric Wave 17 exists to instrument.

**Fix-now-safe:** yes. Dedupe on prior-fire / first *feedback-eligible + explanation* answer instead of a global raw count. Small and isolated.

---

### #5 — `/pricing` missing its own auth guard → anon-reachable flag-on (MINOR · fix-now · SAFE)

**Verified.** Flag-on, `app/(app)/layout.tsx`'s `resolveShellUser()` returns `getAnonUser()` (anon or null, no redirect) for the whole shell. The ADR says the lenient shell is only so the question loop can render — non-playable routes must still re-assert a real user. Every sibling honors that: `dashboard/page.tsx`, `progress/page.tsx`, `mistakes/page.tsx` all call `requireUser()`; `pricing/checkout/page.tsx` calls `getCurrentUser()` then `redirect("/login")`/`redirect("/register")`. **`app/(app)/pricing/page.tsx` has NO auth call at all** — I confirmed the file (its comment at lines 10-12 even claims "the layout's requireUser() bounces anonymous traffic to /login," which is now **false** flag-on).

**Impact is low:** `/pricing` is static marketing (price literal + trust bullets + interest-only CTA, no PII, renders fine for a null user). No data/security leak. But it is a real, reachable divergence from both the ADR and the established self-guard pattern its own sibling checkout page enforces (which even bounces anon to `/register`).

**Fix-now-safe:** yes. Add a `requireUser()` (or `getCurrentUser()` + redirect) at the top of the page, matching the sibling checkout page; correct the stale comment.

---

### #7 — Checkout test (e) "grant still writes" assertion is vacuous (MINOR · add-test · SAFE)

Tests a–e share one `buyerId` and run in source order; `afterEach` only unstubs envs — nothing deletes the entitlement until `afterAll`. Test (a) upserts an `EXAM_ACCESS` row; test (e) then asserts `row?.tier === "EXAM_ACCESS"` — but that row already exists from (a), so the assertion passes **independent of what (e) wrote**. If the grant were (wrongly) flag-gated behind `isEntitlementsEnabled()`, (e) would still be green. Two mitigations: (e)'s *second* assertion (`checkIntelligenceAccess => {enabled:false, hasAccess:true}`) genuinely exercises the inert read gate; and production code is correct (the upsert is unconditional). **Test-coverage gap, not a shipped bug.** Fix: reset the buyer's entitlement before (e), or use a distinct buyer, so the "grant still writes flag-off" claim is actually exercised.

### #8 — Checkout suite claims server-authoritative grant but never adversarially exercises it (NIT · add-test · SAFE)

Production `completeCheckout(_formData)` never references the FormData — identity is `getCurrentUser()`, grant is `user.id` + hardcoded `EXAM_ACCESS`. **Production path is genuinely server-authoritative with zero client-controlled input — no defect.** But the header comment advertises the "no client-controlled path" guarantee, and no case exercises it: `runCheckout()` always passes an empty FormData, so a hypothetical `formData.get('userId')` read would yield the identical buyerId and the assertion couldn't tell session-derived from body-derived identity. Insures only against a future regression. Fix: add a case that stuffs a *different* userId into the FormData and asserts the grant still lands on the session user.

### #9 — T5 self-segment validators + server actions untested (MINOR · add-test · SAFE)

Grepping all test files for `segment` / `isSegmentTiming` / `isSegmentConfidence` returns zero hits. `lib/segment.ts`'s two validators and the three `app/actions/segment.ts` actions have no direct coverage — an isolated gap against a well-tested surrounding surface (`funnel.test.ts`, `validation.test.ts`). Blast radius is small: the validators are whitelist checks that **fail closed** (non-whitelisted value → event simply not recorded), the one validator gating a DB mutation (`selectCategorySchema`) IS tested, and the surface is inert flag-off. Quality/regression-safety item, not a production defect. Fix: add unit tests for the two validators (whitelist + fail-closed) and integration coverage for the three actions.

---

## 4) The rest, by verdict

**BY_DESIGN (correctly closed — document-only):**
- **#11 Stub checkout unlinked (T7):** Confirmed URL-only reachable; deliberate and documented (PLAN.md:413 — "a free-grant stub must not be one tap away"). Server-side backstop: `completeCheckout` gates the grant on `isPaymentStubEnabled()`, else redirects `?error=unavailable` — no free grant in prod regardless of linking. Only residual: **stale comments** (`exam-access-offer.tsx:30`, `checkout/page.tsx` header) describe wiring that intentionally doesn't exist — a doc nit.
- **#12 Three-flag gating:** The finding's load-bearing claim ("unlogged deviation") is **false** — task wave17-09's Goal 2b pre-authorized the choice and the journal records it. Every "incoherent" state is production-safe (all three flags default OFF → offer never renders) or a documented dev/staging-only combo; the money-relevant one involves no real charge (stub only). Only residual value: a one-line runbook on flag-flip order — a nice-to-have, not a code change.
- **#10 `readiness_aha` per-render fire:** Factually asymmetric with `activation_aha`, but doesn't matter — no consumer treats it as a deduplicated stage (the real funnel query uses `groupBy(['userId'])` on registration/onboarding/test events and never references it), both fire points pass `user.id` so distinct-user counts are query-side recoverable, and render-point firing is the documented spec decision. Adding a once-guard would inject a per-render DB count for no benefit.

**KNOWN_DEFERRED (genuine, but out of scope for this wave — Gate 0):**
- **#6 Unbounded anon User-row minting:** Read accurately — `getOrCreateAnonUser` unconditionally `prisma.user.create`s on any request with an unresolved `ds_anon_play` cookie; no rate-limit, bot-guard, or GC/prune job anywhere; no `middleware.ts`. Aggravated by #3 (a cookieless GET to `/test/<anything>` mints a row before the render throws). Real storage/DoS/count-pollution concern **when public** — but the whole path is unreachable in current prod (flag OFF, no committed env flips it), and the ADR explicitly names GC/retention + public ship as later-wave Non-goals. The prior "by-design" label was imprecise (unbounded growth isn't an intended end state) but its operative conclusion — not a fix-now blocker — is correct. Rate-limit/bot-guard + GC are a Gate-0 prerequisite.
- **#13 Flag-ON HTTPS prod-audit gate:** The finding's premise ("proven only flag-OFF") is a **false read** — `bin/browser-audit.sh` §18 already exercises the full flag-ON funnel in a real browser (anon play → save-prompt → offer card → register migration with a `/history` ownership oracle), and PLAN.md:406-408 records both the 82/82 flag-OFF and 97/1 flag-ON runs. The only genuinely-deferred kernel — point that already-built flag-ON audit at the *public HTTPS origin* as a launch gate — is inherently Gate 0 (no public origin exists yet). Nothing about current shippable code is defective.

**FALSE_POSITIVE:**
- **#14 "No payment line item":** The code claims are accurate but the load-bearing assertion ("ZERO payment line," "no wave18/payment spec") is **factually false** against durable state. PLAN.md:417-418 carries "real payment integration" to the Gate-0 wiring pass and records "STILL BLOCKED ON DANIL: public origin + a LiqPay/Fondy account"; the ADR Non-goals and VISION-2026-07-04.md:44 both record the deferral. The reviewer cited a stale ROADMAP file instead of PLAN.md. The exact item it proposes to add already exists. No-action.

---

## 5) Recommended action list

### fix-now (before flipping `VALUE_FIRST_FUNNEL=true` — all flag-independent, small, isolated, safe)
1. **#1 — Convert `/test/[id]/result/page.tsx` off `requireUser()`** to a lenient resolve (real user, else `getAnonUser()`); keep the offer/paid surfaces scoped as they already are. Restores the funnel's free value payoff for anon. *(The single most important fix — it's the whole point of the wave.)*
2. **#3 — Stop minting/cookie-setting in the `/test/[id]` page render.** Resolve identity read-only; when null, `notFound()`/redirect instead of `getOrCreateAnonUser()`. Kills the cookieless-direct-nav 500 + orphan-row leak.
3. **#4 — Fix `activation_aha` firing** to dedupe on first feedback-eligible + explanation answer, not a global `TestAnswer count===1`. Restores the funnel-stage metric for the guided/diagnostic-first cohort.
4. **#5 — Add `/pricing`'s own auth re-assert** (match the sibling checkout page) and correct its now-false comment.

### fix-at-gate0 (blocked-on-Danil / product-decision — add to the Gate-0 list)
5. **#2 — Anon readiness-dial reachability:** Danil's call — fix the ADR wording ("dial = post-registration reward") **or** give anon a read-only dial. Currently NOT on the Gate-0 list; add it.
6. **#6 — Anon-row hardening:** rate-limit + bot-guard on minting + a GC/retention job, as a Gate-0 prerequisite before public flag-ON.
7. **#13 — Point the already-built flag-ON browser audit at the public HTTPS origin** as a launch gate.

### add-test (regression-safety; no runtime bug)
8. **#7 — De-vacuum checkout test (e)** (reset the buyer's entitlement, or use a distinct buyer).
9. **#8 — Add an adversarial FormData case** to the checkout suite to actually exercise the "no client-controlled grant" guarantee.
10. **#9 — Cover the T5 segment validators + three server actions** (whitelist + fail-closed + action flow).

### document-only (by-design — small doc/runbook nits, no code change)
11. **#11 — Delete/correct the stale checkout-wiring comments** (`exam-access-offer.tsx:30`, `checkout/page.tsx` header) that describe intentionally-absent wiring.
12. **#12 — Add a one-line flag-flip-order invariant/runbook** (funnel-on-before-payment-wired is the sanctioned staging window; fail-closed is intended).
13. **#10 — Leave `readiness_aha` as-is;** optionally note the render-point semantics next to the fire sites so no future reader "fixes" it into a per-render DB count.

### no-action
14. **#14 — None.** Real payment is already tracked in PLAN.md + ADR as a Gate-0 carry.
