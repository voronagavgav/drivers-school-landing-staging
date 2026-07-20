#!/usr/bin/env bash
# verify.sh — wave1-sec-06 (pure safeImageUrl + tests: export + purity + behavior + typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Module + export present.
[ -f lib/sanitize.ts ] || { echo "FAIL: lib/sanitize.ts missing"; exit 1; }
grep -Eq "export function safeImageUrl[[:space:]]*\(" lib/sanitize.ts \
  || { echo "FAIL: safeImageUrl not exported from lib/sanitize.ts"; exit 1; }

# Purity.
if grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/sanitize.ts; then
  echo "FAIL: lib/sanitize.ts is not pure (DB/server import present)"; exit 1
fi

# 4. Test file present + references the fn + vitest.
[ -f lib/sanitize.test.ts ] || { echo "FAIL: lib/sanitize.test.ts missing"; exit 1; }
grep -q "safeImageUrl" lib/sanitize.test.ts || { echo "FAIL: test file does not reference safeImageUrl"; exit 1; }
grep -Eq "from ['\"]vitest['\"]" lib/sanitize.test.ts || { echo "FAIL: test file does not import vitest"; exit 1; }

# 2/3. Behavior smoke at repo-root cwd (so ./lib import resolves).
cat > ./w1s06_smoke.ts <<'TS'
import { safeImageUrl as f } from "./lib/sanitize";
function assert(c: boolean, m: string){ if(!c){ console.error("SMOKE FAIL: "+m); process.exit(1);} }
assert(f("http://example.com/a.png") === "http://example.com/a.png", "http accepted");
assert(f("https://example.com/a.png") === "https://example.com/a.png", "https accepted");
assert(f("HTTPS://example.com/a.png") !== null, "uppercase scheme accepted");
for (const bad of [null, undefined, "", "   ", "javascript:alert(1)", "data:text/html;base64,x",
                   "file:///etc/passwd", "//evil.com/x.png", "/img/x.png"]) {
  assert(f(bad as any) === null, "rejected: " + String(bad));
}
console.log("SMOKE OK");
TS
npx tsx ./w1s06_smoke.ts | tail -3
rm -f ./w1s06_smoke.ts

# 5. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-06 safeImageUrl pure + tested"
