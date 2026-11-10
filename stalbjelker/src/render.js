// render.js – SVG (mm) -> PDF (vektor) og PNG (kontroll) via Chromium.
// Bruk: node render.js <ut-mappe> <ark1.svg> [ark2.svg ...] [--png-scale=2] [--no-png]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const outDir = args[0];
  const svgs = args.slice(1).filter(a => !a.startsWith('--'));
  const scaleArg = args.find(a => a.startsWith('--png-scale='));
  const pngScale = scaleArg ? parseFloat(scaleArg.split('=')[1]) : 2;
  const noPng = args.includes('--no-png');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const svgPath of svgs) {
    const svg = fs.readFileSync(svgPath, 'utf8');
    const m = svg.match(/width="([\d.]+)mm" height="([\d.]+)mm"/);
    const wmm = parseFloat(m[1]), hmm = parseFloat(m[2]);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: ${wmm}mm ${hmm}mm; margin: 0 }
      html, body { margin: 0; padding: 0; background: #fff }
      svg { display: block }
    </style></head><body>${svg}</body></html>`;
    const base = path.basename(svgPath, '.svg');
    const wpx = Math.round(wmm / 25.4 * 96), hpx = Math.round(hmm / 25.4 * 96);
    const ctx = await browser.newContext({ viewport: { width: wpx, height: hpx }, deviceScaleFactor: pngScale });
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: path.join(outDir, base + '.pdf'), width: `${wmm}mm`, height: `${hmm}mm`,
                     printBackground: true, preferCSSPageSize: true });
    if (!noPng) await page.screenshot({ path: path.join(outDir, base + '.png'), fullPage: false });
    await ctx.close();
    console.log('ok', base);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
