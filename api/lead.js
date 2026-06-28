/**
 * /api/lead — lead capture endpoint for the kit-salon-automatizado landing.
 *
 * Subscribes a new lead to MailerLite group "El kit del salón automatizado",
 * triggering the automation that delivers the lead-magnet PDF.
 *
 * ENV VARS (must be set in Vercel project settings → Production):
 *   MAILERLITE_API_KEY   — MailerLite API key (https://connect.mailerlite.com/account/api)
 *   MAILERLITE_GROUP_ID  — Numeric Group ID for the "El kit del salón automatizado" group
 *   ALLOWED_ORIGIN       — defaults to https://kairikos.com
 *
 * BEHAVIOUR
 *   - Validation: name / salon / valid email required. 400 with `{ok:false, error}` on failure.
 *   - MailerLite call: best-effort. On failure, error is logged server-side with
 *     `[lead:result]` tag carrying `mailerlite_ok: false` and the error message.
 *   - Response: always returns `{ok:true}` (200) on a well-formed POST that
 *     reaches the MailerLite call. The frontend redirects to /gracias regardless
 *     of the MailerLite outcome — the user must never see a "subscribed failed"
 *     page even if our email pipeline is down. Lead recovery happens via the
 *     server log + a manual re-import job.
 *   - Diagnostic mode: appending `?_diag=1` to the URL causes the response to
 *     include `diagnostic: { mailerlite_ok, mailerlite_error, skipped }` so the
 *     operator can verify end-to-end MailerLite wiring without leaking details
 *     to end users (real users never append `?_diag=1`).
 *   - Idempotency: MailerLite returns the existing subscriber when the email
 *     is already on the list. We treat that as success (200 + `{ok:true}`).
 *
 * METADATA FORWARDED TO MAILERLITE
 *   The `fields` object carries name / salon / source. The `meta` block carries
 *   UTM params + landing slug + user agent so attribution survives MailerLite's
 *   own analytics dashboards.
 */

const ML_API = 'https://connect.mailerlite.com/api/subscribers';
const VALIDATOR_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Fields we forward to MailerLite as `fields` (visible in the subscriber record).
const SAFE_FIELD_KEYS = ['name', 'salon', 'source'];

// Meta keys we forward (UTM family + landing slug). Anything else is dropped.
const META_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'landing', 'referrer',
];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    const v = obj && obj[k];
    if (typeof v === 'string' && v.length > 0 && v.length <= 200) out[k] = v;
  }
  return out;
}

async function subscribeMailerLite(payload, apiKey, groupId) {
  const res = await fetch(ML_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // MailerLite returns JSON on success and error. Tolerate empty bodies.
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text.slice(0, 200) }; }

  return { ok: res.ok, status: res.status, data };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://kairikos.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Operator diagnostic mode. ?_diag=1 in the URL surfaces MailerLite outcome
  // in the JSON response (not visible to end users — they don't craft querystrings).
  const diag = typeof req.url === 'string' && req.url.includes('_diag=1');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      name, email, salon,
      ts, source = 'kit-salon-automatizado',
    } = body;

    if (!name || !email || !salon) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }
    if (!VALIDATOR_RE.test(email)) {
      return res.status(400).json({ ok: false, error: 'invalid_email' });
    }

    const fields = pick({ name, salon, source }, SAFE_FIELD_KEYS);
    const meta = pick(body, META_KEYS);
    const userAgent = (req.headers && (req.headers['user-agent'] || req.headers['User-Agent'])) || '';

    const apiKey = process.env.MAILERLITE_API_KEY;
    const groupId = process.env.MAILERLITE_GROUP_ID;

    let mailerlite_ok = false;
    let mailerlite_error = null;
    let skipped = false;

    if (!apiKey || !groupId) {
      // Same UX, but loud log so the operator sees the missing env var.
      skipped = 'env_missing';
      mailerlite_error = `MAILERLITE_API_KEY=${!!apiKey} MAILERLITE_GROUP_ID=${!!groupId}`;
      console.error('[lead:result]', {
        event: 'subscribe', mailerlite_ok, skipped,
        email, fields, meta,
      });
    } else {
      const mlPayload = {
        email,
        fields: { ...fields, ...meta, ua: userAgent.slice(0, 200) },
        groups: [groupId],
        optin_settings: { enabled: true }, // double opt-in (CEO decision 2026-06-24)
        onboarding_redirect: 'https://kairikos.com/gracias',
      };

      try {
        const ml = await subscribeMailerLite(mlPayload, apiKey, groupId);
        mailerlite_ok = ml.ok;
        if (!ml.ok) {
          mailerlite_error = ml.data?.error?.message || ml.data?.message || `mailerlite_${ml.status}`;
        }
      } catch (mlErr) {
        mailerlite_ok = false;
        mailerlite_error = mlErr.message || 'mailerlite_network_error';
      }

      console.log('[lead:result]', {
        event: 'subscribe',
        mailerlite_ok,
        email,
        fields,
        meta,
        ts,
        error: mailerlite_ok ? null : mailerlite_error,
      });
    }

    const responseBody = { ok: true };
    if (diag) {
      responseBody.diagnostic = {
        mailerlite_ok,
        mailerlite_error,
        skipped,
        forwarded_fields: Object.keys({ ...fields, ...meta }),
      };
    }
    return res.status(200).json(responseBody);
  } catch (err) {
    console.error('[lead:unexpected]', { err: err.message });
    return res.status(400).json({ ok: false, error: 'bad_json' });
  }
}