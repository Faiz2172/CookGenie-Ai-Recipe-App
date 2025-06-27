import express from "express";
import { ENV } from "./config/env.js";
import { db } from "./config/db.js";
import { favoritesTable } from "./db/schema.js";
import { and, eq } from "drizzle-orm";
import job from "./config/cron.js";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = ENV.PORT || 5001;
app.use(cors());

if (ENV.NODE_ENV === "production") job.start();

app.use(express.json());

const upload = multer({ dest: "uploads/" });


app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

app.post("/api/favorites", async (req, res) => {
  try {
    const { userId, recipeId, title, image, cookTime, servings } = req.body;

    if (!userId || !recipeId || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newFavorite = await db
      .insert(favoritesTable)
      .values({
        userId,
        recipeId,
        title,
        image,
        cookTime,
        servings,
      })
      .returning();

    res.status(201).json(newFavorite[0]);
  } catch (error) {
    console.log("Error adding favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/favorites/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userFavorites = await db
      .select()
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, userId));

    res.status(200).json(userFavorites);
  } catch (error) {
    console.log("Error fetching the favorites", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.delete("/api/favorites/:userId/:recipeId", async (req, res) => {
  try {
    const { userId, recipeId } = req.params;

    await db
      .delete(favoritesTable)
      .where(
        and(eq(favoritesTable.userId, userId), eq(favoritesTable.recipeId, parseInt(recipeId)))
      );

    res.status(200).json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.log("Error removing a favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Gemini Chatbot Endpoint
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await axios.post(
      geminiUrl,
      {
        contents: [
          { role: "user", parts: [{ text: message }] }
        ]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const geminiReply = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";
    res.status(200).json({ reply: geminiReply });
  } catch (error) {
    console.error("Gemini API error:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to get response from Gemini" });
  }
});

// Image Recognition Endpoint
app.post("/api/analyze-ingredients", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const apiKey = process.env.GOOGLE_CLOUD_VISION_KEY;
    const spoonacularKey = process.env.SPOONACULAR_API_KEY;
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString("base64");

    // Google Vision API request
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const visionRes = await axios.post(
      visionUrl,
      {
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    // Parse Vision API response
    const labels = visionRes.data.responses[0]?.labelAnnotations || [];
    const ingredients = labels
      .filter(label => label.score > 0.5)
      .map(label => ({ name: label.description, confidence: Math.round(label.score * 100) }));

    // Call Spoonacular API with detected ingredients
    const ingredientsList = ingredients.map(i => i.name).join(",");
    let recipes = [];
    if (ingredientsList && spoonacularKey) {
      const spoonacularUrl = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredientsList)}&number=5&apiKey=${spoonacularKey}`;
      const spoonacularRes = await axios.get(spoonacularUrl);
      recipes = spoonacularRes.data.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        usedIngredients: recipe.usedIngredients.map(i => i.name),
        missedIngredients: recipe.missedIngredients.map(i => i.name),
      }));
    }

    res.status(200).json({ success: true, ingredients, recipes });
  } catch (error) {
    console.error("Vision/Spoonacular API error:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to analyze image or fetch recipes" });
  }
});

// Recipe Search Endpoint using Spoonacular
app.post("/api/recipes-by-ingredients", async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ success: false, message: "Ingredients array is required" });
    }

    const apiKey = process.env.SPOONACULAR_API_KEY;
    const ingredientsParam = ingredients.map(encodeURIComponent).join(",");
    const spoonacularUrl = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientsParam}&number=5&apiKey=${apiKey}`;

    const spoonacularRes = await axios.get(spoonacularUrl);
    const recipes = spoonacularRes.data.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      usedIngredients: recipe.usedIngredients.map(i => i.name),
      missedIngredients: recipe.missedIngredients.map(i => i.name),
    }));

    res.status(200).json({ success: true, recipes });
  } catch (error) {
    console.error("Spoonacular API error:", error?.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to fetch recipes" });
  }
});

// Get detailed recipe information from Spoonacular
app.get('/api/recipe-detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const url = `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=false&apiKey=${apiKey}`;
    const response = await axios.get(url);
    res.status(200).json({ success: true, recipe: response.data });
  } catch (error) {
    console.error('Spoonacular detail API error:', error?.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch recipe details' });
  }
});

app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
});
