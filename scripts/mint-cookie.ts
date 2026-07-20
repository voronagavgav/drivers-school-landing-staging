// Dev/test helper: mint a valid ds_session cookie for a user by email, using the SAME HMAC
// scheme as lib/auth.ts. Used by the smoke test to exercise authenticated pages over HTTP.
import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const email = process.argv[2];
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});
const secret = process.env.SESSION_SECRET ?? "dev-only-insecure-secret";

(async () => {
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) {
    console.error(`no user: ${email}`);
    process.exit(1);
  }
  const exp = Date.now() + 3_600_000;
  const payload = `${u.id}:${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  process.stdout.write(`${payload}.${sig}`);
  await prisma.$disconnect();
})();
