// BUILD-TIME IMAGE PREBAKE (wave13-04, SPIKES.md §2). Emits AVIF + WebP variants
// at w ∈ {360, 540, 720} for every tier-resolved question image into
// public/img-cache/<key>-<w>.{avif,webp}. Deploy/content step — NEVER on the
// request path (sharp is a devDependency only; nothing in app/ or lib/ imports it).
// Usage: npm run prebake:images [-- --only <key>]
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Tier dirs + extension order — keep LITERALLY in sync with lib/image-resolve.ts
// (IMAGE_TIER_DIRS / IMAGE_EXTENSIONS): precedence is tier-major, extension-minor,
// first tier owning a key wins.
const TIER_DIRS = ["image-overrides", "restyled-live", "official-images"];
const EXTENSIONS = [".png", ".jpeg", ".jpg", ".svg"];
const SAFE_KEY = /^[A-Za-z0-9_-]+$/; // mirrors the resolver — unsafe keys are never served

const PUBLIC_DIR = "public";
const OUT_DIR = path.join(PUBLIC_DIR, "img-cache");
const WIDTHS = [360, 540, 720];
const MAX_BYTES = 122880; // 120 KB hard cap — never emit a variant above this
// Spike-proven starting params (SPIKES.md §2: 512×288 PNG → 9.3 KB AVIF @ q50/e4),
// then cap-retry steps. The variant is dropped if even the last step is over cap.
const AVIF_QUALITIES = [50, 35, 25];
const AVIF_EFFORT = 4;
const WEBP_QUALITIES = [80, 60, 45];

function parseOnly(argv) {
  const i = argv.indexOf("--only");
  if (i === -1) return null;
  const key = argv[i + 1];
  if (!key || !SAFE_KEY.test(key)) {
    console.error(`prebake: --only needs a safe key (got ${JSON.stringify(key ?? null)})`);
    process.exit(1);
  }
  return key;
}

// First tier owning a key wins; within a tier the resolver's extension order
// decides (so a tier's .png beats its own .svg). Returns Map<key, srcPath>,
// where an .svg winner maps to null — vector signs stay vector, the resolver
// serves the original.
function collectWinners() {
  const winners = new Map();
  for (const dir of TIER_DIRS) {
    const tierPath = path.join(PUBLIC_DIR, dir);
    if (!existsSync(tierPath)) continue;
    const byKey = new Map(); // best extension per key WITHIN this tier
    for (const file of readdirSync(tierPath)) {
      const ext = path.extname(file).toLowerCase();
      const rank = EXTENSIONS.indexOf(ext);
      if (rank === -1) continue;
      const key = path.basename(file, path.extname(file));
      if (!SAFE_KEY.test(key)) continue;
      const prev = byKey.get(key);
      if (!prev || rank < prev.rank) byKey.set(key, { rank, file });
    }
    for (const [key, { rank, file }] of byKey) {
      if (winners.has(key)) continue; // a higher tier already owns this key
      winners.set(key, rank === EXTENSIONS.indexOf(".svg") ? null : path.join(tierPath, file));
    }
  }
  return winners;
}

// Encode one variant, retrying at lower quality until it fits the cap.
// Returns the encoded buffer, or null when even the lowest quality is over cap.
async function encodeUnderCap(srcPath, width, format) {
  const qualities = format === "avif" ? AVIF_QUALITIES : WEBP_QUALITIES;
  for (const quality of qualities) {
    const pipeline = sharp(srcPath).resize({ width }); // exact w — the filename is a contract
    const buf =
      format === "avif"
        ? await pipeline.avif({ quality, effort: AVIF_EFFORT }).toBuffer()
        : await pipeline.webp({ quality }).toBuffer();
    if (buf.length <= MAX_BYTES) return buf;
  }
  return null;
}

async function main() {
  const only = parseOnly(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });

  const winners = collectWinners();
  if (only) {
    if (!winners.has(only)) {
      console.error(`prebake: key ${only} not found in any tier`);
      process.exit(1);
    }
    const src = winners.get(only);
    winners.clear();
    winners.set(only, src);
  }

  let encoded = 0;
  let skipped = 0;
  let failed = 0;
  let vector = 0;

  for (const [key, srcPath] of winners) {
    if (srcPath === null) {
      vector++; // .svg winner: no raster variants, resolver serves the vector
      continue;
    }
    const srcMtime = statSync(srcPath).mtimeMs;
    for (const width of WIDTHS) {
      for (const format of ["avif", "webp"]) {
        const outPath = path.join(OUT_DIR, `${key}-${width}.${format}`);
        if (existsSync(outPath) && statSync(outPath).mtimeMs > srcMtime) {
          skipped++; // up to date — exists and newer than its source
          continue;
        }
        try {
          const buf = await encodeUnderCap(srcPath, width, format);
          if (buf === null) {
            // Over cap at every quality step: drop the variant (and any stale
            // output) so we never serve an over-cap file; resolver degrades.
            if (existsSync(outPath)) unlinkSync(outPath);
            console.warn(`prebake: WARN ${key}-${width}.${format} over ${MAX_BYTES}B at all qualities — variant skipped`);
            failed++;
            continue;
          }
          writeFileSync(outPath, buf);
          encoded++;
        } catch (err) {
          console.warn(`prebake: WARN ${key}-${width}.${format} encode failed: ${err.message}`);
          failed++;
        }
      }
    }
  }

  if (vector > 0) console.log(`prebake: ${vector} vector (.svg) key(s) left to the resolver`);
  console.log(`prebake: encoded ${encoded}, skipped ${skipped}, failed ${failed}`);
}

await main();
