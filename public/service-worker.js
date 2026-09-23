// public/service-worker.js
// ============================================
// SERVICE WORKER — FORCE LA MISE À JOUR
// ⚠️ IMPORTANT : change CACHE_VERSION à CHAQUE déploiement
// ============================================

const CACHE_VERSION = 'panneaux-v4-2025-01-16';  // ← CHANGE à chaque déploiement !
const CACHE_NAME = CACHE_VERSION;

const STATIC_ASSETS = ['/', '/manifest.json', '/favicon.ico'];

// ============================================
// INSTALL — Active immédiatement
// ============================================
self.addEventListener('install', (event) => {
  console.log(`🔧 [SW] Installation ${CACHE_VERSION}`);
  // ⚡ Ne pas attendre la fermeture des onglets
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('⚠️ [SW] Pré-cache partiel:', err);
      })
    )
  );
});

// ============================================
// ACTIVATE — Nettoie TOUS les anciens caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log(`🚀 [SW] Activation ${CACHE_VERSION}`);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log(`🗑️ [SW] Suppression cache obsolète: ${key}`);
              return caches.delete(key);
            })
        )
      )
      .then(() => {
        // ⚡ Prend le contrôle de TOUS les onglets ouverts
        return self.clients.claim();
      })
      .then(() => {
        // 📢 Prévenir tous les onglets qu'une nouvelle version est active
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION,
            });
          });
        });
      })
  );
});

// ============================================
// FETCH — Ne jamais cacher les pages dynamiques
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }

  const NEVER_CACHE = [
    '/api/',
    '/auth/',
    '/login',
    '/reset-password',
    '/dashboard/',
    '/proformat/',
    '/facture/',
    '/notifications/',
    '/_next/data/',
    '/sw.js',
    '/service-worker.js',
  ];

  if (NEVER_CACHE.some((path) => url.pathname.startsWith(path))) {
    return; // réseau uniquement
  }

  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match('/'))
        )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return new Response('Hors ligne', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
      )
  );
});

// ============================================
// MESSAGE — Force la mise à jour
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});