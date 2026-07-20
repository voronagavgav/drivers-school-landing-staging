// Demo / illustrative image generator for NON-official content.
// Provider-flexible: uses FLUX 2 via Black Forest Labs direct (BFL_API_KEY, cheapest + newest)
// or fal.ai (FAL_KEY). Output -> public/demo-images/<name>.png (served at /demo-images/<name>.png).
//
// Usage:  node .content-import/gen_demo_image.mjs "<prompt>" <name> [pro|flex|dev]
// Needs a key in .env:  BFL_API_KEY=...   (preferred, ~$0.03/MP)   OR   FAL_KEY=...
//
// NOTE: only for demo/illustrative scenes — NEVER for official ПДР signs (use public/sign-vectors/)
// or precise diagrams (use authored SVG). Generated raster can't be trusted for exact markings.
import 'dotenv/config';
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';

const [prompt, name = 'demo', tier = 'pro'] = process.argv.slice(2);
const OUT = 'public/demo-images';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!prompt) { console.error('usage: node gen_demo_image.mjs "<prompt>" <name> [pro|flex|dev]'); process.exit(1); }

async function viaBFL(key) {
  const model = { pro: 'flux-2-pro', flex: 'flux-2-flex', max: 'flux-2-max' }[tier] || 'flux-2-pro';
  // submit
  const sub = await fetch(`https://api.bfl.ai/v1/${model}`, {
    method: 'POST',
    headers: { 'x-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width: 1024, height: 1024 }),
  });
  if (!sub.ok) throw new Error('BFL submit ' + sub.status + ' ' + (await sub.text()).slice(0, 200));
  const { polling_url, id, cost } = await sub.json();
  if (cost != null) {
    console.log(`  cost: ${cost} credits ($${(cost * 0.01).toFixed(3)}) — model ${model}`);
    appendFileSync('.content-import/bfl_spend.log', `${name}\t${model}\t${cost}\n`);
  }
  // poll
  for (let i = 0; i < 60; i++) {
    await sleep(1500);
    const p = await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': key } });
    const j = await p.json();
    if (j.status === 'Ready') return j.result.sample;
    if (j.status && j.status !== 'Pending' && j.status !== 'Processing') throw new Error('BFL status ' + j.status);
  }
  throw new Error('BFL timed out');
}

async function viaFal(key) {
  const model = tier === 'dev' ? 'fal-ai/flux-2/dev' : tier === 'flex' ? 'fal-ai/flux-2/flex' : 'fal-ai/flux-2/pro';
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'square_hd' }),
  });
  if (!res.ok) throw new Error('fal ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const j = await res.json();
  return j.images?.[0]?.url;
}

const bfl = process.env.BFL_API_KEY, fal = process.env.FAL_KEY;
if (!bfl && !fal) {
  console.error('No image key. Add BFL_API_KEY=... (preferred) or FAL_KEY=... to ~/drivers-school/.env');
  process.exit(2);
}
try {
  const url = bfl ? await viaBFL(bfl) : await viaFal(fal);
  if (!url) throw new Error('no image url returned');
  const img = await fetch(url);
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(await img.arrayBuffer()));
  console.log(`OK -> ${OUT}/${name}.png  (provider: ${bfl ? 'BFL FLUX.2 [' + tier + ']' : 'fal FLUX.2 [' + tier + ']'})`);
} catch (e) { console.error('GEN FAILED:', e.message); process.exit(3); }
