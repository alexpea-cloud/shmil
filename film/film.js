/* SHMIL – Grunnlaget for søknaden (versjon 3.1)
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
  sceneTilsyn();
  sceneJanuar();
  sceneMai();
  sceneDokumenter();
  sceneModell();
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

/* ================================================================== 0:12 Tilsynet */
function sceneTilsyn() {
  const sc = mkScene(12.0, 20.7, 0.6, 0.6);
  const W = sc.world;
  const X = d => (d - D(2025, 11, 6)) * 20;
  div(W, 'left:-1400px;top:-2px;width:5200px;height:4px;border-radius:2px;background:#C3C8C4');
  const prog = div(W, 'left:0;top:-4px;height:8px;width:10px;border-radius:4px;background:#0E9C79');
  [[D(2025, 11, 1), 'NOV 2025'], [D(2025, 12, 1), 'DES'], [D(2026, 1, 1), 'JAN 2026'], [D(2026, 2, 1), 'FEB']].forEach(([d, lab]) => {
    div(W, `left:${X(d) - 1}px;top:-12px;width:2px;height:24px;background:#AEB5B1`);
    const l = div(W, `left:${X(d) + 12}px;top:-46px;font:600 22px/1 var(--sans);letter-spacing:.14em;color:#8A9599;white-space:nowrap`);
    l.textContent = lab;
  });
  const dot = div(W, 'left:-15px;top:-15px;width:30px;height:30px;border-radius:50%;background:#007B61;box-shadow:0 0 0 6px rgba(14,156,121,.18)');
  const K1 = txt(W, 'k', 'Statsforvalteren i Nordland', -620, -318);
  const D1 = txt(W, 'dt', '6. november 2025', -620, -278, { size: 96 });
  const S1 = txt(W, 'sub', 'Tilsynsavvik – krav om henteordning for papp og papir og for glass- og metallemballasje', -620, 62, { w: 1160, size: 44 });
  const camK = [[12.0, { cx: -760, cy: -40, z: 1 }], [14.0, { cx: 40, cy: -40, z: 1 }, E.io], [20.7, { cx: 180, cy: -40, z: 1 }, E.lin]];
  sc.upd = t => {
    const c = camApply(sc, t, camK);
    prog.style.width = Math.max(0, c.cx + 900) * pr(t, 13.4, 14.2) + 'px';
    show(dot, pr(t, 13.3, 13.7), `scale(${E.oback(pr(t, 13.3, 13.9, E.lin))})`);
    tshow(K1, t, 13.6, 20.5, { st: 0.015 });
    tshow(D1, t, 13.7, 20.5, { st: 0.08, du: 0.85 });
    tshow(S1, t, 14.3, 20.5, { st: 0.03 });
  };
}

/* shared: a "lifted" quote layout over a veiled document -------------------- */
function liftBlock(ov, o) {
  const B = {};
  if (o.ask) B.ask = txt(ov, 'src', o.ask, 200, o.askY ?? 196, { w: 1520, size: 30 });
  B.k = txt(ov, 'k' + (o.kc ? ' ' + o.kc : ''), o.k, 200, o.kY ?? 250);
  B.q = txt(ov, 'q', o.q, 200, (o.kY ?? 250) + 42, { w: 1520, size: o.size ?? 54 });
  if (o.q2) B.q2 = txt(ov, 'q2', o.q2, 200, o.q2Y, { w: 1520, size: 44 });
  B.src = txt(ov, 'src', o.src, 200, o.srcY ?? 660, { w: 1520 });
  B.show = (t, a, b) => {
    if (B.ask) tshow(B.ask, t, a, b, { st: 0.008 });
    tshow(B.k, t, a + 0.1, b, { st: 0.02 });
    tshow(B.q, t, a + 0.2, b, { st: 0.035 });
    if (B.q2) tshow(B.q2, t, a + 1.6, b, { st: 0.03 });
    tshow(B.src, t, a + 1.2, b, { st: 0.01 });
  };
  return B;
}
// camera path that leaves one close-up, rises a little, and lands on the next
function flyKeys(keys, tA, camA, tB, camB, zMid = 0.5) {
  const tm = (tA + tB) / 2;
  keys.push([tA, camA], [tm, { cx: (camA.cx + camB.cx) / 2, cy: (camA.cy + camB.cy) / 2, z: zMid, rx: 0 }, E.io2], [tB, camB, E.io2]);
}

/* ================================================================== 0:20 Januar – SHMILs spørsmål */
function sceneJanuar() {
  const sc = mkScene(19.6, 50.5, 0.6, 0.5);
  const W = sc.world, GAP = 1120, pg = [];
  for (let i = 7; i >= 1; i--) { pg[i] = new Page(W, 'brev', i, { lo: ![4, 7].includes(i) }); sc.pages.push(pg[i]); }
  const rot = [0, -0.4, 0.5, -0.3, 0.4, -0.5, 0.3, -0.4];
  for (let i = 1; i <= 7; i++) {
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: rot[i], o: 1, shade: 0 };
    pg[i].rest = row;
    pg[i].keys = [[19.7 + i * 0.09, { ...row, y: 900, o: 0 }], [20.8 + i * 0.09, row, E.o5]];
  }
  const QS = [[4, 'brev_q1a'], [4, 'brev_q1b'], [4, 'brev_q1c'], [6, 'brev_q2a'], [6, 'brev_q2b'], [7, 'brev_q3a']];
  QS.forEach(([p, id], k) => H(sc, pg[p], id, 'boxL-g', 21.3 + k * 0.32, 21.7 + k * 0.32, 23.3));
  H(sc, pg[4], 'brev_q1a', 'm-g', 24.3, 25.4);
  H(sc, pg[4], 'brev_q1c', 'm-g', 34.9, 35.8);
  H(sc, pg[7], 'brev_q3a', 'm-g', 43.2, 44.1);
  const wide = { cx: 3 * GAP, cy: 260, z: 0.205, rx: 0 };
  const c1a = look(pg[4], ['brev_q1a'], 1.25, 960, 520), c1c = look(pg[4], ['brev_q1c'], 1.25, 960, 520), c3a = look(pg[7], ['brev_q3a'], 1.25, 960, 520);
  const camK = [[19.6, wide], [23.2, { ...wide, z: 0.21 }, E.lin]];
  flyKeys(camK, 23.2, { ...wide, z: 0.21 }, 24.3, c1a, 0.4);
  camK.push([34.0, { ...c1a, z: 1.28 }, E.lin]);
  camK.push([34.9, c1c, E.io], [42.0, { ...c1c, z: 1.28 }, E.lin]);
  flyKeys(camK, 42.0, { ...c1c, z: 1.28 }, 43.2, c3a, 0.5);
  camK.push([50.5, { ...c3a, z: 1.3 }, E.lin]);
  const ov = sc.ov;
  const k0 = txt(ov, 'k', 'SHMIL → Miljødirektoratet · 15. januar 2026', 0, 108, { center: true });
  const h0 = txt(ov, 'st', 'SHMIL ber om prinsipielle avklaringer', 0, 148, { center: true });
  const s0 = txt(ov, 'st2', '7 sider · 3 tema · 6 spørsmål', 0, 800, { center: true, size: 58 });
  const L1 = liftBlock(ov, { k: 'Spørsmål 1a – materialgjenvinning og innsatsfaktorer', size: 52,
    q: '«Innebærer praktiseringen av avfallsforskriften kapittel 10a at hensynet til henteordning skal tillegges avgjørende vekt selv der dette skjer på bekostning av samlet miljøeffekt, økt ressursbruk, betydelige samfunnsøkonomiske kostnader, i strid med de overordnede prinsippene i forurensningsloven?»',
    src: 'SHMILs brev til Miljødirektoratet 15.01.2026, side 4', srcY: 680 });
  const L2 = liftBlock(ov, { k: 'Spørsmål 1c – bringeordning med dokumentert utsortering',
    q: '«SHMIL ber om avklaring på hvorvidt forskriften åpner for bruk av bringeordning dersom det kan dokumenteres å gi tilfredsstillende utsortering (§ 10a-4), eller er det krav om henteordning uavhengig av måloppnåelse?»',
    src: 'SHMILs brev til Miljødirektoratet 15.01.2026, side 4', srcY: 600 });
  const L3 = liftBlock(ov, { k: 'Spørsmål 3a – finansiering og produsentansvar',
    q: '«Mener Miljødirektoratet at kommunen har en ubetinget plikt til å foreta irreversible investeringer i henteordning, før det foreligger avtaler og garantier for at produsentansvarsordningen dekker nødvendige kostnader med en slik omlegging?»',
    src: 'SHMILs brev til Miljødirektoratet 15.01.2026, side 7', srcY: 700 });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t); camApply(sc, t, camK);
    veilSet(sc, Math.max(env(t, 25.5, 34.2, 0.5, 0.5), env(t, 35.9, 42.2, 0.5, 0.5), env(t, 44.2, 50.5, 0.5, 0.3)));
    tshow(k0, t, 20.0, 23.6, { st: 0.015 });
    tshow(h0, t, 20.1, 23.6, { st: 0.06 });
    tshow(s0, t, 21.4, 23.6, { st: 0.06 });
    L1.show(t, 25.7, 34.0);
    L2.show(t, 36.1, 42.0);
    L3.show(t, 44.4, 50.3);
  };
}

/* ================================================================== 0:50 Mai – svaret, ordrett */
function sceneMai() {
  const sc = mkScene(49.6, 95.3, 0.6, 0.5);
  const W = sc.world, GAP = 1120, pg = [];
  for (let i = 3; i >= 1; i--) { pg[i] = new Page(W, 'svar', i); sc.pages.push(pg[i]); }
  for (let i = 1; i <= 3; i++) {
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: [0, 0.4, -0.3, 0.3][i], o: 1, shade: 0 };
    pg[i].rest = row;
    pg[i].keys = [[49.8 + i * 0.12, { ...row, x: row.x + 2600, r: row.r + 5 }], [51.3 + i * 0.12, row, E.o5]];
  }
  const [s1, s2, s3] = [pg[1], pg[2], pg[3]];
  H(sc, s1, 'svar_seks', 'boxL-g', 51.8, 52.3, 53.6);
  H(sc, s2, 'svar_ingen', 'm-b', 55.0, 56.0);
  H(sc, s2, 'svar_plikten', 'm-b', 55.8, 56.4);
  H(sc, s2, 'svar_a2a', 'm-b', 64.6, 65.8);
  H(sc, s3, 'svar_a3a', 'm-b', 73.8, 74.8);
  H(sc, s3, 'svar_1994', 'box-g', 81.9, 82.3, 84.0);
  H(sc, s3, 'svar_urimelig', 'm-b', 82.3, 83.1);
  H(sc, s3, 'svar_myetil', 'm-b', 83.0, 83.8);
  const wide = { cx: GAP, cy: 120, z: 0.36, rx: 0 };
  const cA = look(s2, ['svar_ingen', 'svar_plikten'], 1.25, 960, 520), cB = look(s2, ['svar_a2a'], 1.3, 960, 520),
    cC = look(s3, ['svar_a3a'], 1.35, 960, 520), cD = look(s3, ['svar_ventil', 'svar_myetil'], 1.35, 960, 540);
  const camK = [[49.6, wide], [53.6, { ...wide, z: 0.37 }, E.lin]];
  flyKeys(camK, 53.6, { ...wide, z: 0.37 }, 54.9, cA, 0.5);
  camK.push([63.3, { ...cA, z: 1.28 }, E.lin], [64.5, cB, E.io], [72.5, { ...cB, z: 1.33 }, E.lin]);
  flyKeys(camK, 72.5, { ...cB, z: 1.33 }, 73.7, cC, 0.55);
  camK.push([80.5, { ...cC, z: 1.38 }, E.lin], [81.7, cD, E.io], [95.3, { ...cD, z: 1.5 }, E.lin]);
  const ov = sc.ov;
  const k0 = txt(ov, 'k b', 'Miljødirektoratet → SHMIL · 7. mai 2026', 0, 108, { center: true });
  const h0 = txt(ov, 'st', 'Svaret – punkt for punkt', 0, 148, { center: true });
  const s0 = txt(ov, 'q2', '«I brevet ber dere om svar på seks spørsmål. Spørsmålene og våre vurderinger følger nedenfor.»', 0, 846, { center: true, w: 1500, size: 40 });
  const P1 = liftBlock(ov, { kc: 'b', k: 'Miljødirektoratet svarte', kY: 330,
    ask: 'SHMIL spurte (1c): «… åpner forskriften for bruk av bringeordning dersom det kan dokumenteres å gi tilfredsstillende utsortering …, eller er det krav om henteordning uavhengig av måloppnåelse?»',
    q: '«Det foreligger ikke en unntaksmulighet for innføring av henteordning i forskriften for kommuner som oppnår minimumskravet for utsorteringsandel gjennom en bringeordning.»',
    q2: '«Plikten til henteordning gjelder uavhengig av målkravet for utsorteringsandel.»', q2Y: 690,
    src: 'Miljødirektoratets svar 07.05.2026, side 2', srcY: 850 });
  const P2 = liftBlock(ov, { kc: 'b', k: 'Miljødirektoratet svarte', kY: 330,
    ask: 'SHMIL spurte (2a): «… slik at regionen/området under ett kan unntas fra kravet om henteordning for å sikre en helhetlig og rasjonell drift?»',
    q: '«Avfallsforskriften kapittel 10a inneholder ikke en hjemmel som åpner for et slikt unntak, men vi viser til den avsluttende omtalen av vår adgang til å gjøre unntak fra kravene (nederst i dette brevet).»',
    src: 'Miljødirektoratets svar 07.05.2026, side 2', srcY: 680 });
  const P3 = liftBlock(ov, { kc: 'b', k: 'Miljødirektoratet svarte', kY: 330,
    ask: 'SHMIL spurte (3a): «Mener Miljødirektoratet at kommunen har en ubetinget plikt til å foreta irreversible investeringer i henteordning, før det foreligger avtaler og garantier …?»',
    q: '«Kommunenes plikter etter avfallsforskriften kapittel 10a gjelder uavhengig av pliktene til produsentansvaret.»', size: 60,
    src: 'Miljødirektoratets svar 07.05.2026, side 3', srcY: 600 });
  // § 19-4
  const para = $('div', 'ov', ov, '§ 19-4');
  para.style.cssText += ';font:700 260px/1 var(--display);letter-spacing:-.03em;color:#007B61;transform-origin:0 0';
  para.style.display = 'none';
  const pk = txt(ov, 'k b', 'Avslutningsvis i svaret', 0, 140, { center: true });
  const qa = txt(ov, 'q', '«Denne kan være aktuell å benytte hvis krav i avfallsforskriften slår urimelig ut i konkrete tilfeller.»', 0, 480, { center: true, w: 1560, size: 50 });
  const qb = txt(ov, 'q2', '«Vi gjør oppmerksom på at det skal mye til for at det skal være aktuelt å benytte denne unntakshjemmelen.»', 0, 650, { center: true, w: 1500, size: 44 });
  const sr = txt(ov, 'src', 'Miljødirektoratets svar 07.05.2026, side 3 – om den generelle sikkerhetsventilen i avfallsforskriften § 19-4', 0, 800, { center: true });
  const q3 = txt(ov, 'q2', '«Vi har ikke tilstrekkelig informasjon til å vurdere om det kan være aktuelt å gjøre noen unntak for deres eierkommuner.»', 0, 300, { center: true, w: 1500, size: 48 });
  const big = txt(ov, 'dt', 'Grunnlaget manglet.', 0, 510, { center: true, size: 132 });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    veilSet(sc, Math.max(env(t, 56.4, 63.4, 0.5, 0.5), env(t, 65.9, 72.6, 0.5, 0.5), env(t, 74.9, 80.6, 0.5, 0.5), env(t, 84.2, 95.3, 0.6, 0.3)));
    tshow(k0, t, 50.0, 53.7, { st: 0.015 });
    tshow(h0, t, 50.1, 53.7, { st: 0.06 });
    tshow(s0, t, 51.6, 53.7, { st: 0.02 });
    P1.show(t, 56.6, 63.2);
    P2.show(t, 66.1, 72.4);
    P3.show(t, 75.1, 80.4);
    // § 19-4 lifts out of the letter
    const r = hlScreen(c, s3, ['svar_1994'], s3.rest);
    const ta = 84.0, tb = 85.4;
    const p = pr(t, ta, tb, E.io5);
    const srcH = (r.y1 - r.y0) * 1.1, s0s = srcH / 260 * 1.02;
    const endW = 820, x = lerp(r.x0 - 6, 960 - endW / 2, p), y = lerp(r.y0 - srcH * 0.12, 190, p), s = lerp(s0s, 1, p);
    show(para, env(t, ta, 89.5, 0.2, 0.5), `translate(${x}px,${y}px) scale(${s})`);
    tshow(pk, t, 84.6, 89.5, { st: 0.02 });
    tshow(qa, t, 85.4, 89.5, { st: 0.035 });
    tshow(qb, t, 86.6, 89.5, { st: 0.03 });
    tshow(sr, t, 87.2, 89.5, { st: 0.008 });
    tshow(q3, t, 89.7, 95.0, { st: 0.03 });
    tshow(big, t, 91.7, 95.0, { st: 0.12, du: 0.9 });
  };
}

/* ================================================================== 1:35 Dokumentasjonen i faktiske tekster */
function sceneDokumenter() {
  const sc = mkScene(94.6, 125.3, 0.6, 0.6);
  const W = sc.world;
  const sok = [], v1 = [], v2 = [];
  let k = 0;
  const add = (p, st, arr) => { const td = 95.0 + (k++) * 0.05; p.rest = st; p.keys = [[td, { ...st, y: st.y + 300, o: 0 }], [td + 0.7, st, E.o5]]; arr.push(p); sc.pages.push(p); return p; };
  for (let i = 1; i <= 6; i++) add(new Page(W, 'sok', i, { lo: ![3, 4, 5].includes(i) }), { x: (i - 1) * 1100, y: 0, s: 1, r: [0, -0.3, 0.3, -0.2, 0.3, -0.3, 0.2][i], o: 1, shade: 0 }, sok);
  for (let i = 1; i <= 4; i++) add(new Page(W, 'v1', i, { lo: i > 2 }), { x: (i - 1) * 1100, y: 1640, s: 1, r: [0, 0.3, -0.3, 0.2, -0.2][i], o: 1, shade: 0 }, v1);
  for (let j = 0; j < 21; j++) add(new Page(W, 'v2', j + 1, { lo: true }), { x: -250 + (j % 11) * 560, y: 3180 + Math.floor(j / 11) * 790, s: 0.5, r: ((j * 7) % 5 - 2) * 0.4, o: 1, shade: 0 }, v2);
  const [p3, p4, p5] = [sok[2], sok[3], sok[4]], [w1, w2] = [v1[0], v1[1]];
  const STOPS = [
    { t: 99.4, page: w1, ids: ['v1_datastatus_hdr', 'v1_kilde_hdr'], z: 1.15, hl: [['v1_datastatus_hdr', 'box-g'], ['v1_kilde_hdr', 'box-g']], lab: 'Hvert tall har verdi, datastatus og kilde', src: 'Vedlegg 1, side 1' },
    { t: 103.5, page: w2, ids: ['v1_kval_hdr', 'v1_kval_txt'], z: 1.3, hl: [['v1_kval_hdr', 'u-g'], ['v1_kval_txt', 'm-g']], lab: 'Ulike kvalitetsindikatorer holdes adskilt', src: 'Vedlegg 1, side 2' },
    { t: 107.7, page: p3, ids: ['sok_h23', 'sok_23_txt'], z: 1.2, hl: [['sok_h23', 'u-g'], ['sok_23_txt', 'm-g']], lab: 'Sensitivitet: kostnadsnivået består i hele det testede spennet', src: 'Søknaden 2.3' },
    { t: 111.9, page: p4, ids: ['sok_h34', 'sok_34_txt'], z: 1.2, at: [0.5, 0.17], hl: [['sok_h34', 'u-g'], ['sok_34_txt', 'm-g']], lab: 'Alternativer vurdert: fellesbeholdere, bunntømte fellespunkter, samkjøring', src: 'Søknaden 3.4' },
    { t: 116.1, page: p4, ids: ['sok_h42', 'sok_42_txt'], z: 1.3, hl: [['sok_h42', 'u-g'], ['sok_42_txt', 'm-g']], lab: 'Usikkerheten er synliggjort – meruttaket er et modellscenario', src: 'Søknaden 4.2' },
    { t: 120.3, page: p5, ids: ['sok_h52', 'sok_52_txt'], z: 1.05, hl: [['sok_h52', 'u-g'], ['sok_52_txt', 'm-g']], lab: 'Nytte og belastning veid mot hverandre', src: 'Søknaden 5.2' },
  ];
  STOPS.forEach(s => {
    s.cam = s.at ? (() => { const [wx, wy] = s.page.pt(s.at[0], s.at[1]); return { cx: wx, cy: wy - (400 - 540) / s.z, z: s.z, rx: 0 }; })() : look(s.page, s.ids, s.z, 960, 400);
    s.hl.forEach(([id, kind], i) => H(sc, s.page, id, kind, s.t + 0.6 + i * 0.5, s.t + 1.3 + i * 0.5));
  });
  const wide = { cx: 2550, cy: 1310, z: 0.17, rx: 0 };
  const camK = [[94.6, wide], [98.4, { ...wide, z: 0.175 }, E.lin]];
  flyKeys(camK, 98.4, { ...wide, z: 0.175 }, STOPS[0].t, STOPS[0].cam, 0.35);
  for (let i = 0; i < STOPS.length; i++) {
    const s = STOPS[i], n = STOPS[i + 1];
    const dwellEnd = (n ? n.t : 125.3) - (n ? 1.1 : 0);
    camK.push([dwellEnd, { ...s.cam, z: s.cam.z * 1.03 }, E.lin]);
    if (n) flyKeys(camK, dwellEnd, { ...s.cam, z: s.cam.z * 1.03 }, n.t, n.cam, 0.6);
  }
  const ov = sc.ov;
  const k0 = txt(ov, 'k', 'Sommeren 2026 · grunnlaget bygges', 0, 40, { center: true });
  const h0 = txt(ov, 'st', '31 sider dokumentasjon', 0, 78, { center: true, size: 72 });
  const lab = (kk, nm, y) => { const e = $('div', 'ov', ov, `<div class="k" style="margin-bottom:10px">${kk}</div><div style="font:500 26px/1.3 var(--sans);color:var(--ink2)">${nm}</div>`); return place(e, 70, y, 360); };
  const LB = [[lab('Søknaden', '6 sider'), sok[0]], [lab('Vedlegg 1', 'Nøkkeltall, kilder og datastatus · 4 sider'), v1[0]], [lab('Vedlegg 2', 'Plukkanalyse SHMIL 2025 · 21 sider'), v2[0]]];
  LB.forEach(([e]) => (e.style.whiteSpace = 'normal'));
  const band = div(sc.root, 'left:0;top:620px;width:1920px;height:460px;pointer-events:none;opacity:0;background:linear-gradient(to bottom,rgba(236,235,230,0) 0%,rgba(236,235,230,.93) 32%,rgba(236,235,230,.97) 100%)');
  sc.root.insertBefore(band, sc.ov);
  const labs = STOPS.map(s => ({ k: txt(ov, 'k', 'Vurdering · ' + s.src, 200, 800), h: txt(ov, 'st2', s.lab, 200, 840, { w: 1520, size: 56 }) }));
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    tshow(k0, t, 95.2, 98.9, { st: 0.015 });
    tshow(h0, t, 95.3, 98.9, { st: 0.07 });
    LB.forEach(([e, page], i) => {
      const [, y] = toScreen(c, 0, page.rest.y);
      e.style.top = (y - 40) + 'px';
      fshow(e, t, 96.0 + i * 0.3, 98.9, { dx: -20, dy: 0 });
    });
    band.style.opacity = env(t, STOPS[0].t - 0.4, 125.1, 0.6, 0.5).toFixed(3);
    labs.forEach((L, i) => {
      const a = STOPS[i].t + 0.5, b = (STOPS[i + 1] ? STOPS[i + 1].t - 0.6 : 125.0);
      tshow(L.k, t, a, b, { st: 0.015 });
      tshow(L.h, t, a + 0.1, b, { st: 0.04 });
    });
  };
}

/* ================================================================== 2:05 Beregningsmodellen (kort) */
function sceneModell() {
  const sc = mkScene(124.6, 140.3, 0.6, 0.6);
  const ov = sc.ov;
  const k = txt(ov, 'k', 'Beregningsmodellen', 150, 112);
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
  const TA = [125.6, 126.8, 128.0, 129.2, 130.4, 131.2];
  const nodes = N.map(([v, l, cls, st], i) => {
    const e = $('div', 'node', ov, `<span class="stc ${cls}">${st}</span><div class="v">${v}</div><div class="l">${l}</div>`);
    return place(e, XS[i % 3], YS[Math.floor(i / 3)]);
  });
  const ar = ['M650,394 L716,394', 'M1220,394 L1286,394', 'M1540,496 L1540,530 L400,530 L400,562', 'M650,668 L716,668']
    .map(d => { const p = svgPath(sc, '#0E9C79', 4); p.setAttribute('d', d); return p; });
  const plus = div(ov, 'left:1228px;top:632px;font:600 54px/1 var(--display);color:var(--ink3)', 'ov'); plus.textContent = '+';
  const res = txt(ov, 'st', '= *3,39* *mill.* *kr* *i* *året*', 150, 818, { size: 76 });
  const rsrc = txt(ov, 'src', 'Modellert merkostnad ved henteordning i tettbygd strøk (Modell A) · søknaden kap. 2.2 og Vedlegg 1', 150, 908, { w: 1620 });
  sc.upd = t => {
    tshow(k, t, 125.0, 140.0, { st: 0.02 });
    tshow(h1, t, 125.1, 134.4, { st: 0.05 });
    tshow(h2, t, 134.8, 140.0, { st: 0.06 });
    nodes.forEach((e, i) => fshow(e, t, TA[i], 140.0, { dy: 30, fi: 0.7 }));
    ar.forEach((p, i) => {
      const tt = TA[i + 1];
      const a = pr(t, tt - 0.6, tt - 0.1);
      p.style.display = a > 0 ? '' : 'none';
      p.style.opacity = (a * (1 - pr(t, 139.6, 140.2))).toFixed(3);
    });
    show(plus, env(t, TA[5], 140.0, 0.5, 0.5), 'none');
    tshow(res, t, 132.6, 140.0, { st: 0.08, du: 0.9 });
    tshow(rsrc, t, 133.4, 140.0, { st: 0.008 });
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
