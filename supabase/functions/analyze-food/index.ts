// @ts-nocheck
// Edge Function: Analyze Food image using Google Gemini (Optimized)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash-exp";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Optimized: Reduced schema strings
const BASE_SCHEMA = `{"dish":string,"description":string,"tags":string[],"additionalInfo":string,"servingGuidance":string,"confidence":number,"servingSize":string,"servingWeightGrams":number,"nutrients":{"calories":number,"protein_g":number,"carbohydrates_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number},"ingredients":string[],"instructions":string[],"youtubeVideoUrl":string}`;
const SCHEMA_WITH_INSIGHTS = `${BASE_SCHEMA.slice(0, -1)},"insights":string}`;

// Optimized: Condensed prompt guidelines
const PROMPT_GUIDELINES = `Guidelines:
- "description": 1-2 sentence summary
- "tags": 3-6 lowercase keywords
- "additionalInfo": Rich, concise info in 50-80 words covering nutrition variability, health benefits, storage tips
- "servingGuidance": Must explicitly tell users to divide actual dish weight by projected serving weight with example using servingWeightGrams
- "servingWeightGrams": MANDATORY realistic weight estimate (e.g., pasta 200-250g, burger 150-200g)
- "ingredients": All quantities in METRIC (g, kg, ml, L) - NEVER imperial
- "instructions": COMPLETE detailed steps. Format: **Title**: detailed instructions with temps (F/C), times, techniques, measurements
- "youtubeVideoUrl": MANDATORY valid YouTube URL
- CRITICAL NUTRITION: Use USDA FoodData Central. Calculate: (ingredient_g / 100) × value_per_100g. Verify: calories = (protein×4) + (carbs×4) + (fat×9) ± 2
- Ensure fiber_g ≤ carbohydrates_g, realistic values, NO guessing`;

const buildPrompt = (includeInsights = false) =>
  `Return JSON only with schema: ${includeInsights ? SCHEMA_WITH_INSIGHTS : BASE_SCHEMA}\n${PROMPT_GUIDELINES}`;

// Optimized: Faster base64 encoding using chunks
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  
  return btoa(binary);
}

// Optimized: Reduced timeout and better error handling
async function fetchAndEncodeImage(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8s

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
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

// Optimized: Streamlined recalculation
async function recalculateNutritionFromIngredients(dishName, ingredients, existingAnalysis) {
  if (!GEMINI_API_KEY || !Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("Missing API key or ingredients");
  }

  const prompt = `You are a nutrition calculator. Calculate nutrition for:
DISH: ${dishName}
INGREDIENTS:
${ingredients.map((ing, idx) => `${idx + 1}. ${ing}`).join("\n")}

Use USDA FoodData Central per 100g values. Calculate: (quantity_g / 100) × value_per_100g. Sum all ingredients.
Verify: calories = (protein×4) + (carbs×4) + (fat×9) ± 2. Ensure fiber ≤ carbs.

Return ONLY JSON: {"nutrients":{"calories":number,"protein_g":number,"carbohydrates_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number},"servingWeightGrams":number}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 400,
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
          servingWeightGrams: { type: "number" }
        },
        required: ["nutrients", "servingWeightGrams"]
      },
      topP: 0.95,
      topK: 40,
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8s

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
    } catch {
      parsed = JSON.parse(jsonrepair(jsonStr));
    }

    if (!parsed.nutrients || !parsed.servingWeightGrams) {
      throw new Error("Invalid response");
    }

    // Validate calorie math
    const { calories, protein_g, carbohydrates_g, fat_g } = parsed.nutrients;
    const calculatedCal = (protein_g * 4) + (carbohydrates_g * 4) + (fat_g * 9);
    if (Math.abs(calories - calculatedCal) > 5) {
      parsed.nutrients.calories = Math.round(calculatedCal);
    }

    return {
      ...existingAnalysis,
      nutrients: parsed.nutrients,
      servingWeightGrams: parsed.servingWeightGrams,
      ingredients,
      servingGuidance: `To calculate your servings, divide your actual dish weight (in grams) by the projected serving weight shown above (~${Math.round(parsed.servingWeightGrams)}g). For example, if your dish weighs ${Math.round(parsed.servingWeightGrams * 1.5)}g and the projected serving is ~${Math.round(parsed.servingWeightGrams)}g, divide ${Math.round(parsed.servingWeightGrams * 1.5)} ÷ ${Math.round(parsed.servingWeightGrams)} = 1.5 servings. This tells you how many servings your portion contains.`
    };
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`Recalculation failed: ${e?.message || e}`);
  }
}

// Optimized: Streamlined main Gemini call
async function callGemini(imageBase64, mimeType, options = {}) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  const {
    includeInsights = false,
    insightsParams = null,
    overrideIngredients = [],
    manualEntry = null,
  } = options;

  let prompt = buildPrompt(includeInsights);
  let maxTokens = 2000;
  
  // Add manual entry context
  if (manualEntry) {
    prompt += `\n\nMANUAL ENTRY - NO IMAGE:
Dish: ${manualEntry.dish}
Ingredients: ${Array.isArray(manualEntry.ingredients) ? manualEntry.ingredients.join(", ") : manualEntry.ingredients}

Generate analysis with rich additionalInfo (5-6 lines) and personalized insights if requested.`;
  }

  // Add profile context
  if (insightsParams && (insightsParams.weight_kg || insightsParams.height_cm || insightsParams.gender || insightsParams.age)) {
    const { weight_kg, height_cm, age, gender } = insightsParams;
    const profileParts = [];
    
    if (weight_kg && height_cm) {
      const bmi = weight_kg / Math.pow(height_cm / 100, 2);
      profileParts.push(`${weight_kg}kg, ${height_cm}cm (BMI: ${bmi.toFixed(1)})`);
    } else if (weight_kg) profileParts.push(`${weight_kg}kg`);
    else if (height_cm) profileParts.push(`${height_cm}cm`);
    
    if (age) profileParts.push(`${age}yo`);
    if (gender) profileParts.push(gender);
    
    if (profileParts.length > 0) {
      prompt += `\nUser: ${profileParts.join(", ")}. Personalize descriptions and tags.`;
    }
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
    
    prompt += `\n\nCRITICAL: Include "insights" field: "Health Context (Age: ${age}, Gender: ${gender}, Activity: ${activity}, Goal: ${goal}${bmiStr}): [2 paragraphs]. Smart Swaps: [2 suggestions]."`;
    maxTokens = 500;
  }

  const parts = [{ text: prompt }];
  
  // Add image if provided
  if (imageBase64 && mimeType) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } });
  }
  
  parts.push({
    text: "Use METRIC units (g, kg, ml, L). Verify: calories = (protein×4) + (carbs×4) + (fat×9) ± 2, fiber ≤ carbs.",
  });

  // Add ingredient override instructions
  if (Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
    parts.splice(1, 0, {
      text: `CRITICAL: USER INGREDIENT OVERRIDES - COMPLETE REPLACEMENT

Use EXACTLY these ingredients:
${overrideIngredients.join("\n")}

MANDATORY:
1. IGNORE image ingredients - use ONLY list above
2. Recalculate ALL nutrients from USDA per 100g values
3. Calculate: (quantity_g / 100) × value_per_100g, then SUM all
4. Verify: calories = (protein×4) + (carbs×4) + (fat×9) ± 2
5. servingWeightGrams = SUM of all ingredient weights
6. Update servingGuidance with new weight
7. Update description/tags to reflect new ingredients
8. Use METRIC units only`,
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      responseSchema: includeInsights ? {
        type: "object",
        properties: {
          dish: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          additionalInfo: { type: "string" },
          servingGuidance: { type: "string" },
          confidence: { type: "number" },
          servingSize: { type: "string" },
          servingWeightGrams: { type: "number" },
          nutrients: {
            type: "object",
            properties: {
              calories: { type: "number" },
              protein_g: { type: "number" },
              carbohydrates_g: { type: "number" },
              fat_g: { type: "number" },
              fiber_g: { type: "number" },
              sugar_g: { type: "number" }
            }
          },
          ingredients: { type: "array", items: { type: "string" } },
          instructions: { type: "array", items: { type: "string" } },
          youtubeVideoUrl: { type: "string" },
          insights: { type: "string" }
        },
        required: includeInsights ? ["insights"] : []
      } : undefined,
      topP: 0.95,
      topK: 40,
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8s

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
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
    } catch {
      parsed = JSON.parse(jsonrepair(jsonStr));
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

// Optimized: Faster premium check with single query
async function quickPremiumCheck(client, userId) {
  try {
    const { data } = await client
      .from("platform_subscriptions")
      .select("subscription_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    return Boolean(data?.subscription_type && data.subscription_type !== "free");
  } catch {
    return false;
  }
}

// Optimized: Minimal default analysis
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
  youtubeVideoUrl: "",
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

    const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients.map(i => String(i).trim()).filter(Boolean) : result.ingredients;
    result.ingredients = ingredients.length ? ingredients : result.ingredients;
    
    result.instructions = Array.isArray(raw.instructions) ? raw.instructions.map(i => String(i).trim()).filter(Boolean) : result.instructions;
    
    const youtubeUrl = typeof raw.youtubeVideoUrl === "string" ? raw.youtubeVideoUrl.trim() : "";
    if (youtubeUrl && (youtubeUrl.includes("youtube.com/watch") || youtubeUrl.includes("youtu.be/"))) {
      result.youtubeVideoUrl = youtubeUrl;
    }
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
    
    // Handle ingredient-only recalculation
    if (recalculateOnly && existingAnalysis && Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
      const updatedAnalysis = await recalculateNutritionFromIngredients(
        existingAnalysis.dish || "Custom Dish",
        overrideIngredients,
        existingAnalysis
      );
      console.log(`Recalc: ${Date.now() - startTime}ms`);
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
    
    // Parallel execution
    const tasks = [];
    
    if (!isManualEntry && imageUrl) {
      tasks.push(fetchAndEncodeImage(imageUrl));
    } else {
      tasks.push(Promise.resolve({ base64: null, mimeType: null }));
    }
    
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    tasks.push(
      (async () => {
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) return { user: null, isPremium: false, profile: null };
        
        const [isPremium, profileData] = await Promise.all([
          wantsInsights ? quickPremiumCheck(supabaseAuth, user.id) : Promise.resolve(false),
          supabaseAuth.from("profiles").select("weight_kg, height_cm, age, gender").eq("id", user.id).maybeSingle()
        ]);
        
        return { user, isPremium, profile: profileData.data };
      })()
    );

    const [imageData, authResult = { user: null, isPremium: false, profile: null }] = await Promise.all(tasks);

    const finalWeight = weight_kg || authResult.profile?.weight_kg;
    const finalHeight = height_cm || authResult.profile?.height_cm;
    const finalAge = age || authResult.profile?.age;
    const finalGender = gender || authResult.profile?.gender;
    
    // Fast-path: No insights
    if (!wantsInsights) {
      const profileParams = (finalWeight || finalHeight || finalAge || finalGender) ? {
        weight_kg: finalWeight,
        height_cm: finalHeight,
        age: finalAge,
        gender: finalGender,
      } : null;
      
      const result = await callGemini(imageData.base64, imageData.mimeType, {
        includeInsights: false,
        insightsParams: profileParams,
        overrideIngredients: overrides,
        manualEntry: isManualEntry ? manualEntry : null,
      });
      console.log(`Response: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ ok: true, serving, analysis: result.analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle auth/premium for insights
    if (!authResult.user || !authResult.isPremium) {
      const result = await callGemini(imageData.base64, imageData.mimeType, {
        includeInsights: false,
        overrideIngredients: overrides,
        manualEntry: isManualEntry ? manualEntry : null,
      });
      console.log(`Response: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ ok: true, serving, analysis: result.analysis, upgrade: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Premium with insights
    const insightsParams = { 
      age: finalAge, 
      gender: finalGender, 
      activity, 
      goal, 
      optimize, 
      weight_kg: finalWeight, 
      height_cm: finalHeight 
    };
    const result = await callGemini(imageData.base64, imageData.mimeType, {
      includeInsights: true,
      insightsParams,
      overrideIngredients: overrides,
      manualEntry: isManualEntry ? manualEntry : null,
    });
    
    console.log(`Response: ${Date.now() - startTime}ms`);
    return new Response(
      JSON.stringify({
        ok: true,
        serving,
        analysis: result.analysis,
        insights: result.insights
      }),
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