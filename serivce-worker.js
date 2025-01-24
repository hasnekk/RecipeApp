//#region cashing
const cacheName = "static_cache";
const precachedResources = [
  "/",
  "/app.js",
  "/css/style.css",
  "/css/add-recipe.css",
  "/css/header-footer.css",
  "/css/home.css",
  "/css/recipe.css",
  "/cookie.svg",
];

async function precache() {
  const cache = await caches.open(cacheName);
  return cache.addAll(precachedResources);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});
//#endregion cashing
