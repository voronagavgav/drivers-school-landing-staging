#!/usr/bin/env bash
# verify.sh — wave1-sec-02 (pure validation module: exports + purity + behavior smoke + typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. File present + imports zod.
[ -f lib/validation.ts ] || { echo "FAIL: lib/validation.ts missing"; exit 1; }
grep -Eq "from ['\"]zod['\"]" lib/validation.ts || { echo "FAIL: lib/validation.ts does not import zod"; exit 1; }

# 2. Required schema + helper exports present.
for sym in registerSchema loginSchema selectCategorySchema startTestSchema submitAnswerSchema \
           finishTestSchema toggleSaveSchema removeSavedSchema firstIssueMessage; do
  grep -Eq "export (const|function) $sym\b" lib/validation.ts \
    || { echo "FAIL: lib/validation.ts does not export $sym"; exit 1; }
done

# 3. Purity: no DB/server imports.
if grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/validation.ts; then
  echo "FAIL: lib/validation.ts is not pure (DB/server import present)"; exit 1
fi

# 4. Behavior smoke (valid parses, invalid yields a non-empty Ukrainian message). Written at repo
#    root cwd so the "./lib/..." relative import resolves against the repo (see CLAUDE.md tsx note).
cat > ./w1s02_smoke.ts <<'TS'
import { registerSchema, firstIssueMessage } from "./lib/validation";
function assert(c: boolean, m: string){ if(!c){ console.error("SMOKE FAIL: "+m); process.exit(1);} }

const ok = registerSchema.safeParse({ name: "Іван", email: "a@b.co", password: "password1" });
assert(ok.success, "valid register input should parse");

const bad = registerSchema.safeParse({ name: "", email: "nope", password: "x" });
assert(!bad.success, "invalid register input should fail");
if (!bad.success) {
  const msg = firstIssueMessage(bad.error);
  assert(typeof msg === "string" && msg.length > 0, "firstIssueMessage returns a non-empty string");
}
console.log("SMOKE OK");
TS
npx tsx ./w1s02_smoke.ts | tail -3
rm -f ./w1s02_smoke.ts

# 5. Typecheck + suite green (no failures).
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-02 validation module meets criteria"
