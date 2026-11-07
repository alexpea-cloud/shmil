/* SHMIL – Fra tilsynsavvik til søknad (versjon 2)
 * "Saksmappen i dagslys": one idea per screen, long holds, large type.
 * Every frame is a pure function of time t (seconds): FILM.renderAt(t).
 */
(function () {
'use strict';

/* ------------------------------------------------------------------ timing (music: ~109 bpm, phrase hits every 8.81 s) */
const DUR = 149.8, FPS = 30;
const T0 = 0.13, PHR = 8.81;
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

/* ------------------------------------------------------------------ build */
let OV, TLG;
function build() {
  OV = S('ov');
  TLG = S('tl').getContext('2d');
  makeGrain();
  buildCards();
  sceneOpening();
  sceneTilsyn();
  sceneHenvendelse();
  sceneSvar();
  sceneArkiv();
  sceneVedlegg();
  sceneSoknad();
  sceneBelastning();
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

/* ================================================================== chapter cards (with the station line) */
const CARDS = [
  { a: P(1), b: 11.5, k: 'Statsforvalteren i Nordland', d: '6. november 2025', s: 'Tilsyn med Brønnøy kommune · saksnr. 2025/4779' },
  { a: 22.16, b: 24.7, k: 'SHMIL → Miljødirektoratet', d: '15. januar 2026', s: 'Henvendelse om behov for regelverksavklaringer' },
  { a: 39.78, b: 42.3, k: 'Miljødirektoratet → SHMIL', d: '7. mai 2026', s: 'Svar på henvendelse om avfallsforskriften kapittel 10a', kc: 'b' },
  { a: 66.5, b: 69.0, k: 'Juni · juli · august', d: 'Sommeren 2026', s: 'SHMIL bygger dokumentasjonsgrunnlaget' },
  { a: 92.64, b: 95.1, k: 'SHMIL → Miljødirektoratet', d: '31. august 2026', s: 'Søknad om tidsbegrenset unntak etter § 19-4' },
];
function buildCards() {
  for (const c of CARDS) {
    c.K = txt(OV, 'k' + (c.kc ? ' ' + c.kc : ''), c.k, 0, 262, { center: true });
    c.D = txt(OV, 'dt', c.d.toUpperCase(), 0, 302, { center: true });
    c.S = txt(OV, 'sub', c.s, 0, 470, { center: true });
  }
}
function cardAmount(t) {
  let a = 0;
  for (const c of CARDS) a = Math.max(a, env(t, c.a - 0.45, c.b + 0.05, 0.45, 0.55));
  return a;
}
function cardsUpdate(t) {
  for (const c of CARDS) {
    tshow(c.K, t, c.a + 0.05, c.b, { st: 0.015 });
    tshow(c.D, t, c.a + 0.12, c.b, { st: 0.07, du: 0.85 });
    tshow(c.S, t, c.a + 0.5, c.b - 0.05, { st: 0.02 });
  }
}

/* station line ------------------------------------------------------------ */
const X0 = 200, DSTART = D(2025, 10, 25), PPD = 4.19;
const XD = d => X0 + (d - DSTART) * PPD;
const ST = [
  { d: D(2025, 11, 6), lab: 'Tilsyn', date: '06.11.2025', lit: 10.2 },
  { d: D(2026, 1, 15), lab: 'Henvendelse', date: '15.01.2026', lit: 23.6 },
  { d: D(2026, 5, 7), lab: 'Svar', date: '07.05.2026', lit: 41.4 },
  { a: D(2026, 6, 1), b: D(2026, 8, 31), lab: 'Dokumentasjon', date: 'Sommeren 2026', lit: 67.0, band: true },
  { d: D(2026, 8, 31), lab: 'Søknad', date: '31.08.2026', lit: 93.7 },
  { x: 1740, lab: 'Vedtak', date: 'venter på svar', open: true },
];
const CUR = [
  [0, D(2025, 10, 20)], [9.2, D(2025, 10, 20)], [10.2, D(2025, 11, 6), E.io],
  [22.5, D(2025, 11, 6)], [23.6, D(2026, 1, 15), E.io],
  [40.1, D(2026, 1, 15)], [41.4, D(2026, 5, 7), E.io],
  [66.6, D(2026, 5, 7)], [68.4, D(2026, 8, 24), E.io],
  [92.9, D(2026, 8, 24)], [93.7, D(2026, 8, 31), E.io],
];
function drawLine(t, A, Y, opening, fin) {
  const g = TLG;
  if (A <= 0.002) return;
  const cur = K(t, CUR);
  g.save();
  g.globalAlpha = A;
  const xEnd = XD(D(2026, 8, 31));
  const reach = opening != null ? lerp(X0 - 40, 1760, opening) : 1760;
  // base line + dashed wait segment
  g.lineCap = 'round';
  g.strokeStyle = '#BFC5C1'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(X0 - 40, Y); g.lineTo(Math.min(reach, xEnd), Y); g.stroke();
  if (reach > xEnd) {
    g.setLineDash([10, 12]); g.beginPath(); g.moveTo(xEnd, Y); g.lineTo(Math.min(reach, 1740), Y); g.stroke(); g.setLineDash([]);
  }
  // year marks
  g.font = '500 21px FM, "JetBrains Mono", monospace'; g.fillStyle = '#8A9599'; g.textAlign = 'center'; g.textBaseline = 'bottom';
  for (const [d, lab] of [[D(2025, 11, 1), '2025'], [D(2026, 1, 1), '2026']]) {
    const x = XD(d);
    if (x > reach) continue;
    g.fillRect(x - 1, Y - 16, 2, 10);
    g.fillText(lab, x, Y - 22);
  }
  // progress + summer band
  if (cur > ST[0].d) {
    const band = ST[3];
    if (cur > band.a) {
      g.fillStyle = 'rgba(14,156,121,.22)';
      g.beginPath();
      const x0 = XD(band.a), x1 = XD(Math.min(cur, band.b));
      g.roundRect(x0, Y - 11, Math.max(0, x1 - x0), 22, 11); g.fill();
    }
    g.strokeStyle = '#0E9C79'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(XD(ST[0].d), Y); g.lineTo(XD(cur), Y); g.stroke();
  }
  // stations
  ST.forEach((s, i) => {
    const x = s.band ? (XD(s.a) + XD(s.b)) / 2 : s.open ? s.x : XD(s.d);
    if (opening != null && x > reach) return;
    const pop = opening != null ? E.oback(clamp((reach - x) / 60)) : 1;
    const lit = !s.open && (s.band ? cur > s.a + 2 : cur >= s.d - 0.5);
    if (!s.band) {
      const r = 12 * pop;
      g.beginPath(); g.arc(x, Y, r, 0, Math.PI * 2);
      if (lit) { g.fillStyle = '#007B61'; g.fill(); }
      else { g.fillStyle = '#ECEBE6'; g.fill(); g.strokeStyle = s.open ? '#0E9C79' : '#AEB5B1'; g.lineWidth = 3; g.stroke(); }
    }
    // pulse when a station lights up, and a slow pulse on the open "Vedtak" in the final
    const pulses = [];
    if (s.lit && t >= s.lit && t < s.lit + 1.4) pulses.push((t - s.lit) / 1.4);
    if (s.open && fin > 0) { const ph = ((t - 141.2) % 1.8) / 1.8; if (t > 141.2) pulses.push(ph); }
    for (const p of pulses) {
      g.strokeStyle = `rgba(14,156,121,${(1 - p) * 0.75})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, Y, 12 + p * 34, 0, Math.PI * 2); g.stroke();
    }
    // labels
    const la = opening != null ? pr(t, 6.2 + i * 0.22, 6.9 + i * 0.22) : 1;
    if (la > 0.01) {
      g.globalAlpha = A * la;
      g.textAlign = 'center'; g.textBaseline = 'top';
      g.font = '600 30px FS, Inter, system-ui, sans-serif'; g.fillStyle = lit ? '#1B2326' : (s.open ? '#0B7A60' : '#78848A');
      const lx = x + (s.band ? -22 : s.lab === 'Søknad' ? 16 : 0);
      g.fillText(s.lab, lx, Y + 34);
      g.font = '500 22px FM, "JetBrains Mono", monospace'; g.fillStyle = '#78848A';
      g.fillText(s.date, lx, Y + 74);
      g.globalAlpha = A;
    }
  });
  g.restore();
}

/* ================================================================== 0:00 Opening */
function sceneOpening() {
  const sc = mkScene(0, 9.5, 0.01, 0.8);
  const docs = [['brev', 1], ['svar', 1], ['v1', 1], ['v2', 1], ['sok', 1]];
  docs.forEach(([d, n], i) => {
    const p = new Page(sc.world, d, n, { lo: true });
    const rest = { x: (i - 2) * 1150, y: 0, s: 1, r: [-1.2, 0.8, -0.5, 1.1, -0.7][i], o: 1, shade: 0 };
    p.keys = [[0, { ...rest, y: 120 }], [3.0, rest, E.o], [5.4, rest], [6.6, { ...rest, y: 500, o: 0 }, E.i]];
    sc.pages.push(p);
  });
  const camK = [[0, { cx: -160, cy: -930, z: 0.255 }], [6.6, { cx: 160, cy: -930, z: 0.27 }, E.lin]];
  const k = txt(sc.ov, 'k', 'SHMIL IKS · Søndre Helgeland Miljøverk', 0, 236, { center: true });
  const ti = txt(sc.ov, 'dt', 'Fra tilsynsavvik til søknad', 0, 280, { center: true, size: 116 });
  const su = txt(sc.ov, 'sub', 'SHMILs oppfølging av kravet om henteordning', 0, 428, { center: true, size: 42 });
  sc.upd = t => {
    pagesApply(sc, t); camApply(sc, t, camK);
    tshow(k, t, 0.8, 8.7, { st: 0.012 });
    tshow(ti, t, 1.1, 8.8, { st: 0.09, du: 0.9 });
    tshow(su, t, 2.2, 8.8, { st: 0.04 });
  };
}

/* ================================================================== 0:09 Kapittel 1 – Tilsynet */
function sceneTilsyn() {
  const sc = mkScene(11.0, 22.7, 0.5, 0.5);
  const ov = sc.ov;
  const acc = place($('div', 'acc', ov), 170, 302, null); acc.style.height = '226px';
  const k1 = txt(ov, 'k', 'Avviket i tilsynsrapporten', 210, 250);
  const q = txt(ov, 'q', '«Kommunen har ikke etablert henteordning for alt papp- og papiravfall og glass- og metallemballasjeavfall fra husholdningene.»', 210, 296, { w: 1520 });
  const src = txt(ov, 'src', 'Statsforvalteren i Nordland, tilsynsrapport 06.11.2025 (saksnr. 2025/4779). Rapporten er ikke vedlagt – avviket er gjengitt i SHMILs brev av 15.01.2026.', 210, 600, { w: 1500 });
  const k2 = txt(ov, 'k', 'Tilsynsavvik', 210, 230);
  const h2 = txt(ov, 'st', 'Krav om henteordning', 210, 270);
  const cards = ['Papp og papir', 'Glass- og metallemballasje'].map((ttl, i) => {
    const c = $('div', 'card', ov, `<div class="bar"></div><div class="lb">Henteordning mangler</div><div class="tt">${ttl}</div>`);
    place(c, 210 + i * 770, 430, 730); c.style.minHeight = '210px';
    return c;
  });
  sc.upd = t => {
    show(acc, env(t, 11.5, 18.3, 0.6, 0.4), `scaleY(${pr(t, 11.5, 12.3, E.o5)})`);
    acc.style.transformOrigin = '50% 0';
    tshow(k1, t, 11.5, 18.3, { st: 0.02 });
    tshow(q, t, 11.7, 18.3, { st: 0.035 });
    tshow(src, t, 13.2, 18.3, { st: 0.008 });
    tshow(k2, t, 18.5, 22.6, { st: 0.02 });
    tshow(h2, t, 18.55, 22.6, { st: 0.07 });
    fshow(cards[0], t, 19.2, 22.6, { dy: 40 });
    fshow(cards[1], t, 19.6, 22.6, { dy: 40 });
  };
}

/* ================================================================== 0:22 Kapittel 2 – Henvendelsen */
function sceneHenvendelse() {
  const sc = mkScene(24.2, 40.4, 0.4, 0.6);
  const W = sc.world, GAP = 1120, pg = [];
  for (let i = 7; i >= 1; i--) { pg[i] = new Page(W, 'brev', i, { lo: i > 2 }); sc.pages.push(pg[i]); }
  const rot = [0, -0.4, 0.5, -0.3, 0.4, -0.5, 0.3, -0.4];
  for (let i = 1; i <= 7; i++) {
    const stack = { x: i * 6, y: i * 5, s: 1, r: rot[1] + (i - 1) * 0.5, o: 1, shade: i === 1 ? 0 : 0.12 };
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: rot[i], o: 1, shade: 0 };
    const keys = [[24.2, { ...stack, x: stack.x - 2600, y: stack.y + 150, r: stack.r - 6 }], [25.8 + i * 0.03, stack, E.o5]];
    if (i === 2) keys.push([28.6, stack], [29.8, row, E.io]);
    if (i > 2) keys.push([36.6 + (i - 3) * 0.16, stack], [37.8 + (i - 3) * 0.16, row, E.io]);
    pg[i].keys = keys;
    pg[i].rest = i === 1 ? { x: 6, y: 5, s: 1, r: rot[1] } : row;
  }
  H(sc, pg[1], 'brev_tittel', 'u-g', 26.5, 27.7);
  H(sc, pg[2], 'brev_metoden', 'm-g', 30.1, 31.5);
  const camK = [
    [24.2, lookPage(pg[1], 0.66, 1350, 540)],
    [28.6, lookPage(pg[1], 0.7, 1350, 540), E.lin],
    [30.0, look(pg[2], ['brev_metoden'], 1.25, 960, 520), E.io],
    [36.6, look(pg[2], ['brev_metoden'], 1.3, 960, 520), E.lin],
    [38.2, { cx: 3 * GAP, cy: 340, z: 0.205, rx: 0 }, E.io],
    [40.4, { cx: 3 * GAP, cy: 340, z: 0.21, rx: 0 }, E.lin],
  ];
  const ov = sc.ov;
  const k1 = txt(ov, 'k', 'Henvendelsen', 150, 330);
  const h1 = txt(ov, 'st', 'SHMIL ber om prinsipielle avklaringer', 150, 372, { w: 800 });
  const k2 = txt(ov, 'k', 'Kjernespørsmålet i brevet', 200, 276);
  const q = txt(ov, 'q', '«Det sentrale spørsmålet er om det er *metoden* … eller *miljøgevinsten* … som skal være styrende.»', 200, 320, { w: 1520, size: 66 });
  const src = txt(ov, 'src', 'SHMILs brev til Miljødirektoratet 15.01.2026, side 2', 200, 590);
  const scope = txt(ov, 'st2', '7 sider · 3 tema · 6 spørsmål', 0, 752, { center: true });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t); camApply(sc, t, camK);
    veilSet(sc, env(t, 31.5, 37.0, 0.55, 0.6));
    tshow(k1, t, 25.0, 28.9, { st: 0.02 });
    tshow(h1, t, 25.1, 28.9, { st: 0.06 });
    tshow(k2, t, 31.7, 36.8, { st: 0.02 });
    tshow(q, t, 31.8, 36.8, { st: 0.05 });
    tshow(src, t, 33.0, 36.8, { st: 0.01 });
    tshow(scope, t, 37.9, 40.2, { st: 0.08 });
  };
}

/* ================================================================== 0:40 Kapittel 3 – Svaret */
function sceneSvar() {
  const sc = mkScene(41.8, 67.3, 0.4, 0.6);
  const W = sc.world, GAP = 1120, pg = [];
  for (let i = 3; i >= 1; i--) { pg[i] = new Page(W, 'svar', i); sc.pages.push(pg[i]); }
  for (let i = 1; i <= 3; i++) {
    const stack = { x: i * 6, y: i * 5, s: 1, r: 0.4 - (i - 1) * 0.6, o: 1, shade: i === 1 ? 0 : 0.12 };
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: [0, 0.4, -0.3, 0.3][i], o: 1, shade: 0 };
    const keys = [[41.8, { ...stack, x: stack.x + 2700, y: stack.y - 120, r: stack.r + 6 }], [43.5 + i * 0.03, stack, E.o5]];
    if (i === 2) keys.push([44.0, stack], [45.1, row, E.io]);
    if (i === 3) keys.push([51.4, stack], [52.4, row, E.io]);
    pg[i].keys = keys;
    pg[i].rest = i === 1 ? { x: 6, y: 5, s: 1, r: 0.4 } : row;
  }
  const [s1, s2, s3] = [pg[1], pg[2], pg[3]];
  H(sc, s1, 'svar_tittel', 'u-b', 43.4, 44.2);
  H(sc, s2, 'svar_plikten', 'm-b', 45.4, 46.6);
  H(sc, s3, 'svar_1994', 'box-g', 53.0, 53.4, 54.0);
  const camK = [
    [41.8, lookPage(s1, 0.6, 960, 560)],
    [44.0, lookPage(s1, 0.62, 960, 560), E.lin],
    [45.2, look(s2, ['svar_plikten'], 1.32, 960, 520), E.io],
    [51.6, look(s2, ['svar_plikten'], 1.36, 960, 520), E.lin],
    [52.6, look(s3, ['svar_ventil'], 1.45, 960, 560), E.io],
    [54.0, look(s3, ['svar_ventil'], 1.5, 960, 560), E.lin],
  ];
  const ov = sc.ov;
  const chip = $('div', 'ov k t', ov, 'Miljødirektoratet · 07.05.2026'); chip.style.display = 'none';
  // Budskap 1
  const k1 = txt(ov, 'k b', 'Budskap 1', 200, 250);
  const q1 = txt(ov, 'q', '«Plikten til henteordning gjelder uavhengig av målkravet for utsorteringsandel.»', 200, 294, { w: 1520, size: 64 });
  const p1 = txt(ov, 'pl', 'Kravet gjelder i utgangspunktet – også når bringeordningen gir god utsortering.', 200, 520, { w: 1400, size: 44 });
  const sr1 = txt(ov, 'src', 'Miljødirektoratets svar 07.05.2026, side 2', 200, 680);
  // § 19-4
  const para = $('div', 'ov', ov, '§ 19-4');
  para.style.cssText += ';font:700 300px/1 var(--display);letter-spacing:-.03em;color:#007B61;transform-origin:0 0';
  para.style.display = 'none';
  const qa = txt(ov, 'q', '«… slår urimelig ut i konkrete tilfeller»', 0, 520, { center: true, size: 56 });
  const qb = txt(ov, 'q', '«… det skal mye til»', 0, 604, { center: true, size: 56 });
  const pl2 = txt(ov, 'st2', 'En mulig – men snever – unntakshjemmel.', 0, 726, { center: true, size: 60 });
  pl2.el.style.color = 'var(--green)';
  const sr2 = txt(ov, 'src', 'Miljødirektoratets svar 07.05.2026, side 3 – avfallsforskriften § 19-4', 0, 846, { center: true });
  // Grunnlaget manglet
  const q3 = txt(ov, 'q2', '«Vi har ikke tilstrekkelig informasjon til å vurdere om det kan være aktuelt å gjøre noen unntak for deres eierkommuner.»', 0, 300, { center: true, w: 1500, size: 48 });
  const big = txt(ov, 'dt', 'Grunnlaget manglet.', 0, 520, { center: true, size: 124 });
  const sr3 = txt(ov, 'src', 'Miljødirektoratets svar 07.05.2026, side 3', 0, 700, { center: true });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    veilSet(sc, Math.max(env(t, 46.7, 53.0, 0.5, 0.45), env(t, 53.7, 67.3, 0.6, 0.3)));
    // label for the directorate's letter
    {
      const [x, y] = toScreen(c, ...s1.pt(0, 0));
      chip.style.left = x + 'px'; chip.style.top = y - 46 + 'px';
      show(chip, env(t, 43.2, 45.0, 0.5, 0.4), 'none');
    }
    tshow(k1, t, 46.9, 52.6, { st: 0.02 });
    tshow(q1, t, 47.0, 52.6, { st: 0.05 });
    tshow(p1, t, 48.9, 52.6, { st: 0.03 });
    tshow(sr1, t, 49.6, 52.6, { st: 0.01 });
    // § 19-4 lifts out of the letter
    const r = hlScreen(c, s3, ['svar_1994'], s3.rest);
    const ta = 53.5, tb = 54.9;
    const p = pr(t, ta, tb, E.io5);
    const srcH = (r.y1 - r.y0) * 1.1, s0 = srcH / 300 * 1.02;
    const endW = 940, x = lerp(r.x0 - 6, 960 - endW / 2, p), y = lerp(r.y0 - srcH * 0.12, 150, p), s = lerp(s0, 1, p);
    show(para, env(t, ta, 61.5, 0.2, 0.5), `translate(${x}px,${y}px) scale(${s})`);
    tshow(qa, t, 55.2, 61.5, { st: 0.04 });
    tshow(qb, t, 56.7, 61.5, { st: 0.04 });
    tshow(pl2, t, 58.2, 61.5, { st: 0.05 });
    tshow(sr2, t, 58.8, 61.5, { st: 0.01 });
    tshow(q3, t, 61.8, 66.9, { st: 0.03 });
    tshow(big, t, 63.6, 66.9, { st: 0.12, du: 0.9 });
    tshow(sr3, t, 64.2, 66.9, { st: 0.01 });
  };
}

/* ================================================================== 1:06 Kapittel 4a – Arkivet */
const SOURCES = [
  ['KOSTRA-rapportering 2025', 'Innsamlede mengder og restavfall', 'KOSTRA'],
  ['Retura transportgrunnlag 2025', 'Returpunkter, tømminger og kjørte km', 'Retura'],
  ['Komtek kundesystem', 'Avtaler, beholdere og stoppunkter', 'Komtek'],
  ['Plukkanalyse SHMIL 2025', 'Iris Produksjon · desember 2025', 'Plukkanalyse'],
  ['Sirkel – mottaksdata 2025', 'Kvalitet på levert glass og metall', 'Sirkel'],
  ['SSB-statistikk', 'Befolkning og tettsteder', 'SSB'],
  ['Tekniska Verken – sorteringstest', 'Metall i ettersortering', 'Sorteringstest'],
  ['Konsekvensutredning kap. 10a', 'Miljødirektoratets kostnadsgrunnlag', 'Konsekvens-\nutredning'],
  ['Produksjons- og kostnadsregnskap', 'SHMILs beregningsmodell og driftsdata', 'Kostnads-\nmodell'],
];
function sceneArkiv() {
  const sc = mkScene(68.4, 83.4, 0.6, 0.7);
  const W = sc.world;
  const COLS = 9, ROWS = 5, SX = 420, SY = 310;
  const realAt = { '1,1': 0, '3,0': 1, '5,1': 2, '7,0': 3, '8,2': 4, '6,3': 5, '4,3': 6, '2,4': 7, '0,2': 8 };
  const tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const real = realAt[`${c},${r}`];
    const el = $('div', 'tile' + (real != null ? ' real' : ''), W);
    const x = (c - (COLS - 1) / 2) * SX, y = (r - (ROWS - 1) / 2) * SY;
    el.style.transform = `translate(${x - 180}px,${y - 125}px)`;
    const lens = real != null ? [210, 150] : [230, 180, 120];
    lens.forEach((w, i) => { const l = $('div', 'ln', el); l.style.top = 34 + i * 26 + 'px'; l.style.width = w + 'px'; });
    if (real != null) { const lb = $('div', 'lbl', el); lb.textContent = SOURCES[real][2].replace('\n', ''); }
    tiles.push({ el, x, y, real });
  }
  const camK = [[68.4, { cx: 0, cy: 260, z: 0.4, rx: 30 }], [83.4, { cx: 0, cy: 180, z: 0.44, rx: 26 }, E.lin]];
  const ov = sc.ov;
  const k = txt(ov, 'k', 'Sommeren 2026', 150, 104);
  const h = txt(ov, 'st', 'Dokumentasjonen hentes fram', 150, 142);
  const su = txt(ov, 'sub', 'fra fagsystemer, arkiver, prosjektmapper og eksterne kilder', 150, 240, { size: 36 });
  const foot = txt(ov, 'st2', 'Ni kilder – hentet fram og gjennomgått', 150, 818, { size: 52 });
  const slots = SOURCES.map((s, i) => ({ x: 150 + (i % 3) * 560, y: 330 + Math.floor(i / 3) * 150 }));
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const cards = SOURCES.map((s, i) => {
    const e = $('div', 'sc', ov, `<div class="dot"></div><div class="nm">${s[0]}</div><div class="ty">${s[1]}</div>`);
    e.style.display = 'none';
    return e;
  });
  sc.upd = t => {
    const c = camApply(sc, t, camK);
    veilSet(sc, 0.62 * pr(t, 70.4, 73.5), 3);
    tshow(k, t, 69.0, 81.6, { st: 0.02 });
    tshow(h, t, 69.1, 81.6, { st: 0.06 });
    tshow(su, t, 69.7, 81.6, { st: 0.02 });
    tshow(foot, t, 80.0, 82.8, { st: 0.04 });
    order.forEach((si, k2) => {
      const tile = tiles.find(x => x.real === si);
      const tp = P(8) + k2 * 1.1;
      // tile lifts out of the wall
      tile.el.style.opacity = (1 - pr(t, tp, tp + 0.3)).toFixed(3);
      const [ax, ay] = toScreen(c, tile.x - 180, tile.y - 125), [bx] = toScreen(c, tile.x + 180, tile.y - 125);
      const s0 = (bx - ax) / 540;
      const p = pr(t, tp, tp + 0.85, E.io);
      const sl = slots[k2];
      // at the end the cards travel together towards the next scene (Vedlegg 1)
      const pe = pr(t, 82.0, 83.1, E.io);
      const x = lerp(lerp(ax, sl.x, p), 1180 + (k2 % 3) * 60, pe), y = lerp(lerp(ay, sl.y, p), 470 + Math.floor(k2 / 3) * 40, pe);
      const s = lerp(lerp(s0, 1, p), 0.35, pe);
      const a = pr(t, tp - 0.05, tp + 0.15) * (1 - pr(t, 82.6, 83.2));
      show(cards[si], a, `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`);
    });
  };
}

/* ================================================================== 1:22 Kapittel 4b – Vedleggene */
function sceneVedlegg() {
  const sc = mkScene(82.4, 93.4, 0.6, 0.6);
  const W = sc.world;
  const v1 = [], v2 = [];
  for (let i = 4; i >= 1; i--) { v1[i] = new Page(W, 'v1', i, { lo: i > 1 }); sc.pages.push(v1[i]); }
  const V2N = [21, 17, 13, 5, 1];
  V2N.forEach(n => { const p = new Page(W, 'v2', n, { lo: n !== 1 }); v2.push(p); sc.pages.push(p); });
  const L = { x: -700, y: 0 }, R = { x: 700, y: 0 };
  for (let i = 1; i <= 4; i++) {
    const k = 4 - i;
    const solo = { x: i * 5, y: i * 4, s: 1, r: -0.3 + k * 0.7, o: 1, shade: i === 1 ? 0 : 0.1 };
    const left = { ...solo, x: L.x + k * 9, y: L.y + k * 8 };
    v1[i].keys = [[82.4, { ...solo, y: solo.y + 60, o: 0 }], [83.2, solo, E.o5], [86.4, solo], [87.6, left, E.io]];
    v1[i].rest = solo;
  }
  v2.forEach((p, k) => {
    const n = v2.length - 1 - k;
    const st = { x: R.x + n * 9, y: R.y + n * 8, s: 1, r: 0.8 - n * 0.6, o: 1, shade: k === v2.length - 1 ? 0 : 0.1 };
    p.keys = [[86.2 + k * 0.05, { ...st, x: st.x + 1800, r: st.r + 6 }], [87.6 + k * 0.05, st, E.o5]];
  });
  const p1 = v1[1];
  H(sc, p1, 'v1_datastatus_hdr', 'box-g', 83.5, 84.0);
  H(sc, p1, 'v1_kilde_hdr', 'box-g', 83.9, 84.4);
  H(sc, p1, 'v1_maalt', 'm-g', 84.7, 85.4);
  H(sc, p1, 'v1_modell', 'm-b', 85.3, 86.1);
  const camK = [
    [82.4, lookPage(p1, 0.76, 1400, 540)],
    [86.4, lookPage(p1, 0.8, 1420, 560), E.io2],
    [87.8, { cx: 0, cy: -100, z: 0.42, rx: 0 }, E.io],
    [93.4, { cx: 0, cy: -100, z: 0.435, rx: 0 }, E.lin],
  ];
  const ov = sc.ov;
  const k1 = txt(ov, 'k', 'Kontroll', 150, 300);
  const h1 = txt(ov, 'st2', 'Hver opplysning merkes med kilde og datastatus', 150, 340, { w: 640 });
  const k2 = txt(ov, 'k', 'Vedlegg 1 · versjon 31.08.2026', 0, 92, { center: true });
  const q2 = txt(ov, 'q', '«Bygget fra auditerte originalkilder og SHMILs underliggende beregningsmodell.»', 0, 132, { center: true, w: 1640, size: 52 });
  const lab = (kk, nm, sm) => {
    const e = $('div', 'ov', ov, `<div class="k" style="margin-bottom:12px">${kk}</div><div style="font:600 34px/1.2 var(--display);color:var(--ink)">${nm}</div><div class="src" style="margin-top:6px">${sm}</div>`);
    e.style.width = '640px'; e.style.textAlign = 'center'; e.style.whiteSpace = 'normal'; e.style.display = 'none';
    return e;
  };
  const LB = [[lab('Vedlegg 1', 'Nøkkeltall, kilder og datastatus', '4 sider'), L], [lab('Vedlegg 2', 'Plukkanalyse SHMIL 2025', 'Gjennomført 9.–10. desember 2025 · 21 sider'), R]];
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    tshow(k1, t, 82.9, 86.4, { st: 0.02 });
    tshow(h1, t, 83.0, 86.4, { st: 0.05 });
    tshow(k2, t, 87.6, 93.0, { st: 0.015 });
    tshow(q2, t, 87.8, 93.0, { st: 0.045 });
    LB.forEach(([e, pos], i) => {
      const [x, y] = toScreen(c, pos.x, pos.y + 707);
      e.style.left = x - 320 + 'px'; e.style.top = y + 26 + 'px';
      fshow(e, t, 88.4 + i * 0.3, 93.0, { dy: 16 });
    });
  };
}

/* ================================================================== 1:32 Kapittel 5a – Søknaden og henvisningene */
function sceneSoknad() {
  const sc = mkScene(94.4, 107.9, 0.6, 0.5);
  const W = sc.world, GAP = 1120, pg = [];
  for (let i = 6; i >= 1; i--) { pg[i] = new Page(W, 'sok', i, { lo: i > 1 }); sc.pages.push(pg[i]); }
  for (let i = 1; i <= 6; i++) {
    const stack = { x: i * 6, y: i * 5, s: 1, r: -0.3 + (i - 1) * 0.5, o: 1, shade: i === 1 ? 0 : 0.12 };
    const row = { x: (i - 1) * GAP, y: 0, s: 1, r: [0, -0.3, 0.4, -0.3, 0.3, -0.4, 0.3][i], o: 1, shade: 0 };
    const keys = [[94.4, { ...stack, y: stack.y + 1600, r: stack.r + 5 }], [96.0 + i * 0.03, stack, E.o5]];
    if (i > 1) keys.push([100.4 + (i - 2) * 0.12, stack], [101.5 + (i - 2) * 0.12, row, E.io]);
    pg[i].keys = keys;
    pg[i].rest = i === 1 ? { x: 6, y: 5, s: 1, r: -0.3 } : row;
  }
  const s1 = pg[1];
  H(sc, s1, 'sok_fiber', 'm-g', 96.7, 97.5);
  H(sc, s1, 'sok_glass', 'm-b', 97.5, 98.3);
  H(sc, s1, 'sok_2030', 'm-b', 98.2, 98.6);
  const REFS = [
    [1, 'sok_ref_p1', [0]], [2, 'sok_ref_p2', [0]], [3, 'sok_ref_p3a', [2]], [3, 'sok_ref_p3b', [2]],
    [4, 'sok_ref_p4a', [1]], [4, 'sok_ref_p4b', [3]], [4, 'sok_ref_p4c', [0]], [5, 'sok_ref_p5', [2]], [6, 'sok_vedlegges', [0, 1]],
  ];
  REFS.forEach(([pi, id], k) => { const tt = 101.9 + k * 0.22; REFS[k].push(tt); H(sc, pg[pi], id, 'boxL-g', tt, tt + 0.4); });
  const camK = [
    [94.4, lookPage(s1, 0.7, 1350, 540)],
    [100.4, lookPage(s1, 0.73, 1350, 540), E.lin],
    [101.7, { cx: 2.5 * GAP, cy: 230, z: 0.27, rx: 0 }, E.io],
    [107.9, { cx: 2.5 * GAP, cy: 230, z: 0.278, rx: 0 }, E.lin],
  ];
  const ov = sc.ov;
  const k0 = txt(ov, 'k', 'Søknaden 31.08.2026', 120, 196);
  const mk = (cls, lb, tt, ds, y, col) => {
    const e = $('div', 'card', ov, `<div class="bar" style="background:${col}"></div><div class="lb" style="color:${col}">${lb}</div><div class="tt" style="font-size:50px">${tt}</div><div class="ds">${ds}</div>`);
    return place(e, 120, y, 840);
  };
  const c1 = mk('', 'Papp og papir', 'Egen fiberdunk innføres', 'Henteordning for alle husstander – uavhengig av søknaden', 246, 'var(--green)');
  const c2 = mk('', 'Glass- og metallemballasje', 'Søknad om tidsbegrenset unntak etter § 19-4', 'Frem til 31.12.2030, med årlig dokumentasjon', 520, 'var(--blue-hi)');
  const hd = txt(ov, 'st', 'Hver påstand viser til dokumentasjonen', 0, 96, { center: true });
  const chipsBox = $('div', 'ov', ov);
  chipsBox.style.cssText += ';left:0;top:792px;width:1920px';
  const chipsRow = $('div', null, chipsBox);
  chipsRow.style.cssText = 'display:flex;justify-content:center;gap:28px;white-space:nowrap';
  const chips = ['Vedlegg 1 · Nøkkeltall og kilder', 'Vedlegg 2 · Plukkanalysen', 'Miljødirektoratets brev og rapporter', 'Sirkel · kvalitetsdata']
    .map(s => $('span', 'chip', chipsRow, s));
  chipsBox.style.display = 'none';
  const lines = [];
  const LINE_IDS = ['sok_ref_p1', 'sok_ref_p2', 'sok_ref_p3a', 'sok_ref_p4a', 'sok_ref_p4b', 'sok_vedlegges'];
  REFS.filter(r => LINE_IDS.includes(r[1])).forEach(r => r[2].forEach(ci => lines.push({ pi: r[0], id: r[1], ci, t: r[3], p: svgPath(sc, '#0E9C79', 2.5) })));
  let chipPos = null;
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t);
    const c = camApply(sc, t, camK);
    tshow(k0, t, 95.3, 100.6, { st: 0.02 });
    fshow(c1, t, 95.5, 100.6, { dx: -40, dy: 0 });
    fshow(c2, t, 96.1, 100.6, { dx: -40, dy: 0 });
    tshow(hd, t, 101.5, 107.6, { st: 0.06 });
    const ca = env(t, 103.9, 107.6, 0.6, 0.5);
    show(chipsBox, ca, `translateY(${(1 - pr(t, 103.9, 104.6, E.o5)) * 20}px)`);
    if (ca > 0 && !chipPos) {
      const sr = S('stage').getBoundingClientRect(), k = sr.width / 1920;
      chipPos = chips.map(ch => { const b = ch.getBoundingClientRect(); return { x: (b.left + b.width / 2 - sr.left) / k, y: 792 }; });
    }
    for (const L of lines) {
      const a = env(t, 104.3, 107.6, 0.3, 0.5);
      if (a <= 0 || !chipPos) { L.p.style.display = 'none'; continue; }
      L.p.style.display = '';
      const r = hlScreen(c, pg[L.pi], [L.id]);
      const x0 = (r.x0 + r.x1) / 2, y0 = r.y1 + 8, x1 = chipPos[L.ci].x, y1 = chipPos[L.ci].y - 6;
      const prog = pr(t, 104.3 + L.ci * 0.08, 105.3 + L.ci * 0.08, E.io);
      const xe = lerp(x0, x1, prog), ye = lerp(y0, y1, prog);
      const my = (y0 + ye) / 2;
      L.p.setAttribute('d', `M${x0.toFixed(1)},${y0.toFixed(1)} C${x0.toFixed(1)},${my.toFixed(1)} ${xe.toFixed(1)},${my.toFixed(1)} ${xe.toFixed(1)},${ye.toFixed(1)}`);
      L.p.style.opacity = (0.55 * a).toFixed(3);
    }
  };
}

/* ================================================================== 1:47 Kapittel 5b – Nytte og belastning */
function sceneBelastning() {
  const sc = mkScene(107.4, 119.5, 0.5, 0.5);
  const ov = sc.ov;
  // nytte
  const k1 = txt(ov, 'k', 'Nytte', 200, 250);
  const h1 = txt(ov, 'st', 'Ni av ti kilo samles allerede inn i dag', 200, 290);
  const BAR = { x: 200, y: 470, w: 1520, h: 110 }, f1 = 375.5 / 421.2;
  const b1 = $('div', 'ov', ov); b1.style.cssText += `;left:${BAR.x}px;top:${BAR.y}px;height:${BAR.h}px;width:${BAR.w * f1}px;background:#007B61;border-radius:10px 0 0 10px;transform-origin:0 50%`;
  const b1t = $('div', 'ov', ov, '375,5 tonn samles inn i dag'); b1t.style.cssText += `;left:${BAR.x + 34}px;top:${BAR.y + 33}px;font:600 38px/1 var(--display);color:#fff`;
  const b2 = $('div', 'ov', ov); b2.style.cssText += `;left:${BAR.x + BAR.w * f1 + 6}px;top:${BAR.y}px;height:${BAR.h - 6}px;width:${BAR.w * (1 - f1) - 12}px;border:3px dashed #2A7FA6;border-radius:0 10px 10px 0;background:repeating-linear-gradient(135deg,rgba(42,127,166,.16) 0 10px,rgba(42,127,166,.04) 10px 20px);transform-origin:0 50%`;
  const b2t = $('div', 'ov', ov, '<div style="font:700 50px/1 var(--display);color:#2A7FA6">+ 45,7 tonn</div><div style="font:400 30px/1.3 var(--sans);color:var(--ink2);margin-top:8px">modellert meruttak</div>');
  b2t.style.cssText += `;left:${BAR.x + BAR.w - 420}px;top:${BAR.y + BAR.h + 26}px;width:420px;text-align:right;white-space:normal`;
  [b1, b1t, b2, b2t].forEach(e => (e.style.display = 'none'));
  const s1 = txt(ov, 'src', 'Søknaden kap. 2.1 og Vedlegg 1 · Meruttaket er et modellscenario (50 % fangst), ikke en målt effekt.', 200, 780, { w: 1500 });
  // belastning
  const k2 = txt(ov, 'k', 'Belastning', 200, 196);
  const h2 = txt(ov, 'st', 'Det den siste tidelen ville kreve', 200, 236);
  const items = [
    ['ca. 56 000', 'tømmestopp i året'],
    ['0,8 kg', 'ekstra glass og metall per stopp'],
    ['ca. 9 228', 'nye beholdere'],
    ['Ny tungtrafikk', 'i boliggatene – med støy, vei-, dekk- og bremseslitasje og partikkelutslipp'],
  ].map(([v, d], i) => {
    const e = $('div', 'ov', ov, `<div style="font:700 88px/1 var(--display);letter-spacing:-.02em;color:var(--ink)">${v}</div><div style="font:400 34px/1.3 var(--sans);color:var(--ink2);margin-top:12px">${d}</div>`);
    return place(e, 200 + (i % 2) * 800, 392 + Math.floor(i / 2) * 250, 720);
  });
  items.forEach(e => (e.style.whiteSpace = 'normal'));
  const tg = $('div', 'ov', ov, '<span class="tag s">Beregnet<span class="x">søknaden kap. 2.2 og 5.2, på grunnlag av Vedlegg 1</span></span>');
  place(tg, 200, 910);
  sc.upd = t => {
    tshow(k1, t, 107.7, 112.0, { st: 0.02 });
    tshow(h1, t, 107.8, 112.0, { st: 0.06 });
    const ga = env(t, 108.4, 112.0, 0.3, 0.5);
    show(b1, ga, `scaleX(${pr(t, 108.4, 109.6, E.io)})`);
    show(b1t, ga * pr(t, 109.3, 109.9), 'none');
    show(b2, ga * pr(t, 109.6, 110.0), `scaleX(${pr(t, 109.6, 110.2, E.o5)})`);
    show(b2t, ga * pr(t, 110.0, 110.5), 'none');
    tshow(s1, t, 110.2, 112.0, { st: 0.006 });
    tshow(k2, t, 112.2, 119.2, { st: 0.02 });
    tshow(h2, t, 112.3, 119.2, { st: 0.06 });
    items.forEach((e, i) => fshow(e, t, 112.9 + i * 0.55, 119.2, { dy: 30 }));
    fshow(tg, t, 115.4, 119.2, { dy: 10 });
  };
}

/* ================================================================== 1:59 Kapittel 5c – Boksen på side 1 */
function sceneBoks() {
  const sc = mkScene(118.9, 133.1, 0.5, 0.5);
  const p1 = new Page(sc.world, 'sok', 1);
  sc.pages.push(p1);
  p1.rest = { x: 0, y: 0, s: 1, r: 0 };
  p1.keys = [[118.9, { x: 0, y: 80, s: 0.98, r: 0, o: 0, shade: 0 }], [119.6, { x: 0, y: 0, s: 1, r: 0, o: 1, shade: 0 }, E.o5]];
  H(sc, p1, 'sok_box', 'box-g', 120.1, 120.5);
  const camK = [
    [118.9, lookPage(p1, 0.58, 960, 540)],
    [120.4, look(p1, ['sok_box'], 1.95, 960, 540), E.io],
    [121.6, look(p1, ['sok_box'], 2.0, 960, 540), E.lin],
  ];
  const ov = sc.ov;
  const k1 = txt(ov, 'k', 'Søknaden, side 1 – konklusjonen', 200, 150);
  const st = txt(ov, 'st', 'Omlegging til henteordning koster *74 286 kroner* per ekstra tonn', 200, 190, { w: 1520, size: 74 });
  const BX = 200, BW = 1520;
  const l1 = txt(ov, 'pl', 'Miljødirektoratets eget anslag da kravet ble innført', BX, 424, { size: 32 });
  const r1 = $('div', 'ov', ov); r1.style.cssText += `;left:${BX}px;top:470px;height:52px;width:${BW / 41}px;background:#78848A;border-radius:6px;transform-origin:0 50%`;
  const v1 = $('div', 'ov', ov, 'ca. 1 810 kr'); v1.style.cssText += `;left:${BX + BW / 41 + 18}px;top:478px;font:600 36px/1 var(--display);color:var(--ink2)`;
  const l2 = txt(ov, 'pl', 'SHMILs pliktområde', BX, 552, { size: 32 });
  const r2 = $('div', 'ov', ov); r2.style.cssText += `;left:${BX}px;top:598px;height:52px;width:${BW}px;background:#007B61;border-radius:6px;transform-origin:0 50%`;
  const v2 = $('div', 'ov', ov, '74 286 kr'); v2.style.cssText += `;left:${BX + BW - 260}px;top:606px;width:236px;text-align:right;font:600 36px/1 var(--display);color:#fff`;
  [r1, v1, r2, v2].forEach(e => (e.style.display = 'none'));
  const x40 = txt(ov, 'dt', '*over* *40* *ganger*', BX, 694, { size: 124 });
  const x40s = txt(ov, 'pl', 'det direktoratet selv la til grunn i sine beregninger', BX, 836, { size: 40 });
  const foot = txt(ov, 'foot', 'Konsekvensutredningen (M-2021) la til grunn ca. 1 475 kr per ekstra tonn i 2020-priser, ca. 1 810 kr i 2025-priser. Tallene har ikke fullt ut samme systemgrense og sammenlignes som størrelsesorden (søknaden kap. 3.1).', BX, 960, { w: 1520 });
  // 3,39 mill.
  const k3 = txt(ov, 'k', 'Dette tilsvarer', 0, 330, { center: true });
  const num = $('div', 'ov num', ov); num.style.cssText += ';left:0;top:376px;width:1920px;text-align:center'; num.style.display = 'none';
  const pl3 = txt(ov, 'pl', 'i året – en økning i renovasjonsgebyret på 3–4 %', 0, 594, { center: true, size: 48 });
  const src3 = txt(ov, 'src', 'Søknaden, side 1 · modellert merkostnad ved henteordning i tettbygd strøk', 0, 700, { center: true });
  sc.upd = t => {
    pagesApply(sc, t); hlsApply(sc, t); camApply(sc, t, camK);
    p1.dim(['sok_box'], 0.85 * env(t, 119.8, 121.6, 0.5, 0.4), 40);
    veilSet(sc, pr(t, 121.0, 121.6), 9);
    tshow(k1, t, 121.2, 128.3, { st: 0.015 });
    tshow(st, t, 121.3, 128.3, { st: 0.06 });
    const ba = env(t, 122.1, 128.3, 0.4, 0.5);
    tshow(l1, t, 122.1, 128.3, { st: 0.02 });
    show(r1, ba, `scaleX(${pr(t, 122.3, 122.7, E.o5)})`);
    show(v1, ba * pr(t, 122.6, 123.0), 'none');
    tshow(l2, t, 122.5, 128.3, { st: 0.02 });
    show(r2, ba * pr(t, 122.6, 122.8), `scaleX(${pr(t, 122.7, 124.3, E.io)})`);
    show(v2, ba * pr(t, 124.0, 124.4), 'none');
    tshow(x40, t, P(14) + 0.1, 128.3, { st: 0.1, du: 0.9 });
    tshow(x40s, t, 124.4, 128.3, { st: 0.03 });
    tshow(foot, t, 125.0, 128.3, { st: 0.004 });
    tshow(k3, t, 128.5, 132.9, { st: 0.02 });
    const na = env(t, 128.6, 132.9, 0.5, 0.5);
    if (show(num, na, `translateY(${(1 - pr(t, 128.6, 129.3, E.o5)) * 30}px)`)) {
      num.innerHTML = nf(3.39 * pr(t, 128.7, 129.9, E.o5), 2) + '<span style="font-size:120px;letter-spacing:-.01em"> mill. kr</span>';
    }
    tshow(pl3, t, 129.6, 132.9, { st: 0.04 });
    tshow(src3, t, 130.2, 132.9, { st: 0.01 });
  };
}

/* ================================================================== 2:12 Kapittel 5d – Pakken sendes */
function scenePakke() {
  const sc = mkScene(132.5, 140.9, 0.6, 0.6);
  const W = sc.world;
  const groups = [
    { docs: [['sok', 4, true], ['sok', 3, true], ['sok', 2, true], ['sok', 1, false]], x: -1300, k: 'Søknad', nm: 'Tidsbegrenset unntak etter § 19-4', sm: '6 sider' },
    { docs: [['v1', 3, true], ['v1', 2, true], ['v1', 1, true]], x: 0, k: 'Vedlegg 1', nm: 'Nøkkeltall, kilder og datastatus', sm: '4 sider' },
    { docs: [['v2', 17, true], ['v2', 13, true], ['v2', 5, true], ['v2', 2, true], ['v2', 1, true]], x: 1300, k: 'Vedlegg 2', nm: 'Plukkanalyse SHMIL 2025', sm: '21 sider' },
  ];
  const ord = [2, 1, 0]; // vedlegg underneath, søknad on top when merged
  ord.forEach(gi => {
    const g = groups[gi];
    g.docs.forEach(([d, n, lo], k) => {
      const p = new Page(W, d, n, { lo });
      const nn = g.docs.length - 1 - k;
      const st = { x: g.x + nn * 8, y: nn * 7, s: 1, r: (nn - 1) * 0.6 - 0.4, o: 1, shade: nn === 0 ? 0 : 0.1 };
      const merged = { ...st, x: (2 - gi) * 26 + nn * 6, y: (2 - gi) * 22 + nn * 5 - 40 };
      const sent = { ...merged, x: merged.x + 2400, y: merged.y - 500, s: 0.6, r: merged.r + 6, o: 0 };
      p.keys = [[132.5 + gi * 0.2, { ...st, y: st.y + 1500, r: st.r + 5 }], [133.9 + gi * 0.2, st, E.o5],
        [135.7 + (2 - gi) * 0.12, st], [136.9 + (2 - gi) * 0.12, merged, E.io], [137.6, merged], [139.4, sent, E.i]];
      sc.pages.push(p);
    });
  });
  const camK = [[132.5, { cx: 0, cy: 60, z: 0.36, rx: 0 }], [136.9, { cx: 0, cy: 60, z: 0.38, rx: 0 }, E.lin], [140.9, { cx: 300, cy: 120, z: 0.4, rx: 0 }, E.io]];
  const ov = sc.ov;
  const labs = groups.map(g => {
    const e = $('div', 'ov', ov, `<div class="k" style="margin-bottom:12px">${g.k}</div><div style="font:600 32px/1.2 var(--display);color:var(--ink)">${g.nm}</div><div class="src" style="margin-top:6px">${g.sm}</div>`);
    e.style.width = '440px'; e.style.textAlign = 'center'; e.style.whiteSpace = 'normal'; e.style.display = 'none';
    return e;
  });
  const k = txt(ov, 'k', '31. august 2026', 0, 812, { center: true });
  const h = txt(ov, 'st', 'Oversendt Miljødirektoratet', 0, 852, { center: true });
  sc.upd = t => {
    pagesApply(sc, t);
    const c = camApply(sc, t, camK);
    groups.forEach((g, i) => {
      const [x, y] = toScreen(c, g.x, 707);
      labs[i].style.left = x - 220 + 'px'; labs[i].style.top = y + 30 + 'px';
      fshow(labs[i], t, 134.0 + i * 0.25, 136.0, { dy: 16 });
    });
    tshow(k, t, 138.0, 140.6, { st: 0.02 });
    tshow(h, t, 138.1, 140.6, { st: 0.07 });
  };
}

/* ================================================================== 2:20 Avslutning */
let FIN;
function buildFinal() {
  const h = txt(OV, 'st', 'SHMIL søker om tidsbegrenset\nunntak etter § 19-4', 0, 128, { center: true, size: 80 });
  const s = txt(OV, 'sub', 'Glass- og metallemballasje – frem til 31.12.2030', 0, 330, { center: true, size: 44 });
  const w = txt(OV, 'st', '*Vi* *venter* *fortsatt* *på* *svar.*', 0, 790, { center: true, size: 72 });
  const logo = $('img', 'ov', OV); logo.src = 'assets/shmil-logo-green.png'; logo.alt = 'SHMIL';
  logo.style.cssText += ';left:893px;top:960px;height:50px;display:none';
  IMGS.push(logo);
  FIN = t => {
    tshow(h, t, HIT_END + 0.2, 150, { st: 0.08, du: 0.9 });
    tshow(s, t, HIT_END + 1.1, 150, { st: 0.04 });
    tshow(w, t, 143.2, 150, { st: 0.12, du: 0.9 });
    fshow(logo, t, 144.8, null, { dy: 10, fi: 1.0 });
  };
}

/* ================================================================== render */
function renderAt(t) {
  t = clamp(t, 0, DUR);
  const cardA = cardAmount(t);
  S('cveil').style.opacity = (0.97 * cardA).toFixed(3);
  // station line: opening draw, chapter cards, final
  TLG.clearRect(0, 0, 1920, 1080);
  const openA = env(t, 5.9, 9.4, 0.6, 0.7), finA = pr(t, HIT_END + 0.5, HIT_END + 1.4) * (1 - pr(t, 148.0, 149.6));
  if (t < 9.4 && cardA < 0.5) drawLine(t, openA, 720, pr(t, 6.0, 8.4, E.io), 0);
  else if (finA > 0) drawLine(t, finA, 610, null, 1);
  else drawLine(t, cardA, 720, null, 0);
  cardsUpdate(t);
  for (const sc of SCENES) {
    const on = t >= sc.a && t <= sc.b;
    if (!on) { if (sc.root.style.display !== 'none') sc.root.style.display = 'none'; continue; }
    sc.root.style.display = 'block';
    sc.root.style.opacity = env(t, sc.a, sc.b, sc.fi, sc.fo, E.o, E.io).toFixed(3);
    sc.upd(t);
  }
  FIN(t);
  S('black').style.opacity = Math.max(1 - pr(t, 0, 1.2, E.o), pr(t, 148.0, 149.7, E.io2)).toFixed(3);
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
  const poster = 3.6;
  btn.onclick = () => {
    if (au.paused) {
      if (!started && au.currentTime < 0.05) au.currentTime = 0;
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
    if (!scrubbing) { renderAt(started ? t : poster); sc.value = t; }
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
  renderAt(m ? +m[1] : isRender ? 0 : 3.6);
  window.FILM_READY = true;
  if (!isRender) preview();
});
})();
