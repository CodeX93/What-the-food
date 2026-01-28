// @ts-nocheck
// Edge Function: Analyze Food image using Google Gemini (Ultra-Optimized)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL_FAST = "gemini-2.0-flash"; // Fast for initial analysis
// ✅ Correct: Points to the specific stable version
const GEMINI_MODEL_ACCURATE = "gemini-2.0-flash"; // Reliable with structured output
const FOOD_CONFIDENCE_THRESHOLD = 0.7;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff"
};

// Optimized: Reduced schema strings (YouTube video removed)
const BASE_SCHEMA = `{"dish":string,"description":string,"tags":string[],"additionalInfo":string,"servingGuidance":string,"confidence":number,"servingSize":string,"servingWeightGrams":number,"nutrients":{"calories":number,"protein_g":number,"carbohydrates_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number},"ingredients":string[],"instructions":string[],"nutritionScore":number}`;
const SCHEMA_WITH_INSIGHTS = `${BASE_SCHEMA.slice(0, -1)},"insights":string}`;

// Optimized: Clear but concise prompt guidelines (YouTube removed)
const PROMPT_GUIDELINES = `REQUIRED - Generate ALL fields:
- IMPORTANT: Before any nutritional analysis, determine whether the image clearly contains edible food intended for human consumption.
- If the image does NOT contain food (animals, people, objects, scenery, screenshots, drawings, or ambiguous content), do NOT guess and do NOT invent nutrition/recipes.
- In non-food cases, return a minimal, honest response with low confidence.
- dish: Name of the dish
- description: 1-2 sentence summary
- tags: 3-6 lowercase keywords (e.g., healthy, vegetarian, high-protein)
- additionalInfo: 50-80 words covering nutrition facts, health benefits, storage tips
- servingGuidance: "To calculate servings, divide your dish weight by [X]g. Example: 300g dish ÷ [X]g = Y servings. Also include a note about the serving size and how to calculate it."
- servingWeightGrams: MUST provide realistic weight (pasta 200-250g, burger 150-200g, salad 150g)
- ingredients: List ALL ingredients with METRIC quantities (g, kg, ml, L) - NEVER imperial
- instructions: Detailed step-by-step recipe. Format: "**Step Name**: Complete instructions with temps, times"
- nutrients: Use USDA FoodData. Calculate: (ingredient_g/100)×value_per_100g. Verify: calories=(protein×4)+(carbs×4)+(fat×9)±2, fiber≤carbs
- nutritionScore: 0-100 score based on nutritional quality. + points for: high protein, high fiber, whole food ingredients (veg/fruits/nuts). - points for: added sugars, processed ingredients, artificial additives. 70=neutral/good, >85=excellent superfood, <40=highly processed/unhealthy.`;

const buildPrompt = (includeInsights = false) =>
  `Return JSON only with schema: ${includeInsights ? SCHEMA_WITH_INSIGHTS : BASE_SCHEMA}\n${PROMPT_GUIDELINES}`;

// Ultra-optimized: Fastest base64 encoding with optimal chunks
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x10000; // 64KB chunks for better performance

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

// Classification (strict): Decide if image is food before analysis
async function classifyFoodImage(imageBase64, mimeType) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  const payload = {
    contents: [
      {
        parts: [
          {
            text:
              `You are a food image validator.\n` +
              `Task: Determine whether the uploaded image clearly contains edible food intended for human consumption.\n` +
              `Rules:\n` +
              `- If NOT food (animals, people, objects, scenery, screenshots, drawings, or ambiguous content), set food_detected=false.\n` +
              `- Do NOT guess food items when not clearly food.\n` +
              `- Return JSON only.\n` +
              `Return fields:\n` +
              `food_detected: boolean\n` +
              `food_confidence: number between 0 and 1\n` +
              `non_food_category: one of [animal, person, electronics, object, screenshot, drawing, scenery, text, unknown]\n` +
              `primary_subject: short noun phrase of what is shown (e.g. "laptop", "cat", "receipt screenshot")\n` +
              `message: short friendly sentence explaining the decision.\n`,
          },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          food_detected: { type: "boolean" },
          food_confidence: { type: "number" },
          non_food_category: {
            type: "string",
            enum: ["animal", "person", "electronics", "object", "screenshot", "drawing", "scenery", "text", "unknown"]
          },
          primary_subject: { type: "string" },
          message: { type: "string" },
        },
        required: ["food_detected", "food_confidence", "non_food_category", "primary_subject", "message"],
      },
      topP: 0.95,
      topK: 20,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_FAST}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${text.slice(0, 150)}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim();
    if (!text) throw new Error("Empty classifier response");

    const jsonStr = text.replace(/^```(?:json)?|```$/gi, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = JSON.parse(jsonrepair(jsonStr));
    }

    const food_detected = !!parsed.food_detected;
    const food_confidence =
      typeof parsed.food_confidence === "number"
        ? Math.max(0, Math.min(1, parsed.food_confidence))
        : 0;
    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    const non_food_category = typeof parsed.non_food_category === "string" ? parsed.non_food_category.trim() : "unknown";
    const primary_subject = typeof parsed.primary_subject === "string" ? parsed.primary_subject.trim() : "";

    return { food_detected, food_confidence, non_food_category, primary_subject, message };
  } finally {
    clearTimeout(timeoutId);
  }
}

const cleanSubject = (s) => String(s || "").trim().replace(/\s+/g, " ").slice(0, 80);

async function generateNonFoodCopy({ category, subject, classifierMessage }) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  const prompt =
    `You are writing a friendly, light, cute non-food response for an AI food scanner.\n` +
    `The uploaded image is NOT food. Be definitive.\n` +
    `Primary subject: "${subject}". Category: "${category}".\n` +
    (classifierMessage ? `Classifier note: "${classifierMessage}".\n` : "") +
    `\n` +
    `Write JSON only with these fields:\n` +
    `- message: 1 sentence (max 20 words). Friendly, playful, non-sarcastic. Never shame.\n` +
    `- ingredients: 3 short lines. Must NOT invent edible food. Must be relevant to the subject.\n` +
    `- instructions: 3 steps. Each MUST start with "**Step X**:" (X=1..3). Be definitive (no "if this is food").\n` +
    `\n` +
    `Extra guidance:\n` +
    `- For babies/children, you may include a cute "good vibes" type phrase.\n` +
    `- For electronics/objects, avoid animal-specific jokes.\n` +
    `- Do not mention cats unless the subject is a cat.\n` +
    `- Vary wording across runs; avoid repeating stock phrases.\n`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 300,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          message: { type: "string" },
          ingredients: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
          instructions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        },
        required: ["message", "ingredients", "instructions"],
      },
      topP: 0.95,
      topK: 20,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_FAST}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${text.slice(0, 150)}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("").trim();
    if (!text) throw new Error("Empty non-food copy response");

    const jsonStr = text.replace(/^```(?:json)?|```$/gi, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = JSON.parse(jsonrepair(jsonStr));
    }

    const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
    const ingredients = Array.isArray(parsed.ingredients) ? parsed.ingredients.map((s) => String(s).trim()).filter(Boolean) : [];
    const instructions = Array.isArray(parsed.instructions) ? parsed.instructions.map((s) => String(s).trim()).filter(Boolean) : [];

    if (!message || ingredients.length < 3 || instructions.length < 3) {
      throw new Error("Invalid non-food copy");
    }

    return { message, ingredients: ingredients.slice(0, 3), instructions: instructions.slice(0, 3) };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildNonFoodAnalysis(classification) {
  const conf = typeof classification?.food_confidence === "number" ? classification.food_confidence : 0;
  const category = cleanSubject(classification?.non_food_category) || "unknown";
  const subject = cleanSubject(classification?.primary_subject) || "this image";

  let generated = null;
  try {
    generated = await generateNonFoodCopy({
      category,
      subject,
      classifierMessage: cleanSubject(classification?.message),
    });
  } catch (e) {
    // Fallback is intentionally plain (no hardcoded jokes)
    generated = null;
  }

  const message =
    (generated?.message && String(generated.message).trim()) ||
    (typeof classification?.message === "string" && classification.message.trim()) ||
    "No food detected in this image. Please upload a clear photo of a meal, snack, or ingredient.";

  const ingredients =
    (generated?.ingredients && generated.ingredients.length === 3 ? generated.ingredients : null) ||
    ["Non-food image", "No edible ingredients detected", "Upload a meal photo to analyze"];

  const instructions =
    (generated?.instructions && generated.instructions.length === 3 ? generated.instructions : null) ||
    ["**Step 1**: No food detected.", "**Step 2**: Nutrition is N/A for non-food images.", "**Step 3**: Upload a food photo to analyze."];

  return {
    foodDetected: false,
    message,
    dish: "No food detected",
    description: message,
    tags: [],
    additionalInfo:
      "No edible food was detected in the uploaded image. Nutrition values are not applicable for non-food images.",
    servingGuidance: "",
    confidence: Math.max(0, Math.min(1, conf)),
    servingSize: "N/A",
    servingWeightGrams: 0,
    nutrients: {
      calories: null,
      protein_g: null,
      carbohydrates_g: null,
      fat_g: null,
      fiber_g: null,
      sugar_g: null,
    },
    ingredients,
    instructions,
  };
}

// Ultra-optimized: Faster timeout and streamlined error handling
async function fetchAndEncodeImage(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // Reduced to 5s for faster failures

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });

    if (!res.ok) {
      clearTimeout(timeoutId);
      throw new Error(`Fetch failed: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    clearTimeout(timeoutId);

    if (!arrayBuffer.byteLength) throw new Error("Empty image");

    return {
      base64: arrayBufferToBase64(arrayBuffer),
      mimeType: (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim()
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`Image error: ${e?.message || e}`);
  }
}

// Lightning-fast: Instant ingredient recalculation
async function recalculateNutritionFromIngredients(dishName, ingredients, existingAnalysis) {
  if (!GEMINI_API_KEY || !Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("Missing API key or ingredients");
  }

  const prompt = `Calculate nutrition for these ${ingredients.length} ingredients:
${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}
Do not do anything else than the following steps. JUST FOCUS ON THE INGREDIENTS AND THE CALCULATIONS WHICH ARE CHANGED.
For each ingredient:
1. Extract weight in grams
2. Look up USDA nutrition per 100g
3. Calculate: (grams/100) × USDA_value
4. Sum all ingredients

Use accurate USDA values.

Your final calculation must reflect accurate nutritional causality.
    1. If a high-fat/high-calorie ingredient (like olive oil) is *increased, the total Fat and Calories MUST proportionally **increase*.
    2. If a high-fat/high-calorie ingredient is *removed* or *decreased, the total Fat and Calories MUST proportionally **decrease*.
    3. Do not let a change in a single ingredient (e.g., removing fat) illogically boost another unrelated macro (e.g., protein). The total protein is only determined by the protein-containing ingredients (shrimp, pasta, cheese).
`;

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
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s for 1.5-flash

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

    // Validation logging
    const originalCalories = existingAnalysis?.nutrients?.calories || 0;
    const originalIngCount = existingAnalysis?.ingredients?.length || 0;
    const newIngCount = ingredients.length;

    console.log(`🔍 Calculated: ${calories}cal, ${protein_g}g protein, ${fat_g}g fat`);
    console.log(`🔍 Original: ${originalCalories}cal with ${originalIngCount} ingredients → New: ${newIngCount} ingredients`);


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
      ...existingAnalysis,
      nutrients: parsed.nutrients,
      servingWeightGrams: weight,
      ingredients,
      servingGuidance: `To calculate your servings, divide your actual dish weight (in grams) by the projected serving weight shown above (~${weight}g). For example, if your dish weighs ${exampleWeight}g and the projected serving is ~${weight}g, divide ${exampleWeight} ÷ ${weight} = 1.5 servings. This tells you how many servings your portion contains.`
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`Recalculation failed: ${e?.message || e}`);
  }
}

// Ultra-optimized: Fast Gemini call with concise prompts
async function callGemini(imageBase64, mimeType, options = {}) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  const {
    includeInsights = false,
    insightsParams = null,
    overrideIngredients = [],
    manualEntry = null,
  } = options;

  let prompt = buildPrompt(includeInsights);
  let maxTokens = 2048; // Balanced for complete responses

  // Add manual entry context
  if (manualEntry) {
    prompt += `\n\nMANUAL ENTRY (no image):
Dish: ${manualEntry.dish}
Ingredients: ${Array.isArray(manualEntry.ingredients) ? manualEntry.ingredients.join(", ") : manualEntry.ingredients}

Generate COMPLETE analysis with all fields including ingredients, instructions, and additionalInfo.`;
  }

  // Add profile context
  if (insightsParams && (insightsParams.weight_kg || insightsParams.height_cm || insightsParams.gender || insightsParams.age)) {
    const { weight_kg, height_cm, age, gender } = insightsParams;
    const parts = [];

    if (weight_kg && height_cm) {
      const bmi = weight_kg / Math.pow(height_cm / 100, 2);
      parts.push(`${weight_kg}kg, ${height_cm}cm (BMI: ${bmi.toFixed(1)})`);
    } else {
      if (weight_kg) parts.push(`${weight_kg}kg`);
      if (height_cm) parts.push(`${height_cm}cm`);
    }
    if (age) parts.push(`${age}yo`);
    if (gender) parts.push(gender);

    if (parts.length > 0) prompt += `\nUser profile: ${parts.join(", ")}`;
  }

  // Add insights context
  if (includeInsights && insightsParams) {
    const { age = "30", gender = "any", activity = "moderate", goal = "maintenance", weight_kg, height_cm } = insightsParams;

    let bmiStr = "";
    if (weight_kg && height_cm) {
      const bmi = weight_kg / Math.pow(height_cm / 100, 2);
      const cat = bmi < 18.5 ? "underweight" : bmi < 25 ? "normal" : bmi < 30 ? "overweight" : "obese";
      bmiStr = `, BMI ${bmi.toFixed(1)} (${cat})`;
    }

    prompt += `\n\nCRITICAL: Include "insights" field with personalized health analysis in JSON format.
Context: Age ${age}, Gender: ${gender}, Activity: ${activity}, Goal: ${goal}${bmiStr}

Required format (JSON string in "insights" field):
{
  "demographics": "Age: ${age}, Gender: ${gender}, Activity: ${activity}, Goal: ${goal}${bmiStr ? `, BMI ${bmiStr.replace(/^,\s*BMI\s*/, '')}` : ''}",
  "keyRecommendations": [
    "First detailed recommendation about this meal in context of user's profile",
    "Second recommendation focusing on portion control or nutrition",
    "Third recommendation about protein, carbs, or fat content",
    "Fourth recommendation about activity or lifestyle adjustments"
  ],
  "actionItems": [
    "First actionable item (e.g., 'Focus on lean protein sources and be mindful of overall fat content')",
    "Second actionable item (e.g., 'Consider increasing physical activity to create larger calorie deficit')",
    "Third actionable item (e.g., 'Incorporate more vegetables to increase fiber intake')"
  ]
}

IMPORTANT: Return insights as a JSON string that can be parsed. Each recommendation and action item should be a complete, actionable sentence.`;
    maxTokens = 1500; // Increased for detailed insights
  }

  const parts = [{ text: prompt }];

  // Add image if provided
  if (imageBase64 && mimeType) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } });
  }

  parts.push({
    text: "IMPORTANT: Generate ALL required fields (dish, description, tags, additionalInfo, servingGuidance, ingredients, instructions, nutrients). Use METRIC units. Verify: calories = (protein×4) + (carbs×4) + (fat×9) ± 2, fiber ≤ carbs.",
  });

  // Add ingredient override - CRITICAL for accurate recalculation
  if (Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
    parts.splice(1, 0, {
      text: `CRITICAL OVERRIDE - Use ONLY these ingredients (IGNORE image):
${overrideIngredients.join("\n")}

ACCURATE NUTRITION REQUIRED:
1. Use EXACT ingredients above - IGNORE image completely
2. USDA FoodData Central: (quantity_g/100)×value_per_100g for EACH ingredient
3. SUM all to get total nutrients - VERIFY: calories=(protein×4)+(carbs×4)+(fat×9)±2
4. servingWeightGrams = SUM of ALL ingredient weights
5. Ensure fiber_g≤carbohydrates_g, sugar_g≤carbohydrates_g
6. Update description, tags, servingGuidance to match new ingredients
7. METRIC only (g, kg, ml, L)`,
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 20,
    }
  };

  const controller = new AbortController();
  // Increased timeout for insights generation (needs more time for detailed analysis)
  const timeoutDuration = includeInsights ? 30000 : 12000; // 30s for insights, 12s for regular
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_FAST}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
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

    const insights = parsed.insights || (includeInsights ? null : undefined);
    delete parsed.insights;

    const sanitized = sanitizeAnalysis(parsed, overrideIngredients);

    return { analysis: sanitized, insights: insights || undefined };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Ultra-optimized: Cached premium check with minimal query
async function quickPremiumCheck(client, userId) {
  try {
    const { data } = await client
      .from("platform_subscriptions")
      .select("subscription_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();
    return Boolean(data?.subscription_type && data.subscription_type !== "free");
  } catch {
    return false;
  }
}

// Optimized: Minimal default analysis (YouTube removed)
const defaultAnalysis = {
  dish: "",
  description: "",
  tags: [],
  additionalInfo: "Nutritional values may vary based on ingredient quality and cooking method.",
  servingGuidance: "Divide total portion weight by grams per serving.",
  confidence: 0.75,
  servingSize: "1 serving",
  servingWeightGrams: 200,
  nutrients: { calories: 320, protein_g: 18, carbohydrates_g: 34, fat_g: 12, fiber_g: 6, sugar_g: 8 },
  ingredients: [],
  instructions: [],
  nutritionScore: 70,
};

// Optimized: Inline sanitization helpers
function sanitizeAnalysis(raw, ingredientOverrides = []) {
  const result = { ...defaultAnalysis };

  if (raw && typeof raw === "object") {
    result.dish = (typeof raw.dish === "string" && raw.dish.trim()) || result.dish;
    result.description = (typeof raw.description === "string" && raw.description.trim()) || result.description;

    const tags = Array.isArray(raw.tags) ? raw.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 8) : result.tags;
    result.tags = tags.length ? tags : result.tags;

    const info = typeof raw.additionalInfo === "string" ? raw.additionalInfo.trim() : "";
    if (info) result.additionalInfo = info;

    const guidance = typeof raw.servingGuidance === "string" ? raw.servingGuidance.trim() : "";
    if (guidance) result.servingGuidance = guidance;

    const confidence = typeof raw.confidence === "number" ? Math.max(0, Math.min(1, raw.confidence)) : result.confidence;
    result.confidence = confidence;

    result.servingSize = (typeof raw.servingSize === "string" && raw.servingSize.trim()) || result.servingSize;

    const weightGrams = typeof raw.servingWeightGrams === "number" && raw.servingWeightGrams > 0 ? raw.servingWeightGrams : result.servingWeightGrams;
    result.servingWeightGrams = weightGrams;

    const nutrients = raw.nutrients && typeof raw.nutrients === "object" ? raw.nutrients : {};
    result.nutrients = {
      calories: typeof nutrients.calories === "number" ? nutrients.calories : result.nutrients.calories,
      protein_g: typeof nutrients.protein_g === "number" ? nutrients.protein_g : result.nutrients.protein_g,
      carbohydrates_g: typeof nutrients.carbohydrates_g === "number" ? nutrients.carbohydrates_g : result.nutrients.carbohydrates_g,
      fat_g: typeof nutrients.fat_g === "number" ? nutrients.fat_g : result.nutrients.fat_g,
      fiber_g: typeof nutrients.fiber_g === "number" ? nutrients.fiber_g : result.nutrients.fiber_g,
      sugar_g: typeof nutrients.sugar_g === "number" ? nutrients.sugar_g : result.nutrients.sugar_g,
    };

    // Validate score (0-100)
    const score = typeof raw.nutritionScore === "number" ? Math.round(raw.nutritionScore) : result.nutritionScore;
    result.nutritionScore = Math.max(0, Math.min(100, score));

    const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients.map(i => String(i).trim()).filter(Boolean) : result.ingredients;
    result.ingredients = ingredients.length ? ingredients : result.ingredients;

    result.instructions = Array.isArray(raw.instructions) ? raw.instructions.map(i => String(i).trim()).filter(Boolean) : result.instructions;
  }

  const overrides = Array.isArray(ingredientOverrides) ? ingredientOverrides.map(i => String(i).trim()).filter(Boolean) : [];
  if (overrides.length) result.ingredients = overrides;

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const {
      imageUrl,
      serving = 1,
      age,
      gender,
      activity,
      goal,
      optimize,
      weight_kg,
      height_cm,
      overrideIngredients = [],
      manualEntry,
      recalculateOnly = false,
      existingAnalysis = null,
    } = await req.json();

    // Fast-path: Ingredient-only recalculation (no image/auth needed)
    if (recalculateOnly && existingAnalysis && Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
      console.log(`🔄 Starting recalculation for ${overrideIngredients.length} ingredients...`);

      const updatedAnalysis = await recalculateNutritionFromIngredients(
        existingAnalysis.dish || "Custom Dish",
        overrideIngredients,
        existingAnalysis
      );

      console.log(`⚡ Recalc completed: ${Date.now() - startTime}ms`);
      console.log(`📊 Results: ${updatedAnalysis.nutrients.calories}cal, ${updatedAnalysis.nutrients.protein_g}g protein`);

      return new Response(
        JSON.stringify({ ok: true, serving, analysis: updatedAnalysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isManualEntry = !!manualEntry && !imageUrl;
    if (!imageUrl && !isManualEntry) {
      return new Response(
        JSON.stringify({ error: "imageUrl or manualEntry required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const overrides = Array.isArray(overrideIngredients) ? overrideIngredients.map(i => String(i).trim()).filter(Boolean) : [];
    const wantsInsights = !!(age || gender || activity || goal);

    // Ultra-parallel execution - start all tasks immediately
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Start image fetch and auth in parallel immediately
    const imagePromise = (!isManualEntry && imageUrl)
      ? fetchAndEncodeImage(imageUrl)
      : Promise.resolve({ base64: null, mimeType: null });

    const authPromise = (async () => {
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user) return { user: null, isPremium: false, profile: null };

      // Only fetch premium/profile if insights requested
      if (!wantsInsights) return { user, isPremium: false, profile: null };

      const [isPremium, profileData] = await Promise.all([
        quickPremiumCheck(supabaseAuth, user.id),
        supabaseAuth.from("profiles").select("weight_kg, height_cm, age, gender").eq("id", user.id).single()
      ]);

      return { user, isPremium, profile: profileData.data };
    })();

    const [imageData, authResult] = await Promise.all([imagePromise, authPromise]);

    // Determine final params (use provided or profile)
    const finalWeight = weight_kg || authResult.profile?.weight_kg;
    const finalHeight = height_cm || authResult.profile?.height_cm;
    const finalAge = age || authResult.profile?.age;
    const finalGender = gender || authResult.profile?.gender;

    // Optimize: Single Gemini call path
    const shouldIncludeInsights = wantsInsights && authResult.user && authResult.isPremium;
    const profileParams = (finalWeight || finalHeight || finalAge || finalGender) ? {
      weight_kg: finalWeight,
      height_cm: finalHeight,
      age: finalAge,
      gender: finalGender,
    } : null;

    const insightsParams = shouldIncludeInsights ? {
      age: finalAge,
      gender: finalGender,
      activity,
      goal,
      optimize,
      weight_kg: finalWeight,
      height_cm: finalHeight
    } : profileParams;

    // Strict non-food guard (prompt-level + programmatic threshold)
    if (!isManualEntry && imageData.base64 && imageData.mimeType && overrides.length === 0) {
      const classification = await classifyFoodImage(imageData.base64, imageData.mimeType);
      if (!classification.food_detected || classification.food_confidence < FOOD_CONFIDENCE_THRESHOLD) {
        const analysis = await buildNonFoodAnalysis(classification);
        return new Response(
          JSON.stringify({ ok: true, serving, analysis }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const result = await callGemini(imageData.base64, imageData.mimeType, {
      includeInsights: shouldIncludeInsights,
      insightsParams,
      overrideIngredients: overrides,
      manualEntry: isManualEntry ? manualEntry : null,
    });

    console.log(`Response: ${Date.now() - startTime}ms`);

    const response = {
      ok: true,
      serving,
      analysis: result.analysis
    };

    if (wantsInsights && !shouldIncludeInsights) {
      response.upgrade = true;
    } else if (shouldIncludeInsights) {
      response.insights = result.insights;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e?.message);
    console.log(`Failed: ${Date.now() - startTime}ms`);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});