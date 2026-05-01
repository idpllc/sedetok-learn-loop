// Kill-switch fallback (vite-plugin-pwa genera el SW real en el build con el mismo nombre).
// Este archivo solo se usa en dev/preview o si el build no incluye plugin-pwa.
// Limpia caches antiguas y se desinstala para que la PWA siempre tome la última versión.
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(
        clients.map((c) => {
          try {
            const url = new URL(c.url);
            url.searchParams.set('sw-cleanup', Date.now().toString());
            return c.navigate(url.toString());
          } catch {
            return null;
          }
        })
      );
    })()
  )
);

// Push notifications (mantener funcionalidad)
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'SEDETOK',
    body: 'Tienes una nueva notificación',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default',
    requireInteraction: false,
    data: { url: '/' },
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
          relatedType: data.relatedType,
        },
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
        { action: 'close', title: 'Cerrar' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const urlToOpen = event.notification.data?.url || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
