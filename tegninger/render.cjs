// Skriver build/tegninger.html (A4 liggende) og build/notat.html (A4 stående) ut til PDF.
//   node render.cjs [--png]      (--png gir også forhåndsvisninger i build/)
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const png = process.argv.includes('--png');
const jobs = [
  { src: 'tegninger.html', out: 'Lindsetvegen_19_-_tegninger_stalbjelker_3_ark_rev_10.pdf',
    width: '297mm', height: '210mm', sel: 'section.sheet', vp: { width: 1123, height: 794 } },
  { src: 'notat.html', out: 'Lindsetvegen_19_-_notat_stalbjelker_rev_10.pdf',
    width: '210mm', height: '297mm', sel: 'section.note', vp: { width: 794, height: 1123 } },
];

(async () => {
  const browser = await chromium.launch();
  for (const job of jobs) {
    const url = pathToFileURL(path.join(__dirname, 'build', job.src)).href;
    const page = await browser.newPage({ viewport: job.vp, deviceScaleFactor: png ? 2 : 1 });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__halo === true);
    const out = path.join(__dirname, job.out);
    await page.pdf({ path: out, width: job.width, height: job.height, printBackground: true, preferCSSPageSize: true });
    console.log(out);
    if (png) {
      const els = await page.$$(job.sel);
      for (let i = 0; i < els.length; i++) {
        const f = path.join(__dirname, 'build', `${path.parse(job.src).name}-${i + 1}.png`);
        await els[i].screenshot({ path: f });
      }
    }
    await page.close();
  }
  await browser.close();
})();
