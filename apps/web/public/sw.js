// FamilyPlate Service Worker v2
const CACHE_NAME = "familyplate-v2";
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.json",
];

// Pre-cache static assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and Convex/API requests
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api") ||
    url.hostname.includes("convex.cloud") ||
    url.hostname.includes("convex.site")
  ) {
    return;
  }

  // Cache-first for static assets (images, fonts, icons)
  if (
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Stale-while-revalidate for Next.js chunks and pages
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname === "/" ||
    !url.pathname.includes(".")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first fallback for everything else
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
