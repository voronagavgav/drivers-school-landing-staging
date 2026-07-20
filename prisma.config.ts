import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config. The datasource URL moved out of schema.prisma to here.
// For SQLite, `file:` paths are resolved relative to THIS config file (project root),
// so "file:./prisma/dev.db" => ./prisma/dev.db — the same file the libsql runtime adapter
// opens (it resolves relative to cwd = project root). See lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
