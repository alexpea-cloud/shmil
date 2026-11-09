/* SHMIL – Grunnlaget for søknaden (versjon 4)
 * Calm direction: one message at a time, few words, long holds, slow transitions.
 * Geography: SHMIL left (green), Miljødirektoratet right (blue).
 * Every frame is a pure function of time t (seconds): FILM.renderAt(t).
 */
(function () {
'use strict';

/* ------------------------------------------------------------------ timing (music: 128 bpm, 15 s phrases from 4.8 s) */
const DUR = 204.7, FPS = 30;
const Q = k => 4.8 + 15 * k;   // 4.8, 19.8, 34.8, 49.8, 64.8, 79.8, 94.8, 109.8, 124.8, 139.8, 154.8, 169.8, 184.8, 199.8
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

/* ------------------------------------------------------------------ calm helpers */
const div = (parent, css, cls) => { const e = $('div', cls || null, parent); e.style.cssText = 'position:absolute;' + css; return e; };
const calm = (T, t, a, b, o = {}) => tshow(T, t, a, b, { st: 0.012, du: 1.2, dy: 38, fo: 0.9, oy: 0, ...o });
const fade = (el, t, a, b, o = {}) => fshow(el, t, a, b, { fi: 1.1, fo: 0.9, dy: 16, ...o });
const GREEN = '#007B61', GREEN_HI = '#0E9C79', BLUE = '#2A7FA6';
function nameplate(parent, name, color, cx, y) {
  const e = $('div', 'np', parent, `<span class="dot" style="background:${color}"></span><span>${name}</span>`);
  e.style.left = (cx - 300) + 'px'; e.style.top = y + 'px';
  return e;
}
// fades an element that tshow/fshow already shows, e.g. to dim context text
function dimBy(el, f) {
  if (el.style.display === 'none') return;
  el.style.opacity = (parseFloat(el.style.opacity || '1') * f).toFixed(3);
}
// arrow drawn from (x0,y) to (x1,y)
function arrow(sc, x0, x1, y, color) {
  const p = svgPath(sc, color, 4);
  const head = document.createElementNS(NS, 'path');
  head.setAttribute('fill', color);
  sc.svg.appendChild(head);
  const dir = Math.sign(x1 - x0);
  return q => {
    if (q <= 0) { p.style.display = 'none'; head.style.display = 'none'; return; }
    p.style.display = ''; head.style.display = '';
    const xe = lerp(x0, x1, q);
    p.setAttribute('d', `M${x0},${y} L${xe - dir * 10},${y}`);
    head.setAttribute('d', `M${xe},${y} L${xe - dir * 22},${y - 12} L${xe - dir * 22},${y + 12} Z`);
  };
}
const ident = { cx: 0, cy: 0, z: 1, rx: 0 };

/* ------------------------------------------------------------------ build */
let OV, TLG, PROG;
function build() {
  OV = S('ov');
  TLG = S('tl').getContext('2d');
  makeGrain();
  sceneTitle();
  sceneAvvik();
  sceneStage();
  sceneBrev();
  sceneQA(Q(3), {
    q: 'Kan bringeordning brukes hvis den gir god nok utsortering?',
    ans: '«Plikten til henteordning gjelder uavhengig av målkravet for utsorteringsandel.»',
    src: 'mai 2026',
    mean: 'God utsortering fritar ikke fra kravet.',
  });
  sceneQA(Q(4), {
    q: 'Må kommunen investere før finansieringen gjennom produsentansvaret er avklart?',
    ans: '«Kommunenes plikter etter avfallsforskriften kapittel 10a gjelder uavhengig av pliktene til produsentansvaret.»',
    src: 'mai 2026',
    mean: 'Kravet gjelder – også uten avklart finansiering.',
  });
  sceneParagraf();
  sceneGrunnlag();
  sceneForutsetning();
  sceneGeografi();
  sceneNytte();
  sceneBelastning();
  sceneKonsekvens();
  sceneSendt();
  buildProgress();
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

/* ================================================================== 0:00 Åpning */
function sceneTitle() {
  const sc = mkScene(0, 20.6, 0.01, 1.1);
  [['v1', 1, -980, 60, -3], ['sok', 1, 0, 0, 0.6], ['v2', 1, 980, 40, 3]].forEach(([d, n, x, y, r]) => {
    const p = new Page(sc.world, d, n, { lo: true });
    p.keys = [[0, { x, y: y + 160, s: 1, r, o: 1, shade: 0 }], [6.0, { x, y, s: 1, r, o: 1, shade: 0 }, E.o], [20.6, { x, y: y - 90, s: 1, r, o: 1, shade: 0 }, E.lin]];
    sc.pages.push(p);
  });
  const camK = [[0, { cx: 0, cy: -1120, z: 0.3 }], [20.6, { cx: 0, cy: -1120, z: 0.318 }, E.lin]];
  const k = txt(sc.ov, 'k', 'SHMIL IKS · Søndre Helgeland Miljøverk', 0, 200, { center: true });
  const ti = txt(sc.ov, 'dt', 'Grunnlaget for søknaden', 0, 242, { center: true, size: 124 });
  const su = txt(sc.ov, 'sub', 'Kravet om henteordning · november 2025 – august 2026', 0, 404, { center: true, size: 42 });
  sc.upd = t => {
    pagesApply(sc, t); camApply(sc, t, camK);
    calm(k, t, 1.0, 19.6);
    calm(ti, t, 1.4, 19.7, { st: 0.05, du: 1.4 });
    calm(su, t, 3.2, 19.7);
  };
}

/* ================================================================== 0:20 Avviket */
function sceneAvvik() {
  const a = Q(1), b = Q(2);
  const sc = mkScene(a - 0.3, b + 0.6, 0.9, 0.9);
  const ov = sc.ov;
  const k = txt(ov, 'k g', 'Statsforvalteren i Nordland · 6. november 2025', 0, 196, { center: true });
  const h = txt(ov, 'dt', 'Tilsynet fant avvik', 0, 238, { center: true, size: 112 });
  // national sorting labels: square, white border, text outside the coloured field
  const G = [
    { icons: ['papir', 'papp'], name: 'Papp og papir', x: 330 },
    { icons: ['glassemballasje', 'metallemballasje'], name: 'Glass- og metallemballasje', x: 1010 },
  ].map((g, gi) => {
    const e = $('div', 'fgrp', ov,
      `<div class="fic">${g.icons.map(n => `<img src="assets/icons/${n}.svg" alt="">`).join('')}</div>` +
      `<div class="fname">${g.name}</div><div class="fmiss">Henteordning mangler</div>`);
    e.querySelectorAll('img').forEach(im => IMGS.push(im));
    return place(e, g.x, 430, 580);
  });
  sc.upd = t => {
    calm(k, t, a + 0.6, b);
    calm(h, t, a + 1.0, b, { st: 0.05 });
    G.forEach((e, i) => {
      fade(e, t, a + 3.4 + i * 1.6, b, { dy: 30, fi: 1.3 });
      const m = e.querySelector('.fmiss'), p = pr(t, a + 6.8 + i * 0.8, a + 7.8 + i * 0.8, E.o);
      m.style.opacity = p.toFixed(3); m.style.transform = `translateY(${((1 - p) * 14).toFixed(1)}px)`;
    });
  };
}

/* ================================================================== 0:35–1:20 Dialogen: fast scene (navneskilt og skillelinje) */
function sceneStage() {
  const a = Q(2), b = Q(5);
  const sc = mkScene(a - 0.1, b + 0.6, 1.0, 1.0);
  nameplate(sc.ov, 'SHMIL', GREEN, 480, 170);
  nameplate(sc.ov, 'Miljødirektoratet', BLUE, 1440, 170);
  const line = div(sc.ov, 'left:959px;top:260px;width:2px;height:470px;background:#C9CEC9;transform-origin:50% 0');
  sc.upd = t => { show(line, env(t, Q(3) + 0.2, b, 1.0, 0.9), `scaleY(${pr(t, Q(3) + 0.2, Q(3) + 1.4, E.io)})`); };
}

/* ================================================================== 0:35 Brevvekslingen */
function sceneBrev() {
  const a = Q(2), b = Q(3);
  const sc = mkScene(a - 0.1, b + 0.5, 0.6, 0.9);
  camApply(sc, 0, [[0, ident]]);
  const W = sc.world, SC = 0.27;
  const bp = new Page(W, 'brev', 1, { lo: true }), sp = new Page(W, 'svar', 1, { lo: true });
  bp.keys = [[a + 1.0, { x: -480, y: -50, s: SC, r: -1, o: 0, shade: 0 }], [a + 2.2, { x: -480, y: -80, s: SC, r: -1, o: 1, shade: 0 }, E.o]];
  sp.keys = [[a + 6.4, { x: 480, y: -50, s: SC, r: 1, o: 0, shade: 0 }], [a + 7.6, { x: 480, y: -80, s: SC, r: 1, o: 1, shade: 0 }, E.o]];
  sc.pages.push(bp, sp);
  const d1 = txt(sc.ov, 'k', '15. januar 2026', 180, 672, { w: 600, align: 'center' });
  const d2 = txt(sc.ov, 'k b', '7. mai 2026', 1140, 672, { w: 600, align: 'center' });
  const a1 = arrow(sc, 650, 1270, 400, GREEN_HI), a2 = arrow(sc, 1270, 650, 520, BLUE);
  const h = txt(sc.ov, 'st', 'SHMIL ba om prinsipielle avklaringer', 0, 790, { center: true, size: 60 });
  sc.upd = t => {
    pagesApply(sc, t);
    calm(d1, t, a + 1.8, b);
    a1(pr(t, a + 3.2, a + 5.2, E.io) * (1 - pr(t, b - 0.9, b)));
    calm(d2, t, a + 7.2, b);
    a2(pr(t, a + 8.4, a + 10.4, E.io) * (1 - pr(t, b - 0.9, b)));
    calm(h, t, a + 3.6, b, { st: 0.03 });
  };
}

/* ================================================================== 0:50 / 1:05 Spørsmål og svar */
function sceneQA(a, o) {
  const b = a + 15;
  const sc = mkScene(a - 0.1, b + 0.6, 0.8, 0.9);
  const ov = sc.ov;
  const kq = txt(ov, 'k', 'SHMIL spurte · januar 2026', 150, 300, { w: 720 });
  const q = txt(ov, 'q', o.q, 150, 346, { w: 700, size: 48 });
  const ka = txt(ov, 'k b', 'Miljødirektoratet svarte · ' + o.src, 1050, 300, { w: 720 });
  const ans = txt(ov, 'q', o.ans, 1050, 346, { w: 720, size: 52 });
  const mk = txt(ov, 'k g', 'Det betyr', 0, 800, { center: true });
  const mean = txt(ov, 'st', o.mean, 0, 842, { center: true, size: 62 });
  sc.upd = t => {
    calm(kq, t, a + 0.5, b);
    calm(q, t, a + 0.8, b, { st: 0.02 });
    const dimQ = 1 - 0.62 * pr(t, a + 5.0, a + 6.2);
    dimBy(kq.el, dimQ); dimBy(q.el, dimQ);
    calm(ka, t, a + 5.0, b);
    calm(ans, t, a + 5.3, b, { st: 0.025 });
    calm(mk, t, a + 10.2, b);
    calm(mean, t, a + 10.4, b, { st: 0.03 });
  };
}

/* ================================================================== 1:20 Til slutt: § 19-4 */
function sceneParagraf() {
  const a = Q(5), b = Q(7);
  const sc = mkScene(a - 0.2, b + 0.6, 1.0, 1.0);
  const ov = sc.ov;
  const k = txt(ov, 'sub', 'Men direktoratet pekte på én mulighet', 0, 196, { center: true, size: 44 });
  const para = div(ov, 'left:0;top:258px;width:1920px;text-align:center;font:700 240px/1 var(--display);letter-spacing:-.03em;color:#007B61;white-space:nowrap', 'ov');
  para.textContent = '§ 19-4';
  para.style.display = 'none';
  const qa = txt(ov, 'q', '«… slår urimelig ut i konkrete tilfeller»', 0, 560, { center: true, size: 56 });
  const qb = txt(ov, 'q', '«… det skal mye til»', 0, 652, { center: true, size: 56 });
  const src = txt(ov, 'src', 'Miljødirektoratets svar 7. mai 2026, side 3 · avfallsforskriften § 19-4', 0, 790, { center: true });
  const q3 = txt(ov, 'q2', '«Vi har ikke tilstrekkelig informasjon til å vurdere om det kan være aktuelt å gjøre noen unntak for deres eierkommuner.»', 0, 300, { center: true, w: 1480, size: 48 });
  const big = txt(ov, 'dt', 'Grunnlaget manglet.', 0, 560, { center: true, size: 136 });
  sc.upd = t => {
    calm(k, t, a + 0.8, a + 16.6);
    fade(para, t, a + 2.6, a + 16.6, { dy: 0, sc: 0.94, fi: 1.6 });
    calm(qa, t, a + 6.0, a + 16.6, { st: 0.03 });
    calm(src, t, a + 7.4, a + 16.6);
    calm(qb, t, a + 10.8, a + 16.6, { st: 0.04 });
    calm(q3, t, a + 17.4, b - 0.2, { st: 0.02 });
    dimBy(q3.el, 1 - 0.45 * pr(t, a + 22.6, a + 23.6));
    calm(big, t, a + 22.8, b - 0.2, { st: 0.1, du: 1.4 });
  };
}

/* ================================================================== 1:50 Grunnlaget */
function sceneGrunnlag() {
  const a = Q(7), b = Q(9);
  const sc = mkScene(a - 0.2, b + 0.6, 1.0, 1.0);
  camApply(sc, 0, [[0, ident]]);
  const W = sc.world, ov = sc.ov;
  const k = txt(ov, 'k', 'Sommeren 2026', 0, 110, { center: true });
  const h1 = txt(ov, 'st', 'SHMIL bygget grunnlaget', 0, 150, { center: true, size: 72 });
  const h2 = txt(ov, 'st', '31 sider – søknad og to vedlegg', 0, 150, { center: true, size: 68 });
  const s2 = txt(ov, 'sub', 'Hvert tall med kilde og datastatus', 0, 246, { center: true, size: 40 });
  const BL = [['Veide mengder', 'KOSTRA-rapporteringen 2025'], ['Faktiske driftsdata', 'Komtek og Retura'],
    ['Uavhengig plukkanalyse', 'Iris Produksjon · Vedlegg 2'], ['Kostnadsmodell', 'Hver forutsetning kan etterprøves']];
  const blocks = BL.map(([tt, ss], i) => place($('div', 'blk', ov, `<div class="t">${tt}</div><div class="s">${ss}</div>`), 170 + i * 400, 720));
  const SC = 0.2, LIFT = 4;
  const stacks = [['sok', [6, 5, 4, 3, 2, 1], -430], ['v1', [4, 3, 2, 1], 0], ['v2', Array.from({ length: 21 }, (_, i) => 21 - i), 430]];
  const pagesBy = stacks.map(([doc, ns, x], si) => ns.map((n, k2) => {
    const p = new Page(W, doc, n, { lo: true });
    const layer = ns.length - 1 - k2;            // 0 = top page
    const top = 160 - 141.5 - (ns.length - 1) * LIFT - 8;   // all stacks rest on the foundation (screen y 700)
    const rest = { x: x - layer * 1.5, y: top + layer * LIFT, s: SC, r: 0, o: 1, shade: layer === 0 ? 0 : 0.06 };
    const tA = a + 15.0 + si * 0.9;
    p.keys = [[tA, { ...rest, y: rest.y - 60, o: 0 }], [tA + 1.4, rest, E.o]];
    sc.pages.push(p);
    return p;
  }));
  void pagesBy;
  sc.upd = t => {
    pagesApply(sc, t);
    calm(k, t, a + 0.6, b);
    calm(h1, t, a + 0.9, a + 14.6, { st: 0.04 });
    blocks.forEach((e, i) => fade(e, t, a + 3.6 + i * 2.6, b, { dy: -26 }));
    calm(h2, t, a + 15.4, b, { st: 0.04 });
    calm(s2, t, a + 17.0, b);
  };
}

/* ================================================================== 2:20 A – Forutsetningen */
function sceneForutsetning() {
  const a = Q(9), b = 148.4;
  const sc = mkScene(a - 0.2, b + 0.5, 1.0, 0.9);
  const ov = sc.ov;
  const k = txt(ov, 'k b', 'Da kravet ble innført, regnet Miljødirektoratet med', 0, 300, { center: true });
  const n = txt(ov, 'num', 'ca. 1 810 kr', 0, 352, { center: true, size: 180, color: BLUE });
  const u = txt(ov, 'sub', 'per ekstra tonn utsortert', 0, 566, { center: true, size: 46 });
  const s = txt(ov, 'src', 'Konsekvensutredningen for kapittel 10a (M-2021): ca. 1 475 kr i 2020-priser, omregnet til 2025-kroner', 0, 660, { center: true });
  sc.upd = t => {
    calm(k, t, a + 0.7, b);
    calm(n, t, a + 1.2, b, { st: 0.04, du: 1.4 });
    calm(u, t, a + 2.2, b);
    calm(s, t, a + 3.2, b);
  };
}

/* ================================================================== 2:28 B – SHMILs geografi */
function sceneGeografi() {
  const a = 148.4, b = 157.0;
  const sc = mkScene(a - 0.2, b + 0.5, 0.9, 0.9);
  const ov = sc.ov;
  const k = txt(ov, 'k', 'SHMILs geografi', 150, 330);
  const h = txt(ov, 'st', 'Tettbygd: ca. 20 km² av over 9 400 km²', 150, 372, { w: 860, size: 66 });
  const s = txt(ov, 'sub', 'spredt på tre atskilte driftsregioner', 150, 560, { w: 860, size: 40 });
  const SQ = 600, SX = 1170, SY = 220;
  const sq = div(ov, `left:${SX}px;top:${SY}px;width:${SQ}px;height:${SQ}px;border-radius:8px;background:#E1E5DF;border:2px solid #C9CEC9;box-sizing:border-box`);
  // total green area to scale: 20 / 9 400 of the square, split on three areas
  const r = Math.sqrt((SQ * SQ * 20 / 9400) / 3 / Math.PI);
  const dots = [[0.30, 0.28], [0.64, 0.46], [0.24, 0.76]].map(([u, v]) => {
    const d = div(ov, `left:${SX + u * SQ - r}px;top:${SY + v * SQ - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:#007B61`);
    const ring = div(ov, `left:${SX + u * SQ - r}px;top:${SY + v * SQ - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;border:2px solid #0E9C79;box-sizing:border-box`);
    return { d, ring };
  });
  const cap = txt(ov, 'src', 'Arealet vist i riktig målestokk – tettbygde områder i grønt', SX, SY + SQ + 22, { w: SQ });
  sc.upd = t => {
    calm(k, t, a + 0.6, b);
    calm(h, t, a + 0.9, b, { st: 0.03 });
    calm(s, t, a + 2.2, b);
    fade(sq, t, a + 0.8, b, { dy: 0, fi: 1.2 });
    dots.forEach((o2, i) => {
      const t0 = a + 2.6 + i * 0.7;
      show(o2.d, env(t, t0, b, 0.6, 0.9), `scale(${E.oback(pr(t, t0, t0 + 0.6, E.lin))})`);
      const p = pr(t, t0 + 0.2, t0 + 2.2, E.o);
      show(o2.ring, (1 - p) * env(t, t0 + 0.2, b, 0.2, 0.5), `scale(${1 + p * 4})`);
    });
    calm(cap, t, a + 4.4, b);
  };
}

/* ================================================================== 2:37 C – Nytten */
function sceneNytte() {
  const a = 157.0, b = 165.4;
  const sc = mkScene(a - 0.2, b + 0.5, 0.9, 0.9);
  const ov = sc.ov;
  const h = txt(ov, 'st', 'Ni av ti kilo samles allerede inn i dag.', 200, 300, { w: 1520, size: 72 });
  const BX = 200, BY = 500, BW = 1520, BH = 110, f1 = 375.5 / 421.2;
  const b1 = div(ov, `left:${BX}px;top:${BY}px;height:${BH}px;width:${BW * f1}px;background:#007B61;border-radius:12px 0 0 12px;transform-origin:0 50%`);
  const b1t = div(ov, `left:${BX + 34}px;top:${BY + 34}px;font:600 40px/1 var(--display);color:#fff;white-space:nowrap`); b1t.textContent = 'samles inn i dag';
  const b2 = div(ov, `left:${BX + BW * f1 + 6}px;top:${BY}px;height:${BH - 6}px;width:${BW * (1 - f1) - 12}px;border:3px dashed #2A7FA6;border-radius:0 12px 12px 0;background:repeating-linear-gradient(135deg,rgba(42,127,166,.16) 0 10px,rgba(42,127,166,.04) 10px 20px)`);
  const b2t = div(ov, `left:${BX + BW - 420}px;top:${BY + BH + 22}px;width:420px;text-align:right;font:600 36px/1 var(--display);color:#2A7FA6;white-space:nowrap`); b2t.textContent = 'den siste tidelen';
  [b1, b1t, b2, b2t].forEach(e => (e.style.display = 'none'));
  const src = txt(ov, 'src', 'Søknaden kap. 2.1: 375,5 tonn i dag · modellert meruttak 45,7 tonn i året', 200, 760, { w: 1520 });
  sc.upd = t => {
    calm(h, t, a + 0.7, b, { st: 0.03 });
    const ga = env(t, a + 1.8, b, 0.4, 0.9);
    show(b1, ga, `scaleX(${pr(t, a + 1.8, a + 3.4, E.io)})`);
    show(b1t, ga * pr(t, a + 3.0, a + 3.8), 'none');
    show(b2, ga * pr(t, a + 3.8, a + 4.8), 'none');
    show(b2t, ga * pr(t, a + 4.4, a + 5.2), 'none');
    calm(src, t, a + 5.0, b);
  };
}

/* ================================================================== 2:45 D – Belastningen */
function sceneBelastning() {
  const a = 165.4, b = 174.2;
  const sc = mkScene(a - 0.2, b + 0.5, 0.9, 0.9);
  const ov = sc.ov;
  const h = txt(ov, 'st', 'Den siste tidelen ville kreve', 200, 250, { size: 68 });
  const items = ['ca. 56 000 nye tømmestopp i året', 'ny tungtrafikk i boliggatene', 'utslipp, støy, veistøv og slitasje'].map((s, i) => {
    const e = $('div', 'ov', ov, `<span style="display:inline-block;width:34px;height:6px;border-radius:3px;background:#0E9C79;vertical-align:middle;margin-right:26px;position:relative;top:-4px"></span>${s}`);
    e.style.cssText += ';font:500 54px/1.2 var(--display);color:var(--ink)';
    return place(e, 200, 410 + i * 110);
  });
  const src = txt(ov, 'src', 'Søknaden kap. 2.2 og 5.2', 200, 790);
  sc.upd = t => {
    calm(h, t, a + 0.7, b, { st: 0.03 });
    items.forEach((e, i) => fade(e, t, a + 2.0 + i * 1.9, b, { dx: -24, dy: 0 }));
    calm(src, t, a + 6.0, b);
  };
}

/* ================================================================== 2:54 E – Konsekvensen (høydepunkt) */
function sceneKonsekvens() {
  const a = 174.2, b = Q(12);
  const sc = mkScene(a - 0.2, b + 0.6, 0.9, 1.0);
  const ov = sc.ov;
  const BX = 200, BW = 1520;
  const kk = txt(ov, 'k', 'Kostnad per ekstra tonn', BX, 196);
  const l1 = txt(ov, 'pl', 'Miljødirektoratets anslag', BX, 250, { size: 34 });
  const r1 = div(ov, `left:${BX}px;top:298px;height:58px;width:${BW / 41}px;background:${BLUE};border-radius:6px`);
  const v1 = div(ov, `left:${BX + BW / 41 + 20}px;top:308px;font:600 40px/1 var(--display);color:${BLUE};white-space:nowrap`); v1.textContent = 'ca. 1 810 kr';
  const l2 = txt(ov, 'pl', 'SHMILs pliktområde', BX, 392, { size: 34 });
  const r2 = div(ov, `left:${BX}px;top:440px;height:58px;width:${BW}px;background:#007B61;border-radius:6px;transform-origin:0 50%`);
  const v2 = div(ov, `left:${BX + BW - 300}px;top:450px;width:276px;text-align:right;font:600 40px/1 var(--display);color:#fff;white-space:nowrap`); v2.textContent = '74 286 kr';
  [r1, v1, r2, v2].forEach(e => (e.style.display = 'none'));
  const x40 = txt(ov, 'dt', '*Over* *40* *ganger* direktoratets anslag', BX, 586, { w: 1560, size: 96 });
  const sub = txt(ov, 'sub', '3,39 mill. kr i året – 3–4 % høyere renovasjonsgebyr', BX, 804, { w: 1560, size: 38 });
  const src = txt(ov, 'src', 'Søknaden side 1 og kap. 3.1. Tallene har ikke fullt ut samme systemgrense og sammenlignes som størrelsesorden.', BX, 880, { w: 1560, size: 23 });
  sc.upd = t => {
    const A = env(t, a + 0.6, b, 0.8, 0.9);
    calm(kk, t, a + 0.4, b);
    calm(l1, t, a + 0.6, b);
    show(r1, A, 'none'); show(v1, A, 'none');
    calm(l2, t, a + 1.4, b);
    show(r2, A * pr(t, a + 1.6, a + 1.9), `scaleX(${pr(t, a + 1.8, a + 4.6, E.io)})`);
    show(v2, A * pr(t, a + 4.2, a + 4.9), 'none');
    calm(x40, t, a + 5.0, b, { st: 0.06, du: 1.4 });
    calm(sub, t, a + 7.0, b);
    calm(src, t, a + 7.8, b);
  };
}

/* ================================================================== 3:05 Søknaden sendt */
function sceneSendt() {
  const a = Q(12), b = 194.6;
  const sc = mkScene(a - 0.2, b + 0.6, 1.0, 1.0);
  camApply(sc, 0, [[0, ident]]);
  const W = sc.world, ov = sc.ov;
  nameplate(ov, 'SHMIL', GREEN, 480, 170);
  nameplate(ov, 'Miljødirektoratet', BLUE, 1440, 170);
  const p = new Page(W, 'sok', 1, { lo: true });
  p.keys = [[a + 0.9, { x: -480, y: -50, s: 0.27, r: -1, o: 0, shade: 0 }], [a + 2.1, { x: -480, y: -80, s: 0.27, r: -1, o: 1, shade: 0 }, E.o],
    [a + 3.0, { x: -480, y: -80, s: 0.27, r: -1, o: 1, shade: 0 }], [a + 6.2, { x: 480, y: -80, s: 0.27, r: 1, o: 1, shade: 0 }, E.io]];
  sc.pages.push(p);
  const k = txt(ov, 'k', '31. august 2026', 0, 700, { center: true });
  const h = txt(ov, 'st', 'Søknaden er sendt', 0, 742, { center: true, size: 66 });
  const l1 = txt(ov, 'st2', 'Papp og papir: egen fiberdunk innføres', 0, 730, { center: true, size: 50 });
  const l2 = txt(ov, 'st2', 'Glass og metall: søknad om tidsbegrenset unntak til 2030', 0, 808, { center: true, size: 50 });
  sc.upd = t => {
    pagesApply(sc, t);
    calm(k, t, a + 1.0, a + 6.6);
    calm(h, t, a + 1.3, a + 6.6, { st: 0.04 });
    calm(l1, t, a + 7.0, b);
    calm(l2, t, a + 8.4, b);
  };
}

/* ================================================================== progress line (bottom) */
const STEPS = [['Avviket', Q(1)], ['Spørsmål og svar', Q(2)], ['Grunnlaget', Q(7)], ['Konsekvensen', Q(9)], ['Søknaden', Q(12)]];
function buildProgress() {
  PROG = $('div', 'prog', OV);
  PROG.items = STEPS.map(([lab], i) => {
    if (i) $('span', 'sep', PROG);
    return $('span', 'it', PROG, lab);
  });
}
function progressUpdate(t) {
  const A = env(t, Q(1) + 0.6, 194.4, 1.2, 1.0);
  if (!show(PROG, A, 'none')) return;
  let cur = 0;
  STEPS.forEach(([, ts], i) => { if (t >= ts - 0.3) cur = i; });
  PROG.items.forEach((e, i) => {
    e.className = 'it' + (i === cur ? ' cur' : i < cur ? ' done' : '');
  });
}

/* ================================================================== 3:15 Avslutning */
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
function drawLine(t, A, Y, t0) {
  const g = TLG;
  if (A <= 0.002) return;
  g.save();
  g.globalAlpha = A;
  const xEnd = XD(D(2026, 8, 31));
  g.lineCap = 'round';
  g.strokeStyle = '#BFC5C1'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(X0 - 40, Y); g.lineTo(xEnd, Y); g.stroke();
  g.setLineDash([10, 12]); g.beginPath(); g.moveTo(xEnd, Y); g.lineTo(1740, Y); g.stroke(); g.setLineDash([]);
  const band = STN[3];
  g.fillStyle = 'rgba(14,156,121,.22)';
  g.beginPath(); g.roundRect(XD(band.a), Y - 11, XD(band.b) - XD(band.a), 22, 11); g.fill();
  // progress grows calmly from left to right
  const reach = lerp(XD(STN[0].d), xEnd, pr(t, t0, t0 + 3.2, E.io));
  g.strokeStyle = '#0E9C79'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(XD(STN[0].d), Y); g.lineTo(reach, Y); g.stroke();
  STN.forEach(s => {
    const x = s.band ? (XD(s.a) + XD(s.b)) / 2 : s.open ? s.x : XD(s.d);
    const lit = !s.open && x <= reach + 1;
    if (!s.band) {
      g.beginPath(); g.arc(x, Y, 12, 0, Math.PI * 2);
      if (lit) { g.fillStyle = '#007B61'; g.fill(); }
      else { g.fillStyle = '#ECEBE6'; g.fill(); g.strokeStyle = s.open ? '#0E9C79' : '#AEB5B1'; g.lineWidth = 3; g.stroke(); }
    }
    if (s.open && t > t0 + 3.4) {
      const ph = ((t - t0 - 3.4) % 1.875) / 1.875;
      g.strokeStyle = `rgba(14,156,121,${(1 - ph) * 0.75})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, Y, 12 + ph * 34, 0, Math.PI * 2); g.stroke();
    }
    const lx = x + (s.band ? -22 : s.lab === 'Søknad' ? 16 : 0);
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.font = '600 30px FS, Inter, system-ui, sans-serif'; g.fillStyle = s.open ? '#0B7A60' : lit ? '#1B2326' : '#8A9599';
    g.fillText(s.lab, lx, Y + 34);
    g.font = '500 22px FM, "JetBrains Mono", monospace'; g.fillStyle = '#78848A';
    g.fillText(s.date, lx, Y + 74);
  });
  g.restore();
}
let FIN;
const FIN_A = 194.8;
function buildFinal() {
  const w = txt(OV, 'st', '*Vi* *venter* *på* *svar.*', 0, 690, { center: true, size: 80 });
  const logo = $('img', 'ov', OV); logo.src = 'assets/shmil-logo-green.png'; logo.alt = 'SHMIL';
  logo.style.cssText += ';left:893px;top:930px;height:50px;display:none';
  IMGS.push(logo);
  FIN = t => {
    calm(w, t, FIN_A + 4.0, 205, { st: 0.1, du: 1.4 });
    fade(logo, t, FIN_A + 5.4, null, { dy: 8, fi: 1.4 });
  };
}

/* ================================================================== render */
function renderAt(t) {
  t = clamp(t, 0, DUR);
  TLG.clearRect(0, 0, 1920, 1080);
  drawLine(t, pr(t, FIN_A, FIN_A + 1.2) * (1 - pr(t, 202.6, 204.4)), 470, FIN_A + 0.6);
  for (const sc of SCENES) {
    const on = t >= sc.a && t <= sc.b;
    if (!on) { if (sc.root.style.display !== 'none') sc.root.style.display = 'none'; continue; }
    sc.root.style.display = 'block';
    sc.root.style.opacity = env(t, sc.a, sc.b, sc.fi, sc.fo, E.o, E.io).toFixed(3);
    sc.upd(t);
  }
  progressUpdate(t);
  FIN(t);
  S('black').style.opacity = Math.max(1 - pr(t, 0, 1.4, E.o), pr(t, 202.6, 204.6, E.io2)).toFixed(3);
}

async function ready() {
  await document.fonts.ready;
  await Promise.all(['400 20px FS', '500 20px FS', '600 20px FS', '700 20px FS', '500 20px FD', '600 20px FD', '700 20px FD', '500 20px FM']
    .map(f => document.fonts.load(f, 'ÆØÅæøå§–«»→²').catch(() => {})));
  await Promise.all(IMGS.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
  await Promise.all(IMGS.map(i => (i.decode ? i.decode().catch(() => {}) : 0)));
  return true;
}

/* ------------------------------------------------------------------ preview UI */
const POSTER = 6.0;
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
    if (au.paused) { started = true; const p = au.play(); if (p && p.catch) p.catch(() => {}); btn.textContent = '❚❚ Pause'; }
    else { au.pause(); btn.textContent = '▶ Spill av'; }
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
