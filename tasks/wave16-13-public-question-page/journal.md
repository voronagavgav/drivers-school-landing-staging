# Task: wave16-13-public-question-page

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Updated:** 2026-07-04T18:25Z
**Last compute:** mac-mini

## Goal
Spec T5 (page half): public server-rendered `/q/[questionKey]` pages — question, options, image,
explanation; answer revealed only on interaction; works logged-out. SEO metadata/JSON-LD/sitemap is
wave16-14, NOT here. PASS = ALL true:

1. `app/q/[key]/page.tsx` exists OUTSIDE the `(app)` group (public by construction — no
   requireUser; confirm no auth redirect). It renders for a live `questionKey` (e.g. `q_10_1`):
   question text, all options in displayOrder, the restyled image via the existing
   `/api/q-image/...` resolver when the question has an image (exact key per wave16-01 Findings
   1g), and — ONLY in the revealed state — the correct answer marking plus the
   `QuestionExplanation` study-aid text when present.
2. REVEAL WITHOUT AUTH OR CLIENT JS: each option is a link to `?v=<displayOrder>` (same page,
   server re-render). With `?v=` present the page shows: which option the visitor picked, the
   heading «Правильна відповідь» marking the correct option (this exact string is the binding
   reveal marker), and the explanation. Progressive enhancement only — zero client components in
   this route (spec: "no client JS beyond the reveal interaction"; a pure-link reveal needs none).
3. NO ANSWER LEAK IN INITIAL HTML: the document served for `/q/<key>` WITHOUT `?v=` contains
   neither «Правильна відповідь», nor the explanation text, nor any `isCorrect`/`data-correct`
   serialization. (Verified by curl view-source in verify.sh + wave16-15 audit.)
4. Loader `lib/server/public-question.ts` `getPublicQuestion(questionKey)`: returns the question
   ONLY when `isPublished && isActive && archivedAt === null` and questionKey matches; anything
   else (unknown key, unpublished, inactive, archived) → null → page calls `notFound()` (404).
   OFFICIAL-only is guaranteed by the published set (content is official-only since wave 7-8;
   record in Log).
5. Integration test `lib/server/public-question.integration.test.ts`: fixture via
   createOfficialQuestion — published key → full shape (text, options with displayOrder, correct
   flag, explanation relation); then flip `isPublished:false` → null; `isActive:false` → null;
   `archivedAt` set → null; unknown key → null.
6. Live checks (server restarted on fresh build): `curl -s $ORIGIN/q/<live-key>` → HTTP 200
   logged-out, contains the question text, does NOT contain «Правильна відповідь»;
   `curl -s "$ORIGIN/q/<live-key>?v=1"` → contains «Правильна відповідь»;
   `curl -s -o /dev/null -w '%{http_code}' $ORIGIN/q/q_nope_404` → 404.
7. `npx tsc --noEmit`, `npm test`, `npm run test:integration`, `npm run build` exit 0.

## Constraints / decisions
- LINK-BASED REVEAL (decision): options are `<a href="?v=n">` — server re-render carries the
  reveal. No client component, no server action, nothing for a logged-out bot to break; the
  correctness data physically never reaches the initial response. If the implementer switches to a
  client reveal, the no-leak criteria (3, 6) still bind unchanged — but the default is links.
- `?v` is zod/param-validated (positive int within option count) — garbage values render the
  unrevealed state, never crash.
- Route segment param stays `[key]`; sanitize/validate the key shape (`q_` prefix pattern) before
  the DB hit — this is the app's first public DB-backed route (no auth, so the loader's where
  clause IS the access control; keep it exactly Goal 4's predicate).
- No noindex/meta/JSON-LD here (wave16-14) — but do NOT add any robots meta that would have to be
  reverted either; ship the bare page.
- DESIGN CRAFT: reading surface `.solid` (opaque — taste law), calm layout consistent with the
  runner's question card idiom; images through the resolver get AVIF negotiation for free; visible
  focus on option links; reduced-motion respected (no reveal animation needed).
- SvitlykSprite trap: routes outside `(app)` don't get the shell sprite — if any Svitlyk/Wordmark
  `<use>` is rendered, mount a local `<SvitlykSprite />` (house lesson, wave13-02).
- Stale-server trap: restart the LAN server after build before the curl checks (new route
  otherwise 404s on the old in-memory build).
- Depends on: nothing in this wave (uses existing schema/resolver) — can run parallel to the
  entitlement chain.

## Next
- [x] Write the loader + integration test, then the page with link-reveal, build, restart server,
      run the curl checks.
- All Goal criteria met. If the driver's verify.sh goes red, triage there.

## Artifacts
- app/q/[key]/page.tsx
- lib/server/public-question.ts
- lib/server/public-question.integration.test.ts

## Log
- 2026-07-04T00:00Z mac-mini: task created by planner.
- 2026-07-04T18:25Z ClPcs-Mac-mini: Implemented the whole increment. Added
  `lib/server/public-question.ts` (`getPublicQuestion` — `server-only`; validates `q_`-prefix key
  shape via regex BEFORE the DB, then `findFirst` where `questionKey/isPublished:true/isActive:true/
  archivedAt:null`, options ordered by displayOrder, explanation relation; official-only guaranteed by
  the published set per waves 7–8). Added `lib/server/public-question.integration.test.ts` (6 cases:
  full shape + displayOrder ordering + explanation; isPublished:false/isActive:false/archivedAt→null;
  unknown key→null; malformed key→null — fixture via createOfficialQuestion, patched questionKey +
  QuestionExplanation). Added `app/q/[key]/page.tsx` OUTSIDE `(app)` — server component, NO
  `"use client"`, link-based reveal (`<a href="?v=<displayOrder>">`, no client JS/server action).
  Reveal only when `?v` (zod `coerce.number().int().min(0)`) matches a real option's displayOrder;
  «Правильна відповідь» heading + explanation appear ONLY in the revealed state. Mounted a local
  `<SvitlykSprite/>` (Wordmark's `<use>` needs it outside the shell, wave13-02). Image via
  `resolveImageSrc`/`imageSrcSet` (passes `imageKey`, NOT questionKey — wave16-01 1g). Verified:
  `tsc --noEmit` clean; `npm test` 598 pass; new integration file 6 pass; `npm run build` clean
  (`/q/[key]` dynamic). Killed stale LAN server pid 55603 (found via `lsof -nP -iTCP:3100`),
  relaunched `npm run start -- -H 0.0.0.0 -p 3100` on fresh build. Live curl (ORIGIN
  http://100.110.64.90:3100, key q_1_1): `/q/q_1_1`→200 logged-out, no «Правильна відповідь», no
  `isCorrect`, image tag present; `?v=1`→reveal marker present; `q_nope_404`→404; malformed→404.
  Status→done.

## Verify
**Last verify:** PASS (2026-07-04T15:26:08Z)

## Evaluation
**Last evaluation:** PASS (2026-07-04T15:27:29Z)
