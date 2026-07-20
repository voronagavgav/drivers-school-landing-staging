import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
const UA = 'DriversSchoolEdu/1.0 (Ukrainian PDR study app; contact vorontsov6200@gmail.com)';
const API = 'https://commons.wikimedia.org/w/api.php';
const OUT = 'public/sign-vectors';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fetchRetry = async (u, tries = 5) => {
  for (let t = 0; t < tries; t++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) return r; } catch {}
    await sleep(700 * (t + 1));
  }
  return null;
};
const getJson = async (params) => {
  const r = await fetchRetry(API + '?' + new URLSearchParams({ format: 'json', ...params }));
  return r ? r.json() : null;
};
// enumerate
const titles = [];
let cont;
do {
  const j = await getJson({ action: 'query', list: 'allpages', apnamespace: '6', apprefix: 'Ukraine road sign', aplimit: '500', ...(cont || {}) });
  for (const p of j.query.allpages) if (/\.svg$/i.test(p.title)) titles.push(p.title);
  cont = j.continue ? { apcontinue: j.continue.apcontinue } : null;
  await sleep(300);
} while (cont);
const map = existsSync(`${OUT}/index.json`) ? JSON.parse(readFileSync(`${OUT}/index.json`, 'utf8')) : {};
let n = Object.keys(map).length, got = 0, miss = 0;
console.log('SVG sign files:', titles.length, '| already have:', n);
for (let i = 0; i < titles.length; i += 25) {
  const batch = titles.slice(i, i + 25).filter(t => { const m = t.match(/Ukraine road sign\s+([\d.]+)\.svg/i); return m && !existsSync(`${OUT}/${m[1]}.svg`); });
  if (!batch.length) continue;
  const j = await getJson({ action: 'query', titles: batch.join('|'), prop: 'imageinfo', iiprop: 'url' });
  if (!j?.query?.pages) continue;
  for (const p of Object.values(j.query.pages)) {
    const url = p.imageinfo?.[0]?.url; const m = p.title.match(/Ukraine road sign\s+([\d.]+)\.svg/i);
    if (!url || !m) { miss++; continue; }
    const sign = m[1];
    const res = await fetchRetry(url);
    if (!res) { miss++; continue; }
    writeFileSync(`${OUT}/${sign}.svg`, await res.text());
    map[sign] = `${sign}.svg`; got++; n++;
    await sleep(200);
  }
  process.stdout.write(`  have ${n}/${titles.length}\n`);
}
writeFileSync(`${OUT}/index.json`, JSON.stringify(Object.fromEntries(Object.keys(map).sort().map(k => [k, map[k]])), null, 2));
console.log(`DONE: +${got} this run, ${n} total, ${miss} still missing`);
