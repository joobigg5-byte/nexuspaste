/*
 * Offline for NexusPaste.
 *
 * This used to be a string turned into a blob: URL and registered from
 * inside the page. Chrome allows that; Firefox and Safari refuse it
 * outright, so offline only ever worked for some people and failed
 * silently for the rest. A real file at the site root works everywhere.
 *
 * Bump CACHE when you change index.html, or returning visitors keep
 * getting the old one out of their cache.
 */
const CACHE = "nexuspaste-v2";
const FILES = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  // Take over straight away rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only ever serve our own files from the cache. The dictionary,
  // translation and exchange-rate calls must always go to the network,
  // or somebody gets last week's rates with no way to tell.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      // Network first, cache as the fallback: an update should reach
      // people the next time they open it, not weeks later.
      .catch(() => caches.match(event.request).then((r) => r || caches.match("./index.html"))),
  );
});
