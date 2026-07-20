#!/usr/bin/env bash
# verify.sh — wave6-11 (Wave-6 acceptance gate, spec H). Verify-only; runs the whole gate.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "GATE FAIL: $1"; exit 1; }

# H.1 Typecheck.
npm run typecheck 2>&1 | tail -3

# H.2 Fast unit suite, zero failures, includes the resolver unit test.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "npm test reported failures"
# Capture list to a var first: piping `vitest list` straight into `grep -q` lets grep
# close the pipe on first match, SIGPIPE-killing vitest → non-zero under pipefail (flaky). (bit wave2-ux-02)
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/image-resolve.test.ts" \
  || fail "resolver unit test (lib/image-resolve.test.ts) not in the suite"

# H.3 Seed (official >=1000 + demo >=24), then integration suite green incl. the q-image route test.
sout="$(npm run db:seed 2>&1)"; echo "$sout" | tail -4
OFF="$(echo "$sout" | grep -iE "official" | grep -Eo "[0-9]{3,}" | sort -rn | head -1 || true)"
DEMO="$(echo "$sout" | grep -E "Done\. [0-9]+ demo questions" | sed -E 's/.*Done\. ([0-9]+) demo questions.*/\1/' || true)"
[ "${OFF:-0}" -ge 1000 ] || fail "seed official=${OFF:-0} (<1000)"
[ "${DEMO:-0}" -ge 24 ]  || fail "seed demo=${DEMO:-0} (<24)"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "q-image-route.integration.test.ts" \
  || fail "q-image route test not in the integration suite"

# H.4 Build.
npm run build 2>&1 | tail -6

# H.5 Migration applied: imageKey column + index in schema.
grep -Eq "imageKey[[:space:]]+String\?" prisma/schema.prisma || fail "schema has no imageKey column"
grep -Eq "@@index\(\[imageKey\]\)" prisma/schema.prisma       || fail "schema has no @@index([imageKey])"
ls -d prisma/migrations/*_question_image_key >/dev/null 2>&1   || fail "no question_image_key migration dir"

# H.6 Static presence + purity of the wave's surfaces.
grep -Eq "export (function|const) imageCandidatePaths" lib/image-resolve.ts || fail "imageCandidatePaths not exported"
grep -Eq "export (function|const) resolveImageSrc" lib/image-resolve.ts     || fail "resolveImageSrc not exported"
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date\(" lib/image-resolve.ts \
  && fail "lib/image-resolve.ts is not pure"
[ -f "app/api/q-image/[key]/route.ts" ] || fail "q-image route file missing"
grep -q "SERVE_DEMO_QUESTIONS" "app/(app)/practice/page.tsx" || fail "practice page not servable-scoped"
grep -q "imageKey" scripts/import-official.ts || fail "importer does not set imageKey"
grep -Eq "imageUrl[[:space:]]*[:=][[:space:]]*\`?/official-images/" scripts/import-official.ts \
  && fail "importer still writes a served /official-images/ imageUrl"

echo "GATE PASS: Wave 6 acceptance — official=$OFF demo=$DEMO, all checks green"
echo "NOTE: optionally run 'npm run audit:browser' (non-localhost origin) as the real-transport check."
