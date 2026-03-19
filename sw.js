const CACHE = 'claumind-v1';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'ClauMind', body: 'Tienes una tarea pendiente' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'ClauMind', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'claumind',
      renotify: true,
      data: { url: data.url || './' },
      actions: [
        { action: 'open', title: 'Ver tarea' },
        { action: 'dismiss', title: 'Descartar' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) { if (c.url.includes('claumind') && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('./');
  }));
});

// Local scheduled notifications check (every minute)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-tasks') e.waitUntil(checkScheduledTasks());
});

async function checkScheduledTasks() {
  const allClients = await clients.matchAll();
  allClients.forEach(c => c.postMessage({ type: 'CHECK_TASKS' }));
}
