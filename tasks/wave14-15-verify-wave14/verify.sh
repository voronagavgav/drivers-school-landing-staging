#!/usr/bin/env bash
# wave14-15 — final wave gate: all upstream verifies + full suites + build + drift + inclusion proof.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# 1. every wave14 task's own gate re-passes (regression sweep); skip self to avoid recursion
for t in tasks/wave14-*/; do
  v="$t/verify.sh"
  case "$t" in *wave14-15-verify-wave14*) continue ;; esac
  [ -f "$v" ] || continue
  echo "--- $v"
  bash "$v" || { echo "FAIL: upstream gate $v"; exit 1; }
done

# 2. upstream journals all done (02-14)
for t in tasks/wave14-0[2-9]-* tasks/wave14-1[0-4]-*; do
  grep -qE '^\*\*Status:\*\* done' "$t/journal.md" || { echo "FAIL: $t not done"; exit 1; }
done

# 3. schema drift: zero new migrations this wave
m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9 (wave promised none)"; exit 1; }

# 4. inclusion proof for every new test file
u="$(npx vitest list 2>/dev/null || true)"
for f in nudge-policy.test.ts calibration.test.ts learning-health.test.ts; do
  echo "$u" | grep -q "$f" || { echo "FAIL: unit test $f not collected"; exit 1; }
done
i="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
for f in nudges.integration.test.ts calibration.integration.test.ts data-rights.integration.test.ts learning-health.integration.test.ts analytics-prune.integration.test.ts; do
  echo "$i" | grep -q "$f" || { echo "FAIL: integration test $f not collected"; exit 1; }
done

# 5. full gates
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }

# 6. nightly job end-to-end with both new steps visible
out="$(npx tsx --conditions=react-server scripts/nightly-readiness.ts 2>&1)" || { echo "FAIL: nightly script"; exit 1; }
echo "$out" | grep -qiE 'prune|analytics' || { echo "FAIL: prune log line missing from nightly output"; exit 1; }

# 7. spec coverage checklist recorded in this journal
grep -qE '## (Spec coverage|Coverage)' tasks/wave14-15-verify-wave14/journal.md || { echo "FAIL: coverage checklist section missing from journal"; exit 1; }

echo "PASS wave14-15 (plus the live steps: restarted-server audit:browser x2 — record in journal Log)"
