const CACHE_NAME = 'poker-flip-app-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/cards.js',
  '/cards.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// キャッシュクリア機能
async function clearAllCaches() {
  console.log('Service Worker: Clearing all caches...');
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('Service Worker: All caches cleared');
}

// アプリの状態を追跡
let appActive = false;
let clearCacheOnNextStart = false;

// Service Workerのインストール
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // 新バージョンを即時待機解除
  self.skipWaiting();
  
  // 強制終了後の再起動時はキャッシュをクリア
  if (clearCacheOnNextStart) {
    event.waitUntil(
      clearAllCaches().then(() => {
        console.log('Service Worker: Cache cleared on restart');
        clearCacheOnNextStart = false;
        return caches.open(CACHE_NAME).then((cache) => {
          console.log('Service Worker: Caching fresh files');
          return cache.addAll(urlsToCache);
        });
      })
    );
  } else {
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
  }
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
    }).then(() => {
      // 旧SWからの即時引き継ぎ
      return self.clients.claim();
    }).then(() => {
      // アプリの状態を監視開始
      appActive = true;
      console.log('Service Worker: App marked as active');
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

  // HTML(ナビゲーション)はネットワーク優先
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 成功したらキャッシュへも保存
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュの index.html を返す
          return caches.match('/index.html');
        })
    );
    return;
  }

  // その他はキャッシュ優先（フォールバックでネットワーク）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
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
    badge: '/icons/icon-192x192.png',
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

// クライアントからのメッセージを受信
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Service Worker: Clear cache requested');
    event.waitUntil(
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        console.log('Service Worker: Clear cache failed', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      })
    );
  }
  
  if (event.data && event.data.type === 'APP_FORCE_CLOSE') {
    console.log('Service Worker: App force close detected');
    appActive = false;
    clearCacheOnNextStart = true;
    // 次の起動時にキャッシュをクリアするフラグを設定
    console.log('Service Worker: Cache will be cleared on next start');
  }
});

// バックグラウンドでのアプリ状態監視
setInterval(() => {
  if (appActive) {
    // クライアントが存在するかチェック
    self.clients.matchAll().then(clients => {
      if (clients.length === 0) {
        console.log('Service Worker: No clients detected, app may be closed');
        appActive = false;
        clearCacheOnNextStart = true;
      }
    });
  }
}, 5000); // 5秒ごとにチェック
