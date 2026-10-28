/* Service worker del Afinador: precarga los archivos de la app y sirve
   la copia guardada cuando no hay conexión. Para actualizar la copia,
   cambiar VERSION y volver a desplegar. */
const VERSION = 'afinador-v6';

const PRECACHE = [
  './',
  './index.html',
  './bajo/',
  './bajo/index.html',
  './app.css',
  './app.js',
  './favicon.svg',
  './apple-touch-icon.png',
  './manifest.webmanifest',
  './bajo/manifest.webmanifest',
  './cristian/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const FUENTES = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        let host = '';
        try { host = new URL(req.url).hostname; } catch (_e) { /* ignorar */ }
        const guardable = res.ok || (res.type === 'opaque' && FUENTES.has(host));
        if (guardable && (res.type === 'basic' || FUENTES.has(host))) {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') {
          const ruta = new URL(req.url).pathname;
          if (/\/bajo\/(index\.html)?$/.test(ruta)) return caches.match('./bajo/index.html');
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});
