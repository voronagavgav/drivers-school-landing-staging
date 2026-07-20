// Side-by-side: same give-way scenario, FLUX text-to-image vs authored iso SVG.
import sharp from 'sharp';

const H = 560;
const flux = await sharp('public/demo-images/q_unreg_intersection.png').resize({ height: H }).toBuffer();
const auth = await sharp('public/demo-images/proto_giveway.png').resize({ height: H }).toBuffer();
const fm = await sharp(flux).metadata(), am = await sharp(auth).metadata();

const M = 34, GAP = 44, TOP = 96, CAP = 96, BOT = 26;
const x1 = M, x2 = M + fm.width + GAP;
const W = x2 + am.width + M, HT = TOP + H + CAP + BOT, yImg = TOP;

const t = (x, y, s, w, fill, txt, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-size="${s}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}" font-family="system-ui,Arial,sans-serif">${txt}</text>`;
const cap = (cx, y, color, head, lines) =>
  t(cx, y, 22, 800, color, head, 'middle') + lines.map((l, i) => t(cx, y + 26 + i * 22, 16, 500, '#475569', l, 'middle')).join('');

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}">
  <rect width="${W}" height="${HT}" fill="#ffffff"/>
  ${t(M, 46, 30, 800, '#0f172a', 'Same question, two ways — «дати дорогу» at an unregulated equal-roads intersection')}
  ${t(M, 74, 17, 500, '#64748b', 'Real ПДР question cmqjzfnci001r — the image IS the question, so it must be correct.')}
  <rect x="${x1 - 4}" y="${yImg - 4}" width="${fm.width + 8}" height="${H + 8}" rx="10" fill="none" stroke="#fca5a5" stroke-width="3"/>
  <rect x="${x2 - 4}" y="${yImg - 4}" width="${am.width + 8}" height="${H + 8}" rx="10" fill="none" stroke="#86efac" stroke-width="3"/>
  ${cap(x1 + fm.width / 2, yImg + H + 34, '#dc2626', 'FLUX text-to-image', ['✗ cars float mid-road  ✗ signs are AI-slop', '✗ duplicated road arrows  •  $0.07/img'])}
  ${cap(x2 + am.width / 2, yImg + H + 34, '#16a34a', 'Authored iso SVG', ['✓ cars in-lane  ✓ real official 2.1 vector', '✓ correct markings  •  $0/img · 734-scalable'])}
</svg>`);

await sharp(overlay)
  .composite([{ input: flux, left: x1, top: yImg }, { input: auth, left: x2, top: yImg }])
  .png().toFile('public/demo-images/compare_giveway.png');
console.log('OK compare_giveway', W + 'x' + HT);
