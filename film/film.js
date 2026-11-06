/* SHMIL – Fra tilsynsavvik til søknad
 * Animated documentary built from the original PDF pages.
 * Every frame is a pure function of time t (seconds): FILM.renderAt(t).
 * index.html previews it in a browser; render.cjs renders it frame by frame to MP4.
 */
(function () {
'use strict';

/* ------------------------------------------------------------------ timing */
const DUR = 149.8, FPS = 30;
// The music runs at ~109 bpm; strong phrase hits every 8.81 s from 0.13 s.
const T0 = 0.13, PHR = 8.81, BAR = PHR / 4;
const P = k => T0 + k * PHR;
const HIT_END = 140.48;

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
  oback: x => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
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
// keyframes: [[time, value, ease?], ...]   (ease applies to the segment ending at that key)
function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
      const p = t1 > t0 ? (e || E.io)((t - t0) / (t1 - t0)) : 1;
      return mixV(v0, v1, p);
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

/* ------------------------------------------------------------------ DOM */
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

/* text with per-word reveal ------------------------------------------------ */
function txt(parent, cls, text, x, y, opt = {}) {
  const el = $('div', 'ov ' + cls, parent);
  el.style.left = (opt.center ? 0 : x) + 'px';
  el.style.top = y + 'px';
  if (opt.center) { el.style.width = '1920px'; el.style.textAlign = 'center'; }
  if (opt.w) { el.style.width = opt.w + 'px'; el.style.whiteSpace = 'normal'; }
  if (opt.color) el.style.color = opt.color;
  if (opt.size) el.style.fontSize = opt.size + 'px';
  const spans = [];
  text.split('\n').forEach((line, li) => {
    if (li) el.appendChild(document.createElement('br'));
    line.split(' ').forEach((wd, wi) => {
      if (wi) el.appendChild(document.createTextNode(' '));
      const w = $('span', 'w', el), i = $('span', 'wi', w);
      i.innerHTML = wd;
      spans.push(i);
    });
  });
  el.style.display = 'none';
  return { el, spans };
}
function tshow(T, t, tin, tout, o = {}) {
  const st = o.st ?? 0.045, du = o.du ?? 0.75, fo = o.fo ?? 0.5, dy = o.dy ?? 105;
  if (t < tin - 0.001 || (tout != null && t > tout)) { show(T.el, 0); return; }
  const out = tout != null ? pr(t, tout - fo, tout, E.io) : 0;
  const tf = `translate(${(o.ox || 0) * out}px,${-(o.oy ?? 0) * out}px)`;
  show(T.el, 1 - out, tf);
  for (let i = 0; i < T.spans.length; i++) {
    const p = pr(t, tin + i * st, tin + i * st + du, E.o5);
    const s = T.spans[i];
    s.style.transform = p >= 1 ? 'none' : `translateY(${(1 - p) * dy}%)`;
    s.style.opacity = p >= 1 ? '1' : Math.min(1, p * 1.8).toFixed(3);
  }
}
// generic element fade/slide
function fshow(el, t, tin, tout, o = {}) {
  const fi = o.fi ?? 0.6, fo = o.fo ?? 0.5;
  const a = env(t, tin, tout ?? 1e9, fi, fo, E.o5, E.io);
  const pin = pr(t, tin, tin + fi, E.o5), pout = tout != null ? pr(t, tout - fo, tout, E.io) : 0;
  const dx = (o.dx || 0) * (1 - pin) + (o.ox || 0) * pout, dy = (o.dy ?? 24) * (1 - pin) - (o.oy || 0) * pout;
  const sc = o.sc ? lerp(o.sc, 1, pin) : 1;
  show(el, a, `translate(${dx}px,${dy}px)${sc !== 1 ? ` scale(${sc})` : ''}`);
  return a;
}
const tagHTML = (kind, label, src) =>
  `<span class="tag ${kind}">${label}${src ? `<span class="src">${src}</span>` : ''}</span>`;

/* ------------------------------------------------------------------ pages */
const ASPECT = { brev: 841.92 / 595.32, svar: 841.9 / 595.3, sok: 841.92 / 595.32, v1: 792 / 612, v2: 841.92 / 595.2 };
const PW = 1000;
const pageName = (doc, n) => (doc === 'v2' ? `${doc}-${String(n).padStart(2, '0')}` : `${doc}-${n}`);
const IMGS = [];

class Page {
  constructor(world, doc, n, opt = {}) {
    this.doc = doc; this.n = n; this.w = PW; this.h = PW * ASPECT[doc];
    this.el = $('div', 'page' + (opt.cls ? ' ' + opt.cls : ''), world);
    this.el.style.width = this.w + 'px';
    this.el.style.height = this.h + 'px';
    const img = $('img', null, this.el);
    img.src = `assets/pages/${opt.lo ? 'lo-' : ''}${pageName(doc, n)}.png`;
    IMGS.push(img);
    this.dimEl = $('div', 'dim', this.el);
    this.layer = $('div', null, this.el);
    this.layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    this.shadeEl = $('div', 'shade', this.el);
    this.st = { x: 0, y: 0, s: 1, r: 0, o: 1, blur: 0, shade: 0, fy: 0 };
    this.keys = null;
    this.rest = null;
  }
  set(st) {
    Object.assign(this.st, st);
    const { x, y, s, r, o, blur, shade, fy } = this.st;
    if (!show(this.el, o)) return;
    let tf = `translate(${(x - this.w / 2).toFixed(2)}px,${(y - this.h / 2).toFixed(2)}px) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
    if (Math.abs(fy) > 0.05) tf += ` perspective(2600px) rotateY(${fy.toFixed(2)}deg)`;
    this.el.style.transform = tf;
    this.el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
    this.shadeEl.style.opacity = shade.toFixed(3);
  }
  // world coords of page-normalised (u,v) for a given state
  pt(u, v, st = this.rest || this.st) {
    const s = st.s ?? 1, r = ((st.r ?? 0) * Math.PI) / 180;
    const dx = (u - 0.5) * this.w * s, dy = (v - 0.5) * this.h * s;
    return [st.x + dx * Math.cos(r) - dy * Math.sin(r), st.y + dx * Math.sin(r) + dy * Math.cos(r)];
  }
  hl(id, kind) {
    const d = window.HL[id];
    if (!d) throw new Error('missing highlight ' + id);
    const box = kind.startsWith('box'), und = kind.startsWith('u');
    const px = box ? 12 : und ? 2 : 6, py = box ? 9 : und ? 0 : 3;
    const els = d.rects.map(r => {
      const e = $('div', 'hlr', this.layer);
      e.style.left = r[0] * this.w - px + 'px';
      e.style.top = r[1] * this.h - py + 'px';
      e.style.width = r[2] * this.w + 2 * px + 'px';
      e.style.height = r[3] * this.h + 2 * py + 'px';
      const b = $('div', 'hlb ' + kind, e);
      return { e, b, w: r[2] };
    });
    const tot = els.reduce((a, x) => a + x.w, 0);
    return {
      id, page: this, rects: d.rects,
      set(p, alpha = 1) {
        let acc = 0;
        for (const x of els) {
          const a = acc / tot, b = (acc + x.w) / tot; acc += x.w;
          const q = clamp((p - a) / Math.max(1e-6, b - a));
          if (box) { x.b.style.transform = `scale(${(1.25 - 0.25 * E.o(q)).toFixed(4)})`; x.b.style.opacity = (q * alpha).toFixed(3); }
          else { x.b.style.transform = `scaleX(${q.toFixed(4)})`; x.b.style.opacity = alpha.toFixed(3); }
        }
      },
    };
  }
  dim(ids, a, pad = 18) {
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
  if (c.rz) s += ` rotate(${c.rz.toFixed(3)}deg)`;
  s += ` scale(${c.z.toFixed(5)}) translate(${(-c.cx).toFixed(2)}px,${(-c.cy).toFixed(2)}px)`;
  return s;
}
function toScreen(c, wx, wy) {
  let x = (wx - c.cx) * c.z, y = (wy - c.cy) * c.z;
  if (c.rz) { const a = (c.rz * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a); [x, y] = [x * co - y * si, x * si + y * co]; }
  if (Math.abs(c.rx || 0) > 0.02) {
    const a = (c.rx * Math.PI) / 180, d = c.pd || 1800;
    const y2 = y * Math.cos(a), z2 = y * Math.sin(a), k = d / (d - z2);
    x *= k; y = y2 * k;
  }
  return [x + 960, y + 540];
}
// camera that puts the bbox of highlight ids at screen (sx, sy) with zoom z
function look(page, ids, z, sx = 960, sy = 540, st) {
  const [u0, v0, u1, v1] = bbox(ids);
  const [wx, wy] = page.pt((u0 + u1) / 2, (v0 + v1) / 2, st);
  return { cx: wx - (sx - 960) / z, cy: wy - (sy - 540) / z, z, rx: 0 };
}
function lookPage(page, z, sx = 960, sy = 540, rx = 0, st) {
  const [wx, wy] = page.pt(0.5, 0.5, st);
  return { cx: wx - (sx - 960) / z, cy: wy - (sy - 540) / z, z, rx };
}
// screen-space rect of a highlight
function hlScreen(c, page, ids, st) {
  const [u0, v0, u1, v1] = bbox(ids);
  const a = toScreen(c, ...page.pt(u0, v0, st)), b = toScreen(c, ...page.pt(u1, v1, st));
  return { x0: a[0], y0: a[1], x1: b[0], y1: b[1] };
}

/* ------------------------------------------------------------------ scenes */
const SCENES = [];
function mkScene(a, b, fi = 0.4, fo = 0.4) {
  const root = $('div', 'scene', S('scenes'));
  const world = $('div', 'world', root);
  $('div', 'desk', world);
  // readability layers between the documents and the graphics
  const bandT = $('div', 'band-t', root), bandB = $('div', 'band-b', root);
  const panL = $('div', 'pan-l', root), panR = $('div', 'pan-r', root);
  panL.style.opacity = panR.style.opacity = '0';
  const ov = $('div', 'layer', root);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 1920); svg.setAttribute('height', 1080);
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none';
  root.appendChild(svg);
  const sc = { a, b, fi, fo, root, world, ov, svg, bandT, bandB, panL, panR, pages: [], hls: [], upd: null, cam: null };
  SCENES.push(sc);
  return sc;
}
function camApply(sc, t, keys) {
  const c = K(t, keys);
  // a touch of motion blur on fast camera moves
  const c2 = K(t - 1 / FPS, keys);
  const v = Math.hypot((c.cx - c2.cx) * c.z, (c.cy - c2.cy) * c.z) * FPS + Math.abs(Math.log(c.z / c2.z)) * 2400;
  const mb = clamp((v - 1500) / 6000, 0, 1) * 1.6;
  sc.world.style.transform = camTf(c);
  sc.world.style.filter = mb > 0.08 ? `blur(${mb.toFixed(2)}px)` : 'none';
  sc.cam = c;
  return c;
}
function pagesApply(sc, t) {
  for (const p of sc.pages) if (p.keys) p.set(K(t, p.keys));
}
function hlsApply(sc, t) {
  for (const h of sc.hls) h.h.set(pr(t, h.a, h.b, E.io2), h.out ? 1 - pr(t, h.out, h.out + 0.5) : 1);
}
// side panels behind text/callouts: amount 0..1
function panel(sc, side, a) {
  const e = side === 'l' ? sc.panL : sc.panR;
  show(e, a, `translateX(${(1 - E.o(a)) * (side === 'l' ? -120 : 120)}px)`);
}
// connector line (svg) from a doc highlight to a callout
function mkLine(sc, color, dash) {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', '2.5');
  if (dash) p.setAttribute('stroke-dasharray', '7 7');
  sc.svg.appendChild(p);
  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', '6'); dot.setAttribute('fill', color);
  sc.svg.appendChild(dot);
  return { p, dot };
}
function lineSet(L, x0, y0, x1, y1, prog, alpha) {
  if (alpha <= 0.002 || prog <= 0) { L.p.style.display = 'none'; L.dot.style.display = 'none'; return; }
  L.p.style.display = ''; L.dot.style.display = '';
  const mx = x0 + (x1 - x0) * 0.55;
  const xe = lerp(x0, x1, prog), ye = lerp(y0, y1, prog);
  // elbow line: horizontal out from the document, then to the callout
  const d = prog < 0.55 ? `M${x0},${y0} L${lerp(x0, mx, prog / 0.55)},${y0}`
    : `M${x0},${y0} L${mx},${y0} L${lerp(mx, x1, (prog - 0.55) / 0.45)},${lerp(y0, y1, (prog - 0.55) / 0.45)}`;
  L.p.setAttribute('d', d);
  L.p.style.opacity = alpha; L.dot.style.opacity = alpha;
  L.dot.setAttribute('cx', x0); L.dot.setAttribute('cy', y0);
  void xe; void ye;
}

/* callout: big figure pulled out of a document ------------------------------ */
function mkCallout(sc, x, y, o) {
  const el = $('div', 'co', sc.ov);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  const acc = $('div', 'acc', el); acc.style.background = o.kind === 'm' ? 'var(--gl)' : 'var(--bl)';
  const num = $('div', 'num', el);
  $('div', 'lab', el, o.lab);
  const tg = $('div', 'tg', el, tagHTML(o.kind, o.kind === 'm' ? 'Målt' : 'Modellscenario', o.src));
  el.style.display = 'none';
  return {
    el, num, o,
    set(t, a, b) {
      const vis = fshow(el, t, a, b, { dx: 40, dy: 0, fi: 0.55, fo: 0.45, ox: 0 });
      if (!vis) return;
      const p = pr(t, a + 0.05, a + 0.05 + (o.cnt ?? 0.9), E.o5);
      const v = o.to * p + (o.from ?? 0) * (1 - p);
      num.innerHTML = (o.pre ? `<span class="u" style="margin:0 12px 0 0">${o.pre}</span>` : '') + nf(v, o.dec || 0) +
        (o.unit ? `<span class="u">${o.unit}</span>` : '');
      tg.style.opacity = pr(t, a + 0.35, a + 0.8).toFixed(3);
    },
  };
}

/* ------------------------------------------------------------------ build */
let OV, TL, TLG;
function build() {
  OV = S('ov');
  TL = S('tl'); TLG = TL.getContext('2d');
  makeGrain();
  buildHeroDates();
  buildChapters();
  sceneIntro();
  sceneTilsyn();
  scenePlukk();
  sceneBrev();
  sceneSvar();
  sceneSommer();
  sceneSoknad();
  buildFinal();
}

function makeGrain() {
  const c = S('grain'), g = c.getContext('2d');
  const id = g.createImageData(1920, 1080);
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 160;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}

/* hero date cards (shown while the timeline is large) ---------------------- */
const HERO = [
  { a: 9.5, b: 16.4, k: 'Statsforvalteren i Nordland', d: '6. november 2025', s: 'Tilsynsrapport · Brønnøy kommune · saksnr. 2025/4779' },
  { a: 27.0, b: 29.7, k: 'Iris Produksjon for SHMIL', d: '9.–10. desember 2025', s: 'Plukkanalyse av husholdningsavfall' },
  { a: 35.9, b: 38.4, k: 'SHMIL → Miljødirektoratet', d: '15. januar 2026', s: 'Henvendelse om behov for regelverksavklaringer' },
  { a: 63.4, b: 65.6, k: 'Miljødirektoratet → SHMIL', d: '7. mai 2026', s: 'Svar på henvendelse om avfallsforskriften kapittel 10a', kc: 't' },
  { a: 93.6, b: 97.3, k: 'Juni · juli · august', d: 'Sommeren 2026', s: 'Dokumentasjon, analyser og beregninger' },
  { a: 124.0, b: 126.3, k: 'SHMIL → Miljødirektoratet', d: '31. august 2026', s: 'Søknad om tidsbegrenset unntak etter avfallsforskriften § 19-4' },
];
function buildHeroDates() {
  for (const h of HERO) {
    h.K = txt(OV, 'kicker' + (h.kc ? ' ' + h.kc : ''), h.k, 0, 300, { center: true });
    h.D = txt(OV, 'h1', h.d.toUpperCase(), 0, 345, { center: true });
    h.S = txt(OV, 'lead', h.s, 0, 498, { center: true });
  }
}
function heroUpdate(t) {
  for (const h of HERO) {
    tshow(h.K, t, h.a, h.b, { st: 0.02, fo: 0.45, oy: 30 });
    tshow(h.D, t, h.a + 0.08, h.b, { st: 0.06, du: 0.8, fo: 0.45, oy: 40 });
    tshow(h.S, t, h.a + 0.45, h.b - 0.05, { st: 0.025, fo: 0.4, oy: 30 });
  }
}

/* chapter indicator ------------------------------------------------------- */
const CH = [
  { a: 9.6, b: 35.2, n: '01', l: 'Tilsyn og oppfølging' },
  { a: 35.6, b: 61.7, n: '02', l: 'Henvendelse' },
  { a: 62.0, b: 92.5, n: '03', l: 'Avklaring' },
  { a: 92.9, b: 123.3, n: '04', l: 'Dokumentasjon' },
  { a: 123.6, b: 140.2, n: '05', l: 'Søknad' },
];
function buildChapters() {
  for (const c of CH) {
    c.el = $('div', 'ov', OV, `<span style="font:600 22px FM;color:var(--gl);margin-right:16px">${c.n}</span><span style="font:600 20px FS;letter-spacing:.24em;text-transform:uppercase;color:var(--soft)">${c.l}</span>`);
    c.el.style.left = '80px'; c.el.style.top = '62px';
    c.el.style.display = 'none';
  }
}
function chaptersUpdate(t, heroAmt) {
  for (const c of CH) {
    const a = env(t, c.a, c.b, 0.6, 0.4) * (1 - heroAmt);
    show(c.el, a, 'none');
  }
}

/* ================================================================== S0 intro */
let INTRO;
function sceneIntro() {
  const sc = mkScene(0, 9.4, 0.01, 1.0);
  const list = [['brev', 1, -1500, -500, -7], ['svar', 1, -200, -900, 4], ['sok', 1, 1300, -600, 6], ['v1', 1, 2500, -200, -4],
    ['v2', 1, -2600, 400, 5], ['sok', 2, 400, 700, -3], ['v2', 13, 1700, 900, 3], ['brev', 4, -1100, 1150, 2], ['v1', 2, -300, -2300, -2],
    ['brev', 2, 2300, -1500, 8], ['svar', 3, -2600, -1600, -6]];
  for (const [d, n, x, y, r] of list) {
    const p = new Page(sc.world, d, n, { lo: true });
    p.set({ x, y, r, s: 1, o: 1, shade: 0.62, blur: 3 });
    sc.pages.push(p);
  }
  const ov = sc.ov;
  const k = txt(ov, 'kicker', 'SHMIL IKS · Søndre Helgeland Miljøverk', 0, 352, { center: true });
  const ti = txt(ov, 'h1', 'Fra tilsynsavvik til søknad', 0, 392, { center: true, size: 112 });
  const line = $('div', 'ov', ov);
  line.style.cssText += ';left:360px;top:560px;width:1200px;height:2px;background:linear-gradient(90deg,rgba(60,199,154,0),#3cc79a 30%,#3cc79a 70%,rgba(60,199,154,0))';
  const s1 = txt(ov, 'lead', 'SHMILs oppfølging av kravet om henteordning', 0, 592, { center: true });
  const s2 = txt(ov, 'mono', 'NOVEMBER 2025 – AUGUST 2026', 0, 656, { center: true });
  const camK = [[0, { cx: 0, cy: -100, z: 0.3, rx: 26 }], [9.4, { cx: 260, cy: 40, z: 0.37, rx: 22 }, E.lin]];
  sc.upd = t => {
    camApply(sc, t, camK);
    tshow(k, t, 0.7, 8.0, { st: 0.03, oy: 40 });
    tshow(ti, t, 1.0, 8.05, { st: 0.09, du: 0.9, oy: 50 });
    const lp = pr(t, 0.13, 2.0, E.io5);
    show(line, 1 - pr(t, 7.4, 8.1), `scaleX(${lp})`);
    tshow(s1, t, 2.1, 8.1, { st: 0.035, oy: 30 });
    tshow(s2, t, 2.9, 8.1, { st: 0.04, oy: 30 });
  };
  sc.bandT.style.display = sc.bandB.style.display = 'none';
  INTRO = sc;
}

/* ================================================================== S1 tilsyn */
function sceneTilsyn() {
  const sc = mkScene(16.3, 26.7, 0.6, 0.5);
  const ov = sc.ov;
  const camK = [[16.3, { cx: 0, cy: 0, z: 0.42, rx: 24 }], [26.7, { cx: 420, cy: -60, z: 0.46, rx: 22 }, E.lin]];
  const k = txt(ov, 'kicker', 'Statsforvalterens tilsynsrapport · 6. november 2025', 150, 236);
  const h = txt(ov, 'h2', 'Tilsynsavvik –\nkrav om henteordning', 150, 280);
  const q = txt(ov, 'quote', '«Kommunen har ikke etablert henteordning for alt papp- og papiravfall og glass- og metallemballasjeavfall fra husholdningene»', 150, 548, { w: 960 });
  const src = txt(ov, 'small', 'Avviket i tilsynsrapporten 06.11.2025 (saksnr. 2025/4779), slik det er gjengitt i SHMILs brev av 15.01.2026', 150, 780, { w: 980 });
  const cards = [['Papp og papir', 300], ['Glass- og metallemballasje', 486]].map(([ttl, y]) => {
    const c = $('div', 'card', ov, `<div class="bar"></div><div class="lbl">Henteordning mangler</div><div class="ttl">${ttl}</div>`);
    c.style.left = '1230px'; c.style.top = y + 'px'; c.style.display = 'none';
    return c;
  });
  sc.upd = t => {
    camApply(sc, t, camK);
    tshow(k, t, 17.5, 26.2, { st: 0.02, ox: -60, oy: 0 });
    tshow(h, t, P(2), 26.25, { st: 0.07, du: 0.9, ox: -60, oy: 0 });
    fshow(cards[0], t, 19.95, 26.3, { dx: 60, dy: 0, ox: 60 });
    fshow(cards[1], t, 20.5, 26.3, { dx: 60, dy: 0, ox: 60 });
    tshow(q, t, 21.95, 26.3, { st: 0.028, du: 0.6, ox: -60, oy: 0 });
    tshow(src, t, 23.4, 26.3, { st: 0.012, ox: -60, oy: 0 });
  };
  sc.bandT.style.display = sc.bandB.style.display = 'none';
}

/* ================================================================== S1b plukkanalyse */
function scenePlukk() {
  const sc = mkScene(27.6, 35.9, 0.5, 0.6);
  const W = sc.world;
  const p13 = new Page(W, 'v2', 13, { lo: true });
  const p5 = new Page(W, 'v2', 5, { lo: true });
  const cov = new Page(W, 'v2', 1);
  sc.pages.push(p13, p5, cov);
  cov.rest = { x: 0, y: 0, s: 1, r: -1.2 };
  p5.keys = [[27.6, { x: 2900, y: 500, s: 1, r: 10, o: 1, shade: 0.3 }], [29.6, { x: 620, y: 90, s: 1, r: 3.5, o: 1, shade: 0.3 }, E.o5]];
  p13.keys = [[27.6, { x: 3300, y: 300, s: 1, r: 12, o: 1, shade: 0.35 }], [29.9, { x: 1180, y: -60, s: 1, r: 2, o: 1, shade: 0.35 }, E.o5]];
  cov.keys = [[28.0, { x: 2800, y: 700, s: 1, r: 9, o: 1, shade: 0 }], [30.3, { x: 0, y: 0, s: 1, r: -1.2, o: 1, shade: 0 }, E.o5]];
  const hDate = cov.hl('v2_dato', 'u-g');
  sc.hls.push({ h: hDate, a: 32.2, b: 33.0 });
  const camK = [
    [27.6, { cx: 1100, cy: 300, z: 0.3, rx: 24 }],
    [30.6, { cx: -430, cy: 10, z: 0.66, rx: 7 }, E.io],
    [35.9, { cx: -360, cy: -20, z: 0.75, rx: 0 }, E.io2],
  ];
  const ov = sc.ov;
  const chip = $('div', 'ov', ov, '<span class="chip iris"><span class="dot"></span>Iris Produksjon · Plukkanalyse SHMIL 2025 · 21 sider</span>');
  chip.style.left = '1180px'; chip.style.top = '52px';
  const k = txt(ov, 'kicker', 'Uavhengig analyse', 150, 300);
  const h = txt(ov, 'h3', 'Plukkanalyse av\nSHMILs avfall', 150, 340);
  const b = txt(ov, 'body', 'Gjennomført i Mosjøen av Iris Produksjon. Glass- og metallemballasje fra returpunktene inngår i analysen.', 150, 500, { w: 720 });
  const tg = $('div', 'ov', ov, tagHTML('m', 'Målt', '9.–10. desember 2025'));
  tg.style.left = '150px'; tg.style.top = '664px';
  const n = txt(ov, 'small', 'Resultatene blir en del av dokumentasjonsgrunnlaget (Vedlegg 2).', 150, 740, { w: 720 });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    camApply(sc, t, camK);
    fshow(chip, t, 30.4, 35.5, { dy: -16 });
    tshow(k, t, 30.5, 35.5, { st: 0.02 });
    tshow(h, t, 30.6, 35.5, { st: 0.07 });
    tshow(b, t, 31.3, 35.5, { st: 0.02 });
    fshow(tg, t, 32.2, 35.5, { dx: -20, dy: 0 });
    tshow(n, t, 33.0, 35.5, { st: 0.015 });
  };
}

/* ================================================================== S2 brev 15.01.2026 */
function sceneBrev() {
  const sc = mkScene(37.0, 63.2, 0.3, 1.2);
  const W = sc.world;
  const pages = [];
  for (let i = 7; i >= 1; i--) pages[i] = new Page(W, 'brev', i, { lo: i >= 4 && i !== 5 && i !== 6 });
  for (let i = 7; i >= 1; i--) sc.pages.push(pages[i]);
  const rot = [0, -0.6, 0.4, -0.3, 0.5, -0.4, 0.3, -0.5];
  const GAP = 1120;
  for (let i = 1; i <= 7; i++) {
    const p = pages[i];
    const stack = { x: i * 7, y: i * 6, s: 1, r: -0.6 + (i - 1) * 0.9, o: 1, shade: i === 1 ? 0 : 0.2 + i * 0.03 };
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: rot[i], o: 1, shade: 0 };
    p.rest = row;
    const keys = [[37.2, { ...stack, x: stack.x - 260, y: stack.y + 1700, r: stack.r - 9 }],
      [39.4 + i * 0.03, stack, E.o5]];
    if (i > 1) { keys.push([46.0 + (i - 2) * 0.13, stack], [47.5 + (i - 2) * 0.13, row, E.io]); }
    // riffle: a little lift on each page as the camera pulls back
    const tp = 59.7 + (i - 1) * 0.2775;
    keys.push([tp, row], [tp + 0.2, { ...row, s: 1.045, y: -30 }, E.o], [tp + 0.5, row, E.io]);
    p.keys = keys;
  }
  pages[1].rest = { x: 0, y: 0, s: 1, r: rot[1] };
  const [p1, p2, p3] = [pages[1], pages[2], pages[3]];
  const H = (pg, id, kind, a, b) => { const h = pg.hl(id, kind); sc.hls.push({ h, a, b }); return h; };
  H(p1, 'brev_ref', 'u-g', 41.0, 41.6);
  H(p1, 'brev_dato', 'm-g', 41.3, 42.0);
  H(p1, 'brev_tittel', 'u-g', 42.7, 43.9);
  H(p1, 'brev_prinsipielle', 'm-g', 44.5, 45.8);
  H(p2, 'brev_metoden', 'm-g', 48.1, 50.8);
  H(p2, 'brev_samlet', 'm-g', 53.3, 54.7);
  H(p2, 'brev_998', 'm-g', 55.9, 56.9);
  H(p3, 'brev_mangedobling', 'm-g', 58.5, 58.95);
  H(p3, 'brev_ferge', 'm-g', 58.9, 59.7);
  H(p2, 'brev_h1', 'm-g', 60.5, 61.0);
  H(pages[5], 'brev_h2', 'm-g', 60.8, 61.3);
  H(pages[6], 'brev_h3', 'm-g', 61.1, 61.6);

  const camK = [
    [37.2, { cx: 260, cy: 520, z: 0.4, rx: 26 }],
    [39.7, { cx: 20, cy: 40, z: 0.64, rx: 7 }, E.io],
    [40.9, look(p1, ['brev_ref', 'brev_dato'], 2.0, 960, 520), E.io],
    [41.9, look(p1, ['brev_ref', 'brev_dato'], 2.05, 960, 520), E.lin],
    [42.7, look(p1, ['brev_tittel'], 1.75, 960, 520), E.io],
    [43.9, look(p1, ['brev_tittel'], 1.78, 960, 520), E.lin],
    [44.9, look(p1, ['brev_prinsipielle'], 1.55, 960, 420), E.io],
    [46.4, look(p1, ['brev_prinsipielle'], 1.58, 960, 420), E.lin],
    [47.8, look(p2, ['brev_metoden'], 1.6, 960, 400), E.io],
    [52.5, look(p2, ['brev_metoden'], 1.68, 960, 400), E.lin],
    [53.4, look(p2, ['brev_samlet'], 1.6, 960, 410), E.io],
    [55.0, look(p2, ['brev_samlet'], 1.62, 960, 410), E.lin],
    [55.8, look(p2, ['brev_998'], 1.38, 590, 430), E.io],
    [57.8, look(p2, ['brev_998'], 1.42, 590, 430), E.lin],
    [58.6, look(p3, ['brev_ferge', 'brev_mangedobling'], 1.3, 960, 420), E.io],
    [59.6, look(p3, ['brev_ferge', 'brev_mangedobling'], 1.32, 960, 420), E.lin],
    [61.1, { cx: 3 * GAP, cy: 20, z: 0.215, rx: 8 }, E.io],
    [63.2, { cx: 3 * GAP, cy: 20, z: 0.205, rx: 10 }, E.lin],
  ];
  const ov = sc.ov;
  const chip = $('div', 'ov', ov, '<span class="chip"><span class="dot"></span>SHMIL · Brev 15.01.2026 · Ref. 53/26-HJ · 7 sider</span>');
  chip.style.left = '1150px'; chip.style.top = '52px';
  const L = (k, h, a, b, y = 800) => ({ k: txt(ov, 'kicker', k, 150, y - 40), h: txt(ov, 'h3', h, 150, y), a, b });
  const lows = [
    L('Henvendelse til Miljødirektoratet', 'SHMIL ber om prinsipielle avklaringer', P(5), 47.4),
    L('Kjernespørsmålet i brevet', 'Metoden eller miljøgevinsten?', 48.6, 52.9),
    L('Forurensningsloven', 'Samlet vurdering av miljø, ressurser og økonomi', 53.6, 55.5),
    L('Geografi og transport', 'Over 1 100 timer i året i fergekø og fergetid', 58.7, 60.3),
  ];
  const co = mkCallout(sc, 1240, 250, { to: 99.8, dec: 1, unit: '%', kind: 'm', lab: 'av arealet i SHMILs eierkommuner er spredtbygd strøk', src: 'SSB, gjengitt i brevet', cnt: 1.0 });
  co.el.querySelector('.tg').innerHTML = '<span class="mono">Kilde: SSB (tabell 04859), gjengitt i brevet</span>';
  const ln = mkLine(sc, '#3cc79a');
  // overview of the whole letter
  const stat = txt(ov, 'h3', '7 sider · 3 tema · 6 spørsmål', 0, 150, { center: true });
  const nums = [2, 5, 6].map((pg, i) => {
    const e = $('div', 'ov', ov, `<div style="width:58px;height:58px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;font:600 30px FD;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.4)">${i + 1}</div>`);
    e.style.display = 'none';
    return { e, pg };
  });
  const legend = $('div', 'ov', ov, ['Materialgjenvinning og innsatsfaktorer', 'Unntak i distriktsregioner', 'Finansiering og produsentansvar']
    .map((s, i) => `<span style="display:inline-flex;align-items:center;gap:14px;margin:0 26px"><span style="font:600 26px FD;color:var(--gl)">${i + 1}</span><span style="font:400 27px FS;color:var(--soft)">${s}</span></span>`).join(''));
  legend.style.cssText += ';left:0;width:1920px;text-align:center;top:800px';
  legend.style.display = 'none';

  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    p2.dim(['brev_metoden'], 0.42 * env(t, 48.2, 53.2, 0.6, 0.6));
    fshow(chip, t, 39.4, 60.6, { dy: -16 });
    for (const l of lows) { tshow(l.k, t, l.a, l.b, { st: 0.02 }); tshow(l.h, t, l.a + 0.06, l.b, { st: 0.05 }); }
    panel(sc, 'r', env(t, 55.9, 58.4, 0.5, 0.5));
    co.set(t, 56.3, 58.3);
    const r = hlScreen(c, p2, ['brev_998']);
    lineSet(ln, r.x1 + 14, (r.y0 + r.y1) / 2, 1200, 310, pr(t, 56.0, 56.6), env(t, 56.0, 58.3, 0.2, 0.4));
    tshow(stat, t, 60.4, 62.4, { st: 0.06 });
    for (const n of nums) {
      const pg = pages[n.pg];
      const [sx, sy] = toScreen(c, ...pg.pt(0.5, 0, pg.rest));
      n.e.style.left = sx - 29 + 'px'; n.e.style.top = sy - 86 + 'px';
      fshow(n.e, t, 60.6 + nums.indexOf(n) * 0.28, 62.4, { dy: 14, sc: 0.6 });
    }
    fshow(legend, t, 61.0, 62.4, { dy: 20 });
  };
}

/* ================================================================== S3 svar 07.05.2026 */
let SVAR;
function sceneSvar() {
  const sc = mkScene(64.2, 93.2, 0.4, 0.8);
  const W = sc.world;
  // SHMIL's letter as a pile on the left
  const pile = [];
  for (let i = 7; i >= 1; i--) {
    const p = new Page(W, 'brev', i, { lo: true });
    const rest = { x: -1500 + i * 8, y: 120 + i * 7, s: 0.92, r: -5 + i * 0.7, o: 1, shade: 0.25 + i * 0.02 };
    p.keys = [[64.2, { ...rest, x: rest.x - 1600, r: rest.r - 8 }], [66.0, rest, E.o5]];
    pile.push(p); sc.pages.push(p);
  }
  const sv = [];
  for (let i = 3; i >= 1; i--) sv[i] = new Page(W, 'svar', i, { cls: 'mdir' });
  for (let i = 3; i >= 1; i--) sc.pages.push(sv[i]);
  const GAPY = 1530;
  for (let i = 1; i <= 3; i++) {
    const stack = { x: i * 8, y: i * 7, s: 1, r: 0.6 - (i - 1) * 1.1, o: 1, shade: i === 1 ? 0 : 0.25 };
    const col = { x: 0, y: (i - 1) * GAPY, s: 1, r: [0, 0.5, -0.4, 0.3][i], o: 1, shade: 0 };
    sv[i].rest = col;
    const keys = [[64.6, { ...stack, x: stack.x + 2700, y: stack.y - 300, r: stack.r + 8 }], [66.3 + i * 0.04, stack, E.o5]];
    if (i > 1) keys.push([P(8) + (i - 2) * 0.15, stack], [P(8) + 1.1 + (i - 2) * 0.15, col, E.io]);
    sv[i].keys = keys;
  }
  sv[1].rest = { x: 0, y: 0, s: 1, r: 0.5 };
  const H = (pg, id, kind, a, b, out) => { const h = pg.hl(id, kind); sc.hls.push({ h, a, b, out }); return h; };
  H(sv[1], 'svar_dato', 'm-b', 67.7, 68.2);
  H(sv[1], 'svar_tittel', 'u-b', 68.0, 68.9);
  H(sv[1], 'svar_mottatt', 'm-b', 69.3, 70.2);
  H(sv[1], 'svar_seks', 'm-b', 70.1, 70.7);
  H(sv[2], 'svar_ingen', 'm-b', 72.3, 74.3);
  H(sv[2], 'svar_plikten', 'm-b', 74.5, 75.7);
  H(sv[3], 'svar_ventil', 'm-b', 78.6, 79.4, 83.2);
  const box1994 = H(sv[3], 'svar_1994', 'box-b', P(9), P(9) + 0.4, 83.2);
  H(sv[3], 'svar_urimelig', 'm-g', 84.0, 85.2, 88.0);
  H(sv[3], 'svar_myetil', 'm-g', 85.3, 86.6, 88.0);
  H(sv[3], 'svar_info', 'm-b', P(10) + 0.3, P(10) + 1.7);
  void box1994;

  const s3 = sv[3];
  const camK = [
    [64.4, { cx: -700, cy: 150, z: 0.33, rx: 22 }],
    [66.4, { cx: -330, cy: 30, z: 0.47, rx: 8 }, E.io],
    [67.5, look(sv[1], ['svar_dato', 'svar_tittel'], 1.5, 960, 520), E.io],
    [68.6, look(sv[1], ['svar_dato', 'svar_tittel'], 1.52, 960, 520), E.lin],
    [69.3, look(sv[1], ['svar_mottatt', 'svar_seks'], 1.48, 960, 470), E.io],
    [70.6, look(sv[1], ['svar_mottatt', 'svar_seks'], 1.5, 960, 470), E.lin],
    [71.9, look(sv[2], ['svar_ingen', 'svar_plikten'], 1.3, 1270, 500), E.io],
    [77.2, look(sv[2], ['svar_ingen', 'svar_plikten'], 1.36, 1270, 500), E.lin],
    [78.5, look(s3, ['svar_ventil'], 1.75, 960, 520), E.io],
    [P(9), look(s3, ['svar_ventil'], 1.8, 960, 520), E.lin],
    [83.0, look(s3, ['svar_1994'], 2.3, 960, 520), E.io2],
    [84.0, look(s3, ['svar_urimelig', 'svar_myetil'], 1.3, 1270, 500), E.io],
    [87.8, look(s3, ['svar_urimelig', 'svar_myetil'], 1.36, 1270, 500), E.lin],
    [P(10) + 0.3, look(s3, ['svar_info'], 1.5, 960, 420), E.io],
    [93.2, look(s3, ['svar_info'], 1.58, 960, 420), E.lin],
  ];
  const ov = sc.ov;
  const chip = $('div', 'ov', ov, '<span class="chip mdir"><span class="dot"></span>Miljødirektoratet · Svar 07.05.2026 · Ref. 2025/7993 · 3 sider</span>');
  chip.style.left = '1080px'; chip.style.top = '52px';
  const lblA = $('div', 'ov', ov, '<span class="mono" style="color:var(--gl)">SHMIL · 15.01.2026</span>');
  const lblB = $('div', 'ov', ov, '<span class="mono" style="color:var(--tl)">MILJØDIREKTORATET · 07.05.2026</span>');
  const M = (n, ttl, sub, a, b) => {
    const e = $('div', 'msg', ov, `<div class="n">${n}</div><div class="t">${ttl}</div><div class="s">${sub}</div>`);
    e.style.left = '130px'; e.style.top = '270px'; e.style.display = 'none';
    return { e, a, b };
  };
  const m1 = M('1', 'Kravet om henteordning gjelder i utgangspunktet – også når en bringeordning gir god utsortering.',
    'Plikten gjelder uavhengig av målkravet for utsorteringsandel.', 73.2, 77.7);
  const m2 = M('2', '§ 19-4 åpner for unntak dersom kravene slår urimelig ut i konkrete tilfeller – men terskelen er høy.',
    '«… det skal mye til for at det skal være aktuelt å benytte denne unntakshjemmelen.»', 84.3, 88.0);
  m2.e.querySelector('.n').style.borderColor = 'var(--gl)'; m2.e.querySelector('.n').style.color = 'var(--gl)';
  // the § 19-4 turning point
  const para = $('div', 'ov para', ov, '§ 19-4');
  para.style.transformOrigin = '0 0'; para.style.display = 'none';
  const paraSub = txt(ov, 'h4', 'Avfallsforskriftens generelle sikkerhetsventil for unntak', 0, 690, { center: true });
  const paraK = txt(ov, 'kicker t', 'Miljødirektoratet viser til', 0, 300, { center: true });
  const vScrim = $('div', 'layer', ov); vScrim.style.background = '#0b1114'; vScrim.style.opacity = 0;
  ov.insertBefore(vScrim, para);
  const lk = txt(ov, 'kicker', 'Prinsipiell avklaring – ikke et avslag', 150, 760);
  const lh = txt(ov, 'h3', 'Direktoratet manglet grunnlag for å vurdere unntak', 150, 800);
  const lb = txt(ov, 'kicker g', 'SHMIL går i gang med å skaffe grunnlaget', 150, 892);

  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    sv[2].dim(['svar_ingen', 'svar_plikten'], 0.4 * env(t, 72.0, 77.6, 0.6, 0.6));
    s3.dim(t < 87 ? ['svar_ventil'] : ['svar_info'], 0.48 * Math.max(env(t, 78.4, 83.4, 0.6, 0.6), env(t, P(10) + 0.2, 93.2, 0.6, 0.3)));
    fshow(chip, t, 67.4, 92.6, { dy: -16 });
    // dialogue labels on the wide shot
    {
      const a = toScreen(c, -1500, 120 - 0.92 * 707 - 40), b = toScreen(c, 0, -707 - 40);
      lblA.style.left = a[0] - 120 + 'px'; lblA.style.top = a[1] - 10 + 'px';
      lblB.style.left = b[0] - 200 + 'px'; lblB.style.top = b[1] - 10 + 'px';
      fshow(lblA, t, 65.6, 67.2, { dy: 10 }); fshow(lblB, t, 65.8, 67.2, { dy: 10 });
    }
    panel(sc, 'l', Math.max(env(t, 72.9, 77.9, 0.6, 0.6), env(t, 84.0, 88.2, 0.6, 0.6)));
    for (const m of [m1, m2]) fshow(m.e, t, m.a, m.b, { dx: -40, dy: 0, fi: 0.7, ox: -40 });
    // § 19-4 flies out of the letter and becomes the turning point
    const r = hlScreen(c, s3, ['svar_1994'], s3.rest);
    const t1 = P(9) + 0.45, t2 = t1 + 1.25, t3 = 83.0, t4 = 83.7;
    const glyphH = 300, srcH = (r.y1 - r.y0) * 1.05;
    const startS = srcH / glyphH * 1.05;
    const startX = r.x0 - 4, startY = r.y0 - srcH * 0.18;
    const endS = 1, endW = 940 * endS, endX = 960 - endW / 2, endY = 360;
    const badgeS = 0.17, badgeX = 80, badgeY = 104;
    let ps, px, py;
    const pa = pr(t, t1, t2, E.io5), pb = pr(t, t3, t4, E.io);
    ps = lerp(lerp(startS, endS, pa), badgeS, pb);
    px = lerp(lerp(startX, endX, pa), badgeX, pb);
    py = lerp(lerp(startY, endY, pa), badgeY, pb);
    const col = pr(t, t2 - 0.3, t2 + 0.9);
    para.style.color = `rgb(${lerp(104, 60, col)},${lerp(182, 199, col)},${lerp(220, 154, col)})`;
    show(para, env(t, t1, 92.6, 0.25, 0.5), `translate(${px}px,${py}px) scale(${ps})`);
    vScrim.style.opacity = (0.9 * env(t, t1, t4 + 0.2, 0.9, 0.7)).toFixed(3);
    tshow(paraK, t, t1 + 0.5, t3 + 0.2, { st: 0.03 });
    tshow(paraSub, t, t2 - 0.2, t3 + 0.2, { st: 0.04 });
    tshow(lk, t, P(10) + 0.5, 92.9, { st: 0.02 });
    tshow(lh, t, P(10) + 0.6, 92.9, { st: 0.05 });
    tshow(lb, t, 90.9, 92.9, { st: 0.03 });
    S('tint').style.opacity = (env(t, 63.2, 93.0, 2.0, 1.2)).toFixed(3);
  };
  SVAR = sc;
}

/* ================================================================== S4 sommeren 2026 */
function sceneSommer() {
  const sc = mkScene(95.2, 124.4, 0.6, 1.0);
  const W = sc.world;
  const XU = 1130, YR = 1830;
  const grid = [
    ['v1', 1, 0, 0, false], ['v1', 2, 1, 0, false], ['v1', 3, 2, 0, true], ['v1', 4, 3, 0, true], ['sok', 2, 4.15, 0, false], ['sok', 3, 5.15, 0, true],
    ['v2', 1, 0, 1, true], ['v2', 5, 1, 1, true], ['v2', 13, 2, 1, false], ['v2', 17, 3, 1, true], ['sok', 4, 4.15, 1, true], ['sok', 5, 5.15, 1, true],
  ];
  const pg = {};
  const order = [0, 6, 1, 7, 2, 8, 3, 9, 4, 10, 5, 11];
  const CX = 2900, CY = 950;
  grid.forEach((g, gi) => {
    const [d, n, col, row, lo] = g;
    const p = new Page(W, d, n, { lo });
    const rest = { x: col * XU, y: row * YR + (d === 'v1' ? -60 : 0), s: 1, r: ((gi * 37) % 7 - 3) * 0.35, o: 1, shade: 0 };
    p.rest = rest;
    const k = order.indexOf(gi);
    const td = 95.6 + k * 0.137;
    const stack = { x: CX + (k % 4) * 10, y: CY + (k % 3) * 9, s: 0.62, r: (k % 5 - 2) * 1.6, o: 1, shade: 0.15 };
    p.keys = [[td, { ...rest, y: rest.y - 260, s: 1.18, o: 0, shade: 0.2 }], [td + 0.55, rest, E.o5],
      [121.0 + k * 0.09, rest], [122.6 + k * 0.09, stack, E.io]];
    pg[pageName(d, n)] = p;
    sc.pages.push(p);
  });
  const v11 = pg['v1-1'], v12 = pg['v1-2'], v213 = pg['v2-13'], s2 = pg['sok-2'];
  const H = (p, id, kind, a, b) => { const h = p.hl(id, kind); sc.hls.push({ h, a, b }); return h; };
  const P11 = P(11), P12 = P(12), P13 = P(13);
  H(v12, 'v1_44_lbl', 'm-g', P11 + 2.3, P11 + 2.7); H(v12, 'v1_44', 'm-g', P11 + 2.6, P11 + 2.9);
  H(v11, 'v1_5795', 'm-g', P11 + 4.8, P11 + 5.1); H(v11, 'v1_5795_status', 'm-g', P11 + 5.0, P11 + 5.4);
  H(v213, 'v2_939_pie', 'box-g', P11 + 7.1, P11 + 7.6);
  H(s2, 'sok_t_hdr', 'u-b', P12 + 0.8, P12 + 1.2);
  H(s2, 'sok_t_8650', 'm-b', P12 + 1.15, P12 + 1.5); H(s2, 'sok_t_56000', 'm-b', P12 + 1.45, P12 + 1.75); H(s2, 'sok_t_9228', 'm-b', P12 + 1.7, P12 + 2.0);
  H(s2, 'sok_t_457', 'm-b', P12 + 3.1, P12 + 3.5);
  H(s2, 'sok_t_339', 'm-b', P12 + 4.6, P12 + 5.0); H(s2, 'sok_t_74286', 'm-b', P12 + 4.9, P12 + 5.3);
  H(v11, 'v1_maalt', 'm-g', 118.9, 119.6); H(v11, 'v1_modell', 'm-b', 119.5, 120.4);

  const wide = (z, rx) => ({ cx: CX, cy: CY, z, rx });
  const camK = [
    [95.2, wide(0.18, 26)],
    [P11, wide(0.215, 13), E.o],
    [P11 + 1.0, wide(0.222, 11), E.lin],
    [P11 + 2.2, look(v12, ['v1_44_lbl', 'v1_44'], 1.55, 640, 540), E.io],
    [P11 + 4.2, look(v12, ['v1_44_lbl', 'v1_44'], 1.6, 640, 540), E.lin],
    [P11 + 4.9, look(v11, ['v1_5795', 'v1_5795_status'], 1.6, 640, 540), E.io],
    [P11 + 6.4, look(v11, ['v1_5795', 'v1_5795_status'], 1.64, 640, 540), E.lin],
    [P11 + 7.2, look(v213, ['v2_939_pie'], 1.2, 600, 560), E.io],
    [P12, look(v213, ['v2_939_pie'], 1.24, 600, 560), E.lin],
    [P12 + 0.9, look(s2, ['sok_t_hdr', 'sok_t_8650', 'sok_t_9228'], 1.15, 760, 500), E.io],
    [P12 + 2.3, look(s2, ['sok_t_hdr', 'sok_t_8650', 'sok_t_9228'], 1.18, 760, 500), E.lin],
    [P12 + 3.0, look(s2, ['sok_t_457', 'sok_t_339', 'sok_t_74286'], 1.15, 760, 520), E.io],
    [P13 - 0.3, look(s2, ['sok_t_457', 'sok_t_339', 'sok_t_74286'], 1.2, 760, 520), E.lin],
    [P13 + 1.0, wide(0.215, 12), E.io],
    [117.4, wide(0.222, 10), E.lin],
    [118.6, look(v11, ['v1_maalt', 'v1_modell'], 1.4, 960, 430), E.io],
    [120.8, look(v11, ['v1_maalt', 'v1_modell'], 1.44, 960, 430), E.lin],
    [122.3, { cx: CX, cy: CY + 40, z: 0.42, rx: 8 }, E.io],
    [124.4, { cx: CX, cy: CY + 40, z: 0.46, rx: 6 }, E.lin],
  ];
  const ov = sc.ov;
  // group labels in the wide shots
  const glab = (html, page, dx) => { const e = $('div', 'ov', ov, html); e.style.display = 'none'; return { e, page, dx }; };
  const G = [
    glab('<span class="kicker">Vedlegg 1</span><br><span class="body">Nøkkeltall, kilder og datastatus</span>', v11, 0),
    glab('<span class="kicker">Vedlegg 2</span><br><span class="body">Plukkanalyse · des. 2025</span>', pg['v2-01'], 0),
    glab('<span class="kicker b">Søknaden</span><br><span class="body">Mengde- og kostnadsgrunnlag</span>', s2, 0),
  ];
  // section labels
  const secM = $('div', 'ov', ov, tagHTML('m', 'Målt / registrert', 'faktiske mengder, driftsdata og analyse')); secM.style.left = '1180px'; secM.style.top = '170px';
  const secS = $('div', 'ov', ov, tagHTML('s', 'Modellscenario', 'beregnet henteordning i tettbygd strøk')); secS.style.left = '1180px'; secS.style.top = '170px';
  const COX = 1210, COY = 270;
  const C = [
    { c: mkCallout(sc, COX, COY, { to: 44, kind: 'm', lab: 'returpunkter for glass- og metallemballasje', src: 'Retura 2025', cnt: 0.8 }), a: P11 + 2.6, b: P11 + 4.7, p: v12, id: ['v1_44'] },
    { c: mkCallout(sc, COX, COY, { to: 579.5, dec: 1, unit: 'tonn', kind: 'm', lab: 'glass- og metallemballasje samlet inn i 2025', src: 'SHMIL / KOSTRA 2025' }), a: P11 + 5.1, b: P11 + 6.9, p: v11, id: ['v1_5795'] },
    { c: mkCallout(sc, COX, COY, { to: 93.9, dec: 1, unit: '%', kind: 'm', lab: 'riktig sortert i analysert glass-/metallprøve (ca. 122 kg)', src: 'Plukkanalyse 9.–10. des. 2025' }), a: P11 + 7.5, b: P12 - 0.1, p: v213, id: ['v2_939_pie'] },
    { c: mkCallout(sc, COX, COY, { pre: 'ca.', to: 56000, kind: 's', lab: 'tømmestopp per år – og ca. 9 228 nye beholdere', src: 'Søknaden, tabell 2.1' }), a: P12 + 1.6, b: P12 + 2.75, p: s2, id: ['sok_t_56000'] },
    { c: mkCallout(sc, COX, COY, { to: 45.7, dec: 1, unit: 'tonn/år', kind: 's', lab: 'modellert meruttak med henteordning (50 % fangst)', src: 'Ikke en målt effekt' }), a: P12 + 3.3, b: P12 + 4.5, p: s2, id: ['sok_t_457'] },
    { c: mkCallout(sc, COX, COY, { to: 3.39, dec: 2, unit: 'mill. kr/år', kind: 's', lab: 'modellert merkostnad ved henteordning – ca. 74 286 kr per ekstra tonn', src: 'Modell A · gunstig, betinget scenario', cnt: 1.2 }), a: P12 + 4.95, b: P13 + 0.1, p: s2, id: ['sok_t_339'] },
  ];
  for (const x of C) x.L = mkLine(sc, x.c.o.kind === 'm' ? '#3cc79a' : '#68b6dc', x.c.o.kind === 's');
  // summary board: measured vs modelled kept apart
  const boardScrim = $('div', 'layer', ov); boardScrim.style.background = '#0b0f11'; boardScrim.style.opacity = 0;
  const bh = txt(ov, 'h3', 'Målte resultater og beregnede scenarier holdes adskilt', 0, 170, { center: true });
  const mkBoard = (x, kind, ttl, items) => {
    const e = $('div', 'board', ov, `<div class="hd">${tagHTML(kind, kind === 'm' ? 'Målt' : 'Modellscenario')}<span class="body" style="color:var(--white)">${ttl}</span></div>` +
      items.map(([v, d]) => `<div class="it"><span class="v" style="color:${kind === 'm' ? '#8de6c6' : '#a6d5ef'}">${v}</span><span class="d">${d}</span></div>`).join(''));
    e.style.left = x + 'px'; e.style.top = '300px'; e.style.display = 'none';
    return { e, its: [...e.querySelectorAll('.it')] };
  };
  const bM = mkBoard(170, 'm', 'Faktiske data', [['44', 'returpunkter i dag'], ['579,5 t', 'innsamlet glass/metall 2025'], ['93,9 %', 'riktig sortert i prøven (des. 2025)']]);
  const bS = mkBoard(1000, 's', 'Beregnet henteordning', [['ca. 8 650', 'nye stoppesteder'], ['45,7 t', 'modellert meruttak per år'], ['3,39 mill.', 'kr i merkostnad per år']]);
  const lk = txt(ov, 'kicker', 'Vedlegg 1 · Leserveiledning', 150, 760);
  const lh = txt(ov, 'h3', 'Hvert tall er merket med kilde og datastatus', 150, 800);
  const fin = txt(ov, 'h3', 'Sammenstilt til en etterprøvbar søknad', 0, 860, { center: true });

  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    for (const g of G) {
      const [sx, sy] = toScreen(c, ...g.page.pt(0, 0, g.page.rest));
      g.e.style.left = sx + 'px'; g.e.style.top = sy - 92 + 'px';
      const a = Math.max(env(t, P11 + 0.2, P11 + 2.0, 0.5, 0.4), env(t, P13 + 1.0, 117.6, 0.5, 0.4));
      show(g.e, a, 'none');
    }
    panel(sc, 'r', env(t, P11 + 2.3, P13 + 0.3, 0.6, 0.6));
    fshow(secM, t, P11 + 2.4, P12 - 0.1, { dx: 30, dy: 0 });
    fshow(secS, t, P12 + 0.6, P13 + 0.2, { dx: 30, dy: 0 });
    for (const x of C) {
      x.c.set(t, x.a, x.b);
      const r = hlScreen(c, x.p, x.id);
      const ax = x.id[0] === 'v2_939_pie' ? r.x1 + 16 : r.x1 + 12;
      lineSet(x.L, ax, (r.y0 + r.y1) / 2, COX - 46, COY + 64, pr(t, x.a - 0.2, x.a + 0.35), env(t, x.a - 0.2, x.b, 0.15, 0.4));
    }
    boardScrim.style.opacity = (0.93 * env(t, P13 + 0.2, 118.3, 0.7, 0.7)).toFixed(3);
    tshow(bh, t, P13 + 0.5, 118.1, { st: 0.04 });
    for (const [b, d0] of [[bM, P13 + 0.8], [bS, P13 + 1.35]]) {
      fshow(b.e, t, d0, 118.1, { dy: 0, fi: 0.3 });
      b.e.querySelector('.hd').style.opacity = pr(t, d0, d0 + 0.5).toFixed(3);
      b.its.forEach((it, i) => {
        const p = pr(t, d0 + 0.3 + i * 0.275, d0 + 0.9 + i * 0.275, E.o5);
        it.style.opacity = p.toFixed(3); it.style.transform = `translateY(${(1 - p) * 26}px)`;
      });
    }
    tshow(lk, t, 118.8, 121.2, { st: 0.02 });
    tshow(lh, t, 118.9, 121.2, { st: 0.04 });
    tshow(fin, t, 121.6, 123.5, { st: 0.05 });
  };
}

/* ================================================================== S5 søknad 31.08.2026 */
function sceneSoknad() {
  const sc = mkScene(124.6, 141.4, 0.4, 0.9);
  const W = sc.world;
  const GAP = 1120;
  const sok = [];
  const v1 = [], v2 = [];
  // attachments (stacks) – created first so they sit underneath
  const V2N = [1, 2, 3, 4, 5, 13, 17, 21];
  for (let i = V2N.length - 1; i >= 0; i--) v2.push(new Page(W, 'v2', V2N[i], { lo: true }));
  for (let i = 4; i >= 1; i--) v1.push(new Page(W, 'v1', i, { lo: true }));
  for (let i = 6; i >= 1; i--) sok[i] = new Page(W, 'sok', i, { lo: i > 1 });
  sc.pages.push(...v2, ...v1);
  for (let i = 6; i >= 1; i--) sc.pages.push(sok[i]);
  const tSpread = P(15) - 0.05, tGather = 134.6, tMerge = 137.7, tSend = 139.0;
  const PK = { x: -1250, y: 0 }, A1 = { x: 0, y: 30 }, A2 = { x: 1250, y: 15 };
  const pkg = (k, base, n) => ({ x: base.x + k * 9, y: base.y + k * 8, s: 1, r: -1.5 + (k % 3) * 0.9, o: 1, shade: k === n - 1 ? 0 : 0.18 });
  for (let i = 1; i <= 6; i++) {
    const stack = { x: (6 - i) * 0 + i * 7, y: i * 6, s: 1, r: -0.4 + (i - 1) * 0.8, o: 1, shade: i === 1 ? 0 : 0.22 };
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: [0, -0.4, 0.4, -0.3, 0.5, -0.4, 0.3][i], o: 1, shade: 0 };
    const pk = { ...pkg(6 - i, PK, 6) };
    const merged = { ...pk, x: 0 + (6 - i) * 6, y: (6 - i) * 5 };
    const sent = { ...merged, x: 2600, y: -200, s: 0.55, r: 6, o: 0 };
    const keys = [[124.9, { ...stack, y: stack.y + 1700, x: stack.x + 200, r: stack.r - 8 }], [126.9 + i * 0.03, stack, E.o5]];
    if (i > 1) keys.push([tSpread + (i - 2) * 0.09, stack], [tSpread + 0.75 + (i - 2) * 0.09, row, E.io]);
    keys.push([tGather + (i - 1) * 0.06, i > 1 ? row : stack], [tGather + 1.2 + (i - 1) * 0.06, pk, E.io]);
    keys.push([tMerge, pk], [tMerge + 1.0, merged, E.io], [tSend, merged], [tSend + 1.5, sent, E.i]);
    sok[i].keys = keys;
    sok[i].rest = i === 1 ? { x: 0, y: 0, s: 1, r: -0.4 } : row;
  }
  const attach = (arr, base, off, delay) => arr.forEach((p, k) => {
    const n = arr.length, st = pkg(k, base, n);
    const merged = { ...st, x: off.x + k * 6, y: off.y + k * 5 };
    const sent = { ...merged, x: 2600 + off.x, y: -200 + off.y, s: 0.55, r: 6, o: 0 };
    p.keys = [[tGather + delay, { ...st, y: st.y + 1500, r: st.r + 6, o: 1 }], [tGather + delay + 1.3, st, E.o5],
      [tMerge, st], [tMerge + 1.0, merged, E.io], [tSend + 0.1, merged], [tSend + 1.6, sent, E.i]];
  });
  attach(v1, A1, { x: 70, y: 60 }, 0.25);
  attach(v2, A2, { x: 140, y: 120 }, 0.45);
  const s1 = sok[1];
  const H = (p, id, kind, a, b) => { const h = p.hl(id, kind); sc.hls.push({ h, a, b }); return h; };
  H(s1, 'sok_dato', 'm-g', 127.9, 128.4);
  H(s1, 'sok_tittel', 'u-g', 128.6, 129.4);
  H(s1, 'sok_fiber', 'm-g', 129.8, 130.6);
  H(s1, 'sok_glass', 'm-b', 130.5, 131.1); H(s1, 'sok_2030', 'm-b', 131.0, 131.4);
  H(s1, 'sok_grunnlaget', 'm-g', 131.9, 132.6);
  const camK = [
    [124.9, { cx: 0, cy: 420, z: 0.36, rx: 24 }],
    [127.0, { cx: 0, cy: 20, z: 0.6, rx: 7 }, E.io],
    [127.8, look(s1, ['sok_ref', 'sok_dato'], 1.9, 1200, 470), E.io],
    [128.4, look(s1, ['sok_tittel'], 1.55, 960, 470), E.io],
    [129.3, look(s1, ['sok_tittel'], 1.56, 960, 470), E.lin],
    [129.9, look(s1, ['sok_fiber', 'sok_glass', 'sok_2030'], 1.22, 600, 520), E.io],
    [131.3, look(s1, ['sok_fiber', 'sok_glass', 'sok_2030'], 1.25, 600, 520), E.lin],
    [131.9, look(s1, ['sok_grunnlaget'], 1.45, 960, 440), E.io],
    [P(15), look(s1, ['sok_grunnlaget'], 1.47, 960, 440), E.lin],
    [P(15) + 0.7, { cx: 1.2 * GAP, cy: 10, z: 0.47, rx: 0 }, E.io],
    [tGather - 0.1, { cx: 4.6 * GAP, cy: 10, z: 0.5, rx: 0 }, E.io2],
    [tGather + 1.3, { cx: 0, cy: 60, z: 0.36, rx: 10 }, E.io],
    [tMerge, { cx: 0, cy: 60, z: 0.38, rx: 10 }, E.lin],
    [tMerge + 1.0, { cx: 80, cy: 330, z: 0.44, rx: 10 }, E.io],
    [141.4, { cx: 700, cy: 330, z: 0.4, rx: 12 }, E.io],
  ];
  const ov = sc.ov;
  const chip = $('div', 'ov', ov, '<span class="chip"><span class="dot"></span>SHMIL · Søknad 31.08.2026 · Ref. 604/26-HJ · 6 sider</span>');
  chip.style.left = '1130px'; chip.style.top = '52px';
  const cards = [
    ['Papp og papir', 'Egen fiberdunk innføres', 'Henteordning for alle husstander i alle 11 eierkommuner, utplassert innen utgangen av 2027 – uavhengig av søknaden', 'var(--gl)', 129.9],
    ['Glass- og metallemballasje', 'Søknad om tidsbegrenset unntak', 'Etter § 19-4 fra kravet om henteordning (§ 10a-5) – frem til 31.12.2030, med årlig dokumentasjon', 'var(--bl)', 130.6],
  ].map(([l, ttl, st, col, a], i) => {
    const e = $('div', 'card', ov, `<div class="bar" style="background:${col}"></div><div class="lbl" style="color:${col}">${l}</div><div class="ttl">${ttl}</div><div class="st">${st}</div>`);
    e.style.left = '1230px'; e.style.top = (i ? 520 : 236) + 'px'; e.style.width = '580px'; e.style.display = 'none';
    return { e, a };
  });
  const glk = txt(ov, 'kicker', 'Søknaden – 7 kapitler', 150, 820);
  const glh = txt(ov, 'h4', 'Mengder · kostnader · nytte og kvalitet · rettslig vurdering · vilkår', 150, 860);
  const lab = (k, s, n) => { const e = $('div', 'ov', ov, `<div class="kicker">${k}</div><div class="body" style="white-space:normal;line-height:1.25;margin-top:10px;color:var(--white)">${s}</div><div class="small" style="margin-top:4px">${n}</div>`); e.style.display = 'none'; e.style.textAlign = 'center'; e.style.width = '400px'; e.style.whiteSpace = 'normal'; return e; };
  const L = [[lab('Søknad', 'Tidsbegrenset unntak etter § 19-4', '6 sider'), PK], [lab('Vedlegg 1', 'Nøkkeltall, kilder og datastatus', '4 sider'), A1], [lab('Vedlegg 2', 'Plukkanalyse SHMIL 2025', '21 sider'), A2]];
  const sentK = txt(ov, 'kicker', '31.08.2026 · Ref. 604/26-HJ', 0, 836, { center: true });
  const sentH = txt(ov, 'h3', 'Samlet dokumentasjonspakke oversendt Miljødirektoratet', 0, 874, { center: true, size: 54 });

  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    s1.dim(['sok_grunnlaget'], 0.4 * env(t, 131.8, P(15) + 0.3, 0.5, 0.4));
    fshow(chip, t, 127.0, 134.4, { dy: -16 });
    panel(sc, 'r', env(t, 129.6, 131.9, 0.5, 0.5));
    for (const cd of cards) fshow(cd.e, t, cd.a, 131.7, { dx: 50, dy: 0, ox: 40 });
    tshow(glk, t, P(15) + 0.4, tGather + 0.2, { st: 0.02 });
    tshow(glh, t, P(15) + 0.5, tGather + 0.2, { st: 0.04 });
    for (const [e, base] of L) {
      const [sx, sy] = toScreen(c, base.x + 20, base.y - 707 - 30);
      e.style.left = sx - 200 + 'px'; e.style.top = sy - 150 + 'px';
      show(e, env(t, tGather + 0.9 + L.findIndex(x => x[0] === e) * 0.25, tMerge + 0.3, 0.5, 0.4), 'none');
    }
    tshow(sentK, t, tMerge + 0.8, 141.0, { st: 0.02 });
    tshow(sentH, t, tMerge + 0.9, 141.0, { st: 0.05 });
  };
}

/* ================================================================== final card */
let FIN;
function buildFinal() {
  const k = txt(OV, 'kicker', 'Søknad sendt 31. august 2026', 0, 196, { center: true });
  const h = txt(OV, 'h2', 'SHMIL søker om tidsbegrenset\nunntak etter § 19-4', 0, 238, { center: true, size: 84 });
  const s = txt(OV, 'lead', 'Glass- og metallemballasje – frem til 31.12.2030', 0, 440, { center: true, size: 42 });
  const n = txt(OV, 'small', 'Papp og papir: egen fiberdunk innføres.  ·  Søknaden avgjøres ved vedtak i Miljødirektoratet.', 0, 516, { center: true, size: 25 });
  const logo = $('img', 'ov', OV); logo.src = 'assets/shmil-logo-white.png';
  logo.style.cssText += ';left:885px;top:968px;height:46px;display:none';
  IMGS.push(logo);
  FIN = t => {
    tshow(k, t, HIT_END + 0.15, 149.9, { st: 0.02 });
    tshow(h, t, HIT_END + 0.3, 149.9, { st: 0.08, du: 0.9 });
    tshow(s, t, HIT_END + 1.2, 149.9, { st: 0.04 });
    tshow(n, t, HIT_END + 2.2, 149.9, { st: 0.02 });
    fshow(logo, t, 144.2, null, { dy: 10, fi: 1.0 });
  };
}

/* ================================================================== timeline */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
const MS = [
  { d: D(2025, 11, 6), at: 9.95, date: '06.11.2025', lab: 'Tilsynsrapport', who: 'Statsforvalteren', side: -1 },
  { d: D(2025, 12, 9.5), at: 27.55, date: '9.–10.12.2025', lab: 'Plukkanalyse', who: 'Iris Produksjon', side: 1 },
  { d: D(2026, 1, 15), at: 36.65, date: '15.01.2026', lab: 'Henvendelse', who: 'SHMIL', side: -1 },
  { d: D(2026, 1, 19), at: 62.55, date: '19.01.2026', lab: 'Mottatt', minor: true, side: 1 },
  { d: D(2026, 2, 26), at: 63.05, date: '26.02.2026', lab: 'Foreløpig svar', minor: true, side: 1 },
  { d: D(2026, 5, 7), at: 63.95, date: '07.05.2026', lab: 'Svar', who: 'Miljødirektoratet', side: -1 },
  { d: D(2026, 8, 31), at: 124.55, date: '31.08.2026', lab: 'Søknad', who: 'SHMIL', side: -1 },
];
const BAND = { a: D(2026, 6, 1), b: D(2026, 8, 31), at: 93.3 };
const D_START = D(2025, 11, 6);
// cursor (current date) keyframes
const CUR = [
  [8.95, D(2025, 10, 22)], [9.95, D(2025, 11, 6), E.io],
  [26.7, D(2025, 11, 6)], [27.55, D(2025, 12, 9.5), E.io],
  [35.5, D(2025, 12, 10)], [36.65, D(2026, 1, 15), E.io],
  [62.0, D(2026, 1, 15)], [63.95, D(2026, 5, 7), E.io2],
  [93.0, D(2026, 5, 7)], [96.6, D(2026, 8, 24), E.io],
  [123.7, D(2026, 8, 24)], [124.55, D(2026, 8, 31), E.io],
];
// view states: y, ppd (px/day), f (follow cursor), c (centre day when not following), big, fin, a (alpha)
const HUDV = { y: 1012, ppd: 4.9, f: 0, c: D(2026, 3, 22), big: 0, fin: 0, a: 1 };
const HEROV = { y: 700, ppd: 13, f: 1, c: D(2026, 3, 22), big: 1, fin: 0, a: 1 };
const FINV = { y: 780, ppd: 5.0, f: 0, c: D(2026, 4, 1), big: 0.62, fin: 1, a: 1 };
const TLK = [
  [7.9, { ...HEROV, a: 0 }], [8.9, HEROV, E.o],
  [16.3, HEROV], [17.5, HUDV, E.io5],
  [26.5, HUDV], [27.3, HEROV, E.io5], [29.0, HEROV], [30.0, HUDV, E.io5],
  [35.3, HUDV], [36.1, HEROV, E.io5], [38.0, HEROV], [39.0, HUDV, E.io5],
  [61.8, HUDV], [62.6, HEROV, E.io5], [65.4, HEROV], [66.4, HUDV, E.io5],
  [92.6, HUDV], [93.4, { ...HEROV, ppd: 9.5 }, E.io5], [97.0, { ...HEROV, ppd: 9.5 }], [98.0, HUDV, E.io5],
  [123.4, HUDV], [124.2, HEROV, E.io5], [125.9, HEROV], [126.9, HUDV, E.io5],
  [HIT_END - 0.3, HUDV], [HIT_END + 0.9, FINV, E.io5],
];
function drawTimeline(t) {
  const g = TLG;
  g.clearRect(0, 0, 1920, 1080);
  const s = K(t, TLK);
  const fade = 1 - pr(t, 147.6, 149.6);
  const A = s.a * fade;
  if (A <= 0.002) return s;
  const cur = K(t, CUR);
  const cd = lerp(s.c, cur, s.f);
  const X = d => 960 + (d - cd) * s.ppd;
  const y = s.y, big = s.big, fin = s.fin;
  g.save();
  g.globalAlpha = A;
  // base line
  const x0 = X(D(2025, 10, 1)), x1 = X(D(2026, 10, 1));
  const lg = g.createLinearGradient(Math.max(-200, x0), 0, Math.min(2120, x1), 0);
  lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.08, 'rgba(255,255,255,.28)');
  lg.addColorStop(0.92, 'rgba(255,255,255,.28)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
  g.strokeStyle = lg; g.lineWidth = lerp(2, 3, big);
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  // months
  const mf = lerp(16, 24, big) * lerp(1, 0.85, fin);
  g.font = `600 ${mf}px FS`; g.textAlign = 'center'; g.textBaseline = 'top';
  g.letterSpacing = '0.14em';
  for (let i = 0; i < 12; i++) {
    const yy = i < 3 ? 2025 : 2026, mm = ((9 + i) % 12) + 1;
    const d = D(yy, mm, 1), x = X(d);
    if (x < -80 || x > 2000) continue;
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y - lerp(6, 10, big)); g.lineTo(x, y + lerp(6, 10, big)); g.stroke();
    const xm = X(d + 15);
    let lab = MONTHS[mm - 1];
    if (mm === 1 || (mm === 11 && yy === 2025)) lab += ' ' + yy;
    g.fillStyle = 'rgba(241,244,243,.55)';
    g.fillText(lab, xm, y + lerp(14, 22, big));
  }
  g.letterSpacing = '0px';
  // summer band
  if (t > BAND.at) {
    const bp = pr(t, BAND.at, BAND.at + 0.3);
    const xb0 = X(BAND.a), xb1 = X(Math.min(BAND.b, Math.max(BAND.a, cur)));
    const bh = lerp(12, 22, big);
    g.fillStyle = `rgba(60,199,154,${0.22 * bp})`;
    g.fillRect(xb0, y - bh / 2, Math.max(0, xb1 - xb0), bh);
  }
  // progress
  if (cur > D_START) {
    g.strokeStyle = '#3cc79a'; g.lineWidth = lerp(3.5, 5, big); g.lineCap = 'round';
    g.beginPath(); g.moveTo(X(D_START), y); g.lineTo(X(cur), y); g.stroke();
  }
  // milestones
  for (const m of MS) {
    if (t < m.at) continue;
    const x = X(m.d);
    if (x < -100 || x > 2020) continue;
    const pp = E.oback(pr(t, m.at, m.at + 0.45, E.lin));
    const r = (m.minor ? lerp(3.5, 6, big) : lerp(5.5, 10, big)) * pp;
    const pulse = pr(t, m.at, m.at + 1.2, E.o);
    if (pulse < 1) {
      g.strokeStyle = `rgba(60,199,154,${(1 - pulse) * 0.8})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r + pulse * lerp(18, 34, big), 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = m.minor ? '#8fdcc0' : '#3cc79a';
    g.beginPath(); g.arc(x, y, Math.max(0, r), 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#0d1113'; g.lineWidth = 2; g.stroke();
    // labels
    const isCurrent = Math.abs(cur - m.d) < 3 && !fin;
    let la = 0;
    if (fin > 0) la = fin * pr(t, HIT_END + 0.6 + MS.indexOf(m) * 0.12, HIT_END + 1.2 + MS.indexOf(m) * 0.12);
    else if (big > 0.01 && !isCurrent) la = big * pr(t, m.at, m.at + 0.4);
    if (la > 0.01) {
      g.globalAlpha = A * la;
      const up = fin ? m.side < 0 : !m.minor;
      const fs = fin ? 20 : lerp(16, 20, big);
      g.textAlign = 'center';
      if (up) {
        g.textBaseline = 'bottom';
        g.font = `600 ${fs}px FM`; g.fillStyle = '#7fe0bd';
        g.fillText(m.date, x, y - (fin ? 46 : 26));
        g.font = `500 ${fs + 3}px FS`; g.fillStyle = '#f1f4f3';
        g.fillText(m.who ? `${m.lab} · ${m.who}` : m.lab, x, y - (fin ? 18 : 0) - (fin ? 0 : 52));
      } else {
        g.textBaseline = 'top';
        g.font = `600 ${fs - 2}px FM`; g.fillStyle = '#9fdcc6';
        g.fillText(m.minor ? m.date.slice(0, 5) : m.date, x, y + (fin ? 52 : 62));
        g.font = `500 ${fs}px FS`; g.fillStyle = 'rgba(241,244,243,.85)';
        g.fillText(m.lab, x, y + (fin ? 78 : 88));
      }
      g.globalAlpha = A;
    }
  }
  // final: label for the summer band
  if (fin > 0) {
    const la = fin * pr(t, HIT_END + 1.4, HIT_END + 2.0);
    g.globalAlpha = A * la; g.textAlign = 'center'; g.textBaseline = 'top';
    const xm = (X(BAND.a) + X(BAND.b)) / 2;
    g.font = '600 18px FM'; g.fillStyle = '#9fdcc6'; g.fillText('JUN–AUG 2026', xm, y + 52);
    g.font = '500 20px FS'; g.fillStyle = 'rgba(241,244,243,.85)'; g.fillText('Dokumentasjon og beregninger', xm, y + 78);
    g.globalAlpha = A;
  }
  // cursor
  if (t >= 8.95 && fin < 0.99) {
    const xc = X(cur), rc = lerp(6, 11, big);
    g.globalAlpha = A * pr(t, 8.95, 9.4) * (1 - fin);
    g.shadowColor = 'rgba(60,199,154,.9)'; g.shadowBlur = 18;
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(xc, y, rc, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = '#3cc79a'; g.lineWidth = 3; g.beginPath(); g.arc(xc, y, rc + 4, 0, Math.PI * 2); g.stroke();
    // date readout in HUD mode
    const ha = 1 - big;
    if (ha > 0.02) {
      g.globalAlpha = A * ha;
      const dd = new Date(Date.UTC(2025, 9, 1) + Math.round(cur) * 86400000);
      const s2 = `${String(dd.getUTCDate()).padStart(2, '0')}.${String(dd.getUTCMonth() + 1).padStart(2, '0')}.${dd.getUTCFullYear()}`;
      g.font = '500 18px FM'; g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.fillText(s2, xc, y - 16);
    }
  }
  g.restore();
  return s;
}

/* ================================================================== render */
function renderAt(t) {
  t = clamp(t, 0, DUR);
  const tl = drawTimeline(t);
  const heroAmt = tl.big * (1 - tl.fin) * tl.a;
  // dark scrim behind the big timeline / final card
  const finS = pr(t, HIT_END - 0.2, HIT_END + 0.8);
  S('scrim').style.opacity = Math.max(0.8 * heroAmt, 0.86 * finS).toFixed(3);
  heroUpdate(t);
  chaptersUpdate(t, heroAmt);
  for (const sc of SCENES) {
    const on = t >= sc.a && t <= sc.b;
    if (!on) { if (sc.root.style.display !== 'none') sc.root.style.display = 'none'; continue; }
    sc.root.style.display = 'block';
    sc.root.style.opacity = env(t, sc.a, sc.b, sc.fi, sc.fo, E.o, E.io).toFixed(3);
    sc.upd(t);
  }
  if (!(t >= SVAR.a && t <= SVAR.b)) S('tint').style.opacity = '0';
  FIN(t);
  S('black').style.opacity = Math.max(1 - pr(t, 0, 1.3, E.o), pr(t, 147.6, 149.7, E.io2)).toFixed(3);
}

async function ready() {
  await document.fonts.ready;
  await Promise.all(['300 20px FS', '400 20px FS', '500 20px FS', '600 20px FS', '700 20px FS', '500 20px FD', '600 20px FD', '700 20px FD', '400 20px FM', '500 20px FM'].map(f => document.fonts.load(f, 'ÆØÅæøå§–«»')));
  await Promise.all(IMGS.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
  await Promise.all(IMGS.map(i => i.decode().catch(() => {})));
  return true;
}

/* ------------------------------------------------------------------ preview UI */
function fitStage() {
  const st = S('stage');
  if (document.body.classList.contains('render')) { st.style.transform = 'none'; return; }
  const sc = Math.min(window.innerWidth / 1920, (window.innerHeight - 56) / 1080);
  st.style.transform = `translate(${(window.innerWidth - 1920 * sc) / 2}px,${(window.innerHeight - 56 - 1080 * sc) / 2}px) scale(${sc})`;
}
function preview() {
  const au = S('audio'), btn = S('play'), sc = S('scrub'), tm = S('time');
  const fmt = x => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  let scrubbing = false;
  btn.onclick = () => { if (au.paused) { au.play(); btn.textContent = '❚❚ Pause'; } else { au.pause(); btn.textContent = '▶ Spill av'; } };
  sc.oninput = () => { scrubbing = true; au.currentTime = +sc.value; renderAt(+sc.value); };
  sc.onchange = () => { scrubbing = false; };
  au.onended = () => { btn.textContent = '▶ Spill av'; };
  const loop = () => {
    const t = au.currentTime;
    if (!scrubbing) { renderAt(t); sc.value = t; }
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
  renderAt(m ? +m[1] : 0);
  window.FILM_READY = true;
  if (!isRender) preview();
});
})();
