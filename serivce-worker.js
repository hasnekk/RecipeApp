// // when the SW starts
// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open("static").then((cache) => {
//       return cache.addAll([
//         "/",
//         "/index.html",
//         "/css/style.css",
//         "/css/add-recipe.css",
//         "/css/header-footer.css",
//         "/css/recipe.css",
//         "/css/home.css",
//         "/js/app.js",
//         "/manifest.json",
//       ]);
//     })
//   );
// });

// // give cached data
// self.addEventListener("fetch", (event) => {
//   event.respondWith(
//     caches.match(event.request).then((cachedResponse) => {
//       if (cachedResponse) {
//         return cachedResponse;
//       }
//       return fetch(event.request).then((networkResponse) => {
//         return caches.open("dynamic-v1").then((cache) => {
//           cache.put(event.request, networkResponse.clone());
//           return networkResponse;
//         });
//       });
//     })
//   );
// });

// // prompt for installing the app
// // let deferredPrompt;
// // window.addEventListener("beforeinstallprompt", (event) => {
// //   event.preventDefault();
// //   deferredPrompt = event;
// //   const installButton = document.querySelector(
// //     "button[onclick='installApp()']"
// //   );
// //   installButton.style.display = "block";
// // });

// // async function installApp() {
// //   if (deferredPrompt) {
// //     deferredPrompt.prompt();
// //     const { outcome } = await deferredPrompt.userChoice;
// //     if (outcome === "accepted") {
// //       console.log("User installed the app");
// //     }
// //     deferredPrompt = null;
// //   }
// // }

// // sync requests made when offline to be done when the user gets internet again
// self.addEventListener("sync", (event) => {
//   if (event.tag === "sync-recipes") {
//     event.waitUntil(syncPendingRecipes());
//   }
// });

// async function syncPendingRecipes() {
//   const recipes = await getPendingRecipes();
//   for (const recipe of recipes) {
//     await sendRecipeToServer(recipe);
//   }
// }

// // push notification
// self.addEventListener("push", (event) => {
//   const data = event.data.json();
//   event.waitUntil(
//     self.registration.showNotification(data.title, {
//       body: data.body,
//       icon: "/icons/icon-192x192.png",
//     })
//   );
// });
