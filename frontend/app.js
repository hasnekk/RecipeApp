let errorMsg;
let app;

let recipeImageInput;

// functions are hoisted so it should work
window.navigateTo = navigateTo;
window.showRecipe = showRecipe;

window.addEventListener("load", async () => {
  recipeImageInput = document.getElementById("recipe-image");

  recipeImageInput.addEventListener("change", () => {
    const image = recipeImageInput.files[0];
    const imageNameSpan = document.getElementById("image-name");
    if (image) {
      imageNameSpan.textContent = image.name;
    } else {
      imageNameSpan.textContent = "";
    }
  });

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker
      .register("/serivce-worker.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration);
        navigator.serviceWorker.ready.then((registration) => {
          console.log("Service Worker is ready");
          registration.sync.register("sync-recipes");
        });
      })
      .catch((e) => console.error(e));
  }

  if ("Notification" in window) {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Notification permission granted.");
      } else {
        console.log("Notification permission denied.");
      }
    });
  }

  setupRouting();
  registerSubmit();
});

// listen for install event
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  installPrompt = event;
});

const installButton = document.getElementById("install-btn");
installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    return;
  }
  const result = await installPrompt.prompt();
  installPrompt = null;
});

function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result); // The Base64 string
    };
    reader.onerror = reject;
    reader.readAsDataURL(file); // Converts the image to a Base64 string
  });
}

async function fetchRecipes() {
  try {
    const response = await fetch(
      "https://recipeapp-server-4a6j.onrender.com/recipes"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const recipes = await response.json();
    return recipes;
  } catch (error) {
    errorMsg = "Error fetching recipes, try again.";
  }
}

async function displayRecipes() {
  const recipeList = document.getElementById("recipe-list");

  if (!recipeList) {
    return;
  }

  const recipes = await fetchRecipes();

  if (errorMsg) {
    recipeList.innerHTML = errorMsg;
    errorMsg = "";
    return;
  }

  recipeList.innerHTML = recipes
    .map(
      (recipe) => `
    <li onclick="showRecipe('${recipe.title}')" >
      <img src=${recipe.image} alt='recipeImage' />
      <div>
        <p>${recipe.title}</p>
      </div>
    </li>
  `
    )
    .join("");
}

async function showRecipe(title) {
  const recipes = await fetchRecipes();
  const recipeSection = document.getElementById("recipe");

  if (errorMsg) {
    recipeSection.innerHTML = errorMsg;
    errorMsg = "";
    return;
  }

  const selectedRecipe = recipes.filter((recipe) => recipe.title === title)[0];

  if (selectedRecipe) {
    recipeSection.innerHTML = `
        <img src="${selectedRecipe.image}" alt="recipe image" />
        <div class="recipe-info">
          <p class="recipe-name">${selectedRecipe.title}</p>
          <p class="recipe-descripiton">
            ${selectedRecipe.description}
          </p>
          <div>
            <h4>Materials</h4>
            <ul class="recipe-material">
              ${selectedRecipe.ingredients
                .map((ingredient) => {
                  return `<li>${ingredient}</li>`;
                })
                .join("")}
            </ul>
          </div>
        </div>
    `;
    navigateTo("#recipe");
  }
}

function setupRouting() {
  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}

function handleRouteChange() {
  const hash = window.location.hash || "#home";
  const sections = document.querySelectorAll("main > section");

  sections.forEach((section) => {
    if (`#${section.id}` === hash) {
      if (hash === "#home") {
        section.style.display = "flex";
        displayRecipes();
      } else {
        section.style.display = "block";
      }
    } else {
      section.style.display = "none";
    }
  });
}

function navigateTo(hash) {
  window.location.hash = hash;
}

function registerSubmit() {
  document
    .getElementById("recipe-form")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const title = document.getElementById("recipe-title").value;
      const description = document.getElementById("recipe-description").value;
      const ingredients = document
        .getElementById("recipe-ingredients")
        .value.split(",")
        .map((ingredient) => ingredient.trim());
      const image = document.getElementById("recipe-image").files[0];

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("ingredients", JSON.stringify(ingredients));
      formData.append("image", image);

      if (image) {
        try {
          const response = await fetch(
            "https://recipeapp-server-4a6j.onrender.com/recipes",
            {
              method: "POST",
              body: formData,
            }
          );

          const result = await response.json();
          if (response.ok) {
            alert("Recipe submitted successfully!");
            console.log(result);
          } else {
            alert(`Error: ${result.error}`);
          }
        } catch (e) {
          const requestData = {
            title: formData.get("title"),
            description: formData.get("description"),
            ingredients: formData
              .get("ingredients")
              .split(",")
              .map((ingredient) => ingredient.trim()),
            imageUrl: formData.get("image") ? formData.get("image") : null,
          };

          await saveFailedRequest(requestData);

          alert(
            "You are offline. Your recipe will be submitted once you're back online."
          );
        }
      }

      navigateTo("#home");
    });
}

function saveFailedRequest(requestData) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open("failedRequests", 1); // Incremented version to trigger upgrade if needed

    dbRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("requests")) {
        // Create object store only if it doesn't exist
        db.createObjectStore("requests", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    dbRequest.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("requests", "readwrite"); // "readwrite" mode for adding data
      const store = transaction.objectStore("requests");

      // Assuming requestData is a FormData object
      const request = {
        title: requestData.title,
        description: requestData.description,
        ingredients: requestData.ingredients,
        timestamp: new Date(),
        // Optionally, you can store the image URL or image path
        imageUrl: requestData.imageUrl || null,
      };

      // Add the request data
      const addRequest = store.add(request);

      addRequest.onsuccess = () => {
        resolve(); // Resolve when the request is successfully added
      };

      addRequest.onerror = () => {
        reject("Failed to save request"); // Reject if there is an error adding the request
      };

      transaction.onerror = () => {
        reject("Transaction failed");
      };
    };

    dbRequest.onerror = () => {
      reject("Failed to open IndexedDB"); // Reject if the database fails to open
    };
  });
}

function takeFile() {
  recipeImageInput.click();
}

async function takeImage() {
  const videoDiv = document.querySelector(".video");
  const imageDiv = document.querySelector(".image");
  const cameraStream = document.getElementById("camera-stream");
  const cameraCanvas = document.getElementById("camera-canvas");

  const snapButton = document.querySelector(".video>button");
  const acceptButton = document.getElementById("accept-btn");
  const discardButton = document.getElementById("discard-btn");

  discardButton.addEventListener("click", () => {
    const context = cameraCanvas.getContext("2d");
    context.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
    imageDiv.style.display = "none";
  });

  acceptButton.addEventListener("click", () => {
    cameraCanvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "captured-image.png", {
          type: "image/png",
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        recipeImageInput.files = dataTransfer.files;

        recipeImageInput.dispatchEvent(new Event("change"));
      }

      const context = cameraCanvas.getContext("2d");
      context.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
      imageDiv.style.display = "none";
    });
  });

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    videoDiv.style.display = "block";
    cameraStream.srcObject = mediaStream;

    snapButton.addEventListener("click", () => {
      imageDiv.style.display = "block";
      const context = cameraCanvas.getContext("2d");

      cameraCanvas.width = cameraStream.videoWidth;
      cameraCanvas.height = cameraStream.videoHeight;

      context.drawImage(cameraStream, 0, 0);

      mediaStream.getTracks().forEach((track) => track.stop());
      videoDiv.style.display = "none";
    });
  } catch (error) {
    switch (error.code) {
      case 8:
        alert("Your device does not support camera.");
        break;

      default:
        alert(error.message);
        break;
    }
  }
}
