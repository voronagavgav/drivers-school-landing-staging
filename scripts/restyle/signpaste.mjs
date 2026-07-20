// Tier-3 redo: paste the PIXEL-CORRECT official sign onto the (otherwise-good) restyled scene.
// For signs FLUX can't hold (small Cyrillic text, speed digits) — restyle gives a clean scene, then we
// composite the real sign crop from the official image back over the melted/garbled one. Correctness wins.
//
//   node scripts/restyle/signpaste.mjs <base> '<json>'
//   <base>  e.g. 12_2_0  (resolves official-images/<base>.{jpeg,jpg,png} + restyled/<base>.png)
//   <json>  [{ "from":[x,y,w,h], "to":[x,y,w,h], "feather"?:n }, ...]  — NORMALISED 0..1 boxes.
//           from = tight rect around the GOOD sign in the OFFICIAL; to = rect of the BAD sign in the RESTYLED.
//           Keep from/to the SAME aspect ratio (both tight to the same sign) so the paste isn't distorted.
//
// Backs up the current restyled png to restyled/.bak/<base>.<ts>.png first (reversible). Pure pixel op —
// does NOT touch state.json (the cell stays 'restyled' = pending Danil's review).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const OFFICIAL = 'public/official-images', OUT = 'public/restyled';
const [base, json] = process.argv.slice(2);
if (!base || !json) { console.error('usage: signpaste <base> \'[{"from":[x,y,w,h],"to":[x,y,w,h]}]\''); process.exit(1); }

const officialPath = ['jpeg', 'jpg', 'png'].map((e) => `${OFFICIAL}/${base}.${e}`).find(existsSync);
const restyledPath = `${OUT}/${base}.png`;
if (!officialPath) { console.error('no official image for', base); process.exit(1); }
if (!existsSync(restyledPath)) { console.error('no restyled image for', base); process.exit(1); }

let boxes;
try { boxes = JSON.parse(json); } catch { console.error('bad json'); process.exit(1); }
if (!Array.isArray(boxes) || !boxes.length) { console.error('boxes must be a non-empty array'); process.exit(1); }

// px rect from a normalised [x,y,w,h], clamped to the image
const px = (box, W, H) => {
  let [x, y, w, h] = box;
  let left = Math.round(x * W), top = Math.round(y * H), width = Math.round(w * W), height = Math.round(h * H);
  left = Math.max(0, Math.min(left, W - 1)); top = Math.max(0, Math.min(top, H - 1));
  width = Math.max(1, Math.min(width, W - left)); height = Math.max(1, Math.min(height, H - top));
  return { left, top, width, height };
};

// a feathered (soft-edged) alpha mask so the pasted sign blends instead of showing a hard rectangle
const featherMask = async (w, h, f) => {
  if (!f) return null;
  const inset = Math.max(1, Math.round(f));
  const svg = `<svg width="${w}" height="${h}"><rect x="${inset}" y="${inset}" width="${Math.max(1, w - 2 * inset)}" height="${Math.max(1, h - 2 * inset)}" rx="${inset}" fill="#fff"/></svg>`;
  return sharp(Buffer.from(svg)).blur(Math.max(0.3, inset / 1.5)).extractChannel(0).toBuffer();
};

const om = await sharp(officialPath).metadata();
const rm = await sharp(restyledPath).metadata();
const baseBuf = readFileSync(restyledPath); // detach from the file before we overwrite it

const composites = [];
for (const b of boxes) {
  const from = px(b.from, om.width, om.height);
  const to = px(b.to, rm.width, rm.height);
  let crop = sharp(readFileSync(officialPath)).extract(from).resize(to.width, to.height, { fit: 'fill' });
  const mask = await featherMask(to.width, to.height, b.feather ?? 3);
  if (mask) crop = crop.ensureAlpha().joinChannel(mask); // multiply-in the soft edge
  composites.push({ input: await crop.png().toBuffer(), left: to.left, top: to.top });
  console.log(`  sign: official[${from.left},${from.top} ${from.width}x${from.height}] -> restyled[${to.left},${to.top} ${to.width}x${to.height}]`);
}

mkdirSync(`${OUT}/.bak`, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`${OUT}/.bak/${base}.${stamp}.png`, baseBuf);
await sharp(baseBuf).composite(composites).png().toFile(restyledPath);
console.log(`signpaste ${base}: ${composites.length} sign(s) pasted; backup at ${OUT}/.bak/${base}.${stamp}.png`);
