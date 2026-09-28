const CACHE_VERSION = 'v2.1.0';
const CACHE_NAME = `gestion-panneaux-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

/* ================================
   DÉTECTION ENVIRONNEMENT
================================ */

// Détecte si on est dans un contexte où le cache est utilisable.
// En navigation privée (Firefox, Safari), caches peut exister mais échouer.
let CACHE_AVAILABLE = true;

async function checkCacheAvailability() {
  try {
    if (!('caches' in self)) {
      CACHE_AVAILABLE = false;
      return false;
    }
    // Test réel : on ouvre et on ferme un cache temporaire.
    const testCache = await caches.open('__test__');
    await testCache.put('/__test__', new Response('ok'));
    await caches.delete('__test__');
    CACHE_AVAILABLE = true;
    return true;
  } catch {
    CACHE_AVAILABLE = false;
    return false;
  }
}

/* ================================
   HELPERS
================================ */

const isStaticAsset = (pathname) => {
  return (
    pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|avif|woff|woff2|ttf|otf)$/i.test(
      pathname
    )
  );
};

const isApiRequest = (pathname) => pathname.startsWith('/api/');

const isUploadRequest = (pathname) => pathname.startsWith('/uploads/');

const isNavigationRequest = (request) => request.mode === 'navigate';

const isRangeRequest = (request) =>
  request.headers.has('range') || request.headers.has('Range');

const isSameOrigin = (url) => url.origin === self.location.origin;

/* ================================
   SMART ROUTING (petite recherche)
================================ */

/**
 * Analyse la requête et retourne la stratégie à appliquer.
 * Cette "petite recherche" permet de router intelligemment
 * chaque requête sans erreur, même en mode dégradé.
 */
function resolveStrategy(request, url) {
  // 1. Requêtes non-GET → laisser passer
  if (request.method !== 'GET') return 'passthrough';

  // 2. Cross-origin → laisser passer
  if (!isSameOrigin(url)) return 'passthrough';

  // 3. API → réseau uniquement
  if (isApiRequest(url.pathname)) return 'passthrough';

  // 4. Range requests (vidéos, PDF) → réseau uniquement
  if (isRangeRequest(request)) return 'passthrough';

  // 5. Navigation HTML → network-first
  if (isNavigationRequest(request)) return 'navigation';

  // 6. Uploads → network-first sans cache
  if (isUploadRequest(url.pathname)) return 'network-only';

  // 7. Assets statiques → cache-first
  if (isStaticAsset(url.pathname)) return 'static';

  // 8. Par défaut → network-first avec fallback cache
  return 'network-first';
}

/* ================================
   CACHE HELPERS
================================ */

async function safeCacheOpen() {
  if (!CACHE_AVAILABLE) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    CACHE_AVAILABLE = false;
    return null;
  }
}

async function safeCacheMatch(request) {
  if (!CACHE_AVAILABLE) return null;
  try {
    return await caches.match(request);
  } catch {
    return null;
  }
}

async function saveResponse(requestOrUrl, response) {
  if (!CACHE_AVAILABLE) return;

  if (
    !response ||
    !response.ok ||
    response.redirected ||
    response.type !== 'basic'
  ) {
    return;
  }

  try {
    const cache = await safeCacheOpen();
    if (!cache) return;
    await cache.put(requestOrUrl, response.clone());
  } catch {
    // Silencieux : en privé, put peut échouer.
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
  <meta name="theme-color" content="#0f172a">
  <title>Gestion Digitale Panneaux</title>
  <style>
    body{
      font-family:system-ui,sans-serif;
      max-width:700px;
      margin:0 auto;
      padding:40px 20px;
      text-align:center;
      line-height:1.6;
      color:#0f172a;
    }
    .card{
      background:#f8fafc;
      border-radius:12px;
      padding:24px;
      box-shadow:0 2px 8px rgba(0,0,0,.05);
    }
    h1{font-size:1.4rem}
    button{
      margin-top:16px;
      padding:10px 18px;
      border:none;
      border-radius:8px;
      background:#0f172a;
      color:#fff;
      font-size:1rem;
      cursor:pointer;
    }
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
    // Fallback 1 : cache direct
    const cached = await safeCacheMatch(request);
    if (cached) return cached;

    // Fallback 2 : si on navigue vers "/", utiliser /login précaché
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

    // Fallback 3 : page HTML minimale
    return offlineHTML();
  }
}

async function cacheFirstStatic(request, event) {
  const cached = await safeCacheMatch(request);

  if (cached) {
    // Mise à jour en arrière-plan (si possible)
    if (CACHE_AVAILABLE) {
      event.waitUntil(
        fetch(request)
          .then((response) => saveResponse(request, response))
          .catch(() => {})
      );
    }
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok && !response.redirected) {
      if (CACHE_AVAILABLE) {
        event.waitUntil(saveResponse(request, response));
      }
    }

    return response;
  } catch {
    // Fallback : réponse vide mais valide
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
      const available = await checkCacheAvailability();

      if (!available) {
        // En navigation privée : on n'échoue pas, on skip le precache.
        console.warn(
          '[SW] Cache indisponible (navigation privée ?). Precache ignoré.'
        );
        return;
      }

      try {
        const cache = await caches.open(CACHE_NAME);
        // addAll échoue si UNE seule URL échoue → on utilise add() individuel
        await Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Precache échoué pour', url, err);
            })
          )
        );
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
      // Nettoyage des anciens caches (si possible)
      if (CACHE_AVAILABLE) {
        try {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key !== CACHE_NAME)
              .map((key) => caches.delete(key))
          );
        } catch {
          // ignore
        }
      }

      // Prise de contrôle
      try {
        await self.clients.claim();
      } catch {
        // ignore
      }

      // Notification de version
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
      // On ne fait rien : le navigateur gère nativement.
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