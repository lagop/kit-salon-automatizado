// scripts/render-preview.mjs
// Render the PDF source HTML → per-page PNG previews for visual QA.
// Uses Playwright headless Chromium with print media emulation so the
// `counter(page)` and `counter(pages)` CSS counters expand correctly.

import { chromium } from '/paperclip/playwright/node_modules/playwright/index.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(here, 'assets/pdf/source.html');
const outDir = '/tmp/kaia-2401/pdf-preview';
await mkdir(outDir, { recursive: true });

const fileUrl = 'file://' + htmlPath;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const ctx = await browser.newContext({
    viewport: { width: 794, height: 1123 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.emulateMedia({ media: 'print' });
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(500);

  const total = await page.evaluate(() => document.querySelectorAll('.page').length);
  for (let i = 1; i <= total; i++) {
    const el = await page.$(`.page:nth-of-type(${i})`);
    if (!el) {
      console.warn(`no .page at index ${i}`);
      continue;
    }
    await el.screenshot({ path: `${outDir}/page-${i}.png` });
    console.log(`wrote page-${i}.png`);
  }
} finally {
  await browser.close();
}

console.log(`previews in ${outDir}`);