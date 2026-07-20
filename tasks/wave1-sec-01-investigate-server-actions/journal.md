# Task: wave1-sec-01-investigate-server-actions

**Status:** done   <!-- active | blocked | done -->
**Driver:** auto
**Updated:** 2026-06-17
**Last compute:** cloud-agent

## Goal
INVESTIGATION ONLY — produce the grounding map for the input-validation work (spec section A).
Do NOT write or modify any source file. Fill the `## Findings` section of THIS journal, then the
boolean checks below must hold.

1. `## Findings` is populated (not the scaffold placeholder) and contains a table/list cataloguing
   EVERY server action in `app/actions/auth.ts`, `app/actions/test.ts`, `app/actions/user.ts`, and
   `app/admin/actions.ts` with, for each: the function name, whether it is a FORM action
   (`(prev, formData)` used via `useActionState`) or an OBJECT-ARG action (plain object input,
   awaited by a client `startTransition`), and its current input fields.
2. `## Findings` records the TWO error-surfacing patterns already in the repo: (a) form actions
   return `{ error: "<Ukrainian>" }` (e.g. `AuthState` / `FormState`) consumed by `useActionState`;
   (b) object-arg actions currently `throw` (e.g. `submitAnswer` throws `INVALID_SESSION`). It names
   which actions use which.
3. `## Findings` names the validator approach to use: `zod` (already a dependency, v4) and the target
   pure module path `lib/validation.ts`, and confirms `lib/validation.ts` does NOT yet exist.
4. `## Findings` lists the redirect/early-exit actions that must NOT be broken by validation
   (`startTestAction` redirects to `/dashboard?empty=<mode>` on `NoQuestionsError`; `selectCategoryAction`
   redirects to `/onboarding` on bad category) so wiring tasks preserve them.
5. `npm test` still exits 0 (baseline suite unchanged — investigation creates no code).
6. No source file was created or modified: `git status --porcelain` shows changes ONLY under
   `tasks/wave1-sec-01-investigate-server-actions/`.

## Constraints / decisions
- Read-only investigation. Output lives in this journal's `## Findings` ONLY — no `lib/`, `app/`,
  or `components/` edits, no new test files.
- Source of truth for the action inventory: the four files named above plus `lib/rbac.ts`
  (`requireUser`/`requireContentManager`) and `lib/constants.ts` (`TEST_MODES`, `ROLES`, etc.).
- Non-Goal: designing the actual zod schemas (that is task 02). Just catalogue inputs + patterns.

## Findings

### A. Action inventory (every server action in the four files)

Legend — **Kind**: `FORM/useActionState` = `(prev, formData)` returning a state object, wired via
`useActionState`; `FORM/void` = single-arg `(formData)` returning `void`, wired as a plain
`<form action={…}>` handler (NO `useActionState`, no return surfaced to the client); `OBJECT-ARG` =
plain object input awaited inside a client `startTransition`.

#### app/actions/auth.ts  (state type: `AuthState { error?: string }`)
| Action | Kind | Input fields | Current checks | Error pattern |
|---|---|---|---|---|
| `registerAction` | FORM/useActionState | `name`, `email`, `password` | `name.length>=2`; `EMAIL_RE.test(email)`; `password.length>=8`; unique-email | returns `{ error: "<uk>" }` |
| `loginAction` | FORM/useActionState | `email`, `password` | none beyond trim/lower; credential check | returns `{ error: "<uk>" }` |
| `logoutAction` | no-arg/void | — (none) | — | — (redirects `/`) |

#### app/actions/test.ts
| Action | Kind | Input fields | Current checks | Error pattern |
|---|---|---|---|---|
| `startTestAction` | FORM/void | `mode`, `topicId?` | none (mode cast `as TestMode`) | redirect (see §C) |
| `submitAnswerAction` | OBJECT-ARG | `{ sessionId, questionId, selectedOptionId: string\|null, timeSpentSeconds?: number }` | none in action | underlying `submitAnswer` **throws** `INVALID_SESSION` / `INVALID_QUESTION` |
| `finishTestAction` | OBJECT-ARG | `{ sessionId }` | none in action | underlying `finishSession` **throws** `INVALID_SESSION`; redirects to result |
| `toggleSaveAction` | OBJECT-ARG | `{ questionId, save: boolean }` | none | returns `{ saved }`; no throw/error today |
| `removeSavedAction` | FORM/void | `questionId` | `if (questionId)` guard, else no-op | none (revalidates `/saved`) |

#### app/actions/user.ts
| Action | Kind | Input fields | Current checks | Error pattern |
|---|---|---|---|---|
| `selectCategoryAction` | FORM/void | `categoryId` | `findFirst({id, isActive:true})` | redirect (see §C) |

#### app/admin/actions.ts  (state type: `FormState { error?: string }`; all gate on `requireContentManager()`)
| Action | Kind | Input fields | Current checks | Error pattern |
|---|---|---|---|---|
| `createQuestion` | FORM/useActionState | `text`, `option_text_0..4`, `correctIndex`, `categoryIds[]`, `topicId?`, `contentVersionId?`, `explanationShort/Detailed/Legal?`, `explanationReviewed`, `difficulty`, `imageUrl?`, `sourceType`, `isDemo` | `text>=3`; 2..5 options; one correct | returns `{ error: "<uk>" }`; redirects to `/admin/questions/<id>` |
| `updateQuestion` | FORM/useActionState | `id` + same as create | `id` present; `text>=3`; 2..5 options; one correct | returns `{ error: "<uk>" }`; returns `{}` |
| `publishQuestion` | FORM/void | `id` | `if (!id) return` | none |
| `unpublishQuestion` | FORM/void | `id` | `if (!id) return` | none |
| `archiveQuestion` | FORM/void | `id` | `if (!id) return` | none |
| `createCategory` | FORM/useActionState | `code`, `title`, `description?`, `isActive` | `code`, `title` required; unique-code | returns `{ error: "<uk>" }`; returns `{}` |
| `updateCategory` | FORM/useActionState | `id`, `code`, `title`, `description?`, `isActive` | `id`, `code`, `title` required; unique-code | returns `{ error: "<uk>" }` |
| `toggleCategoryActive` | FORM/void | `id` | `if (!id) return` | none |
| `createTopic` | FORM/useActionState | `title`, `description?`, `displayOrder`, `isActive`, `parentTopicId?` | `title` required | returns `{ error: "<uk>" }` |
| `updateTopic` | FORM/useActionState | `id`, `title`, `description?`, `displayOrder`, `isActive`, `parentTopicId?` | `id`, `title` required; self-parent guard | returns `{ error: "<uk>" }` |
| `createContentVersion` | FORM/useActionState | `name`, `source?`, `description?`, `isActive` | `name` required | returns `{ error: "<uk>" }` |
| `updateContentVersion` | FORM/useActionState | `id`, `name`, `source?`, `description?`, `isActive` | `id`, `name` required | returns `{ error: "<uk>" }` |

Parsing helpers in admin/actions.ts to reuse/mirror: `str`, `optionalStr`, `bool`, `intOr`,
`sourceTypeOr`, `reviewStatusOr`, `parseOptions` (reads `option_text_<i>` + `correctIndex`).

### B. The two error-surfacing patterns already in the repo
- **(a) Form actions return `{ error: "<Ukrainian>" }`**, consumed via `useActionState`. State types:
  `AuthState` (auth.ts) and `FormState` (admin/actions.ts). Users of `useActionState`-shaped state:
  `registerAction`, `loginAction`, `createQuestion`, `updateQuestion`, `createCategory`,
  `updateCategory`, `createTopic`, `updateTopic`, `createContentVersion`, `updateContentVersion`.
  → New validation here should `return { error: firstIssueMessage(parsed) }` (preserve the shape).
  - Sub-pattern: `FORM/void` actions (`startTestAction`, `removeSavedAction`, `selectCategoryAction`,
    `publishQuestion`, `unpublishQuestion`, `archiveQuestion`, `toggleCategoryActive`) have NO
    `useActionState` channel — they silently no-op on bad input (`if (!id) return`) or redirect, so
    validation failures there cannot be surfaced as `{ error }`; keep them guard-style.
- **(b) Object-arg actions currently `throw`.** `submitAnswerAction` → `submitAnswer` throws
  `new Error("INVALID_SESSION")` / `"INVALID_QUESTION"` (lib/server/test-engine.ts:213,219);
  `finishTestAction` → `finishSession` throws `"INVALID_SESSION"` (test-engine.ts:266).
  `toggleSaveAction` has no validation today. → New validation here should `throw` on parse failure
  (matches the existing object-arg contract; client `startTransition` already handles rejections).

### C. Validator decision + target module
- Use **`zod`** — already a dependency, **v4.4.3** (`package.json` `"zod": "^4.4.3"`, installed 4.4.3).
- Target pure module: **`lib/validation.ts`** — **confirmed it does NOT yet exist** (`[ -f ]` → absent).
- Module should export the per-action schemas + a `firstIssueMessage(result)` helper that pulls the
  first Zod issue message for the `{ error }` form-action path (task 02).
- Supporting unions live in `lib/constants.ts`: `TEST_MODES`, `ROLES`, `SOURCE_TYPES`,
  `REVIEW_STATUS`, `SESSION_STATUS`, etc. — schemas should reference these, not re-declare literals.
- Server-side authz gates (`requireUser` / `requireContentManager` in `lib/rbac.ts`) are SEPARATE
  from input validation and already in place on every action — validation is additive, not a
  replacement.

### D. Redirect / early-exit behaviours that wiring tasks MUST preserve
- `startTestAction`: `redirect(\`/dashboard?empty=${mode}\`)` on `NoQuestionsError`; on success
  `redirect(\`/test/${sessionId}\`)`. (Validate `mode` ∈ TEST_MODES BEFORE `startSession`, but do not
  swallow the `NoQuestionsError` redirect.)
- `selectCategoryAction`: `redirect("/onboarding")` on missing/inactive category; `redirect("/dashboard")`
  on success.
- `registerAction` → `/onboarding`; `loginAction` → `/admin` or `/dashboard` (role-based);
  `logoutAction` → `/`; `finishTestAction` → `/test/<id>/result`; `createQuestion` →
  `/admin/questions/<id>`.
- Note: `redirect()` throws a control-flow signal internally — never wrap a `redirect()` in a `try`
  that catches everything, and run validation BEFORE the redirect path.

## Plan
- [x] Read the four action files + `lib/rbac.ts` + `lib/constants.ts`; tabulate every action.
- [x] Classify each as form vs object-arg; note input fields + current validation + error pattern.
- [x] Record the zod/`lib/validation.ts` decision and the redirect actions to preserve.
- [x] Run `npm test` to confirm baseline green; confirm no source files touched.

## Done
- [x] Catalogued all 21 server actions across the four files (§A), classified FORM/useActionState vs
      FORM/void vs OBJECT-ARG, with input fields + current checks + error pattern.
- [x] Recorded the two error-surfacing patterns (§B: `{ error }` via useActionState vs `throw`) and
      named which actions use each.
- [x] Confirmed validator decision (§C): zod v4.4.3 already a dep; target `lib/validation.ts`
      confirmed absent; noted `firstIssueMessage` helper + constants reuse.
- [x] Listed redirect/early-exit behaviours to preserve (§D: startTestAction, selectCategoryAction, …).

## Next
- [ ] Goal met — investigation complete. Hand off to wave1-sec-02 (create `lib/validation.ts` with the
      8 schemas + `firstIssueMessage`, mapping each schema to its action per §A/§B).

## Artifacts
- tasks/wave1-sec-01-investigate-server-actions/journal.md — the investigation output (Findings)
- tasks/wave1-sec-01-investigate-server-actions/verify.sh — baseline-green + findings-populated gate

## Log
- 2026-06-17 cloud-agent: scaffolded by planner.
- 2026-06-17T00:00Z ClPcs-Mac-mini: read all four action files + lib/rbac.ts + lib/constants.ts +
  lib/server/test-engine.ts (throw lines); populated §A–§D Findings (21 actions catalogued, both
  error patterns named, zod v4.4.3 / lib/validation.ts-absent confirmed, redirect behaviours listed).
  Ran baseline gate (npm test) — see Verify. No source files touched.

## Verify
**Last verify:** PASS (2026-06-17T07:55:50Z)

## Evaluation
**Last evaluation:** PASS (2026-06-17T07:58:10Z)
