// 5LANCEポータル: ホーム画面アプリ用の最小構成サービスワーカー。
// 同一オリジンのページ本体（HTML/CSS/JS/画像）だけをキャッシュし、
// Firebase等への外部通信には一切関与しません（横取りしません）。
var CACHE = "5lance-portal-v2";
self.addEventListener("install", function (e) {
  self.skipWaiting();
});
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) {
            return k !== CACHE;
          }).map(function (k) {
            return caches.delete(k);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // 同一オリジン・GET以外は素通し（Firebase Auth/Firestore等の外部通信に干渉しない）
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          c.put(e.request, copy);
        }).catch(function () {});
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (c) {
          return c || Response.error();
        });
      })
  );
});
