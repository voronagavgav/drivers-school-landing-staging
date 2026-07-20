// One-page review UI for the restyle pipeline. BEFORE|AFTER pairs with Good/Bad→redo/Skip
// buttons that write to state.json. Plus: click-to-zoom, and "mark" boxes on the AFTER image
// so a redo knows exactly which zone is wrong (regions + a marked snapshot saved to the manifest).
//   node scripts/restyle/review-server.mjs        (PORT=4321 default)
import http from 'node:http';
import os from 'node:os';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const DIR = 'scripts/restyle', STATE = `${DIR}/state.json`, PORT = +(process.env.PORT || 4321);
const qmap = Object.fromEntries(JSON.parse(readFileSync(`${DIR}/questions.json`, 'utf8')).map((r) => [r.file, r.q]));
const baseOf = (f) => f.replace(/\.(jpe?g|png)$/i, '');
const load = () => JSON.parse(readFileSync(STATE, 'utf8'));
const STATUS_OF = { approve: 'approved', bad: 'redo', skip: 'skip' };
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(view) {
  const st = load();
  const all = Object.keys(st.status).filter((f) => existsSync(`public/restyled/${baseOf(f)}.png`));
  const count = (s) => all.filter((f) => st.status[f] === s).length;
  const items = (view === 'all' ? all : all.filter((f) => st.status[f] === view));
  const tab = (v, label) => `<a href="/?view=${v}" class="${view === v ? 'on' : ''}">${label} (${v === 'all' ? all.length : count(v)})</a>`;
  const cards = items.map((f, i) => {
    const b = baseOf(f), s = st.status[f], note = esc(st.notes?.[f] || '');
    const rv = (() => { try { return statSync(`public/restyled/${b}.png`).mtimeMs | 0; } catch { return 0; } })();
    return `<div class="card ${s}" data-file="${esc(f)}">
      <div class="meta"><b>#${i + 1}</b> · ${esc((qmap[f] || '').slice(0, 95))} <span class="badge">${s}</span></div>
      <div class="imgs">
        <figure><figcaption>BEFORE (official)</figcaption><img class="zoom" loading="lazy" src="/img/o/${esc(f)}"></figure>
        <figure><figcaption>AFTER (restyle) <span class="tools"><button type="button" class="tool mark">✏️ mark</button><button type="button" class="tool clr">clear</button><span class="hint"></span></span></figcaption>
          <div class="wrap"><img class="after zoom" loading="lazy" src="/img/r/${b}.png?v=${rv}"><canvas class="mc"></canvas></div></figure>
      </div>
      <div class="actions">
        <button class="good" onclick="decide(this,'approve')">✓ Good</button>
        <button class="bad" onclick="decide(this,'bad')">✗ Bad → redo</button>
        <button class="skip" onclick="decide(this,'skip')">⊘ Skip (keep original)</button>
        <input class="note" placeholder="what to fix (for redo)" value="${note}">
      </div></div>`;
  }).join('\n');
  return `<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Restyle review</title><style>
  *{box-sizing:border-box}body{font:15px/1.4 system-ui,Arial;margin:0;background:#f1f5f9;color:#0f172a}
  header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 18px;z-index:5}
  h1{margin:0 0 8px;font-size:18px}.tabs a{display:inline-block;margin-right:6px;padding:5px 11px;border-radius:7px;text-decoration:none;color:#334155;background:#f1f5f9;font-weight:600;font-size:13px}
  .tabs a.on{background:#1d4ed8;color:#fff}main{padding:18px;max-width:1100px;margin:0 auto}
  .card{background:#fff;border:1px solid #e2e8f0;border-left:6px solid #cbd5e1;border-radius:10px;padding:14px;margin:0 0 16px}
  .card.approved{border-left-color:#16a34a}.card.redo{border-left-color:#dc2626}.card.skip{border-left-color:#94a3b8}
  .meta{font-size:13px;color:#475569;margin-bottom:9px}.badge{float:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b}
  .imgs{display:flex;gap:10px}.imgs figure{margin:0;flex:1}.imgs figcaption{font-size:11px;font-weight:700;color:#64748b;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center}
  .wrap{position:relative;line-height:0}.imgs img{width:100%;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:zoom-in}
  .wrap .mc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:6px}
  .card.marking .after{cursor:crosshair}.card.marking .mc{pointer-events:auto}
  .tools{display:flex;gap:6px;align-items:center}.tool{border:1px solid #cbd5e1;background:#f8fafc;border-radius:6px;padding:2px 7px;font-size:11px;cursor:pointer}
  .tool.mark.on{background:#dc2626;color:#fff;border-color:#dc2626}.hint{color:#dc2626;font-weight:600}
  .actions{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
  .actions button{border:0;border-radius:7px;padding:8px 13px;font-weight:700;font-size:13px;cursor:pointer;color:#fff}
  .good{background:#16a34a}.bad{background:#dc2626}.skip{background:#64748b}.note{flex:1;min-width:180px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font-size:13px}
  .empty{padding:40px;text-align:center;color:#64748b}
  #lb{position:fixed;inset:0;background:rgba(15,23,42,.92);display:none;align-items:center;justify-content:center;z-index:50;overflow:auto;cursor:zoom-out}
  #lb.on{display:flex}#lb img{max-width:95vw;max-height:95vh}#lb img.actual{max-width:none;max-height:none;cursor:zoom-out}</style></head><body>
  <header><h1>Restyle review</h1><div class="tabs">${tab('restyled', 'Pending')} ${tab('approved', 'Approved')} ${tab('skip', 'Skipped')} ${tab('redo', 'Redo')} ${tab('all', 'All')}</div></header>
  <main>${cards || '<div class="empty">Nothing in this view. Run a batch, then refresh the Pending tab.</div>'}</main>
  <div id="lb"><img></div>
  <script>
  const lb=document.getElementById('lb'),lbi=lb.querySelector('img');
  lb.onclick=e=>{ if(e.target===lb||lbi.classList.contains('actual')&&e.target===lbi&&false){} ; if(e.target===lb){lb.classList.remove('on');lbi.classList.remove('actual')} };
  lbi.onclick=e=>{ e.stopPropagation(); lbi.classList.toggle('actual'); };
  function openLB(src){ lbi.classList.remove('actual'); lbi.src=src; lb.classList.add('on'); }
  document.querySelectorAll('.card').forEach(card=>{
    card._regions=[];
    const after=card.querySelector('.after'), cv=card.querySelector('.mc'), markBtn=card.querySelector('.mark'),
          clrBtn=card.querySelector('.clr'), hint=card.querySelector('.hint');
    card.querySelectorAll('img.zoom').forEach(im=> im.addEventListener('click',()=>{ if(card.classList.contains('marking')&&im===after) return; openLB(im.src); }));
    function size(){ cv.width=after.clientWidth; cv.height=after.clientHeight; draw(); }
    function draw(prev){ const x=cv.getContext('2d'); x.clearRect(0,0,cv.width,cv.height); x.lineWidth=2; x.strokeStyle='#dc2626'; x.fillStyle='rgba(220,38,38,.18)';
      const all=prev?card._regions.concat([prev]):card._regions;
      all.forEach(r=>{ const X=r.x*cv.width,Y=r.y*cv.height,W=r.w*cv.width,H=r.h*cv.height; x.fillRect(X,Y,W,H); x.strokeRect(X,Y,W,H); }); }
    markBtn.onclick=()=>{ card.classList.toggle('marking'); markBtn.classList.toggle('on'); hint.textContent=card.classList.contains('marking')?'drag to box the bad area':''; size(); };
    clrBtn.onclick=()=>{ card._regions=[]; draw(); };
    let drawing=false,start=null;
    const pt=e=>{ const r=cv.getBoundingClientRect(); return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]; };
    const rect=(a,b)=>({x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),w:Math.abs(a[0]-b[0]),h:Math.abs(a[1]-b[1])});
    cv.addEventListener('pointerdown',e=>{ if(!card.classList.contains('marking'))return; drawing=true; start=pt(e); });
    cv.addEventListener('pointermove',e=>{ if(!drawing)return; draw(rect(start,pt(e))); });
    cv.addEventListener('pointerup',e=>{ if(!drawing)return; drawing=false; const r=rect(start,pt(e)); if(r.w>.01&&r.h>.01)card._regions.push(r); draw(); });
    if(after.complete)size(); else after.onload=size;
  });
  function annotate(card){ const img=card.querySelector('.after'),regs=card._regions||[]; if(!regs.length||!img.naturalWidth)return null;
    const c=document.createElement('canvas'); c.width=img.naturalWidth; c.height=img.naturalHeight; const x=c.getContext('2d');
    x.drawImage(img,0,0,c.width,c.height); x.lineWidth=Math.max(3,c.width/180); x.strokeStyle='red'; x.fillStyle='rgba(255,0,0,.15)';
    regs.forEach(r=>{ x.fillRect(r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height); x.strokeRect(r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height); });
    try{ return c.toDataURL('image/png'); }catch{ return null; } }
  async function decide(btn,decision){ const card=btn.closest('.card'),file=card.dataset.file,note=card.querySelector('.note').value;
    const regions=decision==='bad'?card._regions:[]; const marked=decision==='bad'?annotate(card):null;
    btn.textContent='…'; await fetch('/decide',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({file,decision,note,regions,marked})});
    card.className='card '+(decision==='approve'?'approved':decision==='bad'?'redo':'skip');
    card.querySelector('.badge').textContent=decision==='approve'?'approved':decision==='bad'?'redo':'skip';
    btn.textContent={approve:'✓ Good',bad:'✗ Bad → redo',skip:'⊘ Skip (keep original)'}[decision]; }
  </script></body></html>`;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/') { res.setHeader('content-type', 'text/html; charset=utf8'); return res.end(page(url.searchParams.get('view') || 'restyled')); }
  if (req.method === 'GET' && url.pathname.startsWith('/img/')) {
    const [, , kind, ...rest] = url.pathname.split('/'); const name = decodeURIComponent(rest.join('/'));
    const p = kind === 'o' ? `public/official-images/${name}` : `public/restyled/${name}`;
    if (!/^[\w.\-]+$/.test(name) || !existsSync(p)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', name.endsWith('.png') ? 'image/png' : 'image/jpeg'); return res.end(readFileSync(p));
  }
  if (req.method === 'POST' && url.pathname === '/decide') {
    let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
      try {
        const { file, decision, note, regions, marked } = JSON.parse(body); const st = load();
        if (st.status[file] !== undefined) {
          st.status[file] = STATUS_OF[decision] || st.status[file];
          if (decision === 'bad') {
            st.notes = st.notes || {}; st.notes[file] = note || '';
            st.regions = st.regions || {}; st.regions[file] = regions || [];
            if (marked && marked.startsWith('data:image/png;base64,')) writeFileSync(`public/restyled/marked_${baseOf(file)}.png`, Buffer.from(marked.split(',')[1], 'base64'));
          }
          writeFileSync(STATE, JSON.stringify(st, null, 2));
        }
        res.end('ok');
      } catch { res.statusCode = 400; res.end('bad'); }
    }); return;
  }
  res.statusCode = 404; res.end('nf');
}).listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`review UI listening on :${PORT}`);
  ['localhost', ...ips].forEach((h) => console.log(`  http://${h}:${PORT}/`));
});
