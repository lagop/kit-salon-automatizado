# /kit/ — Landing de captura de email

**Issue:** [KAIA-646](/KAIA/issues/KAIA-646) · Landing de captura de email — "El kit del salón automatizado"
**Project:** Kira Studio (Kairikos)
**Tier alignment:** Lead-magnet channel (no tier). Conversion-only asset.

## Status

✅ Static landing built, smoke-tested locally, SEO meta + a11y verified.
✅ Lead magnet PDF (8 pages, branded) generated at `build/assets/kit-salon-automatizado.pdf` (see [KAIA-2401](/KAIA/issues/KAIA-2401)).
✅ **PDF live** at `https://kairikos.com/wp-content/uploads/2026/06/kit-salon-automatizado.pdf` (HTTP/2 200, 528,845 bytes, uploaded via WP REST API per [KAIA-2401](/KAIA/issues/KAIA-2401)).
🟡 Awaiting: (a) CEO domain decision, (b) MailerLite integration with the new URL (`MAILERLITE_API_KEY` + `MAILERLITE_GROUP_ID` + automation setup in dashboard), see [KAIA-659](/KAIA/issues/KAIA-659).

## Stack

- Static HTML + vanilla CSS + vanilla JS (no framework, no build tool, no deps)
- Vercel hosting (`vercel.json` + serverless `api/lead.js` for the form endpoint)
- Fonts: Inter + Instrument Serif via Google Fonts (preconnected)
- Lead magnet PDF: Playwright headless Chromium → A4 print (see `scripts/build-pdf.mjs`)
- 100% Spanish i18n (no strings extracted yet — text is small enough to inline)

## Quick start

```bash
# Smoke test locally (serves src/ on :4173)
npx serve src -l 4173

# Production build (src/ → build/)
node scripts/build.js

# Take screenshots at 375/768/1280 (uses /paperclip/playwright node_modules)
node scripts/screenshots.mjs   # run from inside /paperclip/playwright

# Rebuild the lead magnet PDF (8 pages, Kairikos-branded)
node scripts/build-pdf.mjs
# → build/assets/kit-salon-automatizado.pdf

# Render per-page PNG previews of the PDF source for visual QA
node scripts/render-preview.mjs
# → /tmp/kaia-2401/pdf-preview/page-{1..8}.png

# Deploy to Vercel
vercel --prod
```

## Folder map

```
src/                  # source of truth
build/                # compiled output (gitignored, Vercel-ready)
  assets/
    kit-salon-automatizado.pdf   # 8-page lead magnet PDF
    og-kit.svg                   # 1200×630 OG image
  screenshots/                   # per-page PDF previews (visual QA)
docs/
  build-notes.md      # what was built, smoke results, blockers
  handoff-mailerlite.md  # backend integration contract (KAIA-647)
scripts/
  build.js            # src/ → build/
  build-pdf.mjs       # HTML → branded A4 PDF (Playwright Chromium)
  render-preview.mjs  # PDF source → per-page PNGs
  screenshots.mjs     # landing screenshots (375/768/1280)
api/
  lead.js             # serverless stub — swap for MailerLite call
vercel.json
package.json
```

## Brand tokens (from KAIA-436)

- `--terracotta: #BE4F33` (CTA, links, focus)
- `--terracotta-d: #9E4028` (hover)
- `--bg-bone: #FAF6EE` (page bg)
- `--bg-paper: #F1ECE0` (FAQ section bg, soft gradient)
- `--ink: #14181F` (text)
- `--ink-soft: #4A4F58` (muted text)
- `--border: #E5DED1`

## Related issues

- [KAIA-436](/KAIA/issues/KAIA-436) — parent (Lead magnet + landing + content batch mes 1)
- [KAIA-644](/KAIA/issues/KAIA-644) — PDF lead magnet (Copywriter ES)
- [KAIA-647](/KAIA/issues/KAIA-647) — MailerLite integration (Backend Developer, to be created)
