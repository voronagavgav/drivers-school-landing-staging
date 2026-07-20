#!/usr/bin/env bash
# wave14-03 — server nudge orchestration: persistence lifecycle + caps, oracle tests untouched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F=lib/server/nudges.ts
T=lib/server/nudges.integration.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

grep -qF "export async function computeDueNudges" "$F" || { echo "FAIL: computeDueNudges not exported"; exit 1; }
grep -qF "export async function dismissNudge" "$F" || { echo "FAIL: dismissNudge not exported"; exit 1; }
grep -qF "decideNudge" "$F" || { echo "FAIL: server module must call the pure decideNudge"; exit 1; }
grep -qF '"inapp"' "$F" || { echo "FAIL: channel inapp missing"; exit 1; }
grep -qF '"QUEUED"' "$F" || { echo "FAIL: QUEUED lifecycle missing"; exit 1; }
grep -qF '"SENT"' "$F" || { echo "FAIL: SENT lifecycle missing"; exit 1; }

# oracle protection: the wave14-02 vector file must be untouched by this task
if ! git diff --quiet HEAD -- lib/nudge-policy.test.ts 2>/dev/null; then
  echo "FAIL: lib/nudge-policy.test.ts modified — frozen oracle"; exit 1
fi

# no schema change
m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9"; exit 1; }
if ! git diff --quiet HEAD -- prisma/schema.prisma 2>/dev/null; then
  echo "FAIL: schema.prisma must not change"; exit 1
fi

# integration file collected by the integration config
x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "nudges.integration.test.ts" || { echo "FAIL: nudges.integration.test.ts not collected"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS wave14-03"
