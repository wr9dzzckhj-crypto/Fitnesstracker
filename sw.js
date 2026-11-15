/* Fitness-Logbuch: App-Dateien offline verfügbar halten. Bei jeder Änderung der App die Versionsnummer erhöhen. */
const CACHE = 'fitness-logbuch-v7';
const SHELL = ['./', 'index.html', 'bls.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
const EXTRA = [
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache: 'reload' umgeht den Zwischenspeicher des Browsers, damit wirklich die neuen Dateien landen
    await Promise.all(SHELL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => { if (r.ok) return c.put(u, r); })));
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
  const own = url.origin === location.origin;
  const page = req.mode === 'navigate' || (own && /(\/|index\.html)$/.test(url.pathname));
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (page) {
      // Die App-Seite: zuerst das Netz (frisch), bei fehlender Verbindung die gespeicherte Kopie
      try {
        const r = await fetch(new Request(req.url, { cache: 'no-cache' }));
        if (r.ok) { c.put('index.html', r.clone()); return r; }
      } catch (err) {}
      return (await c.match('index.html')) || (await c.match('./')) || Response.error();
    }
    const hit = await c.match(req, { ignoreSearch: own });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
