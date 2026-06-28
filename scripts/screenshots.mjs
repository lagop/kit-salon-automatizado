// Screenshots for /kit/ landing — mobile/tablet/desktop, plus gracias page.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.URL || 'http://localhost:4173/';
const OUT = process.env.OUT || '/paperclip/screenshots/kaia-646';
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'mobile-375', viewport: { width: 375, height: 812 }, ua: 'iPhone' },
  { name: 'tablet-768', viewport: { width: 768, height: 1024 }, ua: 'iPad' },
  { name: 'desktop-1280', viewport: { width: 1280, height: 800 }, ua: 'Desktop' }
];

const browser = await chromium.launch();
try {
  for (const t of targets) {
    const ctx = await browser.newContext({
      viewport: t.viewport,
      deviceScaleFactor: 2
    });
    const page = await ctx.newPage();

    // 1) Landing
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const fullPath = path.join(OUT, `landing-${t.name}-full.png`);
    const aboveFoldPath = path.join(OUT, `landing-${t.name}-fold.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    await page.screenshot({ path: aboveFoldPath, fullPage: false });

    // 2) Form filled state
    if (t.name === 'mobile-375' || t.name === 'desktop-1280') {
      await page.fill('#lead-name', 'María');
      await page.fill('#lead-email', 'maria@misalon.es');
      await page.fill('#lead-salon', 'Salón María');
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `landing-${t.name}-filled.png`), fullPage: false });
    }

    // 3) Gracias page
    await page.goto(URL.replace(/\/$/, '') + '/gracias.html?email=maria%40misalon.es', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `gracias-${t.name}.png`), fullPage: false });

    await ctx.close();
    console.log('OK', t.name);
  }
} finally {
  await browser.close();
}

console.log('Saved to', OUT);
