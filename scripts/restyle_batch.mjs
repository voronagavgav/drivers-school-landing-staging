// Pilot batch: restyle a spread of EXISTING official ПДР images to the ref_B clean semi-realistic look
// via FLUX.2 edit (content/layout inherited = correct for free). Builds a before/after review grid.
import 'dotenv/config';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const key = process.env.BFL_API_KEY;
const DIR = 'public/official-images', OUT = 'public/demo-images';
const all = readdirSync(DIR).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
const N = 12, step = Math.floor(all.length / N);
const picks = Array.from({ length: N }, (_, i) => all[i * step]).filter(Boolean);
console.log('picked:', picks.join(', '));

const PROMPT =
  "Restyle this Ukrainian driving-exam illustration into a CLEAN SEMI-REALISTIC 3D render of official ПДР-graphic quality. " +
  "CRITICAL: keep ALL content and layout EXACTLY — every car (and its colour), sign, road marking, arrow, coloured marker, " +
  "pedestrian and text caption stays in the SAME position; do NOT move, add or remove anything; keep all text and signs " +
  "readable and unchanged. ONLY upgrade rendering quality: crisp clean semi-realistic materials, smooth light-grey asphalt, " +
  "neat green grass, realistic-but-clean cars with subtle reflections, bright even neutral daylight, soft shadows; remove the " +
  "dated/grainy look. Keep the original framing and aspect.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function reskin(path) {
  const b64 = readFileSync(path).toString('base64');
  const sub = await fetch('https://api.bfl.ai/v1/flux-2-max', { method: 'POST', headers: { 'x-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: PROMPT, input_image: b64, safety_tolerance: 2 }) });
  if (!sub.ok) throw new Error('submit ' + sub.status);
  const { polling_url, id } = await sub.json();
  for (let i = 0; i < 60; i++) { await sleep(1500); const j = await (await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': key } })).json(); if (j.status === 'Ready') { const img = await fetch(j.result.sample); return Buffer.from(await img.arrayBuffer()); } if (j.status && !['Pending', 'Processing'].includes(j.status)) throw new Error('status ' + j.status); }
  throw new Error('timeout');
}

// concurrency-limited
async function mapLimit(items, limit, fn) {
  const out = []; let idx = 0;
  await Promise.all(Array.from({ length: limit }, async () => { while (idx < items.length) { const i = idx++; try { out[i] = await fn(items[i], i); } catch (e) { out[i] = null; console.log('FAIL', items[i], e.message); } } }));
  return out;
}

const results = await mapLimit(picks, 5, async (f) => {
  const buf = await reskin(`${DIR}/${f}`);
  const name = `restyle_${f.replace(/\.(jpe?g|png)$/i, '')}`;
  await sharp(buf).png().toFile(`${OUT}/${name}.png`);
  console.log('ok', f);
  return { f, name };
});

// before/after grid: 2 items per row, each = [before | after] with filename label
const TH = 150, GAPX = 16, PAIRGAP = 6, COLS = 2, ROWPAD = 28, MARGIN = 20;
const ok = results.filter(Boolean);
const cells = [];
for (const { f, name } of ok) {
  const before = await sharp(`${DIR}/${f}`).resize({ height: TH }).toBuffer();
  const after = await sharp(`${OUT}/${name}.png`).resize({ height: TH }).toBuffer();
  const bm = await sharp(before).metadata(), am = await sharp(after).metadata();
  cells.push({ f, before, after, bw: bm.width, aw: am.width });
}
const cellW = (c) => c.bw + PAIRGAP + c.aw;
const rows = []; for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));
const rowW = (r) => r.reduce((s, c) => s + cellW(c), 0) + GAPX * (r.length - 1);
const W = Math.max(...rows.map(rowW)) + MARGIN * 2;
const rowH = TH + ROWPAD;
const H = rows.length * rowH + MARGIN * 2 + 24;
let svg = `<rect width="${W}" height="${H}" fill="#ffffff"/><text x="${MARGIN}" y="28" font-size="20" font-weight="800" fill="#0f172a" font-family="system-ui,Arial">Restyle pilot — official (left) → ref_B restyle (right)</text>`;
const composites = [];
let y = 44;
for (const r of rows) {
  let x = MARGIN;
  for (const c of r) {
    composites.push({ input: c.before, left: x, top: y });
    composites.push({ input: c.after, left: x + c.bw + PAIRGAP, top: y });
    svg += `<text x="${x}" y="${y + TH + 16}" font-size="11" fill="#475569" font-family="system-ui,Arial">${c.f}</text>`;
    svg += `<rect x="${x + c.bw + PAIRGAP - 1}" y="${y}" width="2" height="${TH}" fill="#16a34a"/>`;
    x += cellW(c) + GAPX;
  }
  y += rowH;
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`))
  .composite(composites).png().toFile(`${OUT}/restyle_batch_grid.png`);
console.log('GRID done', W + 'x' + H, '(' + ok.length + '/' + picks.length + ' ok)');
