const CACHE_VERSION = 'v2.4.1';   // ⚠️ incrémenté
const CACHE_NAME = `gestion-panneaux-${CACHE_VERSION}`;

// ⚠️ NE PAS pré-cacher '/' ou '/login'
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/icons/icon-16x16.png',
  '/icons/icon-32x32.png',
  '/icons/icon-48x48.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png',
  '/icons/apple-touch-icon-180x180.png',
];

// ⏱️ Timeout pour les requêtes réseau (évite les blocages)
const NETWORK_TIMEOUT_MS = 10000;

/* ================================
   DÉTECTION CACHE
================================ */
async function isCacheUsable() {
  try {
    if (!('caches' in self)) return false;
    const test = await caches.open('__probe__');
    await test.put('/__probe__', new Response('ok'));
    await caches.delete('__probe__');
    return true;
  } catch {
    return false;
  }
}

/* ================================
   HELPERS
================================ */
const isStaticAsset = (pathname) =>
  pathname.startsWith('/_next/static/') ||
  pathname.startsWith('/icons/') ||
  /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|avif|woff|woff2|ttf|otf|webmanifest|json)$/i.test(pathname);

const isApiRequest = (pathname) => pathname.startsWith('/api/');
const isUploadRequest = (pathname) => pathname.startsWith('/uploads/');
const isNavigationRequest = (request) => request.mode === 'navigate';
const isRangeRequest = (request) => request.headers.has('range');
const isSameOrigin = (url) => url.origin === self.location.origin;

/* ================================
   SMART ROUTING
================================ */
function resolveStrategy(request, url) {
  if (request.method !== 'GET') return 'passthrough';
  if (!isSameOrigin(url)) return 'passthrough';
  if (isApiRequest(url.pathname)) return 'passthrough';
  if (isRangeRequest(request)) return 'passthrough';

  // ✅ CRUCIAL : NE JAMAIS intercepter les navigations
  if (isNavigationRequest(request)) return 'passthrough';

  // ✅ Les icônes et le manifeste doivent être servis en priorité depuis le cache
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    return 'static';
  }

  if (isUploadRequest(url.pathname)) return 'network-only';
  if (isStaticAsset(url.pathname)) return 'static';

  // ⚠️ Par défaut : passthrough (le navigateur gère nativement)
  //    On évite networkFirst qui peut bloquer
  return 'passthrough';
}

/* ================================
   CACHE HELPERS
================================ */
async function safeCacheOpen() {
  const usable = await isCacheUsable();
  if (!usable) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

async function safeCacheMatch(request) {
  const usable = await isCacheUsable();
  if (!usable) return null;
  try {
    return await caches.match(request);
  } catch {
    return null;
  }
}

async function saveResponse(requestOrUrl, response) {
  if (!response || !response.ok || response.redirected) return;
  const validTypes = ['basic', 'default', 'cors'];
  if (!validTypes.includes(response.type)) return;
  try {
    const cache = await safeCacheOpen();
    if (!cache) return;
    await cache.put(requestOrUrl, response.clone());
  } catch {
    // Silencieux
  }
}

/* ================================
   FETCH AVEC TIMEOUT
================================ */
async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      new Request(request, {
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      })
    );
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/* ================================
   STRATÉGIES
================================ */
async function cacheFirstStatic(request, event) {
  const cached = await safeCacheMatch(request);
  if (cached) {
    // Revalidation en arrière-plan, mais sans bloquer
    event.waitUntil(
      fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
        .then((response) => saveResponse(request, response))
        .catch(() => {})
    );
    return cached;
  }
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response.ok && !response.redirected) {
      event.waitUntil(saveResponse(request, response));
    }
    return response;
  } catch {
    return new Response('', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkOnly(request) {
  try {
    return await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
  } catch {
    return new Response('', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/* ================================
   INSTALLATION
================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      self.skipWaiting();
      const usable = await isCacheUsable();
      if (!usable) {
        console.warn('[SW] Cache indisponible → precache ignoré');
        return;
      }
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Precache échoué:', url, err);
            })
          )
        );
        console.log('[SW] Precache terminé');
      } catch (err) {
        console.warn('[SW] Precache global échoué', err);
      }
    })()
  );
});

/* ================================
   ACTIVATION
================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const usable = await isCacheUsable();
      if (usable) {
        try {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key !== CACHE_NAME && key !== '__probe__')
              .map((key) => caches.delete(key))
          );
          console.log('[SW] Anciens caches nettoyés');
        } catch {}
      }

      try {
        await self.clients.claim();
      } catch {}

      try {
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE',
            version: CACHE_VERSION,
          });
        });
      } catch {}
    })()
  );
});

/* ================================
   FETCH
================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const strategy = resolveStrategy(request, url);

  switch (strategy) {
    case 'static':
      event.respondWith(cacheFirstStatic(request, event));
      break;
    case 'network-only':
      event.respondWith(networkOnly(request));
      break;
    case 'passthrough':
    default:
      // ✅ Le navigateur gère nativement (y compris les navigations et l'API)
      break;
  }
});

/* ================================
   MESSAGES
================================ */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({
      type: 'NEW_VERSION_AVAILABLE',
      version: CACHE_VERSION,
    });
  }
});