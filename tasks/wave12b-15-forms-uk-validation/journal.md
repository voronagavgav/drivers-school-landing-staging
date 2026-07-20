# Task: wave12b-15-forms-uk-validation

**Status:** done
**Driver:** auto
**Model:** claude-fable-5
**Updated:** 2026-07-02
**Last compute:** laptop

## Goal
Spec §E: Ukrainian client-side validation on register/login/account forms — replace the English
browser tooltips (UX-FINDINGS). Approach (planner DECISION, the lightest that is also
browser-assertable): forms get `noValidate` and a small client validity check on submit that renders
DOM error messages in Ukrainian (native bubbles are browser chrome and can't be asserted or localized
reliably; zod-on-client is heavier than needed).

PASS = ALL true:

1. A small shared helper exists (e.g. `lib/client/form-validation.ts` or inline in
   `components/auth-forms.tsx`) that, given a form, checks the fields' validity constraints
   (required / email format / password minlength matching the server zod limits) and produces
   UKRAINIAN messages: «Заповніть це поле», «Введіть коректну електронну адресу», and a minlength
   message quoting the same minimum as `lib/validation.ts`'s register schema (read the schema, mirror
   the number — no drift: the number appears ONCE in a shared constant or is imported).
2. `components/auth-forms.tsx` (LoginForm + RegisterForm) and the account forms
   (`components/account-forms.tsx`) use it: the `<form>`s carry `noValidate`, invalid submit is
   blocked client-side, and errors render as DOM elements with `role="alert"` (or aria-live) next to
   the fields.
3. Server-side zod validation is UNCHANGED (the client layer is convenience only; grep: the existing
   schemas in `lib/validation.ts` for login/register keep their current messages).
4. Unit test for the pure message-mapping logic (given a ValidityState-like object + field kind →
   Ukrainian message) — `npm test` exits 0, file collected by `npx vitest list` (captured var).
5. `npm run typecheck`, `npm run build` exit 0.
6. Browser (guarded): on /register, clicking submit with empty fields keeps the URL on /register and
   the page text contains «Заповніть це поле».

## Constraints / decisions
- English must be unreachable: every constraint the inputs declare (required/type=email/minLength)
  has a Ukrainian mapping; unknown validity states fall back to a generic Ukrainian message, never the
  browser default.
- Accessibility: error text tied to inputs via aria-describedby where straightforward.
- Non-Goal: restyling the forms (12a done), changing server error copy.

## Plan
- [x] Write the validity→Ukrainian mapper + unit test.
- [x] Wire noValidate + on-submit checks + role=alert errors into auth/account forms.
- [x] typecheck/test/build + browser check + verify.sh.

## Done
- [x] Pure mapper `lib/client/form-validation.ts` (`validationMessage(validity, kind, minLength?)`
      → null when valid; «Заповніть це поле.» / «Введіть коректну електронну адресу.» /
      minlength quoting the shared min / generic «Невірне значення поля.» fallback) + unit test
      (15 cases, incl. exact-match against registerSchema's own too-short message). No-drift:
      `PASSWORD_MIN_LENGTH = 8` added to `lib/constants.ts`; `lib/validation.ts` register +
      change-password schemas now use it via template literals — RENDERED messages byte-identical
      (criterion 3 intact). typecheck ✓, npm test 481/481 ✓, `npx vitest list` collects
      form-validation ✓.
- [x] Wired the mapper into all forms: new DOM glue `lib/client/form-errors.ts`
      (`collectFormErrors(form)` walks named controls' ValidityState → uk messages;
      `useUkValidation()` hook blocks invalid submits via preventDefault — which also stops the
      React form action — and focuses the first invalid field). `Field` (components/ui.tsx) grew
      `error`/`minLength` props and renders the message as `role="alert"` + `aria-describedby`/
      `aria-invalid`. auth-forms (Login/Register) + account-forms (ChangePassword/ExamDate/
      DailyGoal/GlassTier) all `noValidate`; Register name `minLength={2}` and Register/
      ChangePassword passwords `minLength={PASSWORD_MIN_LENGTH}` mirror the zod mins; DailyGoal's
      number min/max falls back to the generic uk message. Both ErrorNotes got `role="alert"`
      (server errors announced too). Server zod untouched. typecheck ✓, 481/481 ✓, build ✓,
      browser: empty /register submit stays on /register with 3 alerts incl. «Заповніть це поле»,
      short password shows «Пароль має містити щонайменше 8 символів.» ✓, verify grep gates
      dry-run PASS ✓.

## Next
- (none — goal met)

## Artifacts
- lib/client/form-validation.ts, lib/client/form-validation.test.ts, lib/client/form-errors.ts
- lib/constants.ts (PASSWORD_MIN_LENGTH), lib/validation.ts (min routed through the constant)
- components/ui.tsx (Field error/minLength), components/auth-forms.tsx, components/account-forms.tsx

## Log
- 2026-07-02 laptop: task scaffolded by planner.
- 2026-07-02 10:42 UTC ClPcs-Mac-mini: wrote pure validity→uk-message mapper (lib/client/form-validation.ts, mirrors track-buffer purity style) + form-validation.test.ts (15 tests); introduced shared PASSWORD_MIN_LENGTH in lib/constants.ts and routed registerSchema/changePasswordSchema mins through it (rendered zod messages unchanged — verified by the no-drift test asserting mapper output === registerSchema issue message). typecheck ✓, npm test 481 passed ✓, vitest list collects the file ✓.
- 2026-07-02 10:48 UTC ClPcs-Mac-mini: wired the mapper into auth+account forms (prior verify FAIL "forms must be noValidate" was the not-yet-done wiring, not a regression). New lib/client/form-errors.ts (collectFormErrors + useUkValidation hook); Field got error/minLength props (role="alert", aria-describedby/aria-invalid); all 6 forms noValidate with on-submit uk validation; minLengths mirror zod (name 2, passwords PASSWORD_MIN_LENGTH). typecheck/test(481)/build ✓. Restarted the LAN next-start server (stale-server trap — client chunks changed) then browser-verified on http://100.110.64.90:3100/register: empty submit stays put with «Заповніть це поле», short password shows the min-8 message, valid-field errors clear. verify.sh grep gates dry-run via bash: PASS. Status → done.


## Verify
**Last verify:** PASS (2026-07-02T10:49:24Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T10:51:49Z)
