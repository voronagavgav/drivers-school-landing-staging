import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 driver-adapter setup. DATABASE_URL ("file:./prisma/dev.db") resolves relative to the
// project root for both the libsql runtime adapter (cwd) and the Prisma CLI (prisma.config.ts at
// root) — so both touch the same ./prisma/dev.db. To migrate to Postgres: set DATABASE_URL to a
// postgresql:// URL and swap PrismaLibSql for @prisma/adapter-pg's PrismaPg here.
const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makeClient() {
  const adapter = new PrismaLibSql({ url: databaseUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
