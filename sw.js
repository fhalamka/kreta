const V = "kreta-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== "kreta-tiles" && k !== "kreta-data").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // the page: network first so updates arrive, cached copy offline
  if (req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith(".html"))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put("./index.html", c)); return r; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }
  // map tiles: cache first
  if (url.hostname === "server.arcgisonline.com") {
    e.respondWith(caches.open("kreta-tiles").then(c => c.match(req.url).then(hit => hit || fetch(req).then(r => { c.put(req.url, r.clone()); return r; }))));
    return;
  }
  // weather and routes: network first, cached copy offline
  if (url.hostname.endsWith("open-meteo.com") || url.hostname === "router.project-osrm.org") {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open("kreta-data").then(x => x.put(req.url, c)); return r; }).catch(() => caches.match(req.url)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (url.origin === location.origin || url.hostname === "cdnjs.cloudflare.com") { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); }
    return r;
  })));
});
