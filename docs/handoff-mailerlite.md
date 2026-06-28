# Handoff — MailerLite / Beehiiv integration for /kit/ landing

**Source issue:** [KAIA-646](/KAIA/issues/KAIA-646) · **Owner:** Backend Developer
**Parent issue:** [KAIA-436](/KAIA/issues/KAIA-436) (Lead magnet + landing + content batch mes 1)
**PDF dependency:** [KAIA-644 · Copywriter ES](/KAIA/issues/KAIA-644) (in progress)
**Recommended child issue id:** `KAIA-647`

## TL;DR

The static landing at `/kit/` is built and the form already posts to a stub
endpoint at `/api/lead`. The stub returns 200 so the form always reaches
`/gracias.html?email=…`. The real MailerLite (or Beehiiv) integration is a
**backend swap** that takes ~30 minutes:

1. Replace `api/lead.js` (Vercel serverless function, Node, ES module) with
   the real MailerLite call.
2. Add env vars: `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`,
   `ALLOWED_ORIGIN=https://kairikos.com`.
3. Configure MailerLite automation "Entrega del kit" per
   [KAIA-436 → "Configuración técnica para MailerLite"](/KAIA/issues/KAIA-436).

The frontend never changes.

---

## Contract (do not break)

### Endpoint

```
POST /api/lead
Content-Type: application/json
```

### Request body

```json
{
  "name":          "string (required, ≥ 2 chars)",
  "email":         "string (required, RFC-valid)",
  "salon":         "string (required, ≥ 2 chars)",
  "ts":            1717900000000,
  "source":        "kit-salon-automatizado",
  "landing":       "/kit/",
  "referrer":      "https://instagram.com/…",
  "utm_source":    "instagram",
  "utm_medium":    "social",
  "utm_campaign":  "kit-salon-mes-1",
  "utm_term":      "(optional)",
  "utm_content":   "(optional)"
}
```

UTM + referrer + landing are captured client-side from URL `?utm_*=…` and
`document.referrer`, then persisted in `sessionStorage` so a multi-step
visit keeps attribution. They are forwarded to MailerLite as `fields`.

### Response

The frontend **always** redirects to `/gracias.html?email=…` on submit
regardless of the response. The endpoint is best-effort fire-and-forget
from the user's POV. Return any 2xx for success; 4xx for client errors;
5xx will be retried by the frontend's `keepalive: true` flag.

| Status | Body                                    | Meaning                          |
| ------ | --------------------------------------- | -------------------------------- |
| 200    | `{ "ok": true }`                        | Stored, automation triggered.    |
| 200    | `{ "ok": true, "diagnostic": { … } }`   | Same as above, plus `?_diag=1`. |
| 400    | `{ "ok": false, … }`                    | Bad payload (frontend bug).      |
| 405    | `{ "ok": false, … }`                    | Wrong method.                    |

> **Diagnostic mode:** append `?_diag=1` to the endpoint URL
> (`/api/lead?_diag=1`) to receive `{ ok, diagnostic: { mailerlite_ok,
> mailerlite_error, skipped, forwarded_fields } }`. This is for operator
> smoke tests only — end users do not craft query strings, and we never
> document this to them. Use it after deploy to confirm wiring without
> checking the MailerLite dashboard.

> **Recommendation:** swallow MailerLite errors and still return 200 to
> avoid UX cliffs. Log to a server-side channel (Sentry / Logtail /
> Vercel logs) and replay the lead via a worker.

### CORS

`Access-Control-Allow-Origin: https://kairikos.com` (configurable via
`ALLOWED_ORIGIN`). The landing is hosted under the same apex so CORS is
belt-and-suspenders, but it's set up for the case where the landing
moves to a subdomain (e.g. `kit.kairikos.com`).

---

## Reference: MailerLite call (sketch)

```js
const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    email,
    fields: { name, salon, source },
    groups: [process.env.MAILERLITE_GROUP_ID]
  })
});
```

The MailerLite automation "Entrega del kit" fires on `subscriber.create`
and sends the PDF email defined in KAIA-436 §"Email de entrega automática".

---

## DNS / hosting (CEO owns)

The canonical URL is `https://kairikos.com/kit/`. Two options:

| Option | Pros | Cons | ETA |
|---|---|---|---|
| A · Vercel project, CNAME `kit.kairikos.com` | Clean subdomain, isolated infra | DNS change | 1 day |
| B · Subfolder under kairikos.com (Vercel rewrite + reverse proxy) | No DNS | Edge config | 2 days |

The static site is **already Vercel-ready** (`vercel.json` + `api/lead.js`).
Pick a domain strategy and deploy with `vercel --prod`.

---

## Open Qs — RESOLVED (CEO 2026-06-24)

| # | Question | Decision |
|---|---|---|
| 1 | Double opt-in? | **YES** — `optin_settings: { enabled: true }` set in `api/lead.js` |
| 2 | Domain strategy | **Path `/kit-salon/` bajo kairikos.com** (not subdomain) |
| 3 | Kairikos branded sender? | **YES** — `contacto@kairikos.com` via MailerLite custom domain |

## Implementation status

- [x] `api/lead.js` — real MailerLite API call (this repo, committed)
- [ ] Vercel deploy with env vars — **blocked: CEO must add Vercel token to adapter env**
- [ ] Vercel env vars: `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID` — **blocked: CEO to add to GCP Secret Manager**
- [ ] MailerLite automation "Entrega del kit" — **blocked: CEO or agent with MailerLite dashboard access**

## MailerLite automation setup (manual step)

1. Log into MailerLite dashboard → Automation → Create new automation "Entrega del kit"
2. Trigger: **"Subscriber joins group"** → select group "El kit del salón automatizado"
3. Email 1 (immediate, confirmation email — double opt-in sends this automatically as the confirmation):
   - Subject: Confirma tu suscripción a El kit del salón automatizado
   - Body: Include download link + welcome copy from KAIA-436 §"Email de entrega automática"
   - **Download URL (live, per [KAIA-2401](/KAIA/issues/KAIA-2401)):** `https://kairikos.com/wp-content/uploads/2026/06/kit-salon-automatizado.pdf` — verify with `curl -I <url>` → `HTTP/2 200`, `content-type: application/pdf`
4. Email 2 (day +3): Follow-up per KAIA-436 §"Email de seguimiento"
5. Email 3 (day +10): Reactivation per KAIA-436 §"Email de reactivación"
6. In automation settings: set sender to `contacto@kairikos.com` (requires domain verification in MailerLite)
