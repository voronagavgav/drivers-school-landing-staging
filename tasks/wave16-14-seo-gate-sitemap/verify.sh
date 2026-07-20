#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f lib/seo.ts ] || { echo "FAIL: lib/seo.ts missing"; exit 1; }
[ -f lib/seo.test.ts ] || { echo "FAIL: lib/seo.test.ts missing"; exit 1; }
grep -q 'questionJsonLd' lib/seo.ts || { echo "FAIL: questionJsonLd missing"; exit 1; }
grep -q 'acceptedAnswer' lib/seo.test.ts || { echo "FAIL: acceptedAnswer leak-shape untested"; exit 1; }
P='app/q/[key]/page.tsx'
grep -q 'generateMetadata' "$P" || { echo "FAIL: generateMetadata missing on /q page"; exit 1; }
grep -q 'questionJsonLd' "$P" || { echo "FAIL: page does not use the pure JSON-LD builder"; exit 1; }
[ -f app/sitemap.ts ] || { echo "FAIL: app/sitemap.ts missing"; exit 1; }
grep -q 'indexingEnabled' app/sitemap.ts || { echo "FAIL: sitemap not gated on indexingEnabled"; exit 1; }
IT=lib/server/seo-gate.integration.test.ts
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
grep -q 'noindex' "$IT" || { echo "FAIL: noindex-while-closed not asserted"; exit 1; }
grep -q 'generateMetadata' "$IT" || { echo "FAIL: test bypasses the real generateMetadata export"; exit 1; }
# Gate ships closed: no tracked file may set APP_ORIGIN
if git grep -nE '^APP_ORIGIN=' -- . 2>/dev/null | grep -q .; then
  echo "FAIL: a tracked file sets APP_ORIGIN — gate must ship closed"; exit 1
fi
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
key="$(sqlite3 prisma/dev.db "SELECT questionKey FROM Question WHERE isPublished=1 AND isActive=1 AND archivedAt IS NULL AND questionKey IS NOT NULL LIMIT 1;")"
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/q/$key" || true)"
if [ "$code" = "000" ]; then
  echo "WARN: app server not reachable at $ORIGIN — live checks skipped (must pass before done-claim)"
else
  html="$(curl -s "$ORIGIN/q/$key")"
  echo "$html" | grep -q 'noindex' || { echo "FAIL: noindex meta missing while gate closed"; exit 1; }
  echo "$html" | grep -q 'application/ld+json' || { echo "FAIL: JSON-LD missing"; exit 1; }
  echo "$html" | grep -q 'acceptedAnswer' && { echo "FAIL: acceptedAnswer in un-revealed document"; exit 1; }
  sm="$(curl -s "$ORIGIN/sitemap.xml")"
  echo "$sm" | grep -q '/q/' && { echo "FAIL: sitemap exposes /q/ urls while gate closed"; exit 1; }
fi
echo "OK wave16-14"
