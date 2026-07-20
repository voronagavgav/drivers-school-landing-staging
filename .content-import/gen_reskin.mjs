// img2img RE-SKIN: feed a CORRECT authored iso diagram into FLUX.2 [max] editing (input_image) so it
// repaints photoreal materials/light while PRESERVING the layout (car positions, lanes, markings).
// Signs are NOT trusted to FLUX — composite the real vector afterwards (separate step).
// Usage: node .content-import/gen_reskin.mjs <inputPng> <name> "<prompt>"
import 'dotenv/config';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const [input, name, prompt, model = 'flux-2-max'] = process.argv.slice(2);
const key = process.env.BFL_API_KEY;
if (!input || !name || !prompt || !key) { console.error('usage: node gen_reskin.mjs <inputPng> <name> "<prompt>" (needs BFL_API_KEY)'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = readFileSync(input).toString('base64');

const sub = await fetch(`https://api.bfl.ai/v1/${model}`, {
  method: 'POST',
  headers: { 'x-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ prompt, input_image: b64, safety_tolerance: 2 }),
});
if (!sub.ok) { console.error('submit', sub.status, (await sub.text()).slice(0, 300)); process.exit(2); }
const { polling_url, id, cost } = await sub.json();
if (cost != null) { console.log(`  cost ${cost} ($${(cost*0.01).toFixed(3)})`); appendFileSync('.content-import/bfl_spend.log', `${name}\tflux-2-max-edit\t${cost}\n`); }

for (let i = 0; i < 60; i++) {
  await sleep(1500);
  const j = await (await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': key } })).json();
  if (j.status === 'Ready') {
    const img = await fetch(j.result.sample);
    writeFileSync(`public/demo-images/${name}.png`, Buffer.from(await img.arrayBuffer()));
    console.log('OK ->', name); process.exit(0);
  }
  if (j.status && !['Pending', 'Processing'].includes(j.status)) { console.error('status', j.status); process.exit(3); }
}
console.error('timeout'); process.exit(4);
