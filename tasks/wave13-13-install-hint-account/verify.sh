#!/usr/bin/env bash
# wave13-13 — install hint card: lanes, dismiss memory, mounted on /account, client-pure.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="components/install-hint.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
for tok in "beforeinstallprompt" "Додати на головний екран" "Встановити застосунок" "ds_install_hint_dismissed" "display-mode: standalone" "Приховати"; do
  grep -qF "$tok" "$F" || { echo "FAIL: missing token in install-hint: $tok"; exit 1; }
done
for tok in "@/lib/db" "@/lib/auth" "@/lib/rbac" "server-only"; do
  grep -qF "$tok" "$F" && { echo "FAIL: server-graph import in client component: $tok"; exit 1; }
done
grep -qE 'install-hint|InstallHint' "app/(app)/account/page.tsx" || { echo "FAIL: hint not mounted on /account"; exit 1; }
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave13-13"
