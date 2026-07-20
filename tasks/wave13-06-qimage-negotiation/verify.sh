#!/usr/bin/env bash
# wave13-06 — q-image content negotiation: pure fn + oracle vectors + route wiring.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

grep -qF "IMAGE_VARIANT_WIDTHS" lib/image-resolve.ts || { echo "FAIL: IMAGE_VARIANT_WIDTHS missing"; exit 1; }
grep -qF "negotiateImageVariant" lib/image-resolve.ts || { echo "FAIL: negotiateImageVariant missing"; exit 1; }
# pure module must stay pure (scoped to imports, not comments — but these tokens must not appear at all)
for tok in "node:fs" "server-only" "@/lib/db" "lib/generated"; do
  grep -qF "$tok" lib/image-resolve.ts && { echo "FAIL: purity violation in lib/image-resolve.ts: $tok"; exit 1; }
done

[ -f lib/image-resolve.test.ts ] || { echo "FAIL: lib/image-resolve.test.ts missing"; exit 1; }
# oracle vectors present verbatim (spot-check three)
grep -qF 'image/avif,image/webp,image/*' lib/image-resolve.test.ts || { echo "FAIL: avif-preference vector missing from tests"; exit 1; }
grep -qF '"541"' lib/image-resolve.test.ts || { echo "FAIL: invalid-width vector (541) missing from tests"; exit 1; }
grep -qF '"*/*"' lib/image-resolve.test.ts || { echo "FAIL: */*-only vector missing from tests"; exit 1; }

grep -qF "resolveVariantDiskPath" lib/server/image-resolve.ts || { echo "FAIL: resolveVariantDiskPath missing"; exit 1; }
grep -qF "img-cache" lib/server/image-resolve.ts || { echo "FAIL: variant path must live under public/img-cache"; exit 1; }

R="app/api/q-image/[key]/route.ts"
grep -qF "negotiateImageVariant" "$R" || { echo "FAIL: route does not call the negotiator"; exit 1; }
grep -qF "immutable" "$R" || { echo "FAIL: immutable Cache-Control missing for variants"; exit 1; }
grep -qF "max-age=3600" "$R" || { echo "FAIL: original path Cache-Control changed"; exit 1; }
grep -qF "resolveImageDiskPath" "$R" || { echo "FAIL: base tier walk must remain in the route"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
lst="$(npx vitest list 2>/dev/null || true)"
echo "$lst" | grep -q "image-resolve.test.ts" || { echo "FAIL: image-resolve.test.ts not in vitest list"; exit 1; }
echo "PASS wave13-06"
