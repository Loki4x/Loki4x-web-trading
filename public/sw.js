// Service worker minimal: syarat agar web bisa dipasang sebagai aplikasi.
// SENGAJA tidak menyimpan (cache) halaman atau data akun. Semua tetap diambil dari server,
// supaya data trading/signal selalu terbaru dan tidak ada data user yang tertinggal di perangkat.
// Satu-satunya yang disimpan: halaman "offline" sederhana kalau internet putus.
const CACHE = "loki4x-offline-v1";
const OFFLINE_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050810;color:#f8fafc;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:20px;margin:0 0 8px}p{color:#94a3b8;margin:0 0 20px;font-size:14px}button{background:#5f85db;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:600}</style></head><body><div><h1>Tidak ada koneksi internet</h1><p>Periksa koneksimu lalu coba lagi.</p><button onclick="location.reload()">Coba lagi</button></div></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.put("/__offline", new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return; // selain pindah halaman: biarkan browser menangani
  event.respondWith(fetch(req).catch(() => caches.match("/__offline")));
});

// ---- Notifikasi push ----
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Loki4x Academy";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          if ("navigate" in client) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
