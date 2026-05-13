const CACHE_VERSION = "leaders-pwa-v1";
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const OFFLINE_URL = "/leaders/offline";
const APP_SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/landing/z5.png",
  "/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== APP_SHELL_CACHE) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(APP_SHELL_CACHE);
        return cache.match(OFFLINE_URL);
      }),
    );
    return;
  }

  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.endsWith("/manifest.webmanifest") ||
    APP_SHELL_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(request);
        const cache = await caches.open(APP_SHELL_CACHE);
        cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
