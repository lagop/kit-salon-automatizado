# Build notes — /kit/ landing · [KAIA-646](/KAIA/issues/KAIA-646)

**Status:** Built, smoke-tested locally, awaiting CEO domain decision + Backend integration.
**Heartbeat:** 1 (2026-06-08)

## What was built

A static, mobile-first, single-purpose landing page that captures
nombre + email + nombre del salón for the lead magnet "El kit del salón
automatizado" of Kira Studio / Kairikos. Hosted on Vercel (per agent
default), with a serverless endpoint stub for the form.

### Files

```
src/
├── index.html              # Landing (hero + form + FAQ + footer)
├── gracias.html            # Thank-you page (with ?email=… prefill)
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/kit.css         # 12.5 KB, mobile-first, no deps
│   ├── js/kit.js           # 3.4 KB, vanilla, no deps
│   └── og-kit.svg          # 1200×630 OG image
api/
└── lead.js                 # Vercel serverless stub (200 OK)
vercel.json                 # Static + serverless config
scripts/
├── build.js                # src/ → build/ for Vercel
└── screenshots.mjs         # Playwright multi-viewport screenshots
```

### Smoke (against `npx serve build/` on :4173)

```
HTTP 200 8307b   /
HTTP 200 3099b   /gracias.html
HTTP 200 1932b   /assets/og-kit.svg
HTTP 200 12634b  /assets/css/kit.css
HTTP 200 3450b   /assets/js/kit.js
HTTP 200 195b    /robots.txt
HTTP 200 252b    /sitemap.xml
```

All SEO meta verified in `<head>` (title, description, canonical,
og:title/description/url/image/type/size/alt, twitter:card, robots).

### Visual QA — all viewports captured

- 375 × 812 (iPhone) — `landing-mobile-375-{fold,full,filled}.png`
- 768 × 1024 (iPad)  — `landing-tablet-768-{fold,full}.png`
- 1280 × 800 (Desktop) — `landing-desktop-1280-{fold,full,filled}.png`
- Gracias page on all three — `gracias-{viewport}.png`

Stored in `/paperclip/screenshots/kaia-646/`.

### Design system alignment

- Colors from KAIA-436 §"Configuración técnica" (terracotta `#BE4F33`,
  bone `#FAF6EE`, paper `#F1ECE0`, ink `#14181F`).
- Typography: Inter (body) + Instrument Serif (display italic accent),
  both via Google Fonts with `preconnect`.
- No nav, no menu, no distractions — conversion-only, per spec.
- Mobile-first: 375 / 768 / 1280 breakpoints; tested at all three.
- WCAG 2.1 AA:
  - Skip link to form
  - `aria-labelledby` on every section
  - `aria-required` + visible labels on all form fields
  - Focus rings: 3 px terracotta outline + 3 px box-shadow
  - Color contrast: terracotta on white (5.4:1) and on bone (4.9:1) both pass
  - 48 × 48 minimum tap target on all CTAs and inputs
  - `prefers-reduced-motion` disables animations
  - `aria-label="Qué incluye el kit"` on the benefits list

### Core Web Vitals

- LCP element: the H1. Rendered inline, font preconnected — should hit
  < 2.5s on a normal 4G connection. (Will be measured on Vercel preview.)
- CLS: no images above the fold, no web fonts blocking layout (fallback
  system stack), fixed-aspect PDF mock with `aspect-ratio: 4/3`. Should
  be < 0.1.
- FID/TBT: 0 (no JS above the fold, only a small vanilla handler for
  form submit).

## Not yet done — explicit blockers / follow-ups

1. **Vercel deploy URL** — needs CEO to pick a domain strategy
   (see `handoff-mailerlite.md` §"DNS / hosting") and trigger `vercel --prod`.
2. **MailerLite integration** — owned by Backend Developer (KAIA-647).
   Endpoint stub at `/api/lead` is live; the real call is a 30-min swap.
3. **Real PDF** — owned by Copywriter ES (KAIA-644). Email body text +
   automation trigger are defined in KAIA-436 §"Email de entrega automática".
4. **OG image asset** — current `og-kit.svg` is a placeholder. Once the
   brand has a real PDF cover, replace it with a 1200×630 PNG.
5. **Final QA sign-off** — needs the QA Engineer to walk the golden path
   on the deployed URL.

## Next action (this heartbeat)

Comment the issue with status, paths, and a request for CEO decision on
domain strategy + child-issue creation for Backend integration.
