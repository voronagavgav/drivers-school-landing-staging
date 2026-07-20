// Build per-scene BEFORE|AFTER comparison images. Usage: node scripts/restyle/cmp.mjs <file.jpeg> ...
import sharp from 'sharp';
import { existsSync } from 'node:fs';
const H = 420, DIV = 6, LBL = 30, M = 10;
for (const f of process.argv.slice(2)) {
  const base = f.replace(/\.(jpe?g|png)$/i, '');
  const off = `public/official-images/${f}`, re = `public/restyled/${base}.png`;
  if (!existsSync(off) || !existsSync(re)) { console.log('skip (missing)', f); continue; }
  const before = await sharp(off).resize({ height: H }).toBuffer();
  const after = await sharp(re).resize({ height: H }).toBuffer();
  const bm = await sharp(before).metadata(), am = await sharp(after).metadata();
  const W = bm.width + DIV + am.width, HT = H + LBL + M;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}"><rect width="${W}" height="${HT}" fill="#fff"/>` +
    `<text x="${bm.width / 2}" y="20" font-size="15" font-weight="800" fill="#64748b" text-anchor="middle" font-family="system-ui,Arial">BEFORE</text>` +
    `<text x="${bm.width + DIV + am.width / 2}" y="20" font-size="15" font-weight="800" fill="#16a34a" text-anchor="middle" font-family="system-ui,Arial">AFTER</text>` +
    `<rect x="${bm.width}" y="${LBL}" width="${DIV}" height="${H}" fill="#0f172a"/></svg>`;
  await sharp(Buffer.from(svg)).composite([{ input: before, left: 0, top: LBL }, { input: after, left: bm.width + DIV, top: LBL }]).png().toFile(`public/restyled/cmp_${base}.png`);
  console.log('cmp', f);
}
