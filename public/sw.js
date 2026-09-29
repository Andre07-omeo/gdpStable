const CACHE_VERSION = 'v2.2.0';
const CACHE_NAME = `gestion-panneaux-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

/* ================================
   DÉTECTION CACHE (à chaque fois)
================================ */

/**
 * Teste RÉELLEMENT si le cache est utilisable.
 * Ne stocke PAS le résultat dans une variable globale
 * (le SW est tué/relancé à chaque event en navigation privée).
 */
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
  /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|avif|woff|woff2|ttf|otf)$/i.test(
    pathname
  );

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
  if (isNavigationRequest(request)) return 'navigation';
  if (isUploadRequest(url.pathname)) return 'network-only';
  if (isStaticAsset(url.pathname)) return 'static';
  return 'network-first';
}

/* ================================
   CACHE HELPERS (safe)
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

  // ✅ Accepter basic + default + cors
  const validTypes = ['basic', 'default', 'cors'];
  if (!validTypes.includes(response.type)) return;

  try {
    const cache = await safeCacheOpen();
    if (!cache) return;
    await cache.put(requestOrUrl, response.clone());
  } catch {
    // Silencieux : peut échouer en privé.
  }
}

/* ================================
   FALLBACK HTML
================================ */

function offlineHTML(message = 'Connexion momentanément indisponible') {
  return new Response(
    `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#1e40af">
  <title>Gestion Digitale Panneaux</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:40px 20px;text-align:center;line-height:1.6;color:#0f172a}
    .card{background:#f8fafc;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
    h1{font-size:1.4rem}
    button{margin-top:16px;padding:10px 18px;border:none;border-radius:8px;background:#1e40af;color:#fff;font-size:1rem;cursor:pointer}
  </style>
</head>
<body>
  <div class="card">
    <h1>${message}</h1>
    <p>Vérifiez votre connexion Internet puis rechargez la page.</p>
    <button onclick="location.reload()">Recharger</button>
  </div>
</body>
</html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}

/* ================================
   STRATÉGIES
================================ */

async function networkFirstNavigation(request) {
  try {
    const networkRequest = new Request(request, {
      redirect: 'follow',
      cache: 'no-store',
    });

    const response = await fetch(networkRequest);

    if (response.ok && !response.redirected) {
      await saveResponse(request, response);
    }

    return response;
  } catch {
    const cached = await safeCacheMatch(request);
    if (cached) return cached;

    try {
      const url = new URL(request.url);
      if (url.pathname === '/') {
        const loginCache = await safeCacheMatch(
          new URL('/login', self.location.origin).toString()
        );
        if (loginCache) return loginCache;
      }
    } catch {
      // ignore
    }

    return offlineHTML();
  }
}

async function cacheFirstStatic(request, event) {
  const cached = await safeCacheMatch(request);

  if (cached) {
    // Mise à jour en arrière-plan
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
      new Request(request, {
        redirect: 'follow',
        cache: 'no-store',
      })
    );

    if (response.ok && !response.redirected) {
      await saveResponse(request, response);
    }

    return response;
  } catch {
    const cached = await safeCacheMatch(request);
    return (
      cached ||
      new Response('', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain' },
      })
    );
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
        } catch {
          // ignore
        }
      }

      try {
        await self.clients.claim();
      } catch {
        // ignore
      }

      try {
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'NEW_VERSION_AVAILABLE',
            version: CACHE_VERSION,
          });
        });
      } catch {
        // ignore
      }
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
    case 'navigation':
      event.respondWith(networkFirstNavigation(request));
      break;
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
      // Le navigateur gère nativement.
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