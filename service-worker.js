// EXECOGIM — Service Worker
// Version: v1.0 (update version number when you update files)
const CACHE_NAME = "execogim-cache-v1";

// ✅ List of files to cache (update when adding new files)
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/app.html",
  "/manifest.json",
  "/style.css",
  "/script_v5.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/exe_cogim_poster.png",
  "/exercise_concepts.png",
  "/exercise_prescription.png"
];

// ✅ Install event — cache core files
self.addEventListener("install", (event) => {
  console.log("🟣 [Service Worker] Installing and caching app shell...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate immediately after install
});

// ✅ Activate event — cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("🟢 [Service Worker] Activated");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("🧹 [Service Worker] Removing old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim(); // Control all clients immediately
});

// ✅ Fetch event — serve from cache first, then network
self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only cache GET requests (ignore POST, etc.)
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately
        return cachedResponse;
      }

      // Otherwise, fetch from network and cache it
      return fetch(request)
        .then((networkResponse) => {
          // Skip opaque responses (cross-origin)
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          // Cache the new response for future use
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return networkResponse;
        })
        .catch(() => {
          // Optional: fallback offline page
          return caches.match("/index.html");
        });
    })
  );
});
