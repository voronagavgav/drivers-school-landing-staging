// reskin1.mjs — re-edit ONE official image through FLUX and overwrite its restyled png. STATELESS (never
// touches state.json) so the automated verify/fix loop can run many in parallel without clobbering state.
// Always re-edits the ORIGINAL official (not the current restyled png), like batch.mjs redo.
//
// Usage (from repo root):
//   node scripts/restyle/reskin1.mjs <base> [restyle|gentle|modern] ["<extra note>"]
//     base  = e.g. 15_22_0   -> writes public/restyled/<base>.png (backs up the old png to .bak/)
//     mode  = restyle (default, full ref_B) | gentle (light cleanup) | modern (slightly-more-modern, keeps
//             signs/labels/ghost-cars integrated, adds no new lines — use for dense/ghost/sign-garble scenes)
//     extra = optional targeted fix note appended as "ADDITIONAL FIX: ..." (describe the FIX, never on-image text)
import 'dotenv/config';
import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import sharp from 'sharp';
import { BASES } from './prompts.mjs';

const KEY = process.env.BFL_API_KEY;
const [base, modeArg, extra = ''] = process.argv.slice(2);
const mode = ['restyle', 'gentle', 'modern'].includes(modeArg) ? modeArg : 'restyle';
if (!base) { console.error('usage: reskin1.mjs <base> [restyle|gentle|modern] ["<note>"]'); process.exit(1); }
const off = readdirSync('public/official-images').find((f) => f.replace(/\.(jpe?g|png)$/i, '') === base);
if (!off) { console.error('no official for', base); process.exit(1); }
const out = `public/restyled/${base}.png`;

const prompt = extra ? `${BASES[mode]} ADDITIONAL FIX: ${extra}` : BASES[mode];
const b64 = readFileSync(`public/official-images/${off}`).toString('base64');
const sub = await fetch('https://api.bfl.ai/v1/flux-2-max', { method: 'POST', headers: { 'x-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, input_image: b64, safety_tolerance: 2 }) });
if (!sub.ok) { console.error(base, 'submit', sub.status); process.exit(1); }
const { polling_url, id } = await sub.json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  await sleep(1500);
  const j = await (await fetch(polling_url || `https://api.bfl.ai/v1/get_result?id=${id}`, { headers: { 'x-key': KEY } })).json();
  if (j.status === 'Ready') {
    if (existsSync(out)) { const bak = 'public/restyled/.bak'; if (!existsSync(bak)) mkdirSync(bak, { recursive: true }); copyFileSync(out, `${bak}/${base}.reskin1.${new Date().toISOString().replace(/[:.]/g, '-')}.png`); }
    const img = await fetch(j.result.sample);
    await sharp(Buffer.from(await img.arrayBuffer())).png().toFile(out);
    console.log(`reskin1 ${base} [${mode}] done${extra ? ' :: ' + extra : ''}`);
    process.exit(0);
  }
  if (j.status && !['Pending', 'Processing'].includes(j.status)) { console.error(base, 'status', j.status); process.exit(1); }
}
console.error(base, 'timeout'); process.exit(1);
