// Stateful, resumable restyle pipeline. Restyles official ПДР images to ref_B via FLUX.2 edit
// (content/layout inherited = correct), human-reviewed in numbered batches.
//
// Commands (run from repo root):
//   node scripts/restyle/batch.mjs run [N=20]        -> restyle next N pending -> numbered review grid
//   node scripts/restyle/batch.mjs redo <n> "<extra>" -> re-restyle cell n with extra instruction
//   node scripts/restyle/batch.mjs mark approve <n,n,...>
//   node scripts/restyle/batch.mjs mark skip <n,n,...>
//   node scripts/restyle/batch.mjs status
import 'dotenv/config';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const KEY = process.env.BFL_API_KEY;
const OFFICIAL = 'public/official-images', OUT = 'public/restyled', DIR = 'scripts/restyle';
const STATE_F = `${DIR}/state.json`;
import { PROMPT, GENTLE, MODERN } from './prompts.mjs'; // prompt wording lives in prompts.mjs (shared with reskin1.mjs + workflow)

const load = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const save = (f, o) => writeFileSync(f, JSON.stringify(o, null, 2));
const state = load(STATE_F, { status: {}, notes: {}, lastBatch: [], batchNum: 0 });
const qmap = Object.fromEntries(load(`${DIR}/questions.json`, []).map((r) => [r.file, r.q]));
const files = readdirSync(OFFICIAL).filter((f) => /\.(jpe?g|png)$/i.test(f));

// scene-first score (so productive images come early; sign/marking-only sink)
const POS = /перехрест|автомобіл|поворот|смуг|пішохід|велосипед|розворот|ситуац|рух|дорог|траси|зустріч|буксир/i;
const NEG = /який знак|що означає знак|дорожній знак|розмітк|табличк|сигнал світлофора означа/i;
// SINK: overtaking (topic 14) maneuver diagrams are FLUX-edit-HARD — flat yellow star-burst markers, lit
// beacons & taillights tend to clay-ify, drop or recolour on a generic restyle. Danil wants them FINISHED, not
// skipped (batch 3): a GENTLE redo with a targeted per-defect note ("keep the lit red taillights", "keep the
// blue beacon flat 2D") or a minimal "just modernise" prompt does restore them and passed review — see
// restyle-pdr. The sink only DEFERS overtaking so the easy clean scenes go first; it does NOT exclude them.
const SINK = /обгін|обгон|обігнат|обгону/i;
const score = (f) => { const q = qmap[f] || ''; return (POS.test(q) ? 2 : 0) - (NEG.test(q) ? 3 : 0) - (SINK.test(q) ? 5 : 0); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const baseOf = (f) => f.replace(/\.(jpe?g|png)$/i, '');
// No upscaling — serve the FAITHFUL native render at ORIGINAL resolution (Danil: upscalers made details
// worse). Keep images exactly as FLUX produced them.

async function reskin(file, extra = '', base = PROMPT) {
  // NATIVE resolution only — 2x rendering drifts content (breaks faithfulness). Zoom is solved by the
  // separate upscale() step, never by re-editing at higher res.
  const b64 = readFileSync(`${OFFICIAL}/${file}`).toString('base64');
  const prompt = extra ? `${base} ADDITIONAL FIX: ${extra}` : base;
  const sub = await fetch('https://api.bfl.ai/v1/flux-2-max', { method: 'POST', headers: { 'x-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, input_image: b64, safety_tolerance: 2 }) });
  if (!sub.ok) throw new Error('submit ' + sub.status);
  const { polling_url, id } = await sub.json();
  for (let i = 0; i < 60; i++) { await sleep(1500); const j = await (await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': KEY } })).json(); if (j.status === 'Ready') { const img = await fetch(j.result.sample); const png = `${OUT}/${baseOf(file)}.png`; await sharp(Buffer.from(await img.arrayBuffer())).png().toFile(png); return png; } if (j.status && !['Pending', 'Processing'].includes(j.status)) throw new Error('status ' + j.status); }
  throw new Error('timeout');
}
async function mapLimit(items, limit, fn) { let i = 0; await Promise.all(Array.from({ length: limit }, async () => { while (i < items.length) { const k = i++; try { await fn(items[k], k); } catch (e) { console.log('FAIL', items[k], e.message); } } })); }

async function buildGrid(batch) {
  const TH = 132, GX = 14, PG = 5, COLS = 4, PAD = 30, M = 18;
  const cells = [];
  for (let i = 0; i < batch.length; i++) {
    const f = batch[i], png = `${OUT}/${f.replace(/\.(jpe?g|png)$/i, '')}.png`;
    const before = await sharp(`${OFFICIAL}/${f}`).resize({ height: TH }).toBuffer();
    const after = await sharp(png).resize({ height: TH }).toBuffer();
    const bm = await sharp(before).metadata(), am = await sharp(after).metadata();
    cells.push({ n: i + 1, f, before, after, bw: bm.width, aw: am.width });
  }
  const cw = (c) => c.bw + PG + c.aw;
  const rows = []; for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));
  const W = Math.max(...rows.map((r) => r.reduce((s, c) => s + cw(c), 0) + GX * (r.length - 1))) + M * 2;
  const H = rows.length * (TH + PAD) + M + 36;
  let svg = `<rect width="${W}" height="${H}" fill="#fff"/><text x="${M}" y="26" font-size="18" font-weight="800" fill="#0f172a" font-family="system-ui,Arial">Batch ${state.batchNum}: official (L) → restyle (R) — review by number</text>`;
  const comp = []; let y = 40;
  for (const r of rows) { let x = M; for (const c of r) {
    comp.push({ input: c.before, left: x, top: y }, { input: c.after, left: x + c.bw + PG, top: y });
    svg += `<rect x="${x - 3}" y="${y - 3}" width="${cw(c) + 6}" height="${TH + 6}" fill="none" stroke="#cbd5e1" stroke-width="1"/>`;
    svg += `<rect x="${x}" y="${y}" width="26" height="20" fill="#1d4ed8"/><text x="${x + 13}" y="${y + 15}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle" font-family="system-ui,Arial">${c.n}</text>`;
    svg += `<text x="${x}" y="${y + TH + 15}" font-size="10" fill="#475569" font-family="system-ui,Arial">${c.f}</text>`;
    x += cw(c) + GX;
  } y += TH + PAD; }
  const grid = `${DIR}/review_batch${state.batchNum}.png`;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`)).composite(comp).png().toFile(grid);
  return grid;
}

const [cmd, ...rest] = process.argv.slice(2);
const done = (f) => ['approved', 'skip', 'restyled'].includes(state.status[f]);

if (cmd === 'run') {
  const N = parseInt(rest[0] || '20', 10);
  const redos = files.filter((f) => state.status[f] === 'redo');
  const fresh = files.filter((f) => !state.status[f]).sort((a, b) => score(b) - score(a));
  const batch = [...redos, ...fresh].slice(0, N);
  if (!batch.length) { console.log('nothing pending — all done/approved/skipped'); process.exit(0); }
  state.batchNum++;
  await mapLimit(batch, 5, async (f) => { await reskin(f, state.notes[f] || ''); state.status[f] = 'restyled'; });
  const restyled = batch.filter((f) => state.status[f] === 'restyled');
  state.lastBatch = restyled; save(STATE_F, state);
  const grid = await buildGrid(restyled);
  console.log(`\nBATCH ${state.batchNum} — ${restyled.length} images -> ${grid}`);
  restyled.forEach((f, i) => console.log(`  ${i + 1}. ${f}  —  ${(qmap[f] || '').slice(0, 70)}`));
  const counts = Object.values(state.status).reduce((a, s) => ((a[s] = (a[s] || 0) + 1), a), {});
  console.log('progress:', JSON.stringify(counts), `/ ${files.length} total`);
} else if (cmd === 'redo') {
  // redo <n> [gentle|modern] "<extra>"  — gentle = light cleanup (sign-heavy); modern = "slightly more modern"
  // (keeps signs/labels/ghost-cars integrated, adds no new lines — for dense/ghost/sign-garble scenes); default = full restyle
  const n = parseInt(rest[0], 10);
  const mode = ['gentle', 'modern'].includes(rest[1]) ? rest[1] : null;
  const extra = (mode ? rest[2] : rest[1]) || '';
  const base = mode === 'gentle' ? GENTLE : mode === 'modern' ? MODERN : PROMPT;
  const f = state.lastBatch[n - 1]; if (!f) { console.log('bad cell', n); process.exit(1); }
  state.notes[f] = extra; await reskin(f, extra, base); state.status[f] = 'restyled'; save(STATE_F, state);
  console.log(`redone ${n} (${f}) [${mode || 'restyle'}]: ${extra}`);
} else if (cmd === 'rerender') {
  // rerender [file ...]  — re-run reskin (now hi-res) for given files (or all approved), status unchanged
  const targets = rest.length ? rest : files.filter((f) => state.status[f] === 'approved');
  let n = 0;
  await mapLimit(targets, 5, async (f) => { if (state.status[f] === undefined) { console.log('  skip unknown', f); return; } await reskin(f, ''); n++; console.log('  rerendered', f); });  // base prompt only — never re-feed notes (they leak into the image as text)
  console.log(`rerendered ${n} file(s) at hi-res (status unchanged)`);
} else if (cmd === 'mark') {
  const kind = rest[0] === 'skip' ? 'skip' : 'approved';
  const nums = (rest[1] || '').split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
  nums.forEach((n) => { const f = state.lastBatch[n - 1]; if (f) state.status[f] = kind; });
  save(STATE_F, state);
  console.log(`marked ${kind}:`, nums.join(','));
} else if (cmd === 'verifylist') {
  // dump JSON for the restyle-verify workflow: every RESTYLED (pending-review) image + its paths + question.
  // Usage: node scripts/restyle/batch.mjs verifylist   ->   pass the JSON to Workflow({name:'restyle-verify', args:<json>})
  const list = files.filter((f) => state.status[f] === 'restyled').map((f) => ({
    base: baseOf(f), official: `${OFFICIAL}/${f}`, restyled: `${OUT}/${baseOf(f)}.png`, q: (qmap[f] || '').replace(/\s+/g, ' ').trim(),
  }));
  console.log(JSON.stringify(list));
} else {
  const counts = Object.values(state.status).reduce((a, s) => ((a[s] = (a[s] || 0) + 1), a), {});
  console.log(`batches run: ${state.batchNum} · progress:`, JSON.stringify(counts), `/ ${files.length}`);
}
