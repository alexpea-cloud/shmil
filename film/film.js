/* SHMIL – Grunnlaget for søknaden (versjon 3)
 * Focus: the documentation work behind the application – gathered from the archives,
 * analysed, compiled into Vedlegg 1 and 2 – and the application that rests on it.
 * Light, calm editorial look; one idea per screen; long holds.
 * Every frame is a pure function of time t (seconds): FILM.renderAt(t).
 */
(function () {
'use strict';

/* ------------------------------------------------------------------ timing (music: 128 bpm, 8-bar phrases of 15 s from 4.8 s) */
const DUR = 204.7, FPS = 30;
const Q = k => 4.8 + 15 * k;   // phrase starts: 4.8, 19.8, 34.8, 49.8, 64.8, 79.8, 94.8, 109.8, 124.8, 139.8, 154.8, 169.8, 184.8, 199.8
const BAR = 1.875;
/* ------------------------------------------------------------------ math */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: x => x,
  io: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  io2: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  io5: x => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  o: x => 1 - Math.pow(1 - x, 3),
  o5: x => 1 - Math.pow(1 - x, 5),
  i: x => x * x * x,
  oback: x => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
const pr = (t, a, b, e = E.io) => e(clamp((t - a) / (b - a)));
const env = (t, a, b, fi = 0.5, fo = 0.5, ei = E.o, eo = E.io) =>
  Math.min(pr(t, a, a + fi, ei), 1 - pr(t, b - fo, b, eo));
function mixV(a, b, p) {
  if (typeof a === 'number') return lerp(a, b, p);
  const o = {};
  for (const k in a) o[k] = k in b ? lerp(a[k], b[k], p) : a[k];
  for (const k in b) if (!(k in a)) o[k] = b[k];
  return o;
}
function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
      return mixV(v0, v1, t1 > t0 ? (e || E.io)((t - t0) / (t1 - t0)) : 1);
    }
  }
  return keys[keys.length - 1][1];
}
const D = (y, m, d) => (Date.UTC(y, m - 1, Math.floor(d)) - Date.UTC(2025, 9, 1)) / 86400000 + (d % 1);
const nf = (v, dec = 0) => {
  const s = v.toFixed(dec).split('.');
  const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return s[1] ? i + ',' + s[1] : i;
};

/* ------------------------------------------------------------------ DOM helpers */
const $ = (tag, cls, parent, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};
const NS = 'http://www.w3.org/2000/svg';
const S = id => document.getElementById(id);
function show(el, o, tf) {
  if (o <= 0.002) { if (el.style.display !== 'none') el.style.display = 'none'; return false; }
  if (el.style.display === 'none') el.style.display = '';
  el.style.opacity = o >= 0.999 ? '1' : o.toFixed(4);
  if (tf !== undefined) el.style.transform = tf;
  return true;
}
// text with per-word reveal. *word* = green, ^word^ = blue, \n = line break
function txt(parent, cls, text, x, y, opt = {}) {
  const el = $('div', 'ov ' + cls, parent);
  el.style.top = y + 'px';
  if (opt.center) { el.style.left = '0px'; el.style.width = '1920px'; el.style.textAlign = 'center'; el.style.whiteSpace = 'normal'; }
  else el.style.left = x + 'px';
  if (opt.w) {
    el.style.width = opt.w + 'px'; el.style.whiteSpace = 'normal';
    if (opt.center) { el.style.left = (960 - opt.w / 2) + 'px'; }
  }
  if (opt.size) el.style.fontSize = opt.size + 'px';
  if (opt.color) el.style.color = opt.color;
  if (opt.align) el.style.textAlign = opt.align;
  const spans = [];
  text.split('\n').forEach((line, li) => {
    if (li) el.appendChild(document.createElement('br'));
    line.split(' ').forEach((wd, wi) => {
      if (wi) el.appendChild(document.createTextNode(' '));
      const w = $('span', 'w', el), i = $('span', 'wi', w);
      let m;
      if ((m = wd.match(/^\*(.+)\*$/))) { i.className += ' em'; wd = m[1]; }
      else if ((m = wd.match(/^\^(.+)\^$/))) { i.className += ' emb'; wd = m[1]; }
      i.textContent = wd;
      spans.push(i);
    });
  });
  el.style.display = 'none';
  return { el, spans };
}
function tshow(T, t, tin, tout, o = {}) {
  const st = o.st ?? 0.03, du = o.du ?? 0.75, fo = o.fo ?? 0.5, dy = o.dy ?? 70;
  if (t < tin - 0.001 || (tout != null && t > tout)) { show(T.el, 0); return; }
  const out = tout != null ? pr(t, tout - fo, tout, E.io) : 0;
  show(T.el, 1 - out, `translateY(${-(o.oy ?? 18) * out}px)`);
  for (let i = 0; i < T.spans.length; i++) {
    const p = pr(t, tin + i * st, tin + i * st + du, E.o5);
    const s = T.spans[i];
    s.style.transform = p >= 1 ? 'none' : `translateY(${(1 - p) * dy}%)`;
    s.style.opacity = p >= 1 ? '1' : Math.min(1, p * 1.6).toFixed(3);
  }
}
function fshow(el, t, tin, tout, o = {}) {
  const fi = o.fi ?? 0.7, fo = o.fo ?? 0.5;
  const a = env(t, tin, tout ?? 1e9, fi, fo, E.o5, E.io);
  const pin = pr(t, tin, tin + fi, E.o5), pout = tout != null ? pr(t, tout - fo, tout, E.io) : 0;
  const dx = (o.dx || 0) * (1 - pin), dy = (o.dy ?? 26) * (1 - pin) - (o.oy ?? 0) * pout;
  const sc = o.sc ? lerp(o.sc, 1, pin) : 1;
  show(el, a, `translate(${dx}px,${dy}px)${sc !== 1 ? ` scale(${sc})` : ''}`);
  return a;
}
const place = (el, x, y, w) => { el.style.left = x + 'px'; el.style.top = y + 'px'; if (w) el.style.width = w + 'px'; el.style.display = 'none'; return el; };

/* ------------------------------------------------------------------ pages */
const ASPECT = { brev: 841.92 / 595.32, svar: 841.9 / 595.3, sok: 841.92 / 595.32, v1: 792 / 612, v2: 841.92 / 595.2 };
const PW = 1000;
const pageName = (doc, n) => (doc === 'v2' ? `${doc}-${String(n).padStart(2, '0')}` : `${doc}-${n}`);
const IMGS = [];
class Page {
  constructor(world, doc, n, opt = {}) {
    this.doc = doc; this.n = n; this.w = PW; this.h = PW * ASPECT[doc];
    this.el = $('div', 'page', world);
    this.el.style.width = this.w + 'px'; this.el.style.height = this.h + 'px';
    const img = $('img', null, this.el);
    img.alt = '';
    img.src = `assets/pages/${opt.lo ? 'lo-' : ''}${pageName(doc, n)}.png`;
    IMGS.push(img);
    this.dimEl = $('div', 'dim', this.el);
    this.layer = $('div', null, this.el);
    this.layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    this.shadeEl = $('div', 'shade', this.el);
    this.st = { x: 0, y: 0, s: 1, r: 0, o: 1, shade: 0 };
    this.keys = null; this.rest = null;
  }
  set(st) {
    Object.assign(this.st, st);
    const { x, y, s, r, o, shade } = this.st;
    if (!show(this.el, o)) return;
    this.el.style.transform = `translate(${(x - this.w / 2).toFixed(2)}px,${(y - this.h / 2).toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    this.shadeEl.style.opacity = shade.toFixed(3);
  }
  pt(u, v, st = this.rest || this.st) {
    const s = st.s ?? 1, r = ((st.r ?? 0) * Math.PI) / 180;
    const dx = (u - 0.5) * this.w * s, dy = (v - 0.5) * this.h * s;
    return [st.x + dx * Math.cos(r) - dy * Math.sin(r), st.y + dx * Math.sin(r) + dy * Math.cos(r)];
  }
  hl(id, kind) {
    const d = window.HL[id];
    if (!d) throw new Error('missing highlight ' + id);
    const box = kind.startsWith('box'), und = kind.startsWith('u'), big = kind.startsWith('boxL');
    const px = big ? 34 : box ? 14 : und ? 2 : 6, py = big ? 28 : box ? 10 : und ? 0 : 3;
    const els = d.rects.map(r => {
      const e = $('div', 'hlr', this.layer);
      e.style.left = r[0] * this.w - px + 'px'; e.style.top = r[1] * this.h - py + 'px';
      e.style.width = r[2] * this.w + 2 * px + 'px'; e.style.height = r[3] * this.h + 2 * py + 'px';
      return { e, b: $('div', 'hlb ' + kind, e), w: r[2] };
    });
    if (box && els.length > 1) {
      // one box around all lines
      const [u0, v0, u1, v1] = bbox([id]);
      els.slice(1).forEach(x => x.e.remove());
      const x = els[0];
      x.e.style.left = u0 * this.w - px + 'px'; x.e.style.top = v0 * this.h - py + 'px';
      x.e.style.width = (u1 - u0) * this.w + 2 * px + 'px'; x.e.style.height = (v1 - v0) * this.h + 2 * py + 'px';
      els.length = 1;
    }
    const tot = els.reduce((a, x) => a + x.w, 0);
    return {
      id, page: this,
      set(p, alpha = 1) {
        let acc = 0;
        for (const x of els) {
          const a = acc / tot, b = (acc + x.w) / tot; acc += x.w;
          const q = box ? p : clamp((p - a) / Math.max(1e-6, b - a));
          if (box) { x.b.style.transform = `scale(${(1.12 - 0.12 * E.o(q)).toFixed(4)})`; x.b.style.opacity = (q * alpha).toFixed(3); }
          else { x.b.style.transform = `scaleX(${q.toFixed(4)})`; x.b.style.opacity = alpha.toFixed(3); }
        }
      },
    };
  }
  dim(ids, a, pad = 22) {
    if (a <= 0.002) { this.dimEl.style.opacity = '0'; return; }
    const [u0, v0, u1, v1] = bbox(ids);
    const x0 = u0 * this.w - pad, y0 = v0 * this.h - pad, x1 = u1 * this.w + pad, y1 = v1 * this.h + pad;
    this.dimEl.style.clipPath = `path(evenodd,'M0 0H${this.w}V${this.h}H0Z M${x0} ${y0}H${x1}V${y1}H${x0}Z')`;
    this.dimEl.style.opacity = a.toFixed(3);
  }
}
function bbox(ids) {
  let u0 = 1, v0 = 1, u1 = 0, v1 = 0;
  for (const id of ids) for (const r of window.HL[id].rects) {
    u0 = Math.min(u0, r[0]); v0 = Math.min(v0, r[1]); u1 = Math.max(u1, r[0] + r[2]); v1 = Math.max(v1, r[1] + r[3]);
  }
  return [u0, v0, u1, v1];
}

/* ------------------------------------------------------------------ camera */
function camTf(c) {
  let s = 'translate(960px,540px)';
  if (Math.abs(c.rx || 0) > 0.02) s += ` perspective(${c.pd || 1800}px) rotateX(${c.rx.toFixed(3)}deg)`;
  s += ` scale(${c.z.toFixed(5)}) translate(${(-c.cx).toFixed(2)}px,${(-c.cy).toFixed(2)}px)`;
  return s;
}
function toScreen(c, wx, wy) {
  let x = (wx - c.cx) * c.z, y = (wy - c.cy) * c.z;
  if (Math.abs(c.rx || 0) > 0.02) {
    const a = (c.rx * Math.PI) / 180, d = c.pd || 1800;
    const y2 = y * Math.cos(a), z2 = y * Math.sin(a), k = d / (d - z2);
    x *= k; y = y2 * k;
  }
  return [x + 960, y + 540];
}
function look(page, ids, z, sx = 960, sy = 540, st) {
  const [u0, v0, u1, v1] = bbox(ids);
  const [wx, wy] = page.pt((u0 + u1) / 2, (v0 + v1) / 2, st);
  return { cx: wx - (sx - 960) / z, cy: wy - (sy - 540) / z, z, rx: 0 };
}
function lookPage(page, z, sx = 960, sy = 540, rx = 0, st) {
  const [wx, wy] = page.pt(0.5, 0.5, st);
  return { cx: wx - (sx - 960) / z, cy: wy - (sy - 540) / z, z, rx };
}
function hlScreen(c, page, ids, st) {
  const [u0, v0, u1, v1] = bbox(ids);
  const a = toScreen(c, ...page.pt(u0, v0, st)), b = toScreen(c, ...page.pt(u1, v1, st));
  return { x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
}

/* ------------------------------------------------------------------ scene infrastructure */
const SCENES = [];
function mkScene(a, b, fi = 0.5, fo = 0.5) {
  const root = $('div', 'scene', S('scenes'));
  const world = $('div', 'world', root);
  const veil = $('div', 'veil', root);
  const ov = $('div', 'layer', root);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 1920); svg.setAttribute('height', 1080);
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
  root.appendChild(svg);
  const sc = { a, b, fi, fo, root, world, veil, ov, svg, pages: [], hls: [], upd: null, cam: null };
  SCENES.push(sc);
  return sc;
}
function camApply(sc, t, keys) {
  const c = K(t, keys);
  sc.world.style.transform = camTf(c);
  sc.cam = c;
  return c;
}
function veilSet(sc, a, blur = 7) {
  sc.veil.style.opacity = (0.94 * a).toFixed(3);
  sc.world.style.filter = a > 0.02 ? `blur(${(blur * a).toFixed(2)}px)` : 'none';
}
const pagesApply = (sc, t) => { for (const p of sc.pages) if (p.keys) p.set(K(t, p.keys)); };
const hlsApply = (sc, t) => { for (const h of sc.hls) h.h.set(pr(t, h.a, h.b, E.io2), h.out ? 1 - pr(t, h.out, h.out + 0.5) : 1); };
function H(sc, page, id, kind, a, b, out) { const h = page.hl(id, kind); sc.hls.push({ h, a, b, out }); return h; }
function svgPath(sc, color, w = 3, dash) {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', w);
  p.setAttribute('stroke-linecap', 'round');
  if (dash) p.setAttribute('stroke-dasharray', dash);
  sc.svg.appendChild(p);
  return p;
}

/* ------------------------------------------------------------------ extra page helper: white mask that "fills" a table row by row */
Page.prototype.mask = function (u0, v0, u1, v1) {
  const m = $('div', 'mask', null);
  this.el.insertBefore(m, this.dimEl);
  const self = this;
  return {
    set(vTop) {
      const top = Math.max(v0, vTop);
      if (top >= v1) { m.style.display = 'none'; return; }
      m.style.display = '';
      m.style.left = u0 * self.w + 'px'; m.style.width = (u1 - u0) * self.w + 'px';
      m.style.top = top * self.h + 'px'; m.style.height = (v1 - top) * self.h + 'px';
    },
  };
};
const div = (parent, css, cls) => { const e = $('div', cls || null, parent); e.style.cssText = 'position:absolute;' + css; return e; };
const lpan = sc => { const e = $('div', 'lpan', null); sc.root.insertBefore(e, sc.ov); e.style.opacity = '0'; return e; };

/* ------------------------------------------------------------------ build */
let OV, TLG;
function build() {
  OV = S('ov');
  TLG = S('tl').getContext('2d');
  makeGrain();
  sceneTitle();
  sceneSaksgang();
  sceneArkiv();
  scenePlukk();
  sceneModell();
  sceneVedlegg();
  sceneSoknad();
  sceneNytte();
  sceneBoks();
  scenePakke();
  buildFinal();
}
function makeGrain() {
  const c = S('grain'), g = c.getContext('2d');
  const id = g.createImageData(1920, 1080);
  let seed = 98765;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 200 + rnd() * 55;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}

/* ================================================================== 0:00 Tittel */
function sceneTitle() {
  const sc = mkScene(0, 12.7, 0.01, 0.8);
  [['v1', 1, -980, 60, -3], ['sok', 1, 0, 0, 0.6], ['v2', 1, 980, 40, 3]].forEach(([d, n, x, y, r]) => {
    const p = new Page(sc.world, d, n, { lo: true });
    p.keys = [[0, { x, y: y + 180, s: 1, r, o: 1, shade: 0 }], [4.5, { x, y, s: 1, r, o: 1, shade: 0 }, E.o], [12.7, { x, y: y - 70, s: 1, r, o: 1, shade: 0 }, E.lin]];
    sc.pages.push(p);
  });
  const camK = [[0, { cx: 0, cy: -1120, z: 0.3 }], [12.7, { cx: 0, cy: -1120, z: 0.315 }, E.lin]];
  const k = txt(sc.ov, 'k', 'SHMIL IKS · Søndre Helgeland Miljøverk', 0, 196, { center: true });
  const ti = txt(sc.ov, 'dt', 'Grunnlaget for søknaden', 0, 238, { center: true, size: 124 });
  const su = txt(sc.ov, 'sub', 'Hvordan SHMIL dokumenterte søknaden om unntak etter avfallsforskriften § 19-4', 0, 398, { center: true, w: 1400, size: 42 });
  sc.upd = t => {
    pagesApply(sc, t); camApply(sc, t, camK);
    tshow(k, t, 0.8, 12.0, { st: 0.012 });
    tshow(ti, t, 1.1, 12.1, { st: 0.11, du: 0.95 });
    tshow(su, t, 2.5, 12.1, { st: 0.035 });
  };
}

/* ================================================================== 0:12 Saksgangen (prolog) */
function sceneSaksgang() {
  const sc = mkScene(12.0, 35.3, 0.6, 0.5);
  const W = sc.world;
  const X = d => (d - D(2025, 11, 6)) * 20;
  div(W, 'left:-1400px;top:-2px;width:7000px;height:4px;border-radius:2px;background:#C3C8C4');
  const prog = div(W, 'left:0;top:-4px;height:8px;width:10px;border-radius:4px;background:#0E9C79');
  [[D(2025, 11, 1), 'NOV 2025'], [D(2025, 12, 1), 'DES'], [D(2026, 1, 1), 'JAN 2026'], [D(2026, 2, 1), 'FEB'], [D(2026, 3, 1), 'MAR'],
    [D(2026, 4, 1), 'APR'], [D(2026, 5, 1), 'MAI'], [D(2026, 6, 1), 'JUN']].forEach(([d, lab]) => {
    div(W, `left:${X(d) - 1}px;top:-12px;width:2px;height:24px;background:#AEB5B1`);
    const l = div(W, `left:${X(d) + 12}px;top:-46px;font:600 22px/1 var(--sans);letter-spacing:.14em;color:#8A9599;white-space:nowrap`);
    l.textContent = lab;
  });
  const ST = [
    { x: X(D(2025, 11, 6)), k: 'Statsforvalteren i Nordland', d: '6. november 2025', s: 'Tilsynsavvik – krav om henteordning for papp og papir og for glass- og metallemballasje', a: 13.6 },
    { x: X(D(2026, 1, 15)), k: 'SHMIL → Miljødirektoratet', d: '15. januar 2026', s: 'SHMIL ber om prinsipielle avklaringer', a: 19.9, doc: ['brev', 1], hl: ['brev_tittel', 'u-g'] },
    { x: X(D(2026, 5, 7)), k: 'Miljødirektoratet → SHMIL', d: '7. mai 2026', s: '§ 19-4 kan åpne for unntak – men det skal mye til', a: 26.0, doc: ['svar', 3], hl: ['svar_info', 'm-b'], kc: 'b' },
  ];
  ST.forEach(s => {
    s.dot = div(W, `left:${s.x - 15}px;top:-15px;width:30px;height:30px;border-radius:50%;background:#007B61;box-shadow:0 0 0 6px rgba(14,156,121,.18)`);
    s.K = txt(W, 'k' + (s.kc ? ' ' + s.kc : ''), s.k, s.x - 620, -318);
    s.D = txt(W, 'dt', s.d, s.x - 620, -278, { size: 96 });
    s.S = txt(W, 'sub', s.s, s.x - 620, 62, { w: 1160, size: 44 });
    if (s.doc) {
      const p = new Page(W, s.doc[0], s.doc[1], { lo: true });
      p.rest = { x: s.x + 560, y: -250, s: 0.32, r: 0.8 };
      p.keys = [[s.a - 0.6, { ...p.rest, y: p.rest.y + 60, o: 0, shade: 0 }], [s.a + 0.4, { ...p.rest, o: 1, shade: 0 }, E.o5]];
      sc.pages.push(p);
      H(sc, p, s.hl[0], s.hl[1], s.a + 1.6, s.a + 2.6);
    }
  });
  const q = txt(W, 'q2', '«Vi har ikke tilstrekkelig informasjon til å vurdere om det kan være aktuelt å gjøre noen unntak for deres eierkommuner.»', ST[2].x - 620, 196, { w: 1080, size: 38 });
  const camK = [
    [12.0, { cx: -760, cy: -40, z: 1 }], [14.0, { cx: 40, cy: -40, z: 1 }, E.io], [18.6, { cx: 110, cy: -40, z: 1 }, E.lin],
    [20.4, { cx: ST[1].x + 40, cy: -40, z: 1 }, E.io], [24.4, { cx: ST[1].x + 110, cy: -40, z: 1 }, E.lin],
    [26.6, { cx: ST[2].x + 40, cy: -40, z: 1 }, E.io], [35.3, { cx: ST[2].x + 160, cy: -40, z: 1 }, E.lin],
  ];
  const big = txt(sc.ov, 'dt', 'Grunnlaget manglet.', 0, 420, { center: true, size: 136 });
  const src = txt(sc.ov, 'src', 'Miljødirektoratets svar 07.05.2026, side 3', 0, 610, { center: true });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    prog.style.width = Math.max(0, Math.min(ST[2].x, c.cx)) * pr(t, 13.4, 14.0) + 'px';
    ST.forEach(s => {
      show(s.dot, pr(t, s.a - 0.3, s.a + 0.1), `scale(${E.oback(pr(t, s.a - 0.3, s.a + 0.3, E.lin))})`);
      tshow(s.K, t, s.a, 35.3, { st: 0.015 });
      tshow(s.D, t, s.a + 0.1, 35.3, { st: 0.08, du: 0.85 });
      tshow(s.S, t, s.a + 0.7, 35.3, { st: 0.03 });
    });
    tshow(q, t, 27.4, 35.3, { st: 0.03 });
    veilSet(sc, pr(t, 30.2, 30.9), 6);
    tshow(big, t, 30.6, 35.0, { st: 0.12, du: 0.9 });
    tshow(src, t, 31.4, 35.0, { st: 0.01 });
  };
}

/* ================================================================== 0:35 Hente inn – arkivet og saksmappen */
const SOURCES = [
  ['KOSTRA-rapportering 2025', 'Veide mengder og restavfall', 'KOSTRA'],
  ['Komtek kundesystem', 'Avtaler, beholdere og stoppunkter', 'Komtek'],
  ['Retura transportdata 2025', 'Returpunkter, tømminger og kjørte km', 'Retura'],
  ['SSB-statistikk', 'Befolkning og tettsteder', 'SSB'],
  ['Sirkel – mottaksdata 2025', 'Kvalitet på levert glass og metall', 'Sirkel'],
  ['Plukkanalyse – Iris Produksjon', 'Uavhengig analyse · desember 2025', 'Plukkanalyse'],
  ['Tekniska Verken – sorteringstest', 'Metall i ettersortering', 'Sorteringstest'],
  ['Konsekvensutredning kap. 10a', 'Miljødirektoratets kostnadsgrunnlag', 'Konsekvensutredning'],
];
function sceneArkiv() {
  const sc = mkScene(34.6, 65.3, 0.7, 0.6);
  const W = sc.world;
  const COLS = 16, ROWS = 12, SX = 420, SY = 310;
  const realAt = { '2,8': 0, '5,9': 1, '7,7': 2, '3,10': 3, '9,9': 4, '6,6': 5, '10,7': 6, '4,7': 7 };
  const tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const real = realAt[`${c},${r}`];
    const el = $('div', 'tile' + (real != null ? ' real' : ''), W);
    const x = (c - (COLS - 1) / 2) * SX, y = (r - (ROWS - 1) / 2) * SY;
    el.style.transform = `translate(${x - 180}px,${y - 125}px)`;
    const lens = real != null ? [210, 150] : [230, 180, 120];
    lens.forEach((w, i) => { const l = $('div', 'ln', el); l.style.top = 34 + i * 26 + 'px'; l.style.width = w + 'px'; });
    if (real != null) { const lb = $('div', 'lbl', el); lb.textContent = SOURCES[real][2]; }
    tiles.push({ el, x, y, real });
  }
  const camK = [[34.6, { cx: -300, cy: 420, z: 0.31, rx: 36 }], [65.3, { cx: -300, cy: -220, z: 0.37, rx: 31 }, E.lin]];
  const lp = lpan(sc);
  lp.style.background = 'radial-gradient(ellipse 980px 470px at 420px 250px,rgba(236,235,230,.97) 0%,rgba(236,235,230,.93) 55%,rgba(236,235,230,0) 100%)';
  const lp2 = lpan(sc);
  lp2.style.background = 'radial-gradient(ellipse 900px 300px at 520px 830px,rgba(236,235,230,.97) 0%,rgba(236,235,230,.92) 55%,rgba(236,235,230,0) 100%)';
  const ov = sc.ov;
  const k = txt(ov, 'k', 'Hente inn', 150, 112);
  const h = txt(ov, 'st', 'Svaret måtte finnes i arkivene', 150, 152, { w: 940 });
  const su = txt(ov, 'sub', 'Fagsystemer, prosjektmapper, driftsdata og eksterne rapporter', 150, 352, { w: 880, size: 38 });
  const foot = txt(ov, 'st2', 'Hentet fram og kontrollert mot originalkildene', 150, 760, { w: 900, size: 54 });
  const folder = $('div', 'folder', ov, '<div class="back"></div><div class="tab">Grunnlag for søknaden</div>');
  place(folder, 1150, 252, 720); folder.style.height = '790px';
  const slots = SOURCES.map((s, i) => ({ x: 1185, y: 286 + i * 88 }));
  const cards = SOURCES.map(s => {
    const e = $('div', 'fc', ov, `<div class="dot"></div><div class="nm">${s[0]}</div><div class="ty">${s[1]}</div>`);
    e.style.display = 'none';
    return e;
  });
  sc.upd = t => {
    const c = camApply(sc, t, camK);
    lp.style.opacity = pr(t, 35.0, 36.4).toFixed(3);
    lp2.style.opacity = pr(t, 56.8, 57.8).toFixed(3);
    veilSet(sc, 0.22 * pr(t, 40.5, 43.0), 1.5);
    tshow(k, t, 35.4, 64.9, { st: 0.02 });
    tshow(h, t, 35.5, 64.9, { st: 0.08, du: 0.9 });
    tshow(su, t, 36.9, 64.9, { st: 0.03 });
    tshow(foot, t, 57.6, 64.9, { st: 0.05 });
    fshow(folder, t, 40.8, 64.9, { dx: 180, dy: 0, fi: 1.2 });
    SOURCES.forEach((s, i) => {
      const tile = tiles.find(x => x.real === i);
      const tp = 42.3 + i * BAR;
      tile.el.style.opacity = (1 - pr(t, tp, tp + 0.4)).toFixed(3);
      const [ax, ay] = toScreen(c, tile.x - 180, tile.y - 125), [bx] = toScreen(c, tile.x + 180, tile.y - 125);
      const s0 = (bx - ax) / 650;
      const p = pr(t, tp, tp + 1.15, E.io);
      const x = lerp(ax, slots[i].x, p), y = lerp(ay, slots[i].y, p), sc2 = lerp(s0, 1, p);
      show(cards[i], pr(t, tp - 0.05, tp + 0.2), `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sc2.toFixed(4)})`);
    });
  };
}

/* ================================================================== 1:05 Analysere – plukkanalysen (Vedlegg 2) */
function scenePlukk() {
  const sc = mkScene(64.6, 80.3, 0.6, 0.6);
  const W = sc.world;
  const p13 = new Page(W, 'v2', 13), cov = new Page(W, 'v2', 1);
  sc.pages.push(p13, cov);
  cov.rest = { x: 0, y: 0, s: 1, r: -0.6 }; p13.rest = { x: 1150, y: -20, s: 1, r: 0.6 };
  cov.keys = [[64.6, { ...cov.rest, y: 1500, r: -5, o: 1, shade: 0 }], [66.3, { ...cov.rest, o: 1, shade: 0 }, E.o5]];
  p13.keys = [[64.8, { ...p13.rest, y: 1500, r: 5, o: 1, shade: 0 }], [66.6, { ...p13.rest, o: 1, shade: 0 }, E.o5]];
  H(sc, p13, 'v2_939_pie', 'box-g', 74.0, 74.5);
  const photo = cov.pt(0.39, 0.615), pie = p13.pt(0.61, 0.47);
  const camK = [
    [64.6, lookPage(cov, 0.62, 1350, 540)],
    [68.8, lookPage(cov, 0.65, 1350, 540), E.lin],
    [70.4, { cx: photo[0] - (1330 - 960) / 1.02, cy: photo[1] - (560 - 540) / 1.02, z: 1.02, rx: 0 }, E.io],
    [72.6, { cx: photo[0] - (1330 - 960) / 1.05, cy: photo[1] - (560 - 540) / 1.05, z: 1.05, rx: 0 }, E.lin],
    [74.0, { cx: pie[0] - (1330 - 960) / 1.05, cy: pie[1] - (560 - 540) / 1.05, z: 1.05, rx: 0 }, E.io],
    [80.3, { cx: pie[0] - (1330 - 960) / 1.12, cy: pie[1] - (560 - 540) / 1.12, z: 1.12, rx: 0 }, E.lin],
  ];
  const lp = lpan(sc);
  const ov = sc.ov;
  const k = txt(ov, 'k', 'Analysere · Vedlegg 2', 150, 248);
  const h = txt(ov, 'st', 'Uavhengig plukkanalyse', 150, 288, { w: 900 });
  const su = txt(ov, 'sub', 'Iris Produksjon · 9.–10. desember 2025', 150, 392, { size: 38 });
  const l122 = txt(ov, 'st2', 'ca. 122 kg glass- og metallemballasje sortert og veid', 150, 516, { w: 820, size: 54 });
  const num = div(ov, 'left:150px;top:478px;font:700 190px/1 var(--display);letter-spacing:-.025em;color:var(--ink);white-space:nowrap', 'ov');
  num.style.display = 'none';
  const lab = txt(ov, 'pl', 'riktig sortert glass- og metallemballasje', 150, 690, { w: 820, size: 42 });
  const tag = $('div', 'ov', ov, '<span class="stc m">Målt</span><span class="src" style="margin-left:16px">Plukkanalysen, Vedlegg 2</span>');
  place(tag, 150, 812);
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t); camApply(sc, t, camK);
    lp.style.opacity = pr(t, 64.8, 66.0).toFixed(3);
    tshow(k, t, 65.0, 80.0, { st: 0.02 });
    tshow(h, t, 65.1, 80.0, { st: 0.07 });
    tshow(su, t, 65.9, 80.0, { st: 0.03 });
    tshow(l122, t, 69.8, 73.4, { st: 0.04 });
    if (show(num, env(t, 73.8, 80.0, 0.5, 0.5), `translateY(${(1 - pr(t, 73.8, 74.5, E.o5)) * 30}px)`)) {
      num.textContent = nf(93.9 * pr(t, 73.9, 75.1, E.o5), 1) + ' %';
    }
    tshow(lab, t, 74.6, 80.0, { st: 0.03 });
    fshow(tag, t, 75.4, 80.0, { dy: 12 });
  };
}

/* ================================================================== 1:20 Analysere – beregningsmodellen */
function sceneModell() {
  const sc = mkScene(79.6, 110.3, 0.6, 0.6);
  const ov = sc.ov;
  const k = txt(ov, 'k', 'Analysere · beregningsmodell', 150, 112);
  const h1 = txt(ov, 'st', 'Hva ville henteordning i tettbygd strøk kreve?', 150, 150, { size: 66 });
  const h2 = txt(ov, 'st', 'Hver forutsetning kan etterprøves', 150, 150, { size: 66 });
  const N = [
    ['8 959', 'avtaler i tettbygd strøk', 'e', 'Estimat'],
    ['ca. 8 650', 'stoppesteder', 'e', 'Estimat'],
    ['ca. 56 000', 'tømmestopp i året – tømming hver 8. uke', 's', 'Modell'],
    ['225', 'kjøretøydager i året – 250 stopp per dag', 's', 'Modell'],
    ['2,99 mill. kr', 'rutedrift i året – ca. 13 300 kr per dag', 's', 'Modell'],
    ['0,40 mill. kr', 'i året for ca. 9 228 nye beholdere', 's', 'Modell'],
  ];
  const XS = [150, 720, 1290], YS = [292, 566];
  const TA = [81.7, 85.4, 89.2, 92.9, 96.7, 98.6];
  const nodes = N.map(([v, l, cls, st], i) => {
    const e = $('div', 'node', ov, `<span class="stc ${cls}">${st}</span><div class="v">${v}</div><div class="l">${l}</div>`);
    return place(e, XS[i % 3], YS[Math.floor(i / 3)]);
  });
  const ar = [];
  const mkArrow = d => { const p = svgPath(sc, '#0E9C79', 4); p.setAttribute('d', d); const len = p.getTotalLength ? 0 : 0; ar.push(p); return p; };
  const A = [
    `M650,394 L716,394`, `M1220,394 L1286,394`,
    `M1540,496 L1540,530 L400,530 L400,562`,
    `M650,668 L716,668`,
  ];
  A.forEach(mkArrow);
  const plus = div(ov, 'left:1228px;top:632px;font:600 54px/1 var(--display);color:var(--ink3)', 'ov'); plus.textContent = '+';
  const res = txt(ov, 'st', '= *3,39* *mill.* *kr* *i* *året*', 150, 818, { size: 76 });
  const rsrc = txt(ov, 'src', 'Modellert merkostnad ved henteordning i tettbygd strøk (Modell A) · søknaden kap. 2.2 og Vedlegg 1', 150, 908, { w: 1620 });
  const sens = txt(ov, 'pl', 'Testet fra 59 000 til 110 000 kr per ekstra tonn – det høye kostnadsnivået består gjennom hele spennet.', 150, 958, { w: 1620, size: 30 });
  sc.upd = t => {
    tshow(k, t, 80.0, 110.0, { st: 0.02 });
    tshow(h1, t, 80.1, 102.2, { st: 0.05 });
    tshow(h2, t, 102.6, 110.0, { st: 0.06 });
    nodes.forEach((e, i) => fshow(e, t, TA[i], 110.0, { dy: 30, fi: 0.8 }));
    const into = [1, 2, 3, 4];
    ar.forEach((p, i) => {
      const tt = TA[into[i]];
      const a = pr(t, tt - 0.7, tt - 0.1);
      p.style.display = a > 0 ? '' : 'none';
      p.style.opacity = (a * (1 - pr(t, 109.6, 110.2))).toFixed(3);
    });
    show(plus, env(t, TA[5], 110.0, 0.5, 0.5), 'none');
    tshow(res, t, 100.5, 110.0, { st: 0.08, du: 0.9 });
    tshow(rsrc, t, 101.4, 110.0, { st: 0.008 });
    tshow(sens, t, 104.4, 110.0, { st: 0.02 });
  };
}

/* ================================================================== 1:50 Sammenstille – Vedlegg 1, prinsippet, vedleggene */
function sceneVedlegg() {
  const sc = mkScene(109.6, 140.3, 0.6, 0.6);
  const W = sc.world;
  const v1 = [], v2 = [];
  for (let i = 4; i >= 1; i--) { v1[i] = new Page(W, 'v1', i, { lo: i > 1 }); sc.pages.push(v1[i]); }
  const V2N = [21, 17, 13, 5, 1];
  V2N.forEach(n => { const p = new Page(W, 'v2', n, { lo: true }); v2.push(p); sc.pages.push(p); });
  const L = { x: -700, y: 0 }, R = { x: 700, y: 0 };
  for (let i = 1; i <= 4; i++) {
    const kk = 4 - i;
    const solo = { x: i * 5, y: i * 4, s: 1, r: -0.3 + kk * 0.7, o: 1, shade: i === 1 ? 0 : 0.1 };
    const left = { ...solo, x: L.x + kk * 9, y: L.y + kk * 8 };
    v1[i].keys = [[109.6, { ...solo, y: solo.y + 80, o: 0 }], [110.6, solo, E.o5], [132.4, solo], [133.7, left, E.io]];
    v1[i].rest = solo;
  }
  v2.forEach((p, kq) => {
    const n = v2.length - 1 - kq;
    const st = { x: R.x + n * 9, y: R.y + n * 8, s: 1, r: 0.8 - n * 0.6, o: 1, shade: kq === v2.length - 1 ? 0 : 0.1 };
    p.keys = [[132.3 + kq * 0.05, { ...st, x: st.x + 1800, r: st.r + 6 }], [133.8 + kq * 0.05, st, E.o5]];
  });
  const p1 = v1[1];
  const mk = p1.mask(0.05, 0.392, 0.95, 0.9);
  H(sc, p1, 'v1_datastatus_hdr', 'box-g', 118.0, 118.5);
  H(sc, p1, 'v1_kilde_hdr', 'box-g', 118.5, 119.0);
  const camK = [
    [109.6, lookPage(p1, 0.8, 1400, 540)],
    [124.8, lookPage(p1, 0.85, 1420, 560), E.lin],
    [132.4, lookPage(p1, 0.85, 1420, 560)],
    [134.0, { cx: 0, cy: -100, z: 0.42, rx: 0 }, E.io],
    [140.3, { cx: 0, cy: -100, z: 0.435, rx: 0 }, E.lin],
  ];
  const lp = lpan(sc);
  const ov = sc.ov;
  const k1 = txt(ov, 'k', 'Sammenstille · Vedlegg 1', 150, 270);
  const h1 = txt(ov, 'st2', 'Hvert tall får kilde og datastatus', 150, 310, { w: 660, size: 64 });
  const LEG = [['m', 'Målt / registrert', 'hentet direkte fra kildesystem eller prøve'], ['a', 'Avledet', 'beregnet eller fordelt fra registrerte tall'],
    ['e', 'Estimat', 'bygger på ekstrapolering'], ['s', 'Modellscenario', 'bygger på uttrykkelige forutsetninger']];
  const leg = LEG.map(([c, n, d], i) => {
    const e = $('div', 'ov', ov, `<span class="stc ${c}" style="min-width:210px;text-align:center">${n}</span><span style="font:400 25px/1 var(--sans);color:var(--ink2);margin-left:18px">${d}</span>`);
    return place(e, 150, 548 + i * 72);
  });
  // prinsipp
  const k2 = txt(ov, 'k', 'Vedlegg 1 · prinsipp for bruk', 200, 268);
  const q1 = txt(ov, 'q', '«Ved motstrid mellom en bearbeidet tekst og originalkilden har originalkilden forrang.»', 200, 310, { w: 1520, size: 60 });
  const q2 = txt(ov, 'q2', '«Tall med status Estimat eller Modellscenario skal ikke omtales som målte resultater.»', 200, 500, { w: 1520, size: 46 });
  // vedleggene samlet
  const k3 = txt(ov, 'k', 'Vedlegg 1 · versjon 31.08.2026', 0, 92, { center: true });
  const q3 = txt(ov, 'q', '«Bygget fra auditerte originalkilder og SHMILs underliggende beregningsmodell.»', 0, 132, { center: true, w: 1640, size: 52 });
  const lab = (kk, nm, sm) => {
    const e = $('div', 'ov', ov, `<div class="k" style="margin-bottom:12px">${kk}</div><div style="font:600 34px/1.2 var(--display);color:var(--ink)">${nm}</div><div class="src" style="margin-top:6px">${sm}</div>`);
    e.style.width = '640px'; e.style.textAlign = 'center'; e.style.whiteSpace = 'normal'; e.style.display = 'none';
    return e;
  };
  const LB = [[lab('Vedlegg 1', 'Nøkkeltall, kilder og datastatus', '4 sider'), L], [lab('Vedlegg 2', 'Plukkanalyse SHMIL 2025', 'Gjennomført 9.–10. desember 2025 · 21 sider'), R]];
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    mk.set(lerp(0.392, 0.905, pr(t, 110.8, 117.4, E.lin)));
    lp.style.opacity = env(t, 109.8, 124.9, 1.0, 0.6).toFixed(3);
    veilSet(sc, env(t, 124.6, 132.6, 0.7, 0.6));
    tshow(k1, t, 110.2, 124.7, { st: 0.02 });
    tshow(h1, t, 110.3, 124.7, { st: 0.07 });
    leg.forEach((e, i) => fshow(e, t, 117.4 + i * 0.6, 124.7, { dx: -24, dy: 0 }));
    tshow(k2, t, 125.1, 132.2, { st: 0.02 });
    tshow(q1, t, 125.2, 132.2, { st: 0.05 });
    tshow(q2, t, 127.4, 132.2, { st: 0.04 });
    tshow(k3, t, 133.6, 140.0, { st: 0.015 });
    tshow(q3, t, 133.8, 140.0, { st: 0.05 });
    LB.forEach(([e, pos], i) => {
      const [x, y] = toScreen(c, pos.x, pos.y + 707);
      e.style.left = x - 320 + 'px'; e.style.top = y + 26 + 'px';
      fshow(e, t, 134.6 + i * 0.4, 140.0, { dy: 16 });
    });
  };
}

/* ================================================================== 2:20 Søknaden bygger på grunnlaget */
function sceneSoknad() {
  const sc = mkScene(139.6, 155.3, 0.5, 0.6);
  const W = sc.world;
  const L = { x: -700, y: 0 }, R = { x: 700, y: 0 };
  const stack = (doc, ns, base, rot) => ns.forEach((n, k) => {
    const nn = ns.length - 1 - k;
    const p = new Page(W, doc, n, { lo: true });
    p.set({ x: base.x + nn * 9, y: base.y + nn * 8, s: 1, r: rot - nn * 0.6, o: 1, shade: nn === 0 ? 0 : 0.1 });
    sc.pages.push(p);
  });
  stack('v1', [4, 3, 2, 1], L, -0.3);
  stack('v2', [21, 17, 13, 5, 1], R, 0.8);
  const sk = [];
  for (let i = 6; i >= 1; i--) {
    const p = new Page(W, 'sok', i, { lo: i > 1 });
    const st = { x: i * 7, y: -40 + i * 6, s: 1, r: -0.4 + (i - 1) * 0.5, o: 1, shade: i === 1 ? 0 : 0.12 };
    p.keys = [[139.9 + (6 - i) * 0.03, { ...st, y: st.y - 1700, r: st.r - 5 }], [141.5 + (6 - i) * 0.03, st, E.o5]];
    p.rest = st; sk[i] = p; sc.pages.push(p);
  }
  const s1 = sk[1];
  H(sc, s1, 'sok_grunnlaget', 'm-g', 143.7, 145.0);
  const camK = [
    [139.6, { cx: 0, cy: -100, z: 0.435, rx: 0 }],
    [141.8, { cx: 0, cy: -100, z: 0.45, rx: 0 }, E.lin],
    [143.5, look(s1, ['sok_grunnlaget'], 1.4, 960, 560), E.io],
    [155.3, look(s1, ['sok_grunnlaget'], 1.46, 960, 560), E.lin],
  ];
  const ov = sc.ov;
  const k0 = txt(ov, 'k', '31. august 2026', 0, 88, { center: true });
  const h0 = txt(ov, 'st2', 'Søknaden legges på grunnlaget', 0, 128, { center: true, size: 58 });
  const k = txt(ov, 'k', 'Søknaden, side 1', 200, 196);
  const q = txt(ov, 'q', '«Denne søknaden gir det manglende grunnlaget:»', 200, 238, { w: 1520, size: 62 });
  const ROWS = [['fysisk veide mengder', 'KOSTRA-rapporteringen 2025'], ['en uavhengig plukkanalyse', 'Iris Produksjon · Vedlegg 2'],
    ['faktiske driftsdata', 'Komtek og Retura'], ['dokumenterte produksjons- og kostnadsforutsetninger', 'Beregningsmodellen · Vedlegg 1']];
  const rows = ROWS.map(([a, b], i) => {
    const e = $('div', 'ov', ov, `<div style="position:absolute;left:0;top:0;width:1520px;height:1px;background:rgba(27,35,38,.14)"></div>` +
      `<div style="position:absolute;left:0;top:22px;width:900px;white-space:normal;font:600 42px/1.18 var(--display);color:var(--ink)">${a}</div>` +
      `<div style="position:absolute;left:960px;top:26px;font:600 38px/1 var(--display);color:#0E9C79">→</div>` +
      `<div style="position:absolute;left:1030px;top:30px;width:520px;white-space:normal;font:500 32px/1.25 var(--sans);color:var(--green)">${b}</div>`);
    return place(e, 200, 354 + i * 118);
  });
  const tie = txt(ov, 'src', 'Svaret på direktoratets «ikke tilstrekkelig informasjon» fra mai 2026', 200, 900, { size: 27 });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t); camApply(sc, t, camK);
    veilSet(sc, pr(t, 145.3, 145.9), 8);
    tshow(k0, t, 140.0, 143.3, { st: 0.02 });
    tshow(h0, t, 140.1, 143.3, { st: 0.05 });
    tshow(k, t, 145.7, 155.0, { st: 0.02 });
    tshow(q, t, 145.8, 155.0, { st: 0.06 });
    rows.forEach((e, i) => fshow(e, t, 147.0 + i * 0.95, 155.0, { dx: -30, dy: 0 }));
    tshow(tie, t, 151.4, 155.0, { st: 0.02 });
  };
}

/* ================================================================== 2:35 Nytte og belastning */
function sceneNytte() {
  const sc = mkScene(154.6, 162.8, 0.5, 0.5);
  const ov = sc.ov;
  const k = txt(ov, 'k', 'Nytte og belastning', 200, 222);
  const h = txt(ov, 'st', 'Ni av ti kilo samles allerede inn i dag.', 200, 262, { w: 1560 });
  const BX = 200, BY = 420, BW = 1520, BH = 92, f1 = 375.5 / 421.2;
  const b1 = div(ov, `left:${BX}px;top:${BY}px;height:${BH}px;width:${BW * f1}px;background:#007B61;border-radius:10px 0 0 10px;transform-origin:0 50%`);
  const b1t = div(ov, `left:${BX + 30}px;top:${BY + 27}px;font:600 36px/1 var(--display);color:#fff;white-space:nowrap`); b1t.textContent = '375,5 tonn samles inn i dag';
  const b2 = div(ov, `left:${BX + BW * f1 + 6}px;top:${BY}px;height:${BH - 6}px;width:${BW * (1 - f1) - 12}px;border:3px dashed #2A7FA6;border-radius:0 10px 10px 0;background:repeating-linear-gradient(135deg,rgba(42,127,166,.16) 0 10px,rgba(42,127,166,.04) 10px 20px);transform-origin:0 50%`);
  const b2t = div(ov, `left:${BX + BW - 420}px;top:${BY + BH + 18}px;width:420px;text-align:right;font:700 40px/1 var(--display);color:#2A7FA6;white-space:nowrap`); b2t.textContent = '+ 45,7 tonn modellert';
  [b1, b1t, b2, b2t].forEach(e => (e.style.display = 'none'));
  const h2 = txt(ov, 'st2', 'Den siste tidelen ville kreve ca. 56 000 tømmestopp i året – med ny tungtrafikk i boliggatene.', 200, 640, { w: 1520, size: 56 });
  const src = txt(ov, 'src', 'Søknaden kap. 2 og 5.2 · Meruttaket er et modellscenario (50 % fangst), ikke en målt effekt.', 200, 830, { w: 1520 });
  sc.upd = t => {
    tshow(k, t, 155.0, 162.5, { st: 0.02 });
    tshow(h, t, 155.1, 162.5, { st: 0.07 });
    const ga = env(t, 155.8, 162.5, 0.3, 0.5);
    show(b1, ga, `scaleX(${pr(t, 155.8, 156.9, E.io)})`);
    show(b1t, ga * pr(t, 156.6, 157.1), 'none');
    show(b2, ga * pr(t, 156.9, 157.2), `scaleX(${pr(t, 156.9, 157.5, E.o5)})`);
    show(b2t, ga * pr(t, 157.3, 157.8), 'none');
    tshow(h2, t, 157.9, 162.5, { st: 0.035 });
    tshow(src, t, 159.0, 162.5, { st: 0.008 });
  };
}

/* ================================================================== 2:42 Hovedfokus – boksen på side 1 */
function sceneBoks() {
  const sc = mkScene(162.1, 185.2, 0.5, 0.6);
  const p1 = new Page(sc.world, 'sok', 1);
  sc.pages.push(p1);
  p1.rest = { x: 0, y: 0, s: 1, r: 0 };
  p1.keys = [[162.1, { x: 0, y: 80, s: 0.98, r: 0, o: 0, shade: 0 }], [162.9, { x: 0, y: 0, s: 1, r: 0, o: 1, shade: 0 }, E.o5]];
  H(sc, p1, 'sok_box', 'box-g', 163.9, 164.3);
  const camK = [
    [162.1, lookPage(p1, 0.58, 960, 540)],
    [164.3, look(p1, ['sok_box'], 1.95, 960, 540), E.io],
    [165.6, look(p1, ['sok_box'], 2.0, 960, 540), E.lin],
  ];
  const ov = sc.ov;
  const k1 = txt(ov, 'k', 'Søknaden, side 1 – konklusjonen', 200, 150);
  const st = txt(ov, 'st', 'Omlegging til henteordning koster *74 286 kroner* per ekstra tonn', 200, 190, { w: 1520, size: 74 });
  const BX = 200, BW = 1520;
  const l1 = txt(ov, 'pl', 'Miljødirektoratets eget anslag da kravet ble innført', BX, 424, { size: 32 });
  const r1 = div(ov, `left:${BX}px;top:470px;height:52px;width:${BW / 41}px;background:#78848A;border-radius:6px;transform-origin:0 50%`);
  const v1 = div(ov, `left:${BX + BW / 41 + 18}px;top:478px;font:600 36px/1 var(--display);color:var(--ink2);white-space:nowrap`); v1.textContent = 'ca. 1 810 kr';
  const l2 = txt(ov, 'pl', 'SHMILs pliktområde', BX, 552, { size: 32 });
  const r2 = div(ov, `left:${BX}px;top:598px;height:52px;width:${BW}px;background:#007B61;border-radius:6px;transform-origin:0 50%`);
  const v2 = div(ov, `left:${BX + BW - 260}px;top:606px;width:236px;text-align:right;font:600 36px/1 var(--display);color:#fff;white-space:nowrap`); v2.textContent = '74 286 kr';
  [r1, v1, r2, v2].forEach(e => (e.style.display = 'none'));
  const x40 = txt(ov, 'dt', '*over* *40* *ganger*', BX, 694, { size: 124 });
  const x40s = txt(ov, 'pl', 'det direktoratet selv la til grunn i sine beregninger', BX, 836, { size: 40 });
  const foot = txt(ov, 'foot', 'Konsekvensutredningen (M-2021) la til grunn ca. 1 475 kr per ekstra tonn i 2020-priser, ca. 1 810 kr i 2025-priser. Tallene har ikke fullt ut samme systemgrense og sammenlignes som størrelsesorden (søknaden kap. 3.1).', BX, 960, { w: 1520 });
  const k3 = txt(ov, 'k', 'Dette tilsvarer', 0, 330, { center: true });
  const num = div(ov, 'left:0;top:376px;width:1920px;text-align:center', 'ov num'); num.style.display = 'none';
  const pl3 = txt(ov, 'pl', 'i året – en økning i renovasjonsgebyret på 3–4 %', 0, 594, { center: true, size: 50 });
  const src3 = txt(ov, 'src', 'Søknaden, side 1 · modellert merkostnad ved henteordning i tettbygd strøk', 0, 700, { center: true });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t); camApply(sc, t, camK);
    p1.dim(['sok_box'], 0.85 * env(t, 163.6, 165.6, 0.5, 0.4), 40);
    veilSet(sc, pr(t, 165.0, 165.6), 9);
    tshow(k1, t, 165.2, 177.0, { st: 0.015 });
    tshow(st, t, 165.3, 177.0, { st: 0.06 });
    const ba = env(t, 166.4, 177.0, 0.4, 0.5);
    tshow(l1, t, 166.4, 177.0, { st: 0.02 });
    show(r1, ba, `scaleX(${pr(t, 166.6, 167.0, E.o5)})`);
    show(v1, ba * pr(t, 166.9, 167.3), 'none');
    tshow(l2, t, 167.0, 177.0, { st: 0.02 });
    show(r2, ba * pr(t, 167.5, 167.7), `scaleX(${pr(t, 167.6, 169.6, E.io)})`);
    show(v2, ba * pr(t, 169.3, 169.7), 'none');
    tshow(x40, t, Q(11) + 0.05, 177.0, { st: 0.1, du: 0.9 });
    tshow(x40s, t, 170.7, 177.0, { st: 0.03 });
    tshow(foot, t, 171.4, 177.0, { st: 0.004 });
    tshow(k3, t, 177.3, 184.9, { st: 0.02 });
    const na = env(t, 177.4, 184.9, 0.5, 0.5);
    if (show(num, na, `translateY(${(1 - pr(t, 177.4, 178.1, E.o5)) * 30}px)`)) {
      num.innerHTML = nf(3.39 * pr(t, 177.5, 178.7, E.o5), 2) + '<span style="font-size:120px;letter-spacing:-.01em"> mill. kr</span>';
    }
    tshow(pl3, t, 178.4, 184.9, { st: 0.04 });
    tshow(src3, t, 179.2, 184.9, { st: 0.01 });
  };
}

/* ================================================================== 3:05 Oversendt */
function scenePakke() {
  const sc = mkScene(184.6, 191.7, 0.6, 0.6);
  const W = sc.world;
  const groups = [
    { docs: [['sok', 4], ['sok', 3], ['sok', 2], ['sok', 1]], x: -1150 },
    { docs: [['v1', 3], ['v1', 2], ['v1', 1]], x: 0 },
    { docs: [['v2', 17], ['v2', 13], ['v2', 5], ['v2', 2], ['v2', 1]], x: 1150 },
  ];
  [2, 1, 0].forEach(gi => {
    const g = groups[gi];
    g.docs.forEach(([d, n], k) => {
      const p = new Page(W, d, n, { lo: true });
      const nn = g.docs.length - 1 - k;
      const st = { x: g.x + nn * 8, y: nn * 7, s: 1, r: (nn - 1) * 0.6 - 0.4, o: 1, shade: nn === 0 ? 0 : 0.1 };
      const merged = { ...st, x: (2 - gi) * 26 + nn * 6, y: (2 - gi) * 22 + nn * 5 - 40 };
      const sent = { ...merged, x: merged.x + 2400, y: merged.y - 500, s: 0.6, r: merged.r + 6, o: 0 };
      p.keys = [[184.7 + gi * 0.2, { ...st, y: st.y + 1500, r: st.r + 5 }], [186.0 + gi * 0.2, st, E.o5],
        [186.4 + (2 - gi) * 0.12, st], [187.5 + (2 - gi) * 0.12, merged, E.io], [188.0, merged], [189.8, sent, E.i]];
      sc.pages.push(p);
    });
  });
  const camK = [[184.6, { cx: 0, cy: 60, z: 0.36, rx: 0 }], [187.5, { cx: 0, cy: 60, z: 0.38, rx: 0 }, E.lin], [191.7, { cx: 300, cy: 120, z: 0.4, rx: 0 }, E.io]];
  const k = txt(sc.ov, 'k', '31. august 2026', 0, 812, { center: true });
  const h = txt(sc.ov, 'st', 'Oversendt Miljødirektoratet', 0, 852, { center: true });
  sc.upd = t => {
    pagesApply(sc, t); camApply(sc, t, camK);
    tshow(k, t, 186.6, 191.3, { st: 0.02 });
    tshow(h, t, 186.7, 191.3, { st: 0.07 });
  };
}

/* ================================================================== 3:11 Avslutning */
const X0 = 200, DSTART = D(2025, 10, 25), PPD = 4.19;
const XD = d => X0 + (d - DSTART) * PPD;
const STN = [
  { d: D(2025, 11, 6), lab: 'Tilsyn', date: '06.11.2025' },
  { d: D(2026, 1, 15), lab: 'Henvendelse', date: '15.01.2026' },
  { d: D(2026, 5, 7), lab: 'Svar', date: '07.05.2026' },
  { a: D(2026, 6, 1), b: D(2026, 8, 31), lab: 'Dokumentasjon', date: 'Sommeren 2026', band: true },
  { d: D(2026, 8, 31), lab: 'Søknad', date: '31.08.2026' },
  { x: 1740, lab: 'Vedtak', date: 'venter på svar', open: true },
];
function drawLine(t, A, Y) {
  const g = TLG;
  if (A <= 0.002) return;
  const cur = D(2026, 8, 31);
  g.save();
  g.globalAlpha = A;
  const xEnd = XD(cur);
  g.lineCap = 'round';
  g.strokeStyle = '#BFC5C1'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(X0 - 40, Y); g.lineTo(xEnd, Y); g.stroke();
  g.setLineDash([10, 12]); g.beginPath(); g.moveTo(xEnd, Y); g.lineTo(1740, Y); g.stroke(); g.setLineDash([]);
  g.font = '500 21px FM, "JetBrains Mono", monospace'; g.fillStyle = '#8A9599'; g.textAlign = 'center'; g.textBaseline = 'bottom';
  for (const [d, lab] of [[D(2025, 11, 1), '2025'], [D(2026, 1, 1), '2026']]) { const x = XD(d); g.fillRect(x - 1, Y - 16, 2, 10); g.fillText(lab, x, Y - 22); }
  const band = STN[3];
  g.fillStyle = 'rgba(14,156,121,.22)';
  g.beginPath(); g.roundRect(XD(band.a), Y - 11, XD(band.b) - XD(band.a), 22, 11); g.fill();
  g.strokeStyle = '#0E9C79'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(XD(STN[0].d), Y); g.lineTo(xEnd, Y); g.stroke();
  STN.forEach(s => {
    const x = s.band ? (XD(s.a) + XD(s.b)) / 2 : s.open ? s.x : XD(s.d);
    if (!s.band) {
      g.beginPath(); g.arc(x, Y, 12, 0, Math.PI * 2);
      if (!s.open) { g.fillStyle = '#007B61'; g.fill(); }
      else { g.fillStyle = '#ECEBE6'; g.fill(); g.strokeStyle = '#0E9C79'; g.lineWidth = 3; g.stroke(); }
    }
    if (s.open && t > 192.6) {
      const ph = ((t - 192.6) % 1.875) / 1.875;
      g.strokeStyle = `rgba(14,156,121,${(1 - ph) * 0.75})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, Y, 12 + ph * 34, 0, Math.PI * 2); g.stroke();
    }
    const lx = x + (s.band ? -22 : s.lab === 'Søknad' ? 16 : 0);
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.font = '600 30px FS, Inter, system-ui, sans-serif'; g.fillStyle = s.open ? '#0B7A60' : '#1B2326';
    g.fillText(s.lab, lx, Y + 34);
    g.font = '500 22px FM, "JetBrains Mono", monospace'; g.fillStyle = '#78848A';
    g.fillText(s.date, lx, Y + 74);
  });
  g.restore();
}
let FIN;
const FIN_A = 191.0;
function buildFinal() {
  const h = txt(OV, 'st', 'SHMIL søker om tidsbegrenset\nunntak etter § 19-4', 0, 112, { center: true, size: 80 });
  const s = txt(OV, 'sub', 'Glass- og metallemballasje – frem til 31.12.2030', 0, 314, { center: true, size: 44 });
  const f = txt(OV, 'src', 'Papp og papir: SHMIL innfører egen fiberdunk – uavhengig av søknaden.', 0, 384, { center: true, size: 27 });
  const w = txt(OV, 'st', '*Vi* *venter* *fortsatt* *på* *svar.*', 0, 790, { center: true, size: 74 });
  const logo = $('img', 'ov', OV); logo.src = 'assets/shmil-logo-green.png'; logo.alt = 'SHMIL';
  logo.style.cssText += ';left:893px;top:960px;height:50px;display:none';
  IMGS.push(logo);
  FIN = t => {
    tshow(h, t, FIN_A + 0.2, 205, { st: 0.08, du: 0.9 });
    tshow(s, t, FIN_A + 1.1, 205, { st: 0.04 });
    tshow(f, t, FIN_A + 2.0, 205, { st: 0.015 });
    tshow(w, t, 195.0, 205, { st: 0.12, du: 0.9 });
    fshow(logo, t, 197.4, null, { dy: 10, fi: 1.0 });
  };
}

/* ================================================================== render */
function renderAt(t) {
  t = clamp(t, 0, DUR);
  TLG.clearRect(0, 0, 1920, 1080);
  drawLine(t, pr(t, FIN_A + 0.6, FIN_A + 1.6) * (1 - pr(t, 202.6, 204.4)), 610);
  for (const sc of SCENES) {
    const on = t >= sc.a && t <= sc.b;
    if (!on) { if (sc.root.style.display !== 'none') sc.root.style.display = 'none'; continue; }
    sc.root.style.display = 'block';
    sc.root.style.opacity = env(t, sc.a, sc.b, sc.fi, sc.fo, E.o, E.io).toFixed(3);
    sc.upd(t);
  }
  FIN(t);
  S('black').style.opacity = Math.max(1 - pr(t, 0, 1.2, E.o), pr(t, 202.6, 204.6, E.io2)).toFixed(3);
}

async function ready() {
  await document.fonts.ready;
  await Promise.all(['400 20px FS', '500 20px FS', '600 20px FS', '700 20px FS', '500 20px FD', '600 20px FD', '700 20px FD', '500 20px FM']
    .map(f => document.fonts.load(f, 'ÆØÅæøå§–«»→').catch(() => {})));
  await Promise.all(IMGS.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
  await Promise.all(IMGS.map(i => (i.decode ? i.decode().catch(() => {}) : 0)));
  return true;
}

/* ------------------------------------------------------------------ preview UI */
const POSTER = 4.0;
function fitStage() {
  const st = S('stage');
  if (document.body.classList.contains('render')) { st.style.transform = 'none'; return; }
  const ui = S('ui'), uh = ui ? ui.offsetHeight : 0;
  const sc = Math.min(window.innerWidth / 1920, (window.innerHeight - uh) / 1080);
  st.style.transform = `translate(${(window.innerWidth - 1920 * sc) / 2}px,${Math.max(0, (window.innerHeight - uh - 1080 * sc) / 2)}px) scale(${sc})`;
}
function preview() {
  const au = S('audio'), btn = S('play'), sc = S('scrub'), tm = S('time'), fs = S('fs');
  const fmt = x => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  let scrubbing = false, started = false;
  btn.onclick = () => {
    if (au.paused) {
      started = true;
      const p = au.play(); if (p && p.catch) p.catch(() => {});
      btn.textContent = '❚❚ Pause';
    } else { au.pause(); btn.textContent = '▶ Spill av'; }
  };
  sc.oninput = () => { scrubbing = true; started = true; au.currentTime = +sc.value; renderAt(+sc.value); };
  sc.onchange = () => { scrubbing = false; };
  au.onended = () => { btn.textContent = '▶ Spill av'; };
  fs.onclick = () => {
    const el = document.documentElement;
    try { if (!document.fullscreenElement) { const r = el.requestFullscreen && el.requestFullscreen(); if (r && r.catch) r.catch(() => {}); } else document.exitFullscreen(); } catch (e) { /* not available */ }
  };
  document.addEventListener('fullscreenchange', fitStage);
  const loop = () => {
    const t = au.currentTime;
    if (!scrubbing) { renderAt(started ? t : POSTER); sc.value = t; }
    tm.textContent = `${fmt(t)} / ${fmt(DUR)}`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const isRender = /render/.test(location.search);
if (isRender) document.body.classList.add('render');
build();
fitStage();
window.addEventListener('resize', fitStage);
window.FILM = { renderAt, ready, DUR, FPS };
ready().then(() => {
  const m = location.search.match(/t=([\d.]+)/);
  renderAt(m ? +m[1] : isRender ? 0 : POSTER);
  window.FILM_READY = true;
  if (!isRender) preview();
});
})();
