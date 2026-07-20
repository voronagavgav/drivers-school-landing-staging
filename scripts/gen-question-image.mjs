// QUESTION-IMAGE GENERATION LOGIC (end-to-end, correct + on-style).
// spec -> (1) authored blocking (known coords) -> (2) FLUX.2 re-skin (photoreal, holds layout)
// -> (3) precise answer overlay at the SAME coords -> output. Verify vs answer is a separate step.
// Usage: node scripts/gen-question-image.mjs   (renders the left-turn give-way proof)
import 'dotenv/config';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import sharp from 'sharp';
import { iso, ground, car, tree, svg } from './iso-diagram.mjs';

const OUTW = 992, OUTH = 720, SCX = OUTW / 1000; // re-skin trims to 992 wide
const sp = (x, y, z = 0) => { const [px, py] = iso(x, y, z); return [px * SCX, py]; }; // world -> output px

// ---------- SCENE SPEC (this is the per-question input the LLM will author later) ----------
const spec = {
  id: 'cmqjzfnck001xbegeuj6wlakp',
  name: 'q_leftturn',
  question: "Перед поворотом ліворуч водій зобов'язаний дати дорогу зустрічним ТЗ, що рухаються прямо/праворуч",
  cars: [
    { x: 0.82, y: 3.0, axis: 'y', color: 'blue', dir: 'N', label: 'Ви' }, // you, turning left
    { x: -0.82, y: -3.0, axis: 'y', color: 'white', dir: 'S' },           // oncoming, going straight (priority)
  ],
  trees: [[-5.3, 5.3], [5.3, -5.3], [5.2, 5.2]],
  reskinPrompt:
    "Re-render this isometric road-intersection diagram as a photorealistic premium 3D scene, elevated three-quarter view. " +
    "CRITICAL: keep the EXACT layout — the blue car at the bottom and the white car at the top in their EXACT positions and lanes, " +
    "same crossing roads and markings; do NOT move, add or remove any vehicle, road or marking, and add NO traffic signs and NO text. " +
    "Only upgrade the look: realistic textured asphalt, real grass and trees, realistic glossy car paint, soft warm golden daylight, " +
    "soft shadows, premium product-visualization realism. 1:1.",
  overlay: [
    { type: 'turn', pts: [[0.82, 2.4], [0.82, 0.1], [-2.6, -0.2]], color: '#2563eb' }, // blue's left-turn path
    { type: 'straight', pts: [[-0.82, -2.4], [-0.82, 1.6]], color: '#eaeef3' },         // oncoming straight
    { type: 'star', at: [-0.82, -1.4], color: '#22c55e' },                              // priority car = the answer
    { type: 'label', at: [0.82, 3.0, 1.9], text: 'Ви', color: '#1d4ed8' },
  ],
};

// ---------- (1) authored blocking ----------
function blocking(s) {
  let g = ground();
  for (const [x, y] of s.trees) g += tree(x, y);
  // draw back car (smaller x+y) first
  const cs = [...s.cars].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (const c of cs) g += car(c.x, c.y, c.axis, 2.05, 1.08, c.color, c.dir, null);
  return svg(g);
}

// ---------- (3) answer overlay (precise, at known coords) ----------
function arrow(pts, color, w) {
  const P = pts.map(([x, y]) => sp(x, y));
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  if (P.length === 2) d += ` L${P[1][0].toFixed(1)},${P[1][1].toFixed(1)}`;
  else d += ` Q${P[1][0].toFixed(1)},${P[1][1].toFixed(1)} ${P[2][0].toFixed(1)},${P[2][1].toFixed(1)}`;
  const [ex, ey] = P[P.length - 1], [bx, by] = P[P.length - 2];
  const ang = Math.atan2(ey - by, ex - bx), a = 13;
  const head = `${ex},${ey} ${ex - a * Math.cos(ang - 0.5)},${ey - a * Math.sin(ang - 0.5)} ${ex - a * Math.cos(ang + 0.5)},${ey - a * Math.sin(ang + 0.5)}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"
    style="paint-order:stroke" stroke-opacity="1"/><polygon points="${head}" fill="${color}"/>`;
}
function star(x, y, color) {
  const [cx, cy] = sp(x, y); const R = 17, r = 7; let p = '';
  for (let i = 0; i < 10; i++) { const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5; p += `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)} `; }
  return `<polygon points="${p}" fill="${color}" stroke="#fff" stroke-width="2.5"/>`;
}
function overlaySvg(s) {
  let o = '';
  for (const a of s.overlay) {
    if (a.type === 'turn') o += arrow(a.pts, '#ffffff', 9) + arrow(a.pts, a.color, 5.5);
    else if (a.type === 'straight') o += arrow(a.pts, '#222', 8) + arrow(a.pts, a.color, 5);
    else if (a.type === 'star') o += star(a.at[0], a.at[1], a.color);
    else if (a.type === 'label') { const [lx, ly] = sp(a.at[0], a.at[1], a.at[2] || 0); o += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="22" font-weight="800" text-anchor="middle" fill="${a.color}" stroke="#fff" stroke-width="5" paint-order="stroke" font-family="system-ui,Arial,sans-serif">${a.text}</text>`; }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTW}" height="${OUTH}">${o}</svg>`;
}

// ---------- (2) FLUX.2 re-skin ----------
async function reskin(inputPng, prompt) {
  const key = process.env.BFL_API_KEY; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const b64 = readFileSync(inputPng).toString('base64');
  const sub = await fetch('https://api.bfl.ai/v1/flux-2-max', { method: 'POST', headers: { 'x-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, input_image: b64, safety_tolerance: 2 }) });
  if (!sub.ok) throw new Error('reskin submit ' + sub.status + ' ' + (await sub.text()).slice(0, 200));
  const { polling_url, id, cost } = await sub.json();
  if (cost != null) appendFileSync('.content-import/bfl_spend.log', `${spec.name}\tflux-2-max-edit\t${cost}\n`);
  for (let i = 0; i < 60; i++) { await sleep(1500); const j = await (await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': key } })).json(); if (j.status === 'Ready') { const img = await fetch(j.result.sample); return Buffer.from(await img.arrayBuffer()); } if (j.status && !['Pending', 'Processing'].includes(j.status)) throw new Error('reskin status ' + j.status); }
  throw new Error('reskin timeout');
}

// ---------- run pipeline ----------
const dir = 'public/demo-images';
await sharp(Buffer.from(blocking(spec))).png().toFile(`${dir}/${spec.name}_1blocking.png`);
console.log('1/4 blocking ok');
const skinned = await reskin(`${dir}/${spec.name}_1blocking.png`, spec.reskinPrompt);
await sharp(skinned).png().toFile(`${dir}/${spec.name}_2reskin.png`);
console.log('2/4 reskin ok');
await sharp(skinned).composite([{ input: Buffer.from(overlaySvg(spec)), left: 0, top: 0 }]).png().toFile(`${dir}/${spec.name}_final.png`);
console.log('3/4 overlay+final ok -> ' + spec.name + '_final.png');
console.log('4/4 VERIFY manually vs answer: «' + spec.question + '»');
