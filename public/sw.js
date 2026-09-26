const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `gestion-panneaux-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const isStaticAsset = (pathname) => {
  return (
    pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|avif|woff|woff2|ttf|otf)$/i.test(
      pathname
    )
  );
};

const isApiRequest = (pathname) => {
  return pathname.startsWith('/api/');
};

const isNavigationRequest = (request) => {
  return request.mode === 'navigate';
};

async function saveResponse(requestOrUrl, response) {
  if (
    !response ||
    !response.ok ||
    response.redirected ||
    response.type !== 'basic'
  ) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(requestOrUrl, response.clone());
}

async function networkFirstNavigation(request) {
  try {
    // Important :
    // on force "follow" pour éviter le problème des réponses redirigées.
    const networkRequest = new Request(request, {
      redirect: 'follow',
      cache: 'no-store',
    });

    const response = await fetch(networkRequest);

    // Ne jamais cacher une redirection comme document.
    // Si / redirige vers /login, on évite donc de mettre /login
    // sous la clé "/".
    if (response.ok && !response.redirected) {
      await saveResponse(request, response);
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    // Si la navigation hors ligne porte sur "/", utiliser
    // la page /login déjà précachée.
    const url = new URL(request.url);

    if (url.pathname === '/') {
      const loginCache = await caches.match(
        new URL('/login', self.location.origin).toString()
      );

      if (loginCache) {
        return loginCache;
      }
    }

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
    }
  </style>
</head>
<body>
  <h1>Connexion momentanément indisponible</h1>
  <p>Vérifiez votre connexion Internet puis rechargez la page.</p>
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
}

async function cacheFirstStatic(request, event) {
  const cached = await caches.match(request);

  if (cached) {
    // Mise à jour en arrière-plan.
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

    return response;
  } catch {
    const cached = await caches.match(request);

    return (
      cached ||
      new Response('', {
        status: 503,
        statusText: 'Offline',
      })
    );
  }
}

/* ================================
   INSTALLATION
================================ */

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );

  // On conserve ton mécanisme de mise à jour contrôlée.
  // Le client peut envoyer SKIP_WAITING quand il le souhaite.
});

/* ================================
   ACTIVATION
================================ */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ================================
   FETCH
================================ */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Seulement les ressources du domaine.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Les API/authentification ne doivent pas être mises en cache.
  if (isApiRequest(url.pathname)) {
    return;
  }

  // Les navigations HTML doivent privilégier le réseau.
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Ressources statiques : cache-first + mise à jour en arrière-plan.
  if (isStaticAsset(url.pathname) && !url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirstStatic(request, event));
    return;
  }

  // Autres ressources : réseau prioritaire.
  event.respondWith(networkFirst(request));
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

/* ================================
   NOTIFICATION DE VERSION
================================ */

self.addEventListener('activate', () => {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'NEW_VERSION_AVAILABLE',
        version: CACHE_VERSION,
      });
    });
  });
});