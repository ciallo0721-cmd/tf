/**
 * 关注塔菲谢谢喵 · Service Worker
 * 策略：
 *   - 应用外壳（HTML/CSS/JS/图标）：安装时预缓存
 *   - 页面导航：网络优先，离线回退缓存
 *   - 图片 / 音频：缓存优先（后台更新 + LRU 裁剪）
 */

const CACHE = 'taffy-fansite-v2';
const MEDIA_CACHE = 'taffy-media-v1';
const MEDIA_LIMIT = 40;

const PRECACHE = [
  './',
  './index.html',
  './assets/style.css',
  './assets/app.js',
  './avatar.webp',
  './cover.webp',
  './xiaofei.webp',
  './assets/taffy-illust-tiny.webp',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(
        PRECACHE.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n !== CACHE && n !== MEDIA_CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/** 限制媒体缓存条目数量（删除最早的条目） */
async function trimMedia() {
  const cache = await caches.open(MEDIA_CACHE);
  const keys = await cache.keys();
  if (keys.length <= MEDIA_LIMIT) return;
  await Promise.all(keys.slice(0, keys.length - MEDIA_LIMIT).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 第三方（GA / Giscus）交给浏览器

  // 页面导航：网络优先
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 图片 / 音频：缓存优先
  if (/\.(?:webp|png|jpe?g|svg|gif|mp3|m4a|ogg|wav)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) {
          fetch(req).then((res) => {
            if (res && res.ok) {
              caches.open(MEDIA_CACHE).then((c) => c.put(req, res)).then(trimMedia);
            }
          }).catch(() => { });
          return hit;
        }
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(MEDIA_CACHE).then((c) => c.put(req, copy)).then(trimMedia);
          }
          return res;
        });
      })
    );
    return;
  }

  // 其余同源资源：缓存优先 + 后台更新
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
