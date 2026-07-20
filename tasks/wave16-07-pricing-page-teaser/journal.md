# Task: wave16-07-pricing-page-teaser

**Status:** done
**Driver:** auto
**Updated:** 2026-07-04T17:24Z
**Last compute:** ClPcs-Mac-mini

## Goal
Spec T2: the `/pricing` page (one plan card, interest-capture CTA, no checkout) + the reusable
locked-state teaser component that wave16-08 mounts on gated surfaces. PASS = ALL true:

1. `app/(app)/pricing/page.tsx` exists (server component). It reads `PRICE_UAH` and renders one
   plan card: **399 ₴ — «Доступ до іспиту»**, framed as buying readiness for a dated event, not
   content (content is free — say so on the page). The page imports the constant; the literal 399
   appears in `lib/constants.ts` only, not hardcoded in the page.
2. Trust band present with exactly these three commitments (wording may be styled but each phrase
   present): «прогрес не зникає», «без автосписань», «одна ціна».
3. Completion-offer copy present but visibly marked as draft in code: «Пройшов весь план, але не
   склав — доступ безкоштовно до наступної спроби» with a conditions placeholder, and a
   `// COPY-PENDING-L1` comment (lawyer review) adjacent in the source.
4. CTA = interest capture only: a client component that on click sends `pricing_interest` through
   the freeform `/api/track` lane (`lib/client/track.ts` helper; payload: eventType
   `"pricing_interest"`, path `"/pricing"`, NO PII fields) and swaps to a calm confirmation state
   («Дякуємо! Повідомимо, коли відкриємо оплату» or similar — active, direct). No checkout, no
   payment provider code, no email capture.
5. Integration test (extend `lib/server/analytics-ingest.integration.test.ts` or a sibling file)
   drives the REAL `POST` export of `app/api/track/route.ts` with a `pricing_interest` body that
   ALSO smuggles a forbidden key (e.g. `email`) → exactly one AnalyticsEvent row lands with
   `eventType:"pricing_interest"` and the smuggled key is absent from the stored row/metadata
   (zod strip proven on this event shape).
6. `components/entitlement-teaser.tsx` exists: presentational only (plain props: e.g. `title`,
   `valueLine`; NO imports from lib/server/*, @/lib/db, @/lib/rbac, @/lib/auth), renders a locked
   readiness-detail visual (blurred/obscured placeholder — CSS blur on a placeholder block, never
   real data), ONE line of value copy, and a link to `/pricing`. Calm tone — zero urgency/scarcity
   words (no «останній шанс», no timers). Mounted NOWHERE in this task.
7. Browser check (app served; see stale-server constraint): logged in as the seeded user, opening
   `/pricing` shows the price and card — `$DRIVER_BROWSER_CMD` eval
   `document.querySelector("main").textContent` contains `399` and `Доступ до іспиту`; the CTA is a
   real `<button>` (focusable). Unauthenticated curl of `/pricing` returns a non-200 (redirect to
   /login — page sits inside the (app) shell).
8. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` all exit 0.

## Constraints / decisions
- NO nav entry for /pricing this wave — with the flag OFF nothing may change visually anywhere
  (spec: zero behavior change flags off). The page is reachable by URL and, later, from the teaser
  (flag ON). Adding a nav item would be a flag-off UI change.
- Page lives INSIDE `(app)` (auth'd) — Gate 0 is closed, there is no public traffic; the teaser
  audience is logged-in users. Revisit placement when Gate 0 opens.
- DESIGN CRAFT (unattended implementer — these are the rules): the ported «Спокій · Рідке скло»
  system (docs/app-plan/04-design-system.md); the pricing card CONTENT sits on a `.solid` opaque
  reading surface (taste law: no glass-on-glass, no backdrop-filter on reading surfaces);
  pastel-green CTA with dark slate text; boldness in ONE place only (the price); everything else
  quiet. Copy is design material: active verbs, an action keeps its name through its flow, errors
  direct, no dark-pattern urgency. Quality floor: responsive, visible focus states,
  reduced-motion respected.
- Cyrillic browser asserts: use eval `textContent.includes(…)` — innerText applies text-transform
  and SSR inserts comment nodes (house lesson).
- Stale-server trap (wave12b-10): after `npm run build`, RESTART the long-lived LAN server
  (`npm run start -- -H 0.0.0.0 -p 3100`) before browser checks — a new route 404s on the old
  in-memory build, and client chunks go stale.
- Client-bundle trap: the CTA client component imports only `lib/client/track` and React — never
  server-graph modules.
- Depends on: wave16-02 (PRICE_UAH). Does NOT depend on entitlements (teaser is dumb props).

## Next
- [x] Build the page + CTA client component, then the teaser component, then the track integration
      test; build, restart LAN server, run the browser checks.
- [x] Fix verify FAIL: the whole-file `grep -Eq '399'` gate matched the literal `399` in the page's
      doc comment — reworded the comment to drop the digits (real value lives in PRICE_UAH).
- [x] Fix verify FAIL #2: the teaser server-graph gate (`grep -En 'lib/server|@/lib/db|@/lib/rbac|
      @/lib/auth'`) matched those literal path tokens in the teaser's doc comment (whole-file grep) —
      reworded the comment to prose. Also fixed verify.sh's login setup step to tolerate an
      already-authenticated browser (email input absent → null deref); guarded the fill.
- All 8 Goal gates met. Nothing left; task done.

## Artifacts
- app/(app)/pricing/page.tsx — server page: PRICE_UAH price card «Доступ до іспиту», trust band
  (прогрес не зникає / без автосписань / одна ціна), COPY-PENDING-L1 draft completion offer.
- app/(app)/pricing/pricing-cta.tsx — client CTA: track("pricing_interest",{path:"/pricing"}) +
  flush, swaps to calm confirmation. Imports only React / lib/client/track / components/ui.
- components/entitlement-teaser.tsx — presentational locked teaser (blurred placeholder + one value
  line + /pricing link), plain props, zero server-graph imports. Mounted nowhere.
- lib/server/analytics-ingest.integration.test.ts — +1 case: pricing_interest with smuggled email →
  one row, eventType pricing_interest, email stripped everywhere.

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T17:16Z ClPcs-Mac-mini: Built page + CTA client + teaser + integration test. Gates:
  tsc 0, npm test 588 pass, integration 10 pass (incl. new strip case), build 0 (/pricing in route
  list). Stale-server trap: a pre-existing next-server (pid 20235) held :3100 serving an OLD build
  (/pricing 404, EADDRINUSE on relaunch, nohup exits 0 masking it) — found via `lsof -iTCP:3100
  -sTCP:LISTEN` (lsof prisma/dev.db + pgrep-by-name both came back EMPTY), killed, relaunched fresh.
  Browser (logged-in seeded user): /pricing shows 399 + «Доступ до іспиту», CTA is focusable
  <button>, click swaps to «…Повідомимо, коли відкриємо оплату»; unauth curl → 307 /login. Done.
- 2026-07-04T17:34Z ClPcs-Mac-mini: verify FAIL was the `grep -Eq '399'` page gate matching the
  literal `399` in the page's doc comment (whole-file grep matches comments — house lesson). Reworded
  the comment to drop the digits; `grep -Eq '399'` now clean. No code/behaviour change. Status: done.
- 2026-07-04T17:24Z ClPcs-Mac-mini: verify FAIL #2 — teaser server-graph gate matched the literal
  `lib/server`/`@/lib/db`/`@/lib/rbac`/`@/lib/auth` path tokens in the teaser's OWN doc comment (same
  whole-file-grep-matches-comments trap). Reworded that comment to prose ("no server-graph module").
  Then hit a transient content-upsert.integration flake (shared dev-DB pollution from concurrent
  browser audit) — passed in isolation and on a clean full re-run (42 files, 181 pass). Last: verify's
  login setup step null-deref'd (browser held a live session → /login redirects to /dashboard → no
  email input); guarded the fill in verify.sh (setup-only, real /pricing asserts unchanged). Full
  verify.sh now EXIT 0 ("OK wave16-07"): /pricing renders 399 + «Доступ до іспиту» logged-in, unauth
  curl → non-200. Status: done.



## Verify
**Last verify:** PASS (2026-07-04T14:27:04Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T14:29:28Z)
