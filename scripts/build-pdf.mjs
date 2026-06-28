// scripts/build-pdf.mjs
// Render lead-magnet-pdf-content.md → branded 8-page PDF
// for /kit/assets/kit-salon-automatizado.pdf. Branding from KAIA-436
// (terracotta #BE4F33, bone #FAF6EE, paper #F1ECE0, ink #14181F).
//
// We hand-laid the layout as 8 logical pages in HTML with hard
// 210mm × 297mm boxes, then print via Playwright Chromium.
//
// Usage: node scripts/build-pdf.mjs
//   output: build/assets/kit-salon-automatizado.pdf

import { chromium } from '/paperclip/playwright/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const htmlPath = resolve(here, 'assets/pdf/source.html');
const pdfPath = resolve(repoRoot, 'build/assets/kit-salon-automatizado.pdf');

await mkdir(dirname(pdfPath), { recursive: true });

const fileUrl = 'file://' + htmlPath;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1240, height: 1754 } });
  const page = await ctx.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(300);
  await page.pdf({
    path: pdfPath,
    width: '210mm',
    height: '297mm',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
} finally {
  await browser.close();
}

const { statSync } = await import('node:fs');
const size = statSync(pdfPath).size;
console.log(`wrote ${pdfPath} (${size} bytes)`);