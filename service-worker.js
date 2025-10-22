// =======================================
// EXECOGIM — Service Worker (v2.0)
// =======================================
const CACHE_NAME = "execogim-cache-v5";

// ✅ Core files to cache (update this list when adding new files)
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/style.css",
  "/script_v8.2.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/exe_cogim_poster.png",
  "/exercise_concepts.png",
  "/exercise_prescription.png",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

// ✅ Install event — cache essential files
self.addEventListener("install", (event) => {
  console.log("🟣 [Service Worker] Installing EXECOGIM v2.0...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Activate new SW immediately
});

// ✅ Activate event — clean old caches
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
  self.clients.claim(); // Take control immediately
});

// ✅ Fetch event — serve cached resources first
self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only handle GET requests (ignore POST, etc.)
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Serve from cache
      }

      // Otherwise, fetch and cache dynamically
      return fetch(request)
        .then((networkResponse) => {
          // Only cache valid responses
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          return networkResponse;
        })
        .catch(() => caches.match("/index.html")); // fallback offline
    })
  );
});


