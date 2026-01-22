



// @ts-nocheck
// Edge Function: Edit Ingredients and Recalculate Nutrition (Test Function)
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL_ACCURATE = "gemini-2.0-flash-exp";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff"
};

// Function to recalculate nutrition from edited ingredients
async function recalculateNutritionFromIngredients(dishName, ingredients, existingAnalysis) {
  if (!GEMINI_API_KEY || !Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("Missing API key or ingredients");
  }

  // Get original nutrition for context (but don't use it for calculation)
  const originalNutrients = existingAnalysis?.nutrients || {};
  const originalIngredients = existingAnalysis?.ingredients || [];

  const prompt = `You are a precise nutrition calculator. Your task is to calculate nutrition from scratch using ONLY the ingredients in the list below. 

IMPORTANT: You are calculating nutrition for a NEW ingredient list. Previous nutrition values are NOT relevant. Calculate ONLY from the ingredients provided.

DISH: ${dishName || 'Custom Dish'}

CURRENT INGREDIENTS (calculate nutrition for these ONLY - ignore any ingredients not in this list):
${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

STEP-BY-STEP CALCULATION PROCESS:
1. Parse each ingredient to extract:
   - Ingredient name (e.g., "Ground beef", "Burger bun", "Cheddar cheese")
   - Quantity and unit (e.g., "150g", "1 bun", "20g")
   - Convert ALL units to grams (1kg=1000g, 1ml≈1g for liquids, 1L=1000ml, estimate bun/items by weight)

2. For EACH ingredient, look up USDA FoodData Central nutrition per 100g:
   - Find the exact ingredient in USDA database
   - Get values: calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g per 100g

3. Calculate nutrition for each ingredient:
   - ingredient_calories = (quantity_g / 100) × USDA_calories_per_100g
   - ingredient_protein = (quantity_g / 100) × USDA_protein_per_100g
   - ingredient_carbs = (quantity_g / 100) × USDA_carbs_per_100g
   - ingredient_fat = (quantity_g / 100) × USDA_fat_per_100g
   - ingredient_fiber = (quantity_g / 100) × USDA_fiber_per_100g
   - ingredient_sugar = (quantity_g / 100) × USDA_sugar_per_100g

4. SUM all ingredients:
   - total_calories = sum of all ingredient_calories
   - total_protein = sum of all ingredient_protein
   - total_carbs = sum of all ingredient_carbs
   - total_fat = sum of all ingredient_fat
   - total_fiber = sum of all ingredient_fiber
   - total_sugar = sum of all ingredient_sugar

5. Calculate servingWeightGrams = sum of all ingredient quantities in grams

6. VALIDATE:
   - Verify: calories ≈ (protein × 4) + (carbs × 4) + (fat × 9) ± 2
   - Ensure: fiber ≤ carbs
   - Ensure: sugar ≤ carbs
   - If validation fails, recalculate

7. Calculate nutritionScore (0-100) based on nutritional quality.

EXAMPLE CALCULATION:
If ingredient is "150g Ground beef (80/20)":
1. Parse: name="Ground beef (80/20)", quantity=150g
2. Look up USDA: Ground beef 80/20 = 254 cal, 18.9g protein, 0g carbs, 19.3g fat per 100g
3. Calculate: (150/100) × 254 = 381 calories, (150/100) × 18.9 = 28.35g protein, (150/100) × 19.3 = 28.95g fat
4. Add to totals

CRITICAL RULES:
- Calculate from SCRATCH - do NOT reference previous values
- Use ONLY the ingredients listed above
- If an ingredient is not in the list, it contributes ZERO nutrition
- Use accurate USDA FoodData Central values only
- Round final values to 1 decimal place for macros, whole number for calories
- Double-check: removing a high-protein ingredient (like beef) should significantly reduce protein and calories`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 15000,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          nutrients: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbohydrates_g: { type: "number" },
              fat_g: { type: "number" },
              fiber_g: { type: "number" },
              sugar_g: { type: "number" }
            },
            required: ["calories", "protein_g", "carbohydrates_g", "fat_g", "fiber_g", "sugar_g"]
          },
          servingWeightGrams: { type: "number" },
          nutritionScore: { type: "number" }
        },
        required: ["nutrients", "servingWeightGrams", "nutritionScore"]
      },
      topP: 0.95,
      topK: 20
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ACCURATE}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        priority: "high"
      }
    );
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${text.slice(0, 150)}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("").trim();

    if (!text) throw new Error("Empty response");

    const jsonStr = text.replace(/^```(?:json)?|```$/gi, "").trim();
    let parsed;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      try {
        parsed = JSON.parse(jsonrepair(jsonStr));
      } catch {
        throw new Error("Invalid JSON");
      }
    }

    if (!parsed.nutrients || !parsed.servingWeightGrams) {
      throw new Error("Invalid response");
    }

    // CRITICAL: Validate and enforce accurate nutrition math
    let { calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g } = parsed.nutrients;

    // Ensure all values are positive
    protein_g = Math.max(0, protein_g);
    carbohydrates_g = Math.max(0, carbohydrates_g);
    fat_g = Math.max(0, fat_g);
    fiber_g = Math.max(0, fiber_g);
    sugar_g = Math.max(0, sugar_g);

    // Calculate accurate calories from macros
    const calculatedCal = Math.round((protein_g * 4) + (carbohydrates_g * 4) + (fat_g * 9));

    // Enforce calorie accuracy - always use calculated value if difference > 2
    if (Math.abs(calories - calculatedCal) > 2) {
      calories = calculatedCal;
    }

    // Ensure fiber doesn't exceed carbs (impossible)
    if (fiber_g > carbohydrates_g) {
      fiber_g = Math.min(fiber_g, carbohydrates_g);
    }

    // Ensure sugar doesn't exceed carbs (impossible)
    if (sugar_g > carbohydrates_g) {
      sugar_g = Math.min(sugar_g, carbohydrates_g);
    }

    // Update parsed nutrients with validated values
    parsed.nutrients = {
      calories,
      protein_g: Math.round(protein_g * 10) / 10,
      carbohydrates_g: Math.round(carbohydrates_g * 10) / 10,
      fat_g: Math.round(fat_g * 10) / 10,
      fiber_g: Math.round(fiber_g * 10) / 10,
      sugar_g: Math.round(sugar_g * 10) / 10,
    };

    const weight = Math.round(parsed.servingWeightGrams);
    const exampleWeight = Math.round(weight * 1.5);

    return {
      nutrients: parsed.nutrients,
      servingWeightGrams: weight,
      nutritionScore: parsed.nutritionScore || existingAnalysis?.nutritionScore || 70,
      servingGuidance: `To calculate your servings, divide your actual dish weight (in grams) by the projected serving weight shown above (~${weight}g). For example, if your dish weighs ${exampleWeight}g and the projected serving is ~${weight}g, divide ${exampleWeight} ÷ ${weight} = 1.5 servings. This tells you how many servings your portion contains.`
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`Recalculation failed: ${e?.message || e}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const body = await req.json();

    const { dishName, ingredients, existingAnalysis, serving = 1 } = body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Ingredients array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!existingAnalysis) {
      return new Response(
        JSON.stringify({ ok: false, error: "Existing analysis is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Recalculating nutrition for ${ingredients.length} ingredients`);
    console.log(`Original nutrition:`, existingAnalysis?.nutrients);
    console.log(`Original ingredients count:`, existingAnalysis?.ingredients?.length);
    console.log(`New ingredients:`, ingredients);

    const result = await recalculateNutritionFromIngredients(
      dishName || existingAnalysis.dish,
      ingredients,
      existingAnalysis
    );

    console.log(`Recalculation completed in ${Date.now() - startTime}ms`);
    console.log(`New nutrition:`, result.nutrients);
    console.log(`Calorie check: (${result.nutrients.protein_g} × 4) + (${result.nutrients.carbohydrates_g} × 4) + (${result.nutrients.fat_g} × 9) = ${(result.nutrients.protein_g * 4) + (result.nutrients.carbohydrates_g * 4) + (result.nutrients.fat_g * 9)}`);

    // Return updated analysis with new nutrition data
    const updatedAnalysis = {
      ...existingAnalysis,
      ingredients: ingredients,
      nutrients: result.nutrients,
      servingWeightGrams: result.servingWeightGrams,
      nutritionScore: result.nutritionScore,
      servingGuidance: result.servingGuidance
    };

    return new Response(
      JSON.stringify({
        ok: true,
        analysis: updatedAnalysis,
        serving
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e?.message);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
