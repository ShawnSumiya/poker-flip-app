const CACHE_NAME = 'poker-flip-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/cards.js',
  '/cards.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Service Workerのインストール
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Service Workerのアクティベート
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetching', event.request.url);
  
  // GETリクエストのみ処理
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにヒットした場合
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // キャッシュにない場合はネットワークから取得
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then((response) => {
          // レスポンスが有効かチェック
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // ネットワークエラーの場合、オフラインページを返す
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// プッシュ通知の処理（将来の拡張用）
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: 'ポーカーフリップアプリからの通知です',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Poker Flip App', options)
  );
});

// 通知クリックの処理
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
