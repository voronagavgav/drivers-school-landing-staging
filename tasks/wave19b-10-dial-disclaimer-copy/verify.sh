#!/usr/bin/env bash
# wave19b-10 — readiness-dial honesty disclaimer («не гарантія»), negation-gate safe, quiet copy.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=components/readiness-dial.tsx
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# The negated honesty phrase must be present AND on a single source line with the «не » token (wave5-10 trap).
# Case-explicit (BSD grep does not case-fold Cyrillic).
grep -nE 'гаранті' "$F" | grep -qE 'не[[:space:]]+гаранті|а не гаранті' || {
  echo "FAIL: «не гарантія» not present on a single line with «не » in $F"; exit 1; }

# Quiet secondary styling (muted / small), not a danger element.
grep -Eq 'text-muted|text-xs' "$F" || { echo "FAIL: disclaimer is not quiet (expected text-muted/text-xs)"; exit 1; }

# Structurally inside the sufficientData branch (the number-state). Heuristic: the phrase appears after the
# sufficientData ternary opens and before its close — assert the file still branches on sufficientData.
grep -Eq 'sufficientData' "$F" || { echo "FAIL: sufficientData branch missing"; exit 1; }

# No server-graph import sneaked into the leaf client component.
grep -Eq '@/lib/rbac|@/lib/auth|@/lib/db' "$F" && { echo "FAIL: server-graph import in client component"; exit 1; } || true

npm run -s typecheck
npm run -s build

# Best-effort browser check (non-fatal if number-state not reached).
if [ -n "${DRIVER_BROWSER_CMD:-}" ]; then
  URL="${AUDIT_ORIGIN:-http://localhost:3100}"
  "$DRIVER_BROWSER_CMD" open "$URL/login" >/dev/null 2>&1 || true
  # (login + dashboard navigation is environment-specific; assert presence only if reachable)
  if "$DRIVER_BROWSER_CMD" open "$URL/dashboard" >/dev/null 2>&1; then
    TXT="$("$DRIVER_BROWSER_CMD" eval 'document.querySelector("main")?.textContent || ""' 2>/dev/null || true)"
    if grep -q "готовності\|Готовність" <<<"$TXT" && grep -q "%" <<<"$TXT"; then
      grep -q "не гарантія" <<<"$TXT" || { echo "FAIL: dial in number-state but disclaimer «не гарантія» not rendered"; exit 1; }
      echo "browser: disclaimer visible in dial number-state"
    else
      echo "browser: dashboard reached but dial not in number-state — relying on source gates"
    fi
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
fi

echo "PASS wave19b-10"
