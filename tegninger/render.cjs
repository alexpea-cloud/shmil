// Skriver build/tegninger.html ut til PDF (A4 liggende), ev. med PNG-forhåndsvisning.
//   node render.cjs [utfil.pdf] [--png]
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const args = process.argv.slice(2);
const png = args.includes('--png');
const out = args.find((a) => !a.startsWith('--')) ??
  path.join(__dirname, 'Lindsetvegen_19_-_tegninger_stalbjelker_3_ark_rev_10.pdf');
const src = pathToFileURL(path.join(__dirname, 'build', 'tegninger.html')).href;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(src, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__halo === true);
  await page.pdf({ path: out, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  console.log(out);
  if (png) {
    const shots = await browser.newPage({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2 });
    await shots.goto(src, { waitUntil: 'load' });
    await shots.waitForFunction(() => window.__halo === true);
    const sheets = await shots.$$('section.sheet');
    for (let i = 0; i < sheets.length; i++) {
      const f = path.join(__dirname, 'build', `ark-${i + 1}.png`);
      await sheets[i].screenshot({ path: f });
      console.log(f);
    }
  }
  await browser.close();
})();
