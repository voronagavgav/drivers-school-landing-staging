#!/usr/bin/env bash
# wave13-12 — WAL: client-safe queue, pure batcher + oracle, runner wiring, drain component, build green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

W="lib/offline/wal.ts"
[ -f "$W" ] || { echo "FAIL: $W missing"; exit 1; }
for fn in enqueueAnswer listQueued removeQueued queuedCount; do
  grep -qF "$fn" "$W" || { echo "FAIL: $W missing $fn"; exit 1; }
done
grep -qF "indexedDB" "$W" || { echo "FAIL: wal.ts must feature-detect indexedDB"; exit 1; }
for tok in "@/lib/db" "@/lib/auth" "@/lib/rbac" "server-only"; do
  grep -qF "$tok" "$W" && { echo "FAIL: server-graph import in wal.ts: $tok"; exit 1; }
done

B="lib/offline/sync-batch.ts"
[ -f "$B" ] || { echo "FAIL: $B missing"; exit 1; }
grep -qF "buildSyncBatches" "$B" || { echo "FAIL: buildSyncBatches missing"; exit 1; }
T="lib/offline/sync-batch.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qF "2026-07-02T08:00:00.000Z" "$T" || { echo "FAIL: frozen sort-oracle timestamps missing"; exit 1; }

grep -qF "Збережемо, щойно з'явиться мережа" components/test-runner.tsx components/*.tsx 2>/dev/null || \
  grep -rqF "Збережемо, щойно з'явиться мережа" components/ || { echo "FAIL: queued-state copy missing"; exit 1; }
grep -qF "enqueueAnswer" components/test-runner.tsx || { echo "FAIL: runner catch path must enqueue"; exit 1; }

S="components/offline-sync.tsx"
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
grep -qF '"online"' "$S" || grep -qF "'online'" "$S" || { echo "FAIL: online-event listener missing"; exit 1; }
grep -qF "review-sync" "$S" || { echo "FAIL: drain must POST /api/review-sync"; exit 1; }
grep -rqE 'offline-sync|OfflineSync' "app/(app)/layout.tsx" || { echo "FAIL: drain component not mounted in (app) layout"; exit 1; }

grep -qE '"sync"|sync.*register' app/sw.ts || { echo "FAIL: Background Sync handler missing from app/sw.ts"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
lst="$(npx vitest list 2>/dev/null || true)"
echo "$lst" | grep -q "sync-batch.test.ts" || { echo "FAIL: sync-batch.test.ts not in vitest list"; exit 1; }
npm run -s build || { echo "FAIL: build (client-bundle trap)"; exit 1; }
echo "PASS wave13-12"
