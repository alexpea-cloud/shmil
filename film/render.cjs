#!/usr/bin/env node
/* Renders film/index.html frame by frame with headless Chromium (Playwright)
 * and encodes an MP4 (H.264 + AAC) with ffmpeg.
 *
 *   node render.cjs                       -> output/SHMIL_grunnlaget_for_soknaden.mp4
 *   node render.cjs --stills 12.5,40,81   -> PNG stills in output/stills/
 *   options: --workers 3 --fps 30 --crf 22 --out <file.mp4> --from <s> --to <s> --keep
 */
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const has = name => args.includes('--' + name);

const ROOT = __dirname;
const URL = 'file://' + path.join(ROOT, 'index.html') + '?render=1';
const OUTDIR = path.join(ROOT, '..', 'output');
const FPS = +opt('fps', 30);
const WORKERS = +opt('workers', 3);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.FILM_READY === true, null, { timeout: 120000 });
  return page;
}
async function frame(page, t) {
  await page.evaluate(tt => window.FILM.renderAt(tt), t);
}

async function stills(list) {
  const dir = path.join(OUTDIR, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await openPage(browser);
  for (const t of list) {
    await frame(page, t);
    const f = path.join(dir, `still_${t.toFixed(2).padStart(6, '0')}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
}

async function full() {
  const dur = await (async () => {
    const b = await chromium.launch(); const p = await openPage(b);
    const d = await p.evaluate(() => window.FILM.DUR); await b.close(); return d;
  })();
  const from = +opt('from', 0), to = +opt('to', dur);
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
  const frames = path.join(OUTDIR, 'frames');
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  console.log(`rendering frames ${n0}..${n1 - 1} (${n1 - n0}) with ${WORKERS} workers`);
  const t0 = Date.now();
  let done = 0;
  const browser = await chromium.launch();
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const page = await openPage(browser);
    // interleaved chunks keep the workers balanced
    for (let c = n0 + w * 30; c < n1; c += WORKERS * 30) {
      for (let i = c; i < Math.min(c + 30, n1); i++) {
        await frame(page, i / FPS);
        await page.screenshot({ path: path.join(frames, `f${String(i - n0).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
        done++;
      }
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${done}/${n1 - n0} frames  ${el.toFixed(0)}s  eta ${((el / done) * (n1 - n0 - done)).toFixed(0)}s   `);
    }
    await page.close();
  }));
  await browser.close();
  console.log('\nencoding…');
  const out = opt('out', path.join(OUTDIR, 'SHMIL_grunnlaget_for_soknaden.mp4'));
  // soundtrack: whatever index.html plays
  const audioSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<audio[^>]*src="([^"]+)"/)[1];
  const audio = path.join(ROOT, audioSrc);
  if (!fs.existsSync(audio)) { console.error('soundtrack not found:', audio); process.exit(1); }
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-stats',
    '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'),
    '-ss', String(from), '-i', audio,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '22'), '-aq-mode', '3',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-r', String(FPS),
    '-x264-params', 'keyint=60:min-keyint=30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-af', `afade=t=out:st=${(to - from - 2.0).toFixed(2)}:d=2.0`,
    '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
  if (!has('keep')) fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', out);
}

(async () => {
  if (has('stills')) await stills(opt('stills', '0').split(',').map(Number));
  else await full();
})().catch(e => { console.error(e); process.exit(1); });
