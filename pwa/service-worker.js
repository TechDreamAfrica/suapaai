const CACHE_NAME = 'sua-pa-ai-v1.0.0';
const urlsToCache = [
  '/pwa/',
  '/pwa/index.html',
  '/pwa/css/styles.css',
  '/pwa/js/firebase.js',
  '/pwa/js/auth.js',
  '/pwa/js/app.js',
  '/pwa/js/bot.js',
  '/pwa/js/copilot.js',
  '/pwa/js/companion.js',
  '/pwa/js/pwa.js',
  '/pwa/manifest.json',
  '/pwa/icons/icon-192x192.png',
  '/pwa/icons/icon-512x512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network First, Fall back to Cache
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Firebase requests
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }

            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/pwa/index.html');
            }
          });
      })
  );
});

// Background Sync
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncMessages() {
  try {
    // Get pending messages from IndexedDB
    const pendingMessages = await getPendingMessages();

    // Send each message
    for (const message of pendingMessages) {
      await sendMessage(message);
    }

    console.log('[Service Worker] Messages synced successfully');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

async function syncTasks() {
  try {
    // Get pending tasks from IndexedDB
    const pendingTasks = await getPendingTasks();

    // Sync each task
    for (const task of pendingTasks) {
      await syncTask(task);
    }

    console.log('[Service Worker] Tasks synced successfully');
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Push Notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');

  let notificationData = {
    title: 'Sua Pa AI',
    body: 'You have a new notification',
    icon: '/pwa/icons/icon-192x192.png',
    badge: '/pwa/icons/badge-72x72.png',
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      data: notificationData.data
    })
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/pwa/');
        }
      })
  );
});

// Helper functions (these would integrate with IndexedDB)
async function getPendingMessages() {
  // Placeholder - implement IndexedDB logic
  return [];
}

async function sendMessage(message) {
  // Placeholder - implement message sending logic
  console.log('Sending message:', message);
}

async function getPendingTasks() {
  // Placeholder - implement IndexedDB logic
  return [];
}

async function syncTask(task) {
  // Placeholder - implement task sync logic
  console.log('Syncing task:', task);
}

// Message Handler for clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});
