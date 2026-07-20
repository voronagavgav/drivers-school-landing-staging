# Task: wave14-10-account-delete

**Status:** done
**Driver:** auto
**Evaluate:** yes
**Model:** claude-fable-5
**Updated:** 2026-07-02T22:07Z
**Last compute:** ClPcs-Mac-mini

## Goal
Data rights, part 2 (spec §D): type-to-confirm account deletion. IRREVERSIBLE-OP task — highest care.
PASS = ALL true:

1. `lib/server/data-rights.ts` (extends wave14-09) exports `deleteUserAccount(userId: string): Promise<void>`:
   a single `prisma.user.delete({ where: { id: userId } })` — the schema's onDelete: Cascade FKs wipe
   all learning-state children (wave14-01 finding 1g confirmed the chain; question-side Restrict FKs
   are unaffected because they point Question→, not →User). NO manual child deleteMany UNLESS finding
   1g exposed a non-cascading child — then delete those children first, in FK order, inside one
   $transaction.
2. Server action `deleteAccountAction(formData)` (in `app/actions/user.ts`, house action file):
   - `requireUser()`; reads field `confirm`; proceeds ONLY when the value is EXACTLY «ВИДАЛИТИ»
     (trim, but case- and alphabet-exact — the Latin lookalike "ВИДАЛИТИ" typed in Latin must fail);
     otherwise returns a form error «Щоб підтвердити, введіть слово ВИДАЛИТИ» without deleting;
   - on success: `recordEvent`-free (the user is gone — no orphan analytics write), destroys the
     session cookie (existing destroySession helper), `redirect("/goodbye")`.
3. `/goodbye` page (OUTSIDE the (app) shell — the user no longer has a session): calm copy, pinned
   substring «Ваші дані видалено», a link «На головну» to `/`; no Світлик guilt, no "come back" plea.
   If it renders Svitlyk/Wordmark it mounts a local `<SvitlykSprite />` (outside-shell rule).
4. `/account/data` page: the delete section becomes real — a form with a text input labeled
   «Введіть ВИДАЛИТИ», the destructive button «Видалити акаунт назавжди», and an explicit consequence
   line «Це незворотно: прогрес, повторення і статистика зникнуть одразу».
5. Integration tests (extend `lib/server/data-rights.integration.test.ts`), production path = the
   ACTION with partial-mocked `@/lib/auth`:
   a. Fixture user with ≥1 row in EVERY enumerated learning-state table (reuse wave14-09's fixture
      builder) → call deleteAccountAction with confirm «ВИДАЛИТИ» → catch NEXT_REDIRECT → COUNT = 0
      rows for that userId in EACH of: UserStudyProfile, StudyDay, ReviewState, ReviewLog,
      TopicMastery, ReadinessSnapshot, TestSession, TestAnswer (via session ids captured BEFORE),
      TestSessionQuestion (same), UserMistake, SavedQuestion, UserSettings, NotificationLog, and the
      User row itself is gone.
   b. Wrong confirm value («видалити», "VYDALYTY", empty) → user row still exists, zero children
      deleted.
   c. Post-delete login: `verifyCredentials`/login path with the old email+password fails (user
      cannot log in after — spec letter).
   d. Fixture user B untouched throughout (count B's rows before/after — unchanged).
   e. Official Questions/Topics/Categories referenced by the deleted user's ReviewLogs still exist
     (Restrict FKs unaffected — content survives).
6. `npm run test:integration`, `npm test`, `npm run typecheck`, `npm run build` all exit 0.
7. No schema/migration change. `bash tasks/wave14-10-account-delete/verify.sh` exits 0.

## Constraints / decisions
- HIGH-STAKES (Evaluate) + strongest model: irreversible data loss; the failure modes (deleting the
  wrong scope, cascades not firing, confirm bypass) are all catastrophic and quiet.
- The confirm word comparison is on the SERVER (client `required` is UX only) — never trust the form.
- No soft-delete/grace period: spec says cascade wipe now; noted as a deliberate product decision.
- The action must be safe against double-submit: second call finds no user → `requireUser()` bounces;
  no throw surfaces to the user.
- Seed users (`user@drivers.school` etc.) must NOT be deletable by accident in dev tooling — no special
  code, just ensure tests build their OWN fixture users (house rule anyway).
- CRAFT: destructive button uses the app's danger styling exactly once on the page; consequence copy
  states facts, not warnings-theater; goodbye page is genuinely calm (one sentence + one link).

## Next
- [x] Read wave14-09 result + finding 1g; implement deleteUserAccount + action + /goodbye + form.
- [x] Extend lib/server/data-rights.integration.test.ts with the delete suite (criteria 5a–5e:
      cascade wipe via the real action + NEXT_REDIRECT catch; wrong-confirm vectors «видалити» /
      "VYDALYTY" / empty; post-delete loginAction fails; user B untouched; content survives).
      Partial-mock must ALSO stub destroySession (vi.fn()) — the real one calls cookies() which
      throws outside a request scope; getCurrentUser mock alone is not enough for the success path.
      Then run verify.sh.
- (nothing left — Goal fully met, verify.sh green)

## Artifacts
- lib/server/data-rights.ts (delete), app/actions/user.ts (deleteAccountAction),
  app/goodbye/page.tsx, app/(app)/account/data/page.tsx (delete section copy),
  app/(app)/account/data/delete-account-form.tsx (client form),
  lib/server/data-rights.integration.test.ts (delete suite, criteria 5a–5e)

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-02T22:01Z ClPcs-Mac-mini: implemented the four code deliverables. Finding 1g re-read
  (14/14 user-scoped tables Cascade; Restrict FKs are Question-side only) → `deleteUserAccount`
  is a single `prisma.user.delete` in lib/server/data-rights.ts, no manual child sweeps.
  `deleteAccountAction` (app/actions/user.ts, useActionState `(prev, formData)` signature per the
  house auth.ts pattern): requireUser → trim + code-point-exact `=== "ВИДАЛИТИ"` check (Latin
  lookalike fails naturally) → error state «Щоб підтвердити, введіть слово ВИДАЛИТИ» on mismatch;
  on success delete → destroySession → redirect("/goodbye"), no recordEvent. /goodbye page
  (app/goodbye/page.tsx, outside the (app) shell, local SvitlykSprite, one sentence + «На головну»
  plain link). /account/data delete section: consequence line + button label «Видалити акаунт
  назавжди» live in page.tsx (verify greps pin them there — label passed as a prop to the new
  client DeleteAccountForm, which safely imports the action from the "use server" module).
  typecheck + build + unit tests (49 files / 548) all green. Tests are the next increment.
- 2026-07-02T22:07Z ClPcs-Mac-mini: wrote the delete suite (6 tests) extending
  lib/server/data-rights.integration.test.ts. New fixture user C seeded into all 14 tables via the
  existing seedEveryTable; countUserRows helper counts every table with session ids captured BEFORE
  the delete (deriving them after would make the join-table zero-counts vacuous). @/lib/auth
  partial-mock extended with destroySession: vi.fn(); added a next/headers stub (headers()→empty
  Headers, cookies()→inert jar) because 5c drives the REAL loginAction, whose success path calls
  headers() + real createSession→cookies(). 5c is anchored by a PRE-delete login success (rejects
  with NEXT_REDIRECT) so the post-delete «Невірна пошта або пароль.» failure is provably caused by
  the deletion. Fixture label lowercase ("data-c") — loginAction lowercases the submitted email, so
  an uppercase fixture email ("data-C-…@test.local") would never be found. 5b loops the three
  wrong-confirm vectors and asserts every row still present; 5d deep-equals B's full count map
  before/after; 5e counts C's question/topic/category post-delete. Suite 10/10 green;
  `bash tasks/wave14-10-account-delete/verify.sh` → PASS wave14-10 (typecheck, unit, integration,
  build all exit 0). Status → done.


## Verify
**Last verify:** PASS (2026-07-02T22:10:20Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T22:11:32Z)
