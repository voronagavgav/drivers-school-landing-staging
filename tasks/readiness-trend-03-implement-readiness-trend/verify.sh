#!/usr/bin/env bash
# verify.sh — readiness-trend-03-implement-readiness-trend
# Checks: export signature, uses the constant (no magic number), purity, typecheck,
# and a behavioral smoke test run through vitest in isolation (cleaned up afterward).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Function exported.
grep -Eq "export function readinessTrend[[:space:]]*\(" lib/progress.ts \
  || { echo "FAIL: lib/progress.ts must 'export function readinessTrend('"; exit 1; }

# 3. Uses the named constant, not a literal threshold buried in code.
grep -q "READINESS_TREND_THRESHOLD" lib/progress.ts \
  || { echo "FAIL: readinessTrend must use READINESS_TREND_THRESHOLD from @/lib/constants"; exit 1; }

# 4. Purity: progress.ts must not pull in the DB / server-only runtime.
if grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/progress.ts; then
  echo "FAIL: lib/progress.ts must stay pure (no DB / server-only import)"; exit 1
fi

# 5. Typecheck clean.
npm run typecheck 2>&1 | tail -5

# 2/3. Behavioral smoke via a throwaway vitest spec (matches include '**/*.test.ts').
SMOKE="lib/__trend_smoke__.test.ts"
cleanup() { rm -f "$SMOKE"; }
trap cleanup EXIT
cat > "$SMOKE" <<'TS'
import { describe, it, expect } from "vitest";
import { readinessTrend } from "./progress";
describe("readinessTrend smoke", () => {
  it("fewer than 2 => STABLE", () => {
    expect(readinessTrend([])).toBe("STABLE");
    expect(readinessTrend([50])).toBe("STABLE");
  });
  it("rising => IMPROVING", () => {
    expect(readinessTrend([40, 50, 60, 90])).toBe("IMPROVING");
  });
  it("falling => DECLINING", () => {
    expect(readinessTrend([90, 80, 70, 40])).toBe("DECLINING");
  });
  it("flat => STABLE", () => {
    expect(readinessTrend([70, 71, 69, 72])).toBe("STABLE");
  });
  it("does not mutate its input", () => {
    const src = [10, 20, 30];
    readinessTrend(src);
    expect(src).toEqual([10, 20, 30]);
  });
});
TS
npx vitest run "$SMOKE" 2>&1 | tail -10
npx vitest run "$SMOKE" >/dev/null 2>&1 \
  || { echo "FAIL: behavioral smoke for readinessTrend failed"; exit 1; }

echo "PASS: readinessTrend exported, pure, uses threshold, behavior + typecheck green"
