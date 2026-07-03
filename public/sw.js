// Service worker de AppBalance.
// Objetivo: hacer la app INSTALABLE en iOS y que abra rápido, SIN servir
// datos financieros viejos. Regla de oro: nunca cachear Supabase.

const CACHE = 'appbalance-shell-v1';

// Instala y activa de inmediato (sin esperar a que se cierren pestañas viejas).
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borra caches de versiones anteriores.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Nunca tocar Supabase (auth y datos): siempre red, sin caché.
  if (url.hostname.endsWith('.supabase.co') || req.method !== 'GET') {
    return; // deja pasar a la red normal
  }

  // 2) Assets estáticos y navegación: network-first, cae a caché si no hay red.
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        // Cachea solo respuestas válidas de nuestro propio origen.
        if (fresh && fresh.ok && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Fallback de navegación al shell.
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw e;
      }
    })(),
  );
});
