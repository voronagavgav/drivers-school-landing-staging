// Re-skin with a SECOND reference image (FLUX.2 multi-ref) to keep a vehicle CONSISTENT across scenes.
// Usage: node .content-import/reskin2.mjs <blockingPng> <refCarPng> <name> "<prompt>"
import 'dotenv/config';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
const [input, ref2, name, prompt] = process.argv.slice(2);
const key = process.env.BFL_API_KEY;
if (!input || !ref2 || !name || !prompt || !key) { console.error('usage: reskin2.mjs <blocking> <refCar> <name> "<prompt>"'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (p) => readFileSync(p).toString('base64');
const sub = await fetch('https://api.bfl.ai/v1/flux-2-max', { method: 'POST', headers: { 'x-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, input_image: b64(input), input_image_2: b64(ref2), safety_tolerance: 2 }) });
if (!sub.ok) { console.error('submit', sub.status, (await sub.text()).slice(0, 300)); process.exit(2); }
const { polling_url, id, cost } = await sub.json();
if (cost != null) appendFileSync('.content-import/bfl_spend.log', `${name}\tflux-2-max-mref\t${cost}\n`);
for (let i = 0; i < 60; i++) { await sleep(1500); const j = await (await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': key } })).json(); if (j.status === 'Ready') { const img = await fetch(j.result.sample); writeFileSync(`public/demo-images/${name}.png`, Buffer.from(await img.arrayBuffer())); console.log('OK ->', name); process.exit(0); } if (j.status && !['Pending', 'Processing'].includes(j.status)) { console.error('status', j.status); process.exit(3); } }
console.error('timeout'); process.exit(4);
