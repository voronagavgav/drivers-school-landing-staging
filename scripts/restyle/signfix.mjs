// signfix.mjs — composite a REAL clean road-sign image (from the signs-on-white library) over a wrong/garbled
// sign in a restyled scene. The crisp, content-correct alternative to FLUX redrawing a sign (which renders the
// wrong symbol) or hand-drawing a synthetic one (which isn't the real design). Stateless pixel op (safe in parallel).
//
// Usage (run from repo root):
//   node scripts/restyle/signfix.mjs <base> <signFile> <x> <y> <h> [flattenThreshold]
//     base   = restyled image base name, e.g. 15_22_0   (writes public/restyled/<base>.png)
//     signFile = a sign image in .content-import/v5_signs_imgs/, e.g. 33_222_0.png (ПДР 1.1 right bend),
//                33_159_0.png (ПДР 5.41 bus stop). Find the right one by colour-filter + contact sheet.
//     x,y    = normalised (0..1) top-left of where to place the sign (over the wrong one)
//     h      = normalised (0..1) height; width is derived from the sign's aspect (NEVER distort)
//     flattenThreshold = trim sensitivity for stripping the white margin (default 25)
//
// CRITICAL (batch-3 lesson): size the sign to MATCH the official sign's scale in the scene. Too big + flat = it
// reads as a sticker. Zoom both images, measure the wrong sign's box, use that h. Re-verify the result by zooming.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import sharp from 'sharp';

const [base, signFile, xs, ys, hs, ths] = process.argv.slice(2);
if (!base || !signFile || xs === undefined || ys === undefined || hs === undefined) {
  console.error('usage: signfix.mjs <base> <signFile> <x> <y> <h> [flattenThreshold]');
  process.exit(1);
}
const x = parseFloat(xs), y = parseFloat(ys), h = parseFloat(hs), th = ths ? parseInt(ths, 10) : 25;
const img = `public/restyled/${base}.png`;
const signPath = `.content-import/v5_signs_imgs/${signFile}`;
if (!existsSync(img)) { console.error('no restyled image', img); process.exit(1); }
if (!existsSync(signPath)) { console.error('no sign image', signPath); process.exit(1); }

const bakDir = 'public/restyled/.bak';
if (!existsSync(bakDir)) mkdirSync(bakDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
copyFileSync(img, `${bakDir}/${base}.signfix.${stamp}.png`);

const meta = await sharp(img).metadata();
const W = meta.width, H = meta.height;
// trim the white margin off the clean sign so only the sign panel composites (its own bg is the sign colour)
const sign = await sharp(signPath).flatten({ background: '#fff' }).trim({ threshold: th }).toBuffer();
const sm = await sharp(sign).metadata();
const ph = Math.round(h * H), pw = Math.round(ph * (sm.width / sm.height));
const small = await sharp(sign).resize({ width: pw, height: ph, fit: 'fill' }).png().toBuffer();
const left = Math.round(x * W), top = Math.round(y * H);
const tmp = `/tmp/_signfix_${base}.png`;
await sharp(img).composite([{ input: small, left, top }]).png().toFile(tmp); // sharp can't read+write same file
copyFileSync(tmp, img);
console.log(`signfix ${base}: ${signFile} (${sm.width}x${sm.height}) -> ${pw}x${ph} at ${left},${top}; backup in .bak/`);
