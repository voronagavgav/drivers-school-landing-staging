import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration tests hit the real (seeded) SQLite DB and import server modules, so we stub
// `server-only` (which throws outside a server runtime). Run: npm run test:integration
export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "test/empty-module.ts"),
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    fileParallelism: false,
  },
});
