import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createQuestion, updateQuestion } from "@/app/admin/actions";
import { getCurrentUser } from "@/lib/auth";

// Demo/official label-consistency proofs (AUDIT #3) against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). The save path MUST enforce
// sourceType==="DEMO" ⇔ isDemo===true so demo content can never be silently mislabelled as
// official now that real OFFICIAL content exists. We drive the admin actions as an ADMIN
// principal (mocked auth boundary — we never drive real cookies in the node runtime) and assert
// an inconsistent combo is REJECTED with a friendly Ukrainian error and writes nothing, while a
// consistent combo is accepted. Throwaway category/question are removed in afterAll.

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

let adminId: string;
let categoryId: string;
const throwawayQuestionIds: string[] = [];

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

// A minimally-valid question form: 2 options with the first marked correct, valid text.
function baseQuestionFields(extra: Record<string, string>): Record<string, string> {
  return {
    text: "Тестове питання для перевірки позначок демо/офіційне",
    option_text_0: "Правильний варіант",
    option_text_1: "Хибний варіант",
    correctIndex: "0",
    difficulty: "1",
    categoryIds: categoryId,
    ...extra,
  };
}

beforeAll(async () => {
  const stamp = Date.now();
  const admin = await prisma.user.create({
    data: {
      name: "Label Admin",
      email: `label-admin-${stamp}@test.local`,
      passwordHash: "x",
      role: "ADMIN",
    },
  });
  adminId = admin.id;
  const cat = await prisma.category.create({
    data: { code: `LBL${stamp}`, title: "Label throwaway category" },
  });
  categoryId = cat.id;

  vi.mocked(getCurrentUser).mockResolvedValue({
    id: adminId,
    role: "ADMIN",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
});

afterAll(async () => {
  for (const id of throwawayQuestionIds) {
    await prisma.question.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("createQuestion enforces demo/official label consistency", () => {
  it("rejects OFFICIAL + isDemo=true (mislabelled demo as official) and writes nothing", async () => {
    const before = await prisma.question.count();
    const result = await createQuestion(
      {},
      form(baseQuestionFields({ sourceType: "OFFICIAL", isDemo: "true" })),
    );
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("Невідповідність позначок");
    const after = await prisma.question.count();
    expect(after).toBe(before);
  });

  it("rejects DEMO + isDemo=false (demo source not flagged demo) and writes nothing", async () => {
    const before = await prisma.question.count();
    const result = await createQuestion(
      {},
      form(baseQuestionFields({ sourceType: "DEMO", isDemo: "false" })),
    );
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("Невідповідність позначок");
    const after = await prisma.question.count();
    expect(after).toBe(before);
  });

  it("accepts a consistent OFFICIAL + isDemo=false combo", async () => {
    // createQuestion redirect()s on success, which throws NEXT_REDIRECT — that throw IS the
    // success signal here. We assert the row was created with the consistent labels.
    const text = `Label consistent official ${Date.now()}`;
    await expect(
      createQuestion(
        {},
        form(baseQuestionFields({ text, sourceType: "OFFICIAL", isDemo: "false" })),
      ),
    ).rejects.toThrow(); // NEXT_REDIRECT
    const row = await prisma.question.findFirst({ where: { text } });
    expect(row).not.toBeNull();
    expect(row?.sourceType).toBe("OFFICIAL");
    expect(row?.isDemo).toBe(false);
    if (row) throwawayQuestionIds.push(row.id);
  });

  it("accepts a consistent DEMO + isDemo=true combo", async () => {
    const text = `Label consistent demo ${Date.now()}`;
    await expect(
      createQuestion({}, form(baseQuestionFields({ text, sourceType: "DEMO", isDemo: "true" }))),
    ).rejects.toThrow(); // NEXT_REDIRECT
    const row = await prisma.question.findFirst({ where: { text } });
    expect(row).not.toBeNull();
    expect(row?.sourceType).toBe("DEMO");
    expect(row?.isDemo).toBe(true);
    if (row) throwawayQuestionIds.push(row.id);
  });
});

describe("updateQuestion enforces demo/official label consistency", () => {
  it("rejects flipping an existing question to an inconsistent OFFICIAL + isDemo=true and leaves it unchanged", async () => {
    // Seed a clean, consistent demo question to mutate.
    const text = `Label update target ${Date.now()}`;
    await createQuestion(
      {},
      form(baseQuestionFields({ text, sourceType: "DEMO", isDemo: "true" })),
    ).catch(() => undefined); // swallow NEXT_REDIRECT
    const created = await prisma.question.findFirstOrThrow({ where: { text } });
    throwawayQuestionIds.push(created.id);

    const result = await updateQuestion(
      {},
      form(
        baseQuestionFields({
          id: created.id,
          text,
          sourceType: "OFFICIAL",
          isDemo: "true",
        }),
      ),
    );
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("Невідповідність позначок");

    const reloaded = await prisma.question.findUniqueOrThrow({ where: { id: created.id } });
    expect(reloaded.sourceType).toBe("DEMO");
    expect(reloaded.isDemo).toBe(true);
  });
});
