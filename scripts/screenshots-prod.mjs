// Post-deploy screenshots for the /kit/ landing.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.URL || 'https://kit-salon-automatizado.vercel.app/';
const OUT = process.env.OUT || '/paperclip/screenshots/kaia-646-prod';
fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'mobile-375',  viewport: { width: 375,  height: 812  }, ua: 'iPhone' },
  { name: 'tablet-768',  viewport: { width: 768,  height: 1024 }, ua: 'iPad'   },
  { name: 'desktop-1280', viewport: { width: 1280, height: 800  }, ua: 'Desktop' }
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
    const res = await page.goto(URL, { waitUntil: 'networkidle' });
    console.log('Landing status:', res.status());
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `landing-${t.name}-fold.png`), fullPage: false });
    await page.screenshot({ path: path.join(OUT, `landing-${t.name}-full.png`), fullPage: true });

    // 2) Form filled state
    await page.fill('#lead-name', 'María');
    await page.fill('#lead-email', 'maria@misalon.es');
    await page.fill('#lead-salon', 'Salón María');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, `landing-${t.name}-filled.png`), fullPage: false });

    // 3) Gracias page (clean URL — vercel rewrites /gracias → gracias.html)
    await page.goto(URL.replace(/\/$/, '') + '/gracias?email=maria%40misalon.es', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `gracias-${t.name}.png`), fullPage: false });

    await ctx.close();
    console.log('OK', t.name);
  }
} finally {
  await browser.close();
}

console.log('Saved to', OUT);
