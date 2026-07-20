import sharp from 'sharp';

// (1) Guarantee the real sign: stamp crisp official 2.1 over the re-skinned sign scene.
const signPng = await sharp('public/sign-vectors/2.1.svg', { density: 200 }).resize({ width: 56 }).png().toBuffer();
const sm = await sharp(signPng).metadata();
// authored screen pos iso(1.85,2.5)->x≈482 (×0.992 for 992-wide output), sign center y≈360
const sx = Math.round(482 * 0.992 - sm.width / 2), sy = Math.round(360 - sm.height / 2);
await sharp('public/demo-images/reskin_sign.png')
  .composite([{ input: signPng, left: sx, top: sy }])
  .png().toFile('public/demo-images/reskin_sign_final.png');
console.log('OK reskin_sign_final (real 2.1 stamped @', sx + ',' + sy + ')');

// (2) 3-way comparison montage for the give-way scenario.
const H = 430;
const load = (p) => sharp(p).resize({ height: H }).toBuffer();
const imgs = await Promise.all([
  load('public/demo-images/q_unreg_intersection.png'),
  load('public/demo-images/proto_giveway.png'),
  load('public/demo-images/reskin_giveway_a.png'),
]);
const meta = await Promise.all(imgs.map((b) => sharp(b).metadata()));
const M = 34, GAP = 40, TOP = 100, CAP = 104, BOT = 26;
const xs = []; let cx = M;
for (const m of meta) { xs.push(cx); cx += m.width + GAP; }
const W = cx - GAP + M, HT = TOP + H + CAP + BOT, yImg = TOP;

const t = (x, y, s, w, fill, txt, a = 'start') => `<text x="${x}" y="${y}" font-size="${s}" font-weight="${w}" fill="${fill}" text-anchor="${a}" font-family="system-ui,Arial,sans-serif">${txt}</text>`;
const panels = [
  { c: '#dc2626', b: '#fca5a5', h: '1 · Raw FLUX', l: ['✗ cars mid-road, AI-slop signs,', 'dup arrows — can be WRONG'] },
  { c: '#b45309', b: '#fcd34d', h: '2 · Authored SVG', l: ['✓ correct by construction', '~ but plain (a diagram)'] },
  { c: '#16a34a', b: '#86efac', h: '3 · Authored → FLUX re-skin', l: ['✓ correct AND ✓ beautiful', 'layout held + photoreal materials'] },
];
let ov = `<rect width="${W}" height="${HT}" fill="#ffffff"/>`;
ov += t(M, 48, 30, 800, '#0f172a', 'Beauty + correctness: author the geometry, then let FLUX re-skin it');
ov += t(M, 78, 17, 500, '#64748b', 'Same «дати дорогу» question — correctness comes from our authored layout, beauty from FLUX.2 image-editing.');
meta.forEach((m, i) => {
  const p = panels[i], midX = xs[i] + m.width / 2;
  ov += `<rect x="${xs[i] - 4}" y="${yImg - 4}" width="${m.width + 8}" height="${H + 8}" rx="10" fill="none" stroke="${p.b}" stroke-width="3"/>`;
  ov += t(midX, yImg + H + 34, 21, 800, p.c, p.h, 'middle');
  p.l.forEach((ln, k) => ov += t(midX, yImg + H + 60 + k * 22, 15, 500, '#475569', ln, 'middle'));
});
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}">${ov}</svg>`))
  .composite(imgs.map((b, i) => ({ input: b, left: xs[i], top: yImg })))
  .png().toFile('public/demo-images/compare3_giveway.png');
console.log('OK compare3_giveway', W + 'x' + HT);
