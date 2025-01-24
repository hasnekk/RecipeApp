import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

let errorMsg;
let app;
let db;

// functions are hoisted so it should work
window.navigateTo = navigateTo;
window.showRecipe = showRecipe;

window.addEventListener("load", async () => {
  connectToDB();

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker
      .register("/serivce-worker.js")
      .then((registration) =>
        console.log("Service Worker registered:", registration)
      )
      .catch((e) => console.error(e));
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

// window.addEventListener("appinstalled", () => {
//   console.log("install");
// });

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

async function connectToDB() {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAWHc8UtanvdExx3J4W6Re3Px7sJa3ILMI",
    authDomain: "recipeapp-f5ffa.firebaseapp.com",
    projectId: "recipeapp-f5ffa",
    storageBucket: "recipeapp-f5ffa.firebasestorage.app",
    messagingSenderId: "268777157036",
    appId: "1:268777157036:web:b2423fd962c73b52030a09",
  };

  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

async function fetchRecipes() {
  try {
    const recipesCollection = collection(db, "recipes");
    const querySnapshot = await getDocs(recipesCollection);
    const recipes = [];
    querySnapshot.forEach((doc) => {
      recipes.push({ id: doc.id, ...doc.data() });
    });

    console.log("All users:", recipes);
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
        <button onclick="navigateTo('#addRecipe')" class="add-recipe-button">
          +
        </button>
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

      if (image) {
        try {
          const base64Image = await convertImageToBase64(image);
          await addDoc(collection(db, "recipes"), {
            title: title,
            description: description,
            ingredients: ingredients,
            image: base64Image,
          });
        } catch (e) {}
      }

      navigateTo("#home");
    });
}
