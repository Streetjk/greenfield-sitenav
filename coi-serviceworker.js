/*
 * coi-serviceworker — injects Cross-Origin-Embedder-Policy / Opener-Policy
 * headers so SharedArrayBuffer (required by the Gaussian splat loader) works
 * on static hosts like GitHub Pages that cannot set HTTP response headers.
 *
 * This file is intentionally dual-context:
 *   - Loaded as a <script> in a page  → registers itself as a service worker
 *   - Running as the service worker   → intercepts responses and adds headers
 */

if (typeof window === 'undefined') {
  // ── Service worker context ─────────────────────────────────────────────────
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', e => {
    // Skip opaque no-cors cache-only requests (would cause errors)
    if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

    e.respondWith(
      fetch(e.request).then(r => {
        // Pass through opaque / error responses unchanged
        if (!r || r.status === 0 || r.type === 'opaque') return r;

        const h = new Headers(r.headers);
        h.set('Cross-Origin-Opener-Policy',   'same-origin');
        h.set('Cross-Origin-Embedder-Policy', 'credentialless');

        return new Response(r.body, {
          status:     r.status,
          statusText: r.statusText,
          headers:    h,
        });
      }).catch(() => fetch(e.request)) // network error fallback
    );
  });

} else {
  // ── Page context — register the service worker then reload once ───────────
  (() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.crossOriginIsolated) return; // already isolated — nothing to do

    const src = document.currentScript?.src ?? './coi-serviceworker.js';

    navigator.serviceWorker.register(src).then(reg => {
      const sw = reg.installing ?? reg.waiting;
      if (sw) {
        // Newly installed — reload when it activates
        sw.addEventListener('statechange', e => {
          if (e.target.state === 'activated') location.reload();
        });
      } else if (reg.active && !navigator.serviceWorker.controller) {
        // Active but not yet controlling this page (first claim)
        location.reload();
      }
    }).catch(err => console.warn('[coi-sw] registration failed:', err));
  })();
}
