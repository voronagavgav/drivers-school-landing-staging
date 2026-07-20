#!/usr/bin/env bash
# wave13-02 — /~offline fallback page: exists outside (app), pure, calm invitational copy.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="app/~offline/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
# must NOT live under the authed shell
find "app/(app)" -path "*~offline*" 2>/dev/null | grep -qE '.' && { echo "FAIL: /~offline must not be under (app)"; exit 1; }
# purity: no auth/db/server-only imports
for tok in "@/lib/db" "@/lib/auth" "@/lib/rbac" "server-only" "getCurrentUser"; do
  grep -qF "$tok" "$F" && { echo "FAIL: forbidden import/token in offline page: $tok"; exit 1; }
done
grep -qF "Ви офлайн" "$F" || { echo "FAIL: missing heading «Ви офлайн»"; exit 1; }
grep -qF "Спробувати знову" "$F" || { echo "FAIL: missing retry affordance «Спробувати знову»"; exit 1; }
grep -qF "Завантажені теми" "$F" || { echo "FAIL: missing packs-slot copy «Завантажені теми»"; exit 1; }
grep -q "помилк" "$F" && { echo "FAIL: error framing («помилк…») forbidden on the offline page"; exit 1; }
grep -q "вибач" "$F" && { echo "FAIL: apology framing forbidden on the offline page"; exit 1; }
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave13-02"
