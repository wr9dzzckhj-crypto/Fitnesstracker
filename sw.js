/* Fitness-Logbuch: App-Dateien offline verfügbar halten. Bei jeder Änderung der App die Versionsnummer erhöhen. */
const CACHE = 'fitness-logbuch-v1';
const SHELL = ['./', 'index.html', 'bls.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
const EXTRA = [
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    await Promise.all(EXTRA.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname.endsWith('openfoodfacts.org')) return;          // Produktdaten immer live
  if (url.hostname.startsWith('fonts.')) {                         // Schriften: Cache, sonst Netz
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: url.origin === location.origin });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  })());
});
