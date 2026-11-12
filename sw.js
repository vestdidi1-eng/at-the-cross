// Lets "Leave It at the Cross" open without a connection after the first visit.
// When you upload a new version of index.html, change this number so phones pick it up.
const VERSION = 'at-the-cross-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page itself: try the network first so updates show up, fall back to the saved copy.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Fonts, the PDF library, and the icons: use the saved copy, refresh it in the background.
  const cacheable = url.origin === self.location.origin
    || url.hostname === 'fonts.googleapis.com'
    || url.hostname === 'fonts.gstatic.com'
    || url.hostname === 'cdnjs.cloudflare.com';
  if (!cacheable) return;
  event.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(req).then(hit => {
        const fresh = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || fresh;
      })
    )
  );
});
