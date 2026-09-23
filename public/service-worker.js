const CACHE_NAME = 'panneaux-v2'; // ⬆️ On incrémente pour forcer la mise à jour
const urlsToCache = ['/', '/index.html', '/manifest.json'];

// ─────────────────────────────────────────────────────────
// INSTALLATION : on met en cache uniquement les fichiers statiques
// ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────
// ACTIVATION : on supprime les anciens caches (v1, etc.)
// ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────
// FETCH : on filtre les requêtes à intercepter
// ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1️⃣ Ignorer tout ce qui n'est pas GET (POST, PUT, DELETE…)
  if (request.method !== 'GET') return;

  // 2️⃣ Ignorer les autres origines (CDN, API externe, etc.)
  if (url.origin !== self.location.origin) return;

  // 3️⃣ ⛔ NE JAMAIS intercepter les routes d'authentification
  if (
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // laisse le navigateur gérer normalement
  }

  // 4️⃣ Ignorer les extensions navigateur / devtools
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  // 5️⃣ Stratégie "network-first" pour le HTML (toujours frais),
  //    "cache-first" pour le reste (JS, CSS, images…)
  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // On met à jour le cache avec la version fraîche
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)) // fallback hors-ligne
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            // On ne met en cache que les réponses valides
            if (!response || response.status !== 200 || response.type === 'opaqueredirect') {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => {
            // En dernier recours, on ne peut rien renvoyer
            // (évite l'Uncaught TypeError: Failed to fetch)
            return new Response('Hors ligne', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
          });
      })
    );
  }
});