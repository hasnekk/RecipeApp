//#region cashing
const cacheName = "static_cache";
const dynamicCacheName = "dynamic_cache";
const precachedResources = [
  "/",
  "/index.html",
  "/offline.html",
  "/app.js",
  "/css/style.css",
  "/css/add-recipe.css",
  "/css/header-footer.css",
  "/css/home.css",
  "/css/recipe.css",
  "/cookie.svg",
  "/manifest.json",
];

async function precache() {
  const cache = await caches.open(cacheName);
  return cache.addAll(precachedResources);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});
//#endregion cashing

//#region fetching
self.addEventListener("fetch", (event) => {
  if (
    (event.request.url.includes("http://localhost:3000/recipes") ||
      event.request.url.includes("http://localhost:3000/uploads")) &&
    event.request.method !== "POST"
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Clone the network response because it's a stream
          const clonedResponse1 = networkResponse.clone(); // Clone for comparison
          const clonedResponse2 = networkResponse.clone(); // Clone for caching
          const clonedResponse3 = networkResponse.clone(); // Clone for returning
          // Cache the API response for future use
          caches.open(dynamicCacheName).then((cache) => {
            cache.match(event.request).then((cachedResponse) => {
              if (cachedResponse) {
                // Compare cached and network responses
                Promise.all([
                  cachedResponse.text(),
                  clonedResponse1.text(),
                ]).then(([cachedText, networkText]) => {
                  if (cachedText !== networkText) {
                    // If different, update the cache
                    cache.put(event.request, clonedResponse2);
                    sendCacheUpdateNotification();
                  }
                });
              } else {
                // If no cached response, add to the cache
                cache.put(event.request, clonedResponse2);
                sendCacheUpdateNotification();
              }
            });
          });
          return clonedResponse3; // Return the network response
        })
        .catch(() => {
          // If network fails (offline), try to serve from the cache
          return caches.match(event.request).then((cachedResponse) => {
            // If there's no cache, return a fallback (like an empty list)
            return cachedResponse || new Response([], { status: 200 });
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          console.log(event.request);
          return caches.match("/offline.html"); // if nothing else
        });
      })
    );
  }
});
//#regionend fetching

function sendCacheUpdateNotification() {
  if (self.Notification && Notification.permission === "granted") {
    self.registration.showNotification("Cache Updated", {
      body: "The cache has been updated successfully!",
      icon: "/cookie.svg",
      tag: "cache-update",
    });
  } else {
    console.log(
      "Notification permission not granted, cannot show notification."
    );
  }
}

//#region sync
self.addEventListener("sync", (event) => {
  console.log("Syncing ");

  if (event.tag === "sync-recipes") {
    console.log("Syncing recipes...");
    event.waitUntil(syncRecipes());
  }
});

async function syncRecipes() {
  const failedRequests = await getFailedRequests();

  failedRequests.forEach(async (request) => {
    try {
      // Convert requestData to FormData
      const formData = new FormData();
      formData.append("title", request.title);
      formData.append("description", request.description);
      formData.append("ingredients", request.ingredients.join(","));
      if (request.imageUrl) {
        formData.append("image", request.imageUrl);
      }

      const response = await fetch("http://localhost:3000/recipes", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        await removeFailedRequest(request.id);
      }
    } catch (error) {
      console.error("Error syncing recipe:", error);
    }
  });
}

function getFailedRequests() {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open("failedRequests", 1);
    dbRequest.onupgradeneeded = () => {
      const db = dbRequest.result;
      db.createObjectStore("requests", { keyPath: "id", autoIncrement: true });
    };

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction("requests", "readonly");
      const store = transaction.objectStore("requests");
      const allRequests = store.getAll();

      allRequests.onsuccess = () => {
        resolve(allRequests.result);
      };
    };

    dbRequest.onerror = () => {
      reject("Failed to open IndexedDB");
    };
  });
}

function removeFailedRequest(id) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open("failedRequests", 1);

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction("requests", "readwrite");
      const store = transaction.objectStore("requests");
      store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject("Failed to remove request");
      };
    };

    dbRequest.onerror = () => {
      reject("Failed to open IndexedDB");
    };
  });
}

//#regionend sync
