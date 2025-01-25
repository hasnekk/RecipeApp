import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import * as dotenv from 'dotenv';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const PORT =
  externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Route to handle recipe submissions
app.post('/recipes', upload.single('image'), (req, res) => {
  const { title, ingredients, description } = req.body;
  const image = req.file;

  if (!title || !ingredients || !image || !description) {
    return res.status(400).json({
      error: 'Title, ingredients, description and image are required!'
    });
  }

  const recipesFilePath = path.join(__dirname, 'recipes.json');

  // Read existing recipes or initialize an empty array
  let recipes = [];
  if (fs.existsSync(recipesFilePath)) {
    const data = fs.readFileSync(recipesFilePath);
    recipes = JSON.parse(data);
  }

  // Add the new recipe
  const newRecipe = {
    id: recipes.length + 1,
    title,
    description,
    ingredients: JSON.parse(ingredients),
    image: image.filename
  };

  recipes.push(newRecipe);

  // Write the updated recipes back to the file
  fs.writeFileSync(recipesFilePath, JSON.stringify(recipes, null, 2));

  res
    .status(201)
    .json({ message: 'Recipe added successfully!', recipe: newRecipe });
});

app.get('/recipes', (req, res) => {
  const recipesFilePath = path.join(__dirname, 'recipes.json');
  const data = fs.readFileSync(recipesFilePath);
  let recipes = JSON.parse(data);

  const protocol = req.protocol;
  const host = req.get('host');

  console.log(protocol);

  recipes = recipes.map((recipe) => ({
    ...recipe,
    image: `${protocol}://${host}/uploads/${recipe.image}`
  }));

  return res.status(200).json(recipes);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); // Exit to avoid undefined state
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack); // Log the error stack trace
  res.status(500).json({ error: 'Internal Server Error' });
});


// Start the server
if (externalUrl) {
  const hostname = '0.0.0.0';
  app.listen(PORT, hostname, () => {
    console.log(`Server locally running at http://${hostname}:${PORT}/ and from
  outside on ${externalUrl}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
  });
}
