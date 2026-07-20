import { z } from "zod";
import {
  ENTITLEMENT_SOURCES,
  ENTITLEMENT_TIERS,
  EXAM_OUTCOMES,
  PASSWORD_MIN_LENGTH,
  PREP_MODES,
  SOURCE_TYPES,
  STARTABLE_MODES,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Shared PURE input-validation schemas (zod). No database client, no
// server-runtime-only modules — these are imported by both server actions
// (wiring tasks 04/05/07) and unit tests, so they MUST stay runtime-agnostic.
// Messages are Ukrainian (the app is Ukrainian-only): a failed field yields a
// friendly, user-facing string that the wiring turns into `{ error }` via
// `firstIssueMessage`.
// ---------------------------------------------------------------------------

// Same email shape as app/actions/auth.ts so register behaviour is unchanged.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = z.object({
  name: z.string().min(2, { error: "Вкажіть ім'я (щонайменше 2 символи)." }),
  email: z.string().regex(EMAIL_RE, { error: "Невірний формат електронної пошти." }),
  password: z.string().min(PASSWORD_MIN_LENGTH, {
    error: `Пароль має містити щонайменше ${PASSWORD_MIN_LENGTH} символів.`,
  }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { error: "Вкажіть електронну пошту." })
    .max(320, { error: "Електронна пошта задовга." }),
  password: z
    .string()
    .min(1, { error: "Вкажіть пароль." })
    .max(200, { error: "Пароль задовгий." }),
});

// Change-password (account settings, task 08/09). `newPassword` reuses the SAME
// 8-char minimum as registerSchema; `currentPassword` is only required to be
// present here — its correctness is checked server-side via verifyPassword.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: "Вкажіть поточний пароль." }),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH, {
    error: `Новий пароль має містити щонайменше ${PASSWORD_MIN_LENGTH} символів.`,
  }),
});

export const selectCategorySchema = z.object({
  categoryId: z.string().min(1, { error: "Оберіть категорію." }),
});

export const startTestSchema = z.object({
  mode: z.enum(STARTABLE_MODES, { error: "Невірний режим тесту." }),
  topicId: z.string().nullable().optional(),
});

export const submitAnswerSchema = z.object({
  sessionId: z.string().min(1, { error: "Невірна сесія." }),
  questionId: z.string().min(1, { error: "Невірне питання." }),
  selectedOptionId: z.string().nullable(),
  timeSpentSeconds: z.number().int().nonnegative().optional(),
  // SRS/adaptive-review plumbing (spec §E1): these reach `submitAnswer` →
  // `recordReview`. Zod strips unknown keys, so they MUST be declared here or a
  // client can never supply them. All OPTIONAL/additive — existing callers omit them.
  latencyMs: z
    .number()
    .int()
    .min(0, { error: "Невірний час відповіді." })
    .max(600000, { error: "Невірний час відповіді." })
    .optional(),
  confidence: z
    .number()
    .int()
    .min(1, { error: "Невірна впевненість." })
    .max(4, { error: "Невірна впевненість." })
    .optional(),
  clientEventId: z
    .string()
    .min(1, { error: "Невірний ідентифікатор події." })
    .max(64, { error: "Невірний ідентифікатор події." })
    .optional(),
});

// Late confidence follow-up (Wave 12b §D): the "Наскільки впевнені?" chip is
// shown AFTER the answer is submitted, so the rating arrives as its own call
// and attaches to the already-recorded attempt. Same 1..4 integer range as
// submitAnswerSchema's optional field, but REQUIRED here — the rating is the
// whole payload.
export const setAnswerConfidenceSchema = z.object({
  sessionId: z.string().min(1, { error: "Невірна сесія." }),
  questionId: z.string().min(1, { error: "Невірне питання." }),
  confidence: z
    .number()
    .int({ error: "Невірна впевненість." })
    .min(1, { error: "Невірна впевненість." })
    .max(4, { error: "Невірна впевненість." }),
});

export const finishTestSchema = z.object({
  sessionId: z.string().min(1, { error: "Невірна сесія." }),
});

export const toggleSaveSchema = z.object({
  questionId: z.string().min(1, { error: "Невірне питання." }),
  save: z.boolean(),
});

export const removeSavedSchema = z.object({
  questionId: z.string().min(1, { error: "Невірне питання." }),
});

// ---------------------------------------------------------------------------
// Study-profile mutations (Wave 11, lib/server/study-profile.ts). Both are
// SELF-ONLY: the server action derives the user from requireUser() and NEVER
// reads a userId from the client — so these schemas carry ONLY the editable
// preference field, never a target user id.
// ---------------------------------------------------------------------------

// A local calendar day "YYYY-MM-DD" (an <input type="date"> value).
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// examDate: an ISO day key to set the finite plan's deadline, OR empty/null to
// CLEAR it (back to steady-maintenance mode). Absent field also clears.
export const setExamDateSchema = z.object({
  examDate: z
    .union([
      z.string().regex(DATE_KEY_RE, { error: "Невірна дата іспиту." }),
      z.literal(""),
    ])
    .nullable()
    .optional(),
});

// dailyGoal: a sane small dose (autonomy without letting the ring become
// unreachable). Coerced because it arrives as a FormData string.
export const setDailyGoalSchema = z.object({
  dailyGoal: z.coerce
    .number()
    .int({ error: "Ціль має бути цілим числом." })
    .min(5, { error: "Мінімальна денна ціль — 5 питань." })
    .max(100, { error: "Максимальна денна ціль — 100 питань." }),
});

// prepMode: the OPTIONAL JTBD onboarding answer «Як готуєшся?» (wave16-12 / spec T4).
// A closed enum only (no free text) — SCHOOL / SELF / BOTH; an invalid value is rejected
// with a friendly Ukrainian message and no write happens. The step is skippable, so the
// action is only reached when the user actually picks an option.
export const setPrepModeSchema = z.object({
  prepMode: z.enum(PREP_MODES, { error: "Оберіть, як готуєшся." }),
});

// Self-reported real-exam outcome capture (account, wave16-10 / spec T3). SELF-ONLY:
// the action derives identity from requireUser() and NEVER reads a userId. Outcome and
// its date are REQUIRED together — a bare «склав/не склав» with no date is not actionable
// for the win-back window, so an outcome without a date is rejected. `examDate` is the
// REAL service-center exam date (may be past), distinct from the plan's target examDate.
export const reportExamOutcomeSchema = z.object({
  outcome: z.enum(EXAM_OUTCOMES, { error: "Оберіть результат іспиту." }),
  examDate: z.string().regex(DATE_KEY_RE, { error: "Вкажіть дату іспиту." }),
});

// Calibration capture (wave19a-06, spec §I). SELF-ONLY: `recordExamOutcome` derives identity
// from requireUser() and NEVER reads a userId. `passed` is the real exam result; `categoryId`
// is optional (defaults to the user's selected category) so the snapshotted prediction is scoped
// to the right exam. The persisted PassOutcome row is a durable prediction↔outcome pair.
export const recordExamOutcomeSchema = z.object({
  passed: z.boolean({ error: "Вкажіть результат іспиту." }),
  categoryId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Admin create/update mutations (app/admin/actions.ts). These mirror the
// pre-existing inline checks one-for-one so admin behaviour does not regress;
// the same Ukrainian copy is reused as the field messages. RBAC stays in the
// server actions (requireContentManager) — schemas are input shape only.
// NOTE: imageUrl is a plain optional string here on purpose; scheme/host
// rejection is deferred to a later task (safeImageUrl wiring).
// ---------------------------------------------------------------------------

// One parsed option row (matches parseOptions' ParsedOption shape).
const adminOptionSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
  displayOrder: z.number().int(),
});

export const adminQuestionSchema = z
  .object({
    text: z.string().min(3, { error: "Текст питання має містити щонайменше 3 символи." }),
    options: z
      .array(adminOptionSchema)
      .min(2, { error: "Додайте щонайменше 2 варіанти відповіді." })
      .max(5, { error: "Не більше 5 варіантів відповіді." })
      .refine((opts) => opts.some((o) => o.isCorrect), {
        error: "Позначте правильну відповідь.",
      }),
    topicId: z.string().nullable().optional(),
    contentVersionId: z.string().nullable().optional(),
    difficulty: z.number().int(),
    sourceType: z.enum(SOURCE_TYPES, { error: "Невірний тип джерела." }),
    isDemo: z.boolean(),
    imageUrl: z.string().nullable().optional(),
  })
  // Demo/official label consistency (now that real OFFICIAL content exists): the source type
  // and the demo flag must agree, so demo content can never be silently mislabelled as official.
  // Rule: sourceType==="DEMO" ⇔ isDemo===true. We REJECT an inconsistent combo (no silent coercion)
  // so the admin sees what they actually saved and the legal/demo positioning stays trustworthy.
  .refine((q) => (q.sourceType === "DEMO") === (q.isDemo === true), {
    error:
      'Невідповідність позначок: джерело «Демо» має бути демо-контентом, а будь-яке інше джерело (наприклад «Офіційне») — не демо. Узгодьте «Джерело» та «Демо-контент».',
    path: ["isDemo"],
  });

// Bulk question operations (admin index → bulk-action toolbar). The action kind is a
// closed enum; `ids` is a non-empty list of question ids (capped so a single request can't
// fan out unbounded). `targetId` carries the topic/category id for assign operations and is
// only required for those kinds (validated in the action, not here — the schema is shape-only).
export const BULK_QUESTION_ACTIONS = [
  "publish",
  "unpublish",
  "archive",
  "assignTopic",
  "clearTopic",
  "assignCategory",
] as const;
export type BulkQuestionAction = (typeof BULK_QUESTION_ACTIONS)[number];

export const bulkQuestionSchema = z.object({
  action: z.enum(BULK_QUESTION_ACTIONS, { error: "Невірна масова дія." }),
  ids: z
    .array(z.string().min(1))
    .min(1, { error: "Оберіть щонайменше одне питання." })
    .max(500, { error: "Забагато питань для однієї дії (макс. 500)." }),
  targetId: z.string().nullable().optional(),
});

export const adminCategorySchema = z.object({
  code: z.string().min(1, { error: "Вкажіть код категорії." }),
  title: z.string().min(1, { error: "Вкажіть назву категорії." }),
});

export const adminTopicSchema = z.object({
  title: z.string().min(1, { error: "Вкажіть назву теми." }),
});

export const adminContentVersionSchema = z.object({
  name: z.string().min(1, { error: "Вкажіть назву версії." }),
});

// Admin grant of a manual/promo entitlement (task wave16-06). The user is
// identified by email OR userId — at least one is required. Dates are optional
// ISO-8601 strings (zod v4 `z.iso.datetime()`); the action turns them into Date
// values. `tier`/`source` bind to the shared constant enums so an invalid string
// fails validation with a Ukrainian message and no write happens. Email is
// lowercased server-side before lookup (house login-lane rule), not here.
export const entitlementGrantSchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z
      .string()
      .regex(EMAIL_RE, { error: "Невірний формат електронної пошти." })
      .optional(),
    tier: z.enum(ENTITLEMENT_TIERS, { error: "Невірний рівень доступу." }),
    source: z.enum(ENTITLEMENT_SOURCES, { error: "Невірне джерело." }).default("MANUAL"),
    examDate: z.iso.datetime({ error: "Невірна дата іспиту." }).optional(),
    validUntil: z.iso.datetime({ error: "Невірна дата завершення доступу." }).optional(),
  })
  .refine((d) => Boolean(d.userId || d.email), {
    error: "Вкажіть email або ідентифікатор користувача.",
  });

// Admin revoke — only needs to locate the user (email OR userId).
export const entitlementRevokeSchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z
      .string()
      .regex(EMAIL_RE, { error: "Невірний формат електронної пошти." })
      .optional(),
  })
  .refine((d) => Boolean(d.userId || d.email), {
    error: "Вкажіть email або ідентифікатор користувача.",
  });

/**
 * First validation issue's message, with a generic Ukrainian fallback for the
 * (rare) case an issue carries no message. Used by wiring tasks to turn a parse
 * failure into a `{ error }` result.
 */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Невірні дані.";
}
