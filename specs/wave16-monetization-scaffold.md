# Wave 16 — Monetization scaffold, win-back, JTBD instrumentation, SEO pages

Source of truth: `docs/strategy/VISION-2026-07-04.md` (A-wave table) — read it first. Strategy
evidence in `docs/strategy/STRATEGY-2026-07-04.md` + `RESEARCH-ADDENDUM-2026-07-04.md`.

Mission: build the freemium-INVERSION scaffold (all content free forever; the paid layer = the
intelligence: readiness detail, FSRS plan, calibrated reminders, mistake analytics) behind a flag
that defaults OFF, plus the retake win-back trigger, JTBD onboarding instrumentation, and
noindex-gated public SEO question pages. NO payment provider integration in this wave (deferred
behind Gate 0 public origin). Everything additive; zero behavior change with flags off.

Standing rules (PLAN.md driving prompt applies in full): zod-validate every new input · RBAC/
entitlement enforcement SERVER-side only, never trust the client · no IDOR · additive migrations via
`prisma migrate deploy` + client regen · Ukrainian copy through the frontend-design copy lens (active
verbs, direct errors, one job per element) · tests on every valuable change, pure logic in `lib/` ·
final task runs `npm run build`.

## T1 — Entitlement model + engine (flag off ⇒ inert)

- Env/const flag `ENTITLEMENTS_ENABLED` (default false) following the existing configurable-constants
  pattern in `lib/constants.ts`.
- Additive migration: `Entitlement` table (userId unique FK, tier `FREE|EXAM_ACCESS`, purchasedAt,
  examDate nullable, validUntil nullable, source `MANUAL|PROMO` for now). No changes to existing tables.
- Pure `lib/entitlements.ts`: `getEntitlement(userId)`, `hasIntelligenceAccess(ent, now)` —
  unit-tested, no I/O in the pure core; server loader in `lib/server/`.
- **The gated set is EXACTLY:** readiness dial detail beyond the top-line number, FSRS «план до
  іспиту» surfaces, calibrated reminder scheduling, mistake analytics. **NEVER gated (assert in an
  integration test that stays forever):** questions, explanations, images, all practice/exam modes,
  the simulator, progress history.
- Flag OFF ⇒ every existing test passes unmodified; no UI change. Flag ON without entitlement ⇒
  gated surfaces render the locked state (T2 teaser), APIs return a typed 403 with Ukrainian message.
- Admin: minimal grant/revoke action (requireContentManager or admin-only), zod-validated, for
  manual/promo entitlements.

Boolean criteria: migration applied + client regenerated · unit tests for the pure engine (expiry,
tier, examDate scope) · integration: non-entitled user blocked server-side on a gated API, entitled
user passes, content endpoints unaffected in both states · full suite green with flag off.

## T2 — /pricing page + locked-state teaser

- `/pricing`: one plan card — **399 ₴, «Доступ до іспиту»** (framing: buying readiness for a dated
  event, not content — content is free). `PRICE_UAH = 399` and `PRICE_TEST_ARM_UAH = 499` as
  constants; page reads constants. Trust band: прогрес не зникає · без автосписань · одна ціна.
  Completion-offer copy included but marked draft (lawyer L1): «Пройшов весь план, але не склав —
  доступ безкоштовно до наступної спроби» with conditions placeholder.
- CTA = interest capture (no checkout): tracked event `pricing_interest` through the existing
  `/api/track` zod whitelist (extend whitelist; no PII).
- Locked-state teaser component for gated surfaces (flag ON): shows a blurred/locked readiness
  detail + one-line value + link to /pricing. Calm, no dark-pattern urgency.
- Design: the ported «Спокій · Рідке скло» system (see `docs/app-plan/04-design-system.md`); pricing
  card CONTENT stays solid/opaque (no glass-on-glass); pastel-green CTA with dark slate text.

Boolean: page renders w/ constants · event lands in analytics with whitelisted shape · teaser only
appears with flag ON + no entitlement · a11y (focus, labels) on the card and CTA.

## T3 — Exam outcome capture + retake win-back

- Self-reported outcome on the profile/plan surface: «Склав / Не склав» + exam date (zod-validated,
  own-user only). Store additively (extend UserStudyProfile or a small ExamOutcome table — planner's
  choice, additive migration either way).
- Win-back: if outcome = failed with date D, schedule ONE in-app nudge in the day-8/9 window after D
  (the 10-day retake wait — strategy §5) through the EXISTING impression-capped nudge system (W14,
  ≤4 impressions/7d cap must be respected, prove by test). Copy: kind, no guilt («10 днів майже
  минули — повторимо слабкі теми перед новою спробою?») — flagged COPY-PENDING-L4 in a comment.
- No Web Push (deferred); in-app nudge only.

Boolean: outcome write validated + own-user-only (IDOR test) · nudge scheduled only when
outcome=failed AND date present · cap honored when other nudges compete · no nudge after success.

## T4 — JTBD onboarding instrumentation

- Two OPTIONAL onboarding questions (skippable, never block the flow): «Коли твій іспит?» (date or
  «ще не записався») and «Як готуєшся?» (single-select: автошкола / самостійно / і те і те).
- Persist to the user profile (additive) AND emit whitelisted analytics fields (extend `/api/track`
  zod whitelist; enum/date only, no free text, no PII).
- Purpose: this replaces the 3×-failed JTBD research with production telemetry (VISION L4).

Boolean: skip path leaves profile untouched + flow completes · answers land in profile + analytics ·
whitelist strips anything else · existing onboarding tests still green.

## T5 — Public SEO question pages (noindex-gated)

- Route `/q/[questionKey]` (stable keys, e.g. `q_11_10`): renders question text, options (correct
  answer NOT revealed pre-interaction — simple reveal on select, no auth), restyled image via the
  existing `/api/q-image/[key]` resolver, and the study-aid explanation when present. Server-rendered,
  public, works logged-out.
- JSON-LD (Quiz/Question schema) consistent with the landing's existing JSON-LD approach.
- **Gate:** while `APP_ORIGIN` is unset (Gate 0 closed), every /q page carries
  `<meta name="robots" content="noindex">` AND the sitemap generator excludes them. Sitemap module
  (`/sitemap.xml`) built now, question section activates only when the gate opens. Integration test
  asserts noindex present while gate closed.
- Perf: no client JS beyond the reveal interaction; images through the resolver (AVIF path exists).
- Only OFFICIAL published questions; retired/deactivated keys → 404.

Boolean: page renders for a live key, 404 for retired/unknown · noindex + sitemap-exclusion proven
while gate closed · reveal works without auth · no answer leak in initial HTML before interaction
(view-source check in test) · JSON-LD valid shape.

## T6 — Final verify

`npm run typecheck` · full unit + integration · `npm run db:seed` idempotent · `npm run build` ·
`npm run audit:browser` green. Assert: with `ENTITLEMENTS_ENABLED=false` the app is byte-for-byte
behaviorally identical on the audited flows.

## Wave-review lenses (for the review workflow after the wave)

Server-side entitlement enforcement (no client trust, no IDOR) · content-gating regression (the
never-gated set) · analytics privacy whitelist (nothing smuggled) · noindex/sitemap gate correctness ·
nudge cap honesty · flag-off inertness.
