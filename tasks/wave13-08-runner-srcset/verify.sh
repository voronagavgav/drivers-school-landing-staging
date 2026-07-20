#!/usr/bin/env bash
# wave13-08 — srcset on question images: pure helper + oracle + runner wiring.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

grep -qF "imageSrcSet" lib/image-resolve.ts || { echo "FAIL: imageSrcSet missing from lib/image-resolve.ts"; exit 1; }
grep -qF "IMAGE_VARIANT_WIDTHS" lib/image-resolve.ts || { echo "FAIL: helper must build from IMAGE_VARIANT_WIDTHS"; exit 1; }
grep -qF '?w=360 360w' lib/image-resolve.test.ts || { echo "FAIL: frozen srcset literal missing from unit test"; exit 1; }

R="components/test-runner.tsx"
grep -qF "srcSet" "$R" || { echo "FAIL: runner img missing srcSet"; exit 1; }
grep -qE 'sizes=' "$R" || { echo "FAIL: runner img missing sizes"; exit 1; }
grep -qE 'width=' "$R" || { echo "FAIL: runner img missing explicit width"; exit 1; }
grep -qE 'height=' "$R" || { echo "FAIL: runner img missing explicit height"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
lst="$(npx vitest list 2>/dev/null || true)"
echo "$lst" | grep -q "image-resolve.test.ts" || { echo "FAIL: image-resolve.test.ts not in vitest list"; exit 1; }
echo "PASS wave13-08"
