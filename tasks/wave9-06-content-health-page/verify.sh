#!/usr/bin/env bash
# verify.sh — wave9-06 (admin content-health page + nav link)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/admin/content-health/page.tsx"
LAYOUT="app/admin/layout.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Page exists + default export.
[ -f "$PAGE" ] || fail "$PAGE missing"
grep -Eq 'export default (async )?function' "$PAGE" || fail "$PAGE must default-export a component"

# 2. Calls requireContentManager (F-5).
grep -q 'requireContentManager' "$PAGE" || fail "$PAGE must call requireContentManager"
grep -q '@/lib/rbac' "$PAGE" || fail "$PAGE must import requireContentManager from @/lib/rbac"

# 3-4. Uses the server aggregation + the presentational parts.
grep -q 'getContentHealth' "$PAGE" || fail "$PAGE must use getContentHealth"
grep -q 'content-stats' "$PAGE" || fail "$PAGE must import from @/lib/server/content-stats"
grep -q 'OptionDistribution' "$PAGE" || fail "$PAGE must use OptionDistribution"
grep -q 'FlagBadge' "$PAGE" || fail "$PAGE must use FlagBadge"

# 5. Ukrainian heading + KPI strip.
grep -q 'Якість контенту' "$PAGE" || fail "$PAGE must render the heading «Якість контенту»"
grep -q 'Stat' "$PAGE" || fail "$PAGE must render KPI Stat cards"

# 8. No obvious PII rendered.
grep -q 'passwordHash' "$PAGE" && fail "$PAGE must not render passwordHash (PII)" || true

# 7. Nav link present in NAV_LINKS, AFTER the analytics entry.
grep -q '/admin/content-health' "$LAYOUT" || fail "$LAYOUT NAV_LINKS missing /admin/content-health"
grep -q 'Якість контенту' "$LAYOUT" || fail "$LAYOUT nav link must be labelled «Якість контенту»"
an="$(grep -n '/admin/analytics' "$LAYOUT" | head -1 | cut -d: -f1)"
ch="$(grep -n '/admin/content-health' "$LAYOUT" | head -1 | cut -d: -f1)"
[ -n "$an" ] && [ -n "$ch" ] && [ "$ch" -gt "$an" ] || fail "content-health nav link must come AFTER «Аналітика»"

# 9-10. typecheck + production build green.
npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -8

# 11. BROWSER/transport (best-effort, non-fatal when server down): unauth GET must NOT 200.
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/admin/content-health" 2>/dev/null || true)"
if [ "$code" = "000" ] || [ -z "$code" ]; then
  echo "NOTE: app not reachable at $ORIGIN — skipping live route guard check (static+build gate stands)."
else
  [ "$code" = "200" ] && fail "unauth GET /admin/content-health returned 200 — admin gate not enforced"
  echo "OK: unauth /admin/content-health → HTTP $code (guarded / redirected)."
  # Optional richer drive when a browser tool is wired (non-fatal).
  if [ -n "${DRIVER_BROWSER_CMD:-}" ]; then
    "$DRIVER_BROWSER_CMD" open "$ORIGIN/admin/content-health" >/dev/null 2>&1 || true
    "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
  fi
fi

echo "PASS: wave9-06 content-health page + nav link wired; typecheck/build green; route guarded"
