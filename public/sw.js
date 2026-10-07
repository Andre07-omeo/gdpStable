const CACHE_VERSION = 'v2.3.0';   // ⚠️ IMPORTANT : incrémenter pour forcer la MàJ
const CACHE_NAME = `gestion-panneaux-${CACHE_VERSION}`;

// ⚠️ NE PAS pré-cacher '/' ou '/login' → le navigateur doit gérer les navigations
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

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
  /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|avif|woff|woff2|ttf|otf)$/i.test(pathname);

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
  //    → le navigateur gère les redirections nativement
  if (isNavigationRequest(request)) return 'passthrough';
  
  if (isUploadRequest(url.pathname)) return 'network-only';
  if (isStaticAsset(url.pathname)) return 'static';
  return 'network-first';
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
   STRATÉGIES
================================ */
async function cacheFirstStatic(request, event) {
  const cached = await safeCacheMatch(request);
  if (cached) {
    event.waitUntil(
      fetch(request)
        .then((response) => saveResponse(request, response))
        .catch(() => {})
    );
    return cached;
  }
  try {
    const response = await fetch(request);
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

async function networkFirst(request) {
  try {
    const response = await fetch(
      new Request(request, { redirect: 'follow', cache: 'no-store' })
    );
    if (response.ok && !response.redirected) {
      await saveResponse(request, response);
    }
    return response;
  } catch {
    const cached = await safeCacheMatch(request);
    return cached || new Response('', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
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
      self.skipWaiting();  // ✅ Forcer l'activation immédiate
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
    case 'network-first':
      event.respondWith(networkFirst(request));
      break;
    case 'passthrough':
    default:
      // ✅ Le navigateur gère nativement, Y COMPRIS les navigations
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