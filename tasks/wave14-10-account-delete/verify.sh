#!/usr/bin/env bash
# wave14-10 — account deletion: server-side type-to-confirm, cascade wipe proven, goodbye page.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S=lib/server/data-rights.ts
A=app/actions/user.ts
G=app/goodbye/page.tsx
P="app/(app)/account/data/page.tsx"
T=lib/server/data-rights.integration.test.ts
for f in "$S" "$A" "$G" "$P" "$T"; do [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }; done

grep -qF "deleteUserAccount" "$S" || { echo "FAIL: deleteUserAccount not exported"; exit 1; }
grep -qF "deleteAccountAction" "$A" || { echo "FAIL: deleteAccountAction missing from app/actions/user.ts"; exit 1; }
grep -qF "ВИДАЛИТИ" "$A" || { echo "FAIL: server-side confirm word check missing"; exit 1; }
grep -qF "/goodbye" "$A" || { echo "FAIL: redirect to /goodbye missing"; exit 1; }

# pinned copy
grep -qF "Ваші дані видалено" "$G" || { echo "FAIL: goodbye copy missing"; exit 1; }
grep -qF "Видалити акаунт назавжди" "$P" || { echo "FAIL: destructive button label missing"; exit 1; }
grep -qF "Це незворотно" "$P" || { echo "FAIL: consequence line missing"; exit 1; }

# tests: wrong-confirm, cannot-login-after, cross-user untouched, content survives
grep -qF "deleteAccountAction" "$T" || { echo "FAIL: delete tested via the real action"; exit 1; }
grep -qE 'видалити|VYDALYTY' "$T" || { echo "FAIL: wrong-confirm rejection vectors missing"; exit 1; }

x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "data-rights.integration.test.ts" || { echo "FAIL: integration test not collected"; exit 1; }

m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave14-10"
