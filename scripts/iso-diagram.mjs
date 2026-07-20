// Premium isometric ПДР question-diagram generator (authored = correct by construction).
// Every car/sign/marking is placed by us; real sign pictograms composited from public/sign-vectors/.
// Warm palette + gradient-shaded assets + soft shadows + depth = premium, NOT AI-slop.
// Usage: node scripts/iso-diagram.mjs   (writes proof PNGs to public/demo-images/)
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

// ---- isometric projection (2:1 dimetric) ----
const S = 27, OX = 500, OY = 372;
const iso = (x, y, z = 0) => [OX + (x - y) * S, OY + (x + y) * S * 0.5 - z * S];
const P = (arr) => arr.map(([x, y, z]) => iso(x, y, z).map((n) => n.toFixed(1)).join(',')).join(' ');

// ---- palette ----
const C = {
  skyTop: '#efe6d4', skyBot: '#fdf9f1',
  grassC: '#9ec47a', grassE: '#7da557', grassEdge: '#6b9a4c',
  road: '#84888f', roadDk: '#6d717a', kerbTop: '#d7dce3', kerbFace: '#aeb4be',
  mark: '#f7f9fc', amber: '#f2b705',
  glass1: '#3b475c', glass2: '#141b29',
  trunk: '#7c5a3a', trunkDk: '#664831', tree1: '#7bb45a', tree2: '#5f9e4a', tree3: '#4d8a3a',
  label: '#1d4ed8',
};
// car color sets: [topLight, topBase, sideBase, sideDark]
const CARS = {
  blue:  ['#7cb0fb', '#2f6ff0', '#2256c4', '#173f93'],
  red:   ['#fb8585', '#e0322f', '#bd2422', '#85160f'],
  white: ['#ffffff', '#e7ecf2', '#c6cfdb', '#9aa6b6'],
};

// ---- defs: sky, soft shadow, grass, asphalt, per-car gradients ----
function defs() {
  let g = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skyTop}"/><stop offset="1" stop-color="${C.skyBot}"/></linearGradient>`;
  g += `<radialGradient id="sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#0b1020" stop-opacity="0.32"/><stop offset="0.65" stop-color="#0b1020" stop-opacity="0.15"/><stop offset="1" stop-color="#0b1020" stop-opacity="0"/></radialGradient>`;
  g += `<radialGradient id="grass" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="${C.grassC}"/><stop offset="1" stop-color="${C.grassE}"/></radialGradient>`;
  g += `<linearGradient id="asph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9097"/><stop offset="1" stop-color="${C.roadDk}"/></linearGradient>`;
  for (const [k, v] of Object.entries(CARS)) {
    g += `<linearGradient id="${k}-top" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${v[0]}"/><stop offset="1" stop-color="${v[1]}"/></linearGradient>`;
    g += `<linearGradient id="${k}-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v[2]}"/><stop offset="1" stop-color="${v[3]}"/></linearGradient>`;
  }
  g += `<linearGradient id="glass" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${C.glass1}"/><stop offset="1" stop-color="${C.glass2}"/></linearGradient>`;
  return `<defs>${g}</defs>`;
}

const shadow = (x, y, rx, ry) => { const [sx, sy] = iso(x, y); return `<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${rx}" ry="${ry}" fill="url(#sh)"/>`; };
const poly = (arr, fill, extra = '') => `<polygon points="${P(arr)}" fill="${fill}" ${extra}/>`;

// chamfered top rectangle (rounded look) -> 8 world points
function chamfer(x0, y0, x1, y1, z, c) {
  return [[x0+c,y0,z],[x1-c,y0,z],[x1,y0+c,z],[x1,y1-c,z],[x1-c,y1,z],[x0+c,y1,z],[x0,y1-c,z],[x0,y0+c,z]];
}
// iso box with gradient faces (south + east + chamfered top)
function gbox(x0, y0, x1, y1, h, z0, key, c = 0.12) {
  const south = poly([[x0,y1,z0],[x1,y1,z0],[x1,y1,z0+h],[x0,y1,z0+h]], `url(#${key}-side)`);
  const east  = poly([[x1,y0,z0],[x1,y1,z0],[x1,y1,z0+h],[x1,y0,z0+h]], `url(#${key}-side)`, 'opacity="0.88"');
  const top   = poly(chamfer(x0,y0,x1,y1,z0+h,c), `url(#${key}-top)`);
  return south + east + top;
}

// ---- premium car: shadow, body, wheels, cabin glass, lights, clearcoat ----
function car(cx, cy, axis, len, wid, key, dir, label) {
  const hx = axis === 'y' ? wid/2 : len/2, hy = axis === 'y' ? len/2 : wid/2;
  const x0 = cx-hx, x1 = cx+hx, y0 = cy-hy, y1 = cy+hy;
  let s = shadow(cx+0.16, cy+0.18, (hx+hy)*S*0.6, (hx+hy)*S*0.32);
  // tires: dark rounded blobs at base of the two visible sides
  const wheel = (x, y) => { const [wx, wy] = iso(x, y, 0.12); return `<ellipse cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" rx="7" ry="4.4" fill="#15181d"/>`; };
  s += wheel(x1, y0+0.32) + wheel(x1, y1-0.32) + wheel(x0+0.32, y1) + wheel(x1-0.32, y1);
  // lower body
  s += gbox(x0, y0, x1, y1, 0.46, 0, key);
  // cabin (inset, raised) — narrower along width, shifted toward rear
  const ins = 0.30, rear = 0.30;
  const cx0 = axis==='x' ? x0+ins+rear*(dir==='E'?1:0) : x0+ins;
  const cx1 = axis==='x' ? x1-ins-rear*(dir==='W'?1:0) : x1-ins;
  const cy0 = axis==='y' ? y0+ins+rear*(dir==='S'?1:0) : y0+ins;
  const cy1 = axis==='y' ? y1-ins-rear*(dir==='N'?1:0) : y1-ins;
  s += gbox(cx0, cy0, cx1, cy1, 0.40, 0.46, key, 0.14);
  // windshield glass on top of cabin
  s += poly(chamfer(cx0+0.06, cy0+0.06, cx1-0.06, cy1-0.06, 0.86, 0.12), 'url(#glass)', 'opacity="0.9"');
  // clearcoat highlight: a bright thin streak along the top-left edge
  const [hax, hay] = iso(x0+0.18, y0+0.2, 0.47), [hbx, hby] = iso(axis==='x'?x1-0.18:x0+0.18, axis==='x'?y0+0.2:y1-0.2, 0.47);
  s += `<line x1="${hax.toFixed(1)}" y1="${hay.toFixed(1)}" x2="${hbx.toFixed(1)}" y2="${hby.toFixed(1)}" stroke="#ffffff" stroke-width="2" opacity="0.45" stroke-linecap="round"/>`;
  // head/tail lights on the front face
  const lightAt = (x, y, col) => { const [lx, ly] = iso(x, y, 0.2); return `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="3.4" ry="2.4" fill="${col}"/>`; };
  if (dir==='N') s += lightAt(x0+0.3,y0+0.02,'#fff7da')+lightAt(x1-0.3,y0+0.02,'#fff7da');
  if (dir==='S') s += lightAt(x0+0.3,y1-0.02,'#ffd9d0')+lightAt(x1-0.3,y1-0.02,'#ff5a5a');
  if (dir==='W') s += lightAt(x0+0.02,y0+0.3,'#fff7da')+lightAt(x0+0.02,y1-0.3,'#fff7da');
  if (dir==='E') s += lightAt(x1-0.02,y0+0.3,'#ff5a5a')+lightAt(x1-0.02,y1-0.3,'#ff5a5a');
  if (label) { const [lx, ly] = iso(cx, cy, 1.85); s += textLabel(lx, ly, label); }
  return s;
}

const textLabel = (x, y, t) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="21" font-weight="800" text-anchor="middle" fill="${C.label}" stroke="#fff" stroke-width="4.5" paint-order="stroke" font-family="system-ui,Arial,sans-serif">${t}</text>`;

// ---- layered iso tree ----
function tree(x, y) {
  let s = shadow(x+0.14, y+0.16, 20, 11);
  s += gbox(x-0.1, y-0.1, x+0.1, y+0.1, 1.0, 0, 'white'); // trunk-ish (reuse box) overwritten below
  // trunk (proper)
  s = shadow(x+0.14, y+0.16, 20, 11);
  s += poly([[x-0.09,y-0.09,0],[x+0.09,y-0.09,0],[x+0.09,y-0.09,1.0],[x-0.09,y-0.09,1.0]], C.trunkDk);
  s += poly([[x+0.09,y-0.09,0],[x+0.09,y+0.09,0],[x+0.09,y+0.09,1.0],[x+0.09,y-0.09,1.0]], C.trunk);
  const [cx, cy] = iso(x, y, 1.85);
  s += `<ellipse cx="${cx.toFixed(1)}" cy="${(cy+3).toFixed(1)}" rx="30" ry="22" fill="${C.tree3}"/>`;
  s += `<ellipse cx="${(cx-6).toFixed(1)}" cy="${(cy-2).toFixed(1)}" rx="24" ry="19" fill="${C.tree2}"/>`;
  s += `<ellipse cx="${(cx+7).toFixed(1)}" cy="${(cy-1).toFixed(1)}" rx="21" ry="17" fill="${C.tree2}"/>`;
  s += `<ellipse cx="${(cx-2).toFixed(1)}" cy="${(cy-9).toFixed(1)}" rx="18" ry="14" fill="${C.tree1}"/>`;
  s += `<ellipse cx="${(cx-9).toFixed(1)}" cy="${(cy-9).toFixed(1)}" rx="6" ry="4.5" fill="#a6d27f" opacity="0.7"/>`;
  return s;
}

// ---- composite a REAL official sign vector onto a billboard + post ----
function realSign(signId, x, y, w = 48) {
  const raw = readFileSync(`public/sign-vectors/${signId}.svg`, 'utf8');
  const m = raw.match(/width="([\d.]+)"\s+height="([\d.]+)"/);
  const sw = parseFloat(m[1]), sh = parseFloat(m[2]);
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>[\s\S]*?<\/title>/, '');
  const scale = w / sw, h = sh * scale, [px, py] = iso(x, y, 0), postH = 46, signTop = py - postH - h;
  let s = shadow(x+0.08, y+0.1, 12, 6.5);
  s += `<rect x="${(px-2.6).toFixed(1)}" y="${(signTop+h-3).toFixed(1)}" width="5.2" height="${postH+3}" rx="2.6" fill="#aab0ba"/>`;
  s += `<rect x="${(px-1.2).toFixed(1)}" y="${(signTop+h-3).toFixed(1)}" width="1.6" height="${postH+3}" fill="#c8cdd5"/>`;
  s += `<g transform="translate(${(px-w/2).toFixed(1)},${signTop.toFixed(1)}) scale(${scale.toFixed(4)})">${inner}</g>`;
  return s;
}

// ---- ground: warm sky + grass island + two crossing roads + kerbs + markings ----
function ground(W = 3, L = 7) {
  const h = W/2;
  let s = `<rect width="1000" height="720" fill="url(#sky)"/>`;
  s += shadow(0, 0, 340, 180); // soft island grounding
  s += poly([[L,L,0],[-L,L,0],[-L,-L,0],[L,-L,0]], 'url(#grass)');
  s += poly([[L,L,0],[-L,L,0],[-L,-L,0],[L,-L,0]], 'none', `stroke="${C.grassEdge}" stroke-width="3"`);
  // road surfaces
  s += poly([[-L,-h,0],[L,-h,0],[L,h,0],[-L,h,0]], 'url(#asph)');
  s += poly([[-h,-L,0],[h,-L,0],[h,L,0],[-h,L,0]], 'url(#asph)');
  // kerbs (raised: top light + thin face) + ambient occlusion at grass/road seam
  const seam = (a, b) => `<line x1="${iso(...a)[0].toFixed(1)}" y1="${iso(...a)[1].toFixed(1)}" x2="${iso(...b)[0].toFixed(1)}" y2="${iso(...b)[1].toFixed(1)}" stroke="#3f444c" stroke-width="3" opacity="0.18"/>`;
  const kerb = (a, b) => `<line x1="${iso(...a)[0].toFixed(1)}" y1="${iso(...a)[1].toFixed(1)}" x2="${iso(...b)[0].toFixed(1)}" y2="${iso(...b)[1].toFixed(1)}" stroke="${C.kerbTop}" stroke-width="2.5"/>`;
  for (const yy of [-h, h]) { s += seam([-L,yy,0],[L,yy,0]) + kerb([-L,yy,0],[L,yy,0]); }
  for (const xx of [-h, h]) { s += seam([xx,-L,0],[xx,L,0]) + kerb([xx,-L,0],[xx,L,0]); }
  // dashed white center lines, broken across the junction
  const dash = (vary) => { let o=''; for (let t=-L; t<L; t+=1) { if (Math.abs(t) < h+0.2) continue;
    const a = vary==='x'?[t,0,0.02]:[0,t,0.02], b = vary==='x'?[t+0.5,0,0.02]:[0,t+0.5,0.02];
    o += `<polyline points="${P([a,b])}" stroke="${C.mark}" stroke-width="3" fill="none" stroke-linecap="round"/>`; } return o; };
  s += dash('x') + dash('y');
  return s;
}

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="720" viewBox="0 0 1000 720">${defs()}${inner}</svg>`;

// ===== SCENE 1: unregulated equal roads — give way to the car on the RIGHT =====
function sceneGiveway() {
  let s = ground();
  s += tree(-5.3, 5.3) + tree(5.3, -5.3) + tree(-5.4, -5.0) + tree(5.0, 5.4);
  s += car(3.1, -0.78, 'x', 2.05, 1.08, 'red', 'W', null);   // from right (back)
  s += car(0.78, 3.1, 'y', 2.05, 1.08, 'blue', 'N', 'Ви');    // from bottom (front)
  // amber yield arc blue -> red path
  const [ax, ay] = iso(0.78, 1.7), [bx, by] = iso(1.9, -0.45);
  s += `<path d="M${ax.toFixed(1)},${ay.toFixed(1)} Q${(ax+46).toFixed(1)},${(ay-26).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}" fill="none" stroke="${C.amber}" stroke-width="5.5" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  s += `<polygon points="${bx.toFixed(1)},${by.toFixed(1)} ${(bx+14).toFixed(1)},${(by-2).toFixed(1)} ${(bx+5).toFixed(1)},${(by-15).toFixed(1)}" fill="${C.amber}"/>`;
  return svg(s);
}

// ===== SCENE 2: real 2.1 "Дати дорогу" sign — yield to priority-road car =====
function sceneSign() {
  let s = ground();
  s += tree(5.3, 5.3) + tree(-5.3, -5.3) + tree(-5.4, 5.0);
  s += car(-3.0, 0.78, 'x', 2.05, 1.08, 'white', 'E', null);  // priority car from left
  s += car(0.78, 3.4, 'y', 2.05, 1.08, 'blue', 'N', 'Ви');     // you, waiting
  s += realSign('2.1', 1.85, 2.5, 52);
  return svg(s);
}

// primitives reused by the question-image generation pipeline (scripts/gen-question-image.mjs)
export { iso, S, OX, OY, C, car, tree, ground, svg, realSign };

const out = (n, m) => sharp(Buffer.from(m)).png().toFile(`public/demo-images/${n}.png`).then(() => console.log('OK', n));
// only render the proof scenes when invoked directly (not when imported as a module)
if (process.argv[1]?.endsWith('iso-diagram.mjs')) {
  await out('proto_giveway', sceneGiveway());
  await out('proto_sign', sceneSign());
  console.log('DONE');
}
