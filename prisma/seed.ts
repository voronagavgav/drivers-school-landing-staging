import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { importOfficial } from "../scripts/import-official";

// Standalone client (this script runs under tsx, not Next — so it must NOT import lib/db,
// which pulls in `server-only` and would throw outside a server runtime).
const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

// ---------------------------------------------------------------------------
// OFFICIAL-ONLY SEED. This script creates the 8 ПДР categories + the 3 baseline users the
// app and integration suites rely on, then loads the REAL official content via importOfficial.
// No demo questions/topics are created — official-only is the locked content decision
// (CONTENT-ARCHITECTURE.md §Decisions). importOfficial find-or-creates its own ContentVersion
// and section topics; it only requires that the category rows already exist.
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding Drivers School (official content)…");

  // Clear in FK-safe order
  await prisma.analyticsEvent.deleteMany();
  await prisma.adminActionLog.deleteMany();
  await prisma.testAnswer.deleteMany();
  await prisma.testSessionQuestion.deleteMany();
  await prisma.testSession.deleteMany();
  await prisma.userMistake.deleteMany();
  await prisma.savedQuestion.deleteMany();
  await prisma.progressSnapshot.deleteMany();
  await prisma.reviewLog.deleteMany();      // FK→Question is Restrict → must clear before question
  await prisma.reviewState.deleteMany();    // FK→Question is Restrict → must clear before question
  await prisma.questionOption.deleteMany();
  await prisma.questionExplanation.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.contentVersion.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Categories
  const catB = await prisma.category.create({
    data: { code: "B", title: "Категорія B — легкові автомобілі", description: "Легкові авто та легкі вантажівки до 3500 кг.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "A", title: "Категорія A — мотоцикли", description: "Мотоцикли та мопеди.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "C", title: "Категорія C — вантажні автомобілі", description: "Вантажні авто понад 3500 кг.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "D", title: "Категорія D — автобуси", description: "Автобуси для перевезення пасажирів.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "T", title: "Категорія Т — трактори", description: "Колісні трактори та самохідні машини.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "BE", title: "Категорія BE — легковий автомобіль із причепом", description: "Склад транспортних засобів категорії B з причепом.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "CE", title: "Категорія CE — вантажний автомобіль із причепом", description: "Склад транспортних засобів категорії C з причепом.", isActive: true },
  });
  await prisma.category.create({
    data: { code: "DE", title: "Категорія DE — автобус із причепом", description: "Склад транспортних засобів категорії D з причепом.", isActive: true },
  });

  // Users (passwords hashed)
  const [adminHash, userHash, cmHash] = await Promise.all([
    bcrypt.hash("Admin12345", 10),
    bcrypt.hash("User12345", 10),
    bcrypt.hash("Content12345", 10),
  ]);
  await prisma.user.create({
    data: { name: "Адміністратор", email: "admin@drivers.school", passwordHash: adminHash, role: "ADMIN", language: "uk" },
  });
  await prisma.user.create({
    data: { name: "Контент-менеджер", email: "content@drivers.school", passwordHash: cmHash, role: "CONTENT_MANAGER", language: "uk" },
  });
  await prisma.user.create({
    data: { name: "Тестовий користувач", email: "user@drivers.school", passwordHash: userHash, role: "USER", language: "uk", selectedCategoryId: catB.id },
  });

  console.log("Done. 8 categories, 3 users.");
  console.log("Logins: admin@drivers.school/Admin12345 · content@drivers.school/Content12345 · user@drivers.school/User12345");

  // Load the REAL official ПДР content, reusing the ONE importer (scripts/import-official.ts)
  // with this seed's own client — no second copy of the import logic. The importer THROWS if
  // .content-import/import_plan.json is absent, so a reseed FAILS LOUDLY (non-zero) rather than
  // silently shipping an empty content base. Runs after the categories exist (the importer
  // connects questions to them) and find-or-creates its own ContentVersion + section topics.
  console.log("\nLoading official ПДР content (reusing scripts/import-official.ts)…");
  await importOfficial(prisma);
  const officialCount = await prisma.question.count({
    where: { sourceType: "OFFICIAL", isPublished: true },
  });
  console.log(`official: ${officialCount} questions`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
