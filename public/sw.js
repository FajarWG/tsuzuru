const CACHE_NAME = "tsuzuru-cache-v1";
const OFFLINE_URL = "/offline";

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  "/icon192_rounded.png",
  "/icon512_rounded.png",
  "/icon192_maskable.png",
  "/icon512_maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Pre-caching offline assets");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[Service Worker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bypass API and Next-Auth authentication routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/image") || url.pathname.includes("/api/auth")) {
    return;
  }

  // For page navigations (HTML document requests)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.log("[Service Worker] Navigation failed, serving offline fallback page:", err);
        return caches.match(OFFLINE_URL).then((fallback) => {
          if (fallback) return fallback;
          // Return a fallback text response if the cache match fails
          return new Response("You are offline and no fallback is cached.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/html" }),
          });
        });
      })
    );
    return;
  }

  // Caching strategy for static files (JS, CSS, static files)
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.startsWith("/fonts/"))
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Silence network errors for background assets
          });
      })
    );
  }
});
