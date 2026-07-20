// Go-live: PUBLISH approved restyled PNGs into the resolver's restyled-live tier.
// Filesystem-only — it NEVER touches the database. The image resolver
// (lib/image-resolve.ts) prefers public/restyled-live/<key>.png over the
// original public/official-images/<key>.<ext>, so copying a file into the tier
// makes it live for every learner; emptying the tier reverts to the original.
//
//   node scripts/restyle/golive.mjs apply    -> copy each approved public/restyled/<base>.png
//                                               into public/restyled-live/<base>.png
//   node scripts/restyle/golive.mjs revert   -> empty public/restyled-live/ (fall back to original tier)
//   node scripts/restyle/golive.mjs status   -> count live files in the tier vs approved/missing (no DB)
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'scripts/restyle';
const STATE = `${DIR}/state.json`;
const SRC_DIR = 'public/restyled';            // staging: every restyled PNG (apply COPIES from here — never deleted)
const TIER_DIR = 'public/restyled-live';      // resolver's restyled-live tier (matches RESTYLED_LIVE_DIR in lib/image-resolve.ts)
const cmd = process.argv[2] || 'status';

// Approved keys (base filename without extension, e.g. "11_10_0") from the review state.
function approvedKeys() {
  const state = JSON.parse(readFileSync(STATE, 'utf8'));
  return Object.entries(state.status || {})
    .filter(([, s]) => s === 'approved')
    .map(([file]) => file.replace(/\.(jpe?g|png)$/i, ''));
}

// Names of regular files currently in the tier (empty array if the tier is absent).
function tierFiles() {
  if (!existsSync(TIER_DIR)) return [];
  return readdirSync(TIER_DIR).filter((n) => statSync(join(TIER_DIR, n)).isFile());
}

if (cmd === 'apply') {
  mkdirSync(TIER_DIR, { recursive: true });
  const keys = approvedKeys();
  let published = 0, missing = 0;
  for (const key of keys) {
    const src = join(SRC_DIR, `${key}.png`);
    if (!existsSync(src)) { console.log('  ! approved but no restyled PNG, skipping', `${key}.png`); missing++; continue; }
    copyFileSync(src, join(TIER_DIR, `${key}.png`));   // overwrite-safe → re-apply is idempotent
    published++;
  }
  console.log(`apply: published ${published} approved image(s) into ${TIER_DIR} (approved=${keys.length}, missing=${missing}).`);
} else if (cmd === 'revert') {
  let removed = 0;
  for (const name of tierFiles()) { rmSync(join(TIER_DIR, name)); removed++; }
  console.log(`revert: removed ${removed} file(s) from ${TIER_DIR} — resolution falls back to the original tier.`);
} else {
  const keys = approvedKeys();
  const live = new Set(tierFiles());
  let liveApproved = 0, notLive = 0;
  for (const key of keys) { if (live.has(`${key}.png`)) liveApproved++; else notLive++; }
  console.log(`status: ${live.size} file(s) live in ${TIER_DIR} · approved live: ${liveApproved}/${keys.length} · approved not yet live: ${notLive}`);
}
