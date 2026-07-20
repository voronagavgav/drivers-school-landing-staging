"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireContentManager } from "@/lib/rbac";
import { logAdminAction, recordEvent } from "@/lib/analytics";
import { REVIEW_STATUS, SOURCE_TYPES, type ReviewStatus, type SourceType } from "@/lib/constants";
import { safeImageUrl } from "@/lib/sanitize";
import {
  adminQuestionSchema,
  adminCategorySchema,
  adminTopicSchema,
  adminContentVersionSchema,
  bulkQuestionSchema,
  entitlementGrantSchema,
  entitlementRevokeSchema,
  firstIssueMessage,
  type BulkQuestionAction,
} from "@/lib/validation";

// All admin/content mutations. Each one:
//   (a) calls requireContentManager() — server-side gate, never trust the client;
//   (b) logs an AdminActionLog entry via logAdminAction;
//   (c) for question lifecycle, emits the matching analytics event;
//   then revalidates affected paths (and redirects where sensible).

export interface FormState {
  error?: string;
}

// ---------------------------------------------------------------------------
// Form parsing helpers
// ---------------------------------------------------------------------------
function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v.length > 0 ? v : null;
}

function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

function intOr(formData: FormData, key: string, fallback: number): number {
  const n = Number(formData.get(key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function sourceTypeOr(value: string): SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value) ? (value as SourceType) : "DEMO";
}

function reviewStatusOr(value: string): ReviewStatus {
  return (REVIEW_STATUS as readonly string[]).includes(value)
    ? (value as ReviewStatus)
    : "UNREVIEWED";
}

interface ParsedOption {
  text: string;
  isCorrect: boolean;
  displayOrder: number;
}

/**
 * Options arrive as option_text_<i>, with a single correctIndex radio and
 * implicit display order = i. Empty-text rows are dropped.
 */
function parseOptions(formData: FormData): ParsedOption[] {
  const correctIndex = String(formData.get("correctIndex") ?? "");
  const options: ParsedOption[] = [];
  for (let i = 0; i < 5; i += 1) {
    const text = String(formData.get(`option_text_${i}`) ?? "").trim();
    if (text.length === 0) continue;
    options.push({
      text,
      isCorrect: String(i) === correctIndex,
      displayOrder: options.length,
    });
  }
  return options;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export async function createQuestion(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireContentManager();

  const text = str(formData, "text");
  const options = parseOptions(formData);
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const topicId = optionalStr(formData, "topicId");
  const contentVersionId = optionalStr(formData, "contentVersionId");
  const difficulty = intOr(formData, "difficulty", 1);
  const sourceType = sourceTypeOr(str(formData, "sourceType"));
  const isDemo = bool(formData, "isDemo");
  const imageUrl = optionalStr(formData, "imageUrl");

  const parsed = adminQuestionSchema.safeParse({
    text,
    options,
    topicId,
    contentVersionId,
    difficulty,
    sourceType,
    isDemo,
    imageUrl,
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Reject a non-empty image URL that is not an allow-listed http(s) URL (spec C),
  // and persist only the sanitised value so nothing safeImageUrl would reject is stored.
  const safeImage = imageUrl === null ? null : safeImageUrl(imageUrl);
  if (imageUrl !== null && safeImage === null) {
    return { error: "Посилання на зображення має починатися з http:// або https://." };
  }

  const shortText = optionalStr(formData, "explanationShort");
  const detailedText = optionalStr(formData, "explanationDetailed");
  const legalReference = optionalStr(formData, "explanationLegal");
  const reviewedStatus = reviewStatusOr(str(formData, "explanationReviewed"));
  const hasExplanation = Boolean(shortText || detailedText || legalReference);

  const question = await prisma.question.create({
    data: {
      text,
      topicId,
      difficulty,
      imageUrl: safeImage,
      sourceType,
      isDemo,
      contentVersionId,
      categories: { connect: categoryIds.map((id) => ({ id })) },
      options: { create: options },
      explanation: hasExplanation
        ? { create: { shortText, detailedText, legalReference, reviewedStatus } }
        : undefined,
    },
  });

  await logAdminAction({
    adminUserId: admin.id,
    action: "question.create",
    entityType: "Question",
    entityId: question.id,
    payload: { text, optionCount: options.length },
  });
  await recordEvent("admin_question_created", admin.id, { questionId: question.id });

  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  redirect(`/admin/questions/${question.id}`);
}

export async function updateQuestion(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireContentManager();

  const id = str(formData, "id");
  if (!id) return { error: "Не вказано ідентифікатор питання." };

  const text = str(formData, "text");
  const options = parseOptions(formData);
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const topicId = optionalStr(formData, "topicId");
  const contentVersionId = optionalStr(formData, "contentVersionId");
  const difficulty = intOr(formData, "difficulty", 1);
  const sourceType = sourceTypeOr(str(formData, "sourceType"));
  const isDemo = bool(formData, "isDemo");
  const imageUrl = optionalStr(formData, "imageUrl");

  const parsed = adminQuestionSchema.safeParse({
    text,
    options,
    topicId,
    contentVersionId,
    difficulty,
    sourceType,
    isDemo,
    imageUrl,
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Reject a non-empty image URL that is not an allow-listed http(s) URL (spec C),
  // and persist only the sanitised value so nothing safeImageUrl would reject is stored.
  const safeImage = imageUrl === null ? null : safeImageUrl(imageUrl);
  if (imageUrl !== null && safeImage === null) {
    return { error: "Посилання на зображення має починатися з http:// або https://." };
  }

  const shortText = optionalStr(formData, "explanationShort");
  const detailedText = optionalStr(formData, "explanationDetailed");
  const legalReference = optionalStr(formData, "explanationLegal");
  const reviewedStatus = reviewStatusOr(str(formData, "explanationReviewed"));
  const hasExplanation = Boolean(shortText || detailedText || legalReference);

  // Replace options wholesale (simplest correct approach for a small editor).
  await prisma.$transaction([
    prisma.questionOption.deleteMany({ where: { questionId: id } }),
    prisma.question.update({
      where: { id },
      data: {
        text,
        topicId,
        difficulty,
        imageUrl: safeImage,
        sourceType,
        isDemo,
        contentVersionId,
        categories: { set: categoryIds.map((cid) => ({ id: cid })) },
        options: { create: options },
        explanation: hasExplanation
          ? {
              upsert: {
                create: { shortText, detailedText, legalReference, reviewedStatus },
                update: { shortText, detailedText, legalReference, reviewedStatus },
              },
            }
          : { delete: false },
      },
    }),
  ]);

  await logAdminAction({
    adminUserId: admin.id,
    action: "question.update",
    entityType: "Question",
    entityId: id,
    payload: { text, optionCount: options.length },
  });
  await recordEvent("admin_question_updated", admin.id, { questionId: id });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return {};
}

export async function publishQuestion(formData: FormData): Promise<void> {
  const admin = await requireContentManager();
  const id = str(formData, "id");
  if (!id) return;

  await prisma.question.update({
    where: { id },
    data: { isPublished: true, isActive: true, archivedAt: null },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "question.publish",
    entityType: "Question",
    entityId: id,
  });
  await recordEvent("admin_question_published", admin.id, { questionId: id });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/admin");
}

export async function unpublishQuestion(formData: FormData): Promise<void> {
  const admin = await requireContentManager();
  const id = str(formData, "id");
  if (!id) return;

  await prisma.question.update({ where: { id }, data: { isPublished: false } });
  await logAdminAction({
    adminUserId: admin.id,
    action: "question.unpublish",
    entityType: "Question",
    entityId: id,
  });
  await recordEvent("admin_question_updated", admin.id, { questionId: id, unpublished: true });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/admin");
}

export async function archiveQuestion(formData: FormData): Promise<void> {
  const admin = await requireContentManager();
  const id = str(formData, "id");
  if (!id) return;

  await prisma.question.update({
    where: { id },
    data: { archivedAt: new Date(), isActive: false, isPublished: false },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "question.archive",
    entityType: "Question",
    entityId: id,
  });
  await recordEvent("admin_question_archived", admin.id, { questionId: id });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/admin");
}

export async function unarchiveQuestion(formData: FormData): Promise<void> {
  const admin = await requireContentManager();
  const id = str(formData, "id");
  if (!id) return;

  // Restore from soft-archive back to an UNPUBLISHED draft (isActive=true). We never auto-republish
  // on restore — an admin must explicitly publish again, so recovered official content can't silently
  // go live.
  await prisma.question.update({
    where: { id },
    data: { archivedAt: null, isActive: true, isPublished: false },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "question.unarchive",
    entityType: "Question",
    entityId: id,
  });
  await recordEvent("admin_question_updated", admin.id, { questionId: id, unarchived: true });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Bulk question operations (admin index → selection toolbar)
// ---------------------------------------------------------------------------
export interface BulkResult {
  ok: boolean;
  error?: string;
  /** Number of questions actually affected (after demo/official safety filtering). */
  affected?: number;
}

/**
 * Apply one bulk operation to a set of question ids. RBAC is enforced first
 * (requireContentManager) — never trust the client. Each op mirrors its single-row
 * counterpart's data change so list & detail views stay consistent:
 *   - publish:   isPublished=true, isActive=true, archivedAt=null
 *   - unpublish: isPublished=false
 *   - archive:   SOFT archive (archivedAt set, isActive/isPublished false) — NEVER a hard delete,
 *                so official content is recoverable; we do not `delete` any row here.
 *   - assignTopic / clearTopic: set/clear topicId
 *   - assignCategory: CONNECT a category (additive — never removes existing category links, so a
 *                     question's other categories are preserved).
 * The demo/official label guard is upheld: bulk ops never touch sourceType/isDemo, so they can't
 * make a row's labels inconsistent. One AdminActionLog entry records the whole batch + the matching
 * analytics event fires once. Returns a structured result (no redirect — the caller refreshes).
 */
export async function bulkQuestionAction(input: {
  action: BulkQuestionAction;
  ids: string[];
  targetId?: string | null;
}): Promise<BulkResult> {
  const admin = await requireContentManager();

  const parsed = bulkQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) };
  const { action, ids, targetId } = parsed.data;

  // De-dupe ids so the count and audit payload are honest.
  const uniqueIds = Array.from(new Set(ids));
  const where = { id: { in: uniqueIds } };

  let affected = 0;

  switch (action) {
    case "publish": {
      const r = await prisma.question.updateMany({
        where,
        data: { isPublished: true, isActive: true, archivedAt: null },
      });
      affected = r.count;
      await recordEvent("admin_question_published", admin.id, { bulk: true, count: affected });
      break;
    }
    case "unpublish": {
      const r = await prisma.question.updateMany({ where, data: { isPublished: false } });
      affected = r.count;
      await recordEvent("admin_question_updated", admin.id, { bulk: true, unpublished: true, count: affected });
      break;
    }
    case "archive": {
      // Soft archive only. No hard delete of official (or any) content.
      const r = await prisma.question.updateMany({
        where,
        data: { archivedAt: new Date(), isActive: false, isPublished: false },
      });
      affected = r.count;
      await recordEvent("admin_question_archived", admin.id, { bulk: true, count: affected });
      break;
    }
    case "assignTopic": {
      const tid = targetId?.trim();
      if (!tid) return { ok: false, error: "Оберіть тему для призначення." };
      const topic = await prisma.topic.findUnique({ where: { id: tid }, select: { id: true } });
      if (!topic) return { ok: false, error: "Тему не знайдено." };
      const r = await prisma.question.updateMany({ where, data: { topicId: tid } });
      affected = r.count;
      await recordEvent("admin_question_updated", admin.id, { bulk: true, topicId: tid, count: affected });
      break;
    }
    case "clearTopic": {
      const r = await prisma.question.updateMany({ where, data: { topicId: null } });
      affected = r.count;
      await recordEvent("admin_question_updated", admin.id, { bulk: true, topicId: null, count: affected });
      break;
    }
    case "assignCategory": {
      const cid = targetId?.trim();
      if (!cid) return { ok: false, error: "Оберіть категорію для призначення." };
      const category = await prisma.category.findUnique({ where: { id: cid }, select: { id: true } });
      if (!category) return { ok: false, error: "Категорію не знайдено." };
      // Additive connect per row (relation update can't go through updateMany); preserves existing links.
      const existing = await prisma.question.findMany({ where, select: { id: true } });
      await prisma.$transaction(
        existing.map((q) =>
          prisma.question.update({
            where: { id: q.id },
            data: { categories: { connect: { id: cid } } },
          }),
        ),
      );
      affected = existing.length;
      await recordEvent("admin_question_updated", admin.id, { bulk: true, categoryId: cid, count: affected });
      break;
    }
    default:
      return { ok: false, error: "Невідома масова дія." };
  }

  await logAdminAction({
    adminUserId: admin.id,
    action: `question.bulk.${action}`,
    entityType: "Question",
    payload: { action, count: affected, ids: uniqueIds, targetId: targetId ?? null },
  });

  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  return { ok: true, affected };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireContentManager();

  const code = str(formData, "code").toUpperCase();
  const title = str(formData, "title");
  const parsed = adminCategorySchema.safeParse({ code, title });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const existing = await prisma.category.findUnique({ where: { code } });
  if (existing) return { error: "Категорія з таким кодом уже існує." };

  const category = await prisma.category.create({
    data: {
      code,
      title,
      description: optionalStr(formData, "description"),
      isActive: bool(formData, "isActive"),
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "category.create",
    entityType: "Category",
    entityId: category.id,
    payload: { code, title },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  return {};
}

export async function updateCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireContentManager();

  const id = str(formData, "id");
  const code = str(formData, "code").toUpperCase();
  const title = str(formData, "title");
  if (!id) return { error: "Не вказано ідентифікатор категорії." };
  const parsed = adminCategorySchema.safeParse({ code, title });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const clash = await prisma.category.findUnique({ where: { code } });
  if (clash && clash.id !== id) return { error: "Категорія з таким кодом уже існує." };

  await prisma.category.update({
    where: { id },
    data: {
      code,
      title,
      description: optionalStr(formData, "description"),
      isActive: bool(formData, "isActive"),
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "category.update",
    entityType: "Category",
    entityId: id,
    payload: { code, title },
  });

  revalidatePath("/admin/categories");
  return {};
}

export async function toggleCategoryActive(formData: FormData): Promise<void> {
  const admin = await requireContentManager();
  const id = str(formData, "id");
  if (!id) return;

  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return;

  await prisma.category.update({ where: { id }, data: { isActive: !current.isActive } });
  await logAdminAction({
    adminUserId: admin.id,
    action: current.isActive ? "category.deactivate" : "category.activate",
    entityType: "Category",
    entityId: id,
  });

  revalidatePath("/admin/categories");
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
export async function createTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireContentManager();

  const title = str(formData, "title");
  const parsed = adminTopicSchema.safeParse({ title });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const topic = await prisma.topic.create({
    data: {
      title,
      description: optionalStr(formData, "description"),
      displayOrder: intOr(formData, "displayOrder", 0),
      isActive: bool(formData, "isActive"),
      parentTopicId: optionalStr(formData, "parentTopicId"),
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "topic.create",
    entityType: "Topic",
    entityId: topic.id,
    payload: { title },
  });

  revalidatePath("/admin/topics");
  revalidatePath("/admin");
  return {};
}

export async function updateTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireContentManager();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!id) return { error: "Не вказано ідентифікатор теми." };
  const parsed = adminTopicSchema.safeParse({ title });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  // Guard against a topic becoming its own parent.
  const parentTopicId = optionalStr(formData, "parentTopicId");

  await prisma.topic.update({
    where: { id },
    data: {
      title,
      description: optionalStr(formData, "description"),
      displayOrder: intOr(formData, "displayOrder", 0),
      isActive: bool(formData, "isActive"),
      parentTopicId: parentTopicId === id ? null : parentTopicId,
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "topic.update",
    entityType: "Topic",
    entityId: id,
    payload: { title },
  });

  revalidatePath("/admin/topics");
  return {};
}

// ---------------------------------------------------------------------------
// Content versions
// ---------------------------------------------------------------------------
export async function createContentVersion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireContentManager();

  const name = str(formData, "name");
  const parsed = adminContentVersionSchema.safeParse({ name });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const isActive = bool(formData, "isActive");
  const version = await prisma.contentVersion.create({
    data: {
      name,
      source: optionalStr(formData, "source"),
      description: optionalStr(formData, "description"),
      isActive,
      publishedAt: isActive ? new Date() : null,
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "contentVersion.create",
    entityType: "ContentVersion",
    entityId: version.id,
    payload: { name },
  });

  revalidatePath("/admin/content-versions");
  return {};
}

export async function updateContentVersion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireContentManager();

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) return { error: "Не вказано ідентифікатор версії." };
  const parsed = adminContentVersionSchema.safeParse({ name });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const isActive = bool(formData, "isActive");
  const current = await prisma.contentVersion.findUnique({ where: { id } });

  await prisma.contentVersion.update({
    where: { id },
    data: {
      name,
      source: optionalStr(formData, "source"),
      description: optionalStr(formData, "description"),
      isActive,
      // Stamp publishedAt the first time it goes active; keep prior value otherwise.
      publishedAt: isActive ? current?.publishedAt ?? new Date() : current?.publishedAt ?? null,
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "contentVersion.update",
    entityType: "ContentVersion",
    entityId: id,
    payload: { name, isActive },
  });

  revalidatePath("/admin/content-versions");
  return {};
}

// ---------------------------------------------------------------------------
// Entitlements (task wave16-06) — manual/promo grant + revoke. RBAC is the ONLY
// guard (server-side); there is deliberately no user-facing self-service. The
// user is located by email (lowercased before lookup — house login-lane rule) or
// userId. Grant UPSERTS the one-per-user Entitlement row; revoke DELETEs it and
// is idempotent (deleteMany never throws on a missing row).
// ---------------------------------------------------------------------------

/** Resolve the target user from a validated {userId?, email?} pair, or null. */
async function findEntitlementUser(input: { userId?: string; email?: string }) {
  if (input.userId) return prisma.user.findUnique({ where: { id: input.userId } });
  if (input.email) return prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  return null;
}

export async function grantEntitlement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireContentManager();

  const parsed = entitlementGrantSchema.safeParse({
    userId: optionalStr(formData, "userId") ?? undefined,
    email: optionalStr(formData, "email") ?? undefined,
    tier: str(formData, "tier"),
    source: optionalStr(formData, "source") ?? undefined,
    examDate: optionalStr(formData, "examDate") ?? undefined,
    validUntil: optionalStr(formData, "validUntil") ?? undefined,
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { userId, email, tier, source, examDate, validUntil } = parsed.data;
  const user = await findEntitlementUser({ userId, email });
  if (!user) return { error: "Користувача не знайдено." };

  const examDateValue = examDate ? new Date(examDate) : null;
  const validUntilValue = validUntil ? new Date(validUntil) : null;

  await prisma.entitlement.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier,
      source,
      examDate: examDateValue,
      validUntil: validUntilValue,
    },
    update: {
      tier,
      source,
      examDate: examDateValue,
      validUntil: validUntilValue,
    },
  });
  await logAdminAction({
    adminUserId: admin.id,
    action: "entitlement.grant",
    entityType: "Entitlement",
    entityId: user.id,
    payload: { tier, source },
  });

  revalidatePath("/admin/entitlements");
  return {};
}

export async function revokeEntitlement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireContentManager();

  const parsed = entitlementRevokeSchema.safeParse({
    userId: optionalStr(formData, "userId") ?? undefined,
    email: optionalStr(formData, "email") ?? undefined,
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const user = await findEntitlementUser(parsed.data);
  if (!user) return { error: "Користувача не знайдено." };

  // Idempotent: deleteMany silently affects 0 rows when the user holds none.
  await prisma.entitlement.deleteMany({ where: { userId: user.id } });
  await logAdminAction({
    adminUserId: admin.id,
    action: "entitlement.revoke",
    entityType: "Entitlement",
    entityId: user.id,
  });

  revalidatePath("/admin/entitlements");
  return {};
}
