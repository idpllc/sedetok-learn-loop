const CACHE_NAME = 'sedetok-cache-v7'; // v7 - navegación NetworkFirst para evitar versiones viejas en PWA
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando cache antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nunca cachear rutas de OAuth
  if (url.pathname.startsWith('/~oauth')) {
    return;
  }

  // SPA navigations (HTML): NetworkFirst para evitar quedar en una versión vieja
  // y para soportar rutas profundas como /live-games/results/:id
  const accept = req.headers.get('accept') || '';
  const isNavigation = req.mode === 'navigate' || accept.includes('text/html');
  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(req);

          // Cachea el app-shell bajo una key estable
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', networkResponse.clone());
          cache.put('/', networkResponse.clone());

          return networkResponse;
        } catch (err) {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(req)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/'));
          return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // Bypass caching for JS/module files to prevent stale React instances
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/node_modules/.vite') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx')
  ) {
    return; // Always fetch fresh from network
  }

  // Only cache static assets (images, fonts, manifest)
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(req).then((response) => {
        if (response) return response;
        return fetch(req)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
            return networkResponse;
          })
          .catch(() => caches.match('/index.html'));
      })
    );
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'SEDETOK',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default',
    requireInteraction: false,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.type || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: {
          url: data.url || notificationData.data.url,
          notificationId: data.notificationId,
          relatedId: data.relatedId,
          relatedType: data.relatedType
        }
      };
    } catch (error) {
      console.error('[SW] Error parsing push notification data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Ver' },
        { action: 'close', title: 'Cerrar' }
      ]
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(Promise.resolve());
  }
});
