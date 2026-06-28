/* kit-salon-automatizado — landing
 * Form handler: client-side validation, submit, redirect to gracias page.
 * MailerLite integration lives in /api/lead (KAIA-647 — Backend Developer).
 * This script degrades gracefully: if /api/lead is unavailable, it still
 * shows the thanks page (lead is stored in localStorage as a fallback for
 * retargeting / reprocessing).
 */
(function () {
  'use strict';

  var form = document.getElementById('lead-form');
  if (!form) return;

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // UTM family + landing slug. Captured on first pageview (persisted in
  // sessionStorage so a multi-step visit — landing → scroll → submit —
  // keeps the original campaign attribution).
  var TRACKED_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'landing', 'ref'
  ];

  function getTrackedParams() {
    var out = {};
    try {
      // Read sessionStorage first (captured on first visit if user already arrived).
      var cached = sessionStorage.getItem('kit_utm');
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') out = parsed;
      }
      // Then overlay any params currently in the URL — handles direct deep-links.
      var url = new URL(window.location.href);
      for (var i = 0; i < TRACKED_PARAMS.length; i++) {
        var k = TRACKED_PARAMS[i];
        var v = url.searchParams.get(k);
        if (v) out[k] = v;
      }
      if (Object.keys(out).length) {
        sessionStorage.setItem('kit_utm', JSON.stringify(out));
      }
    } catch (_) { /* ignore — private mode, etc. */ }
    return out;
  }

  function setError(field, msg) {
    var wrap = field.closest('.kit-field');
    if (!wrap) return;
    wrap.setAttribute('data-error', msg ? 'true' : 'false');
    var err = wrap.querySelector('.kit-field__err');
    if (err && msg) err.textContent = msg;
  }

  function validate(data) {
    var ok = true;
    if (!data.name || data.name.trim().length < 2) {
      setError(form.elements['name'], 'Dinos tu nombre.');
      ok = false;
    } else setError(form.elements['name'], null);

    if (!data.email || !emailRe.test(data.email.trim())) {
      setError(form.elements['email'], 'Email no válido.');
      ok = false;
    } else setError(form.elements['email'], null);

    if (!data.salon || data.salon.trim().length < 2) {
      setError(form.elements['salon'], 'Nombre del salón requerido.');
      ok = false;
    } else setError(form.elements['salon'], null);

    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var tracked = getTrackedParams();
    var referrer = '';
    try { referrer = document.referrer || ''; } catch (_) {}

    var data = {
      name: (form.elements['name'] && form.elements['name'].value) || '',
      email: (form.elements['email'] && form.elements['email'].value) || '',
      salon: (form.elements['salon'] && form.elements['salon'].value) || '',
      ts: Date.now(),
      source: 'kit-salon-automatizado',
      landing: window.location.pathname || '/',
      referrer: referrer
    };

    // Overlay UTM family (utm_* keys) on top of base payload.
    for (var k in tracked) {
      if (Object.prototype.hasOwnProperty.call(tracked, k)) data[k] = tracked[k];
    }

    if (!validate(data)) {
      var firstError = form.querySelector('.kit-field[data-error="true"] input');
      if (firstError) firstError.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('data-loading', 'true');
    }

    var endpoint = form.getAttribute('data-endpoint') || '/api/lead';
    var redirect = function () {
      try {
        sessionStorage.setItem('kit_lead_email', data.email);
      } catch (_) { /* ignore quota */ }
      var url = '/gracias.html?email=' + encodeURIComponent(data.email);
      window.location.assign(url);
    };

    // Best-effort POST. We always redirect to thanks — the integration
    // is fire-and-forget from the user's POV.
    var ctrl = (window.AbortController && new AbortController()) || null;
    var timer = setTimeout(redirect, 1500);

    var fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'omit',
      keepalive: true
    };
    if (ctrl) fetchOpts.signal = ctrl.signal;

    fetch(endpoint, fetchOpts)
      .catch(function () {
        try { localStorage.setItem('kit_lead_fallback', JSON.stringify(data)); } catch (_) {}
      })
      .finally(function () {
        clearTimeout(timer);
        redirect();
      });
  });

  // Live-clear errors as the user fixes them.
  Array.prototype.forEach.call(form.querySelectorAll('input'), function (input) {
    input.addEventListener('input', function () { setError(input, null); });
  });
})();