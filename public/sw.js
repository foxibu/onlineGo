// Service Worker — push notifications

// Derive basePath from the SW's own registration URL (e.g. /onlineGo/sw.js → /onlineGo)
const BASE_PATH = new URL(self.location.href).pathname.replace(/\/sw\.js$/, '');

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '온라인 바둑', {
      body: data.body || '',
      icon: `${BASE_PATH}/icon-192.png`,
      badge: `${BASE_PATH}/icon-192.png`,
      tag: data.tag || 'go-notification',
      renotify: true,
      data: { url: data.url || BASE_PATH },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // 없으면 새 창
      return clients.openWindow(url);
    })
  );
});
