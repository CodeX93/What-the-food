// @ts-nocheck
// Edge Function: Analyze Food image using Google Gemini (Ultra-Fast Version)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";
import { Base64 } from "https://esm.sh/js-base64@3.7.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash-exp"; // Fastest model

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const BASE_SCHEMA = `{"dish":string,"description":string,"tags":string[],"additionalInfo":string,"servingGuidance":string,"confidence":number,"servingSize":string,"servingWeightGrams":number,"nutrients":{"calories":number,"protein_g":number,"carbohydrates_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number},"ingredients":string[],"instructions":string[],"youtubeVideoUrl":string}`;
const SCHEMA_WITH_INSIGHTS = `${BASE_SCHEMA.slice(0, -1)},"insights":string}`;
const PROMPT_GUIDELINES = `Guidelines:
- "description" should be a concise 1-2 sentence summary of the meal.
- Provide 3-6 descriptive "tags" (short lowercase keywords separated into an array).
- "additionalInfo" must be RICH, PERSONALIZED, and CONCISE. It should provide valuable information about the dish in MAXIMUM 5-6 lines total (approximately 50-80 words). Write in a single, well-structured paragraph that covers:
  * Key nutrition variability factors (how values may vary based on cooking method, portion size, or ingredient quality)
  * Notable health benefits or dietary considerations specific to this dish
  * Practical tips for storage, serving, or portion adjustments
  * Be informative, helpful, and tailored to the dish, but keep it concise and readable. NEVER exceed 6 lines of text. Prioritize the most important and actionable information.
- "servingGuidance" must provide clear, specific instructions on how to calculate servings for the user's actual portion. The guidance MUST:
  * Explicitly tell users to divide their actual dish weight (in grams) by the projected serving weight shown in the Nutrition Summary (the ~Xg value)
  * Include a concrete, realistic example using the servingWeightGrams value you provide. For instance, if servingWeightGrams is 300, use: "For example, if your dish weighs 470g and the projected serving is ~300g, divide 470 ÷ 300 = 1.56 servings"
  * Explain that this calculation tells them how many servings their actual portion contains, which they can then use to adjust the nutrition values
  * Use the EXACT servingWeightGrams value you provide in the servingWeightGrams field for the example calculation
  * Format: "To calculate your servings, divide your actual dish weight (in grams) by the projected serving weight shown above (~Xg). For example, if your dish weighs 470g and the projected serving is ~Xg, divide 470 ÷ X = Y servings. This tells you how many servings your portion contains."
- "servingWeightGrams" is MANDATORY and must ALWAYS be provided. It must be the estimated weight in grams for one serving of the dish. This should be a realistic number based on the dish type, ingredients, and typical portion sizes. For example, a typical serving of pasta might be 200-250g, a burger might be 150-200g, a salad might be 150-300g. NEVER omit this field or set it to zero. Always provide a realistic weight estimate.
- Every entry in "ingredients" must begin with a quantity and unit in METRIC format ONLY (grams, kg, ml, liters). NEVER use imperial units (oz, pounds, cups, tbsp, tsp, etc.). Convert all measurements to metric. Examples: "250g cooked chickpeas", "30ml olive oil", "150g potatoes".
- "instructions" must be COMPLETE, DETAILED, and EXHAUSTIVE step-by-step cooking/preparation instructions. CRITICAL REQUIREMENTS:
  * You MUST provide the ENTIRE recipe from start to finish. NEVER truncate, abbreviate, or leave steps incomplete.
  * Each step must follow this EXACT structure: Start with a clear, descriptive action title in markdown bold format: **Title** followed by a colon and space, then the detailed instructions
  * Example format: "**Prepare the Pepper Base**: Heat 30ml of vegetable oil in a large pot over medium heat (350°F/175°C). Add 200g chopped onions and cook for 3-4 minutes until translucent. Then add 150g chopped bell peppers, 2 scotch bonnet peppers (seeded), and 300g chopped tomatoes. Blend everything together until smooth using an immersion blender or food processor, creating a vibrant pepper base for the dish."
  * Each step must include comprehensive, detailed sentences with:
    - Specific ingredients and quantities (always in metric: grams, kg, ml, liters)
    - Exact temperatures in both Fahrenheit and Celsius when applicable (e.g., "375°F (190°C)")
    - Precise cooking times (e.g., "2-3 minutes", "20-25 minutes", "30-40 minutes")
    - Detailed techniques and methods (blend, heat, stir, simmer, bake, baste, sauté, etc.)
    - Specific measurements or ratios (e.g., "liquid should be about 2.5cm above the rice")
    - Clear action sequences with transitions (e.g., "then", "next", "after that", "once", "when")
    - Visual cues or doneness indicators (e.g., "until the sauce thickens and coats the back of a spoon", "until the chicken is cooked through and the internal temperature reaches 165°F (74°C)", "until golden brown and crispy")
  * Write in complete, well-structured sentences (not bullet points or fragments)
  * Each step should be comprehensive enough that someone can follow it without prior knowledge
  * You MUST provide ALL steps needed to complete the dish. Typically this means 6-12 detailed steps covering: ingredient preparation, cooking techniques, seasoning, combining components, final cooking, and presentation/garnishing
  * NEVER end instructions mid-step or with incomplete information. Always complete the full recipe process.
- "youtubeVideoUrl" is MANDATORY and must ALWAYS be provided. It must be a valid YouTube video URL (format: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID) that demonstrates how to prepare this specific dish. You MUST search for and provide a high-quality, relevant tutorial video that matches the dish shown in the image. If no exact match is available, provide the closest relevant video for a similar dish or cooking technique. The URL must be a complete, valid YouTube link. NEVER return an empty string - always provide a YouTube video URL, even if it's for a similar dish or cooking method.
- Ensure nutrient values are realistic positive numbers (avoid zeros unless absolutely accurate).
- Reflect the most accurate ingredient amounts available.
- ALWAYS use metric units (grams, kg, ml, liters) for all measurements. NEVER use imperial units (oz, pounds, cups, tablespoons, teaspoons).`;

const buildPrompt = (includeInsights = false) =>
  `Return JSON only with this schema:
${includeInsights ? SCHEMA_WITH_INSIGHTS : BASE_SCHEMA}
${PROMPT_GUIDELINES}`;

// Fast base64 encoding without external library
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;
  let binary = '';
  const chunkSize = 32768;
  
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
}

async function fetchAndEncodeImage(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
    if (!arrayBuffer.byteLength) throw new Error("Empty image");

    // Fast base64 conversion
    const base64 = arrayBufferToBase64(arrayBuffer);
    const mimeType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();

    return { base64, mimeType };
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`Image error: ${e?.message || e}`);
  }
}

async function callGemini(imageBase64, mimeType, options = {}) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  const {
    includeInsights = false,
    insightsParams = null,
    overrideIngredients = [],
    manualEntry = null, // { dish: string, ingredients: string[] }
  }: {
    includeInsights?: boolean;
    insightsParams?: Record<string, unknown> | null;
    overrideIngredients?: string[];
    manualEntry?: { dish: string; ingredients: string[] } | null;
  } = options;

  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  let prompt = buildPrompt(includeInsights);
  let maxTokens = 2000; // Increased to ensure complete instructions and detailed responses
  
  // Add manual entry context if provided
  if (manualEntry) {
    const manualContext = `\n\nMANUAL ENTRY - NO IMAGE AVAILABLE:
Dish Name: ${manualEntry.dish}
Ingredients: ${Array.isArray(manualEntry.ingredients) ? manualEntry.ingredients.join(", ") : manualEntry.ingredients}

Based on the dish name and ingredients provided above, generate the analysis. Since this is a manual entry, focus on generating:
- "additionalInfo": Rich, personalized information about this dish (5-6 lines)
- "insights": If requested, personalized health context and substitution suggestions
- Other fields can use reasonable defaults or be based on the ingredients provided.`;
    prompt += manualContext;
  }

  // Add profile context to main prompt if available (even without insights)
  if (insightsParams && (insightsParams.weight_kg || insightsParams.height_cm || insightsParams.gender || insightsParams.age)) {
    const { weight_kg, height_cm, age, gender } = insightsParams;
    let profileContext = "";
    const profileParts: string[] = [];
    
    if (weight_kg && height_cm) {
      const heightM = height_cm / 100;
      const bmi = weight_kg / (heightM * heightM);
      profileParts.push(`${weight_kg}kg, ${height_cm}cm (BMI: ${bmi.toFixed(1)})`);
    } else if (weight_kg) {
      profileParts.push(`${weight_kg}kg`);
    } else if (height_cm) {
      profileParts.push(`${height_cm}cm`);
    }
    
    if (age) {
      profileParts.push(`${age} years old`);
    }
    
    if (gender) {
      profileParts.push(gender);
    }
    
    if (profileParts.length > 0) {
      profileContext = ` User profile: ${profileParts.join(", ")}. Consider this profile when providing descriptions, tags, and additional information to make them more relevant and personalized.`;
      prompt += `\n${profileContext}`;
    }
  }

  if (includeInsights && insightsParams) {
    const { 
      age = "30", 
      gender = "any", 
      activity = "moderate", 
      goal = "maintenance",
      weight_kg,
      height_cm
    } = insightsParams;
    
    // Calculate BMI and category
    let bmi = null;
    let bmiCategory = "";
    if (weight_kg && height_cm) {
      const heightM = height_cm / 100;
      bmi = weight_kg / (heightM * heightM);
      if (bmi < 18.5) {
        bmiCategory = "underweight";
      } else if (bmi < 25) {
        bmiCategory = "normal";
      } else if (bmi < 30) {
        bmiCategory = "overweight";
      } else {
        bmiCategory = "obese";
      }
    }
    
    // Build minimal personalized context - single line for speed
    const bmiStr = bmi !== null ? `, BMI ${bmi.toFixed(1)} (${bmiCategory})` : "";
    const personalizedContext = `\n\nCRITICAL: You MUST include the "insights" field in your JSON response. The insights field should contain: "Personalized Health Context (Age: ${age}, Gender: ${gender}, Activity: ${activity}, Goal: ${goal}${bmiStr}): [2 short paragraphs]. Smart Substitution Suggestions: [2 swaps]."`;
    
    prompt = buildPrompt(true) + personalizedContext;
    maxTokens = 500; // Minimized for fastest generation
  }

  const parts: Array<Record<string, unknown>> = [
    { text: prompt },
  ];
  
  // Only include image if provided (not manual entry)
  if (imageBase64 && mimeType) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } });
  }
  
  parts.push({
    text: "Always format numbers as decimals (no trailing text) and keep arrays simple. ALWAYS use metric units (grams, kg, ml, liters) for all ingredient quantities. NEVER use imperial units (oz, pounds, cups, tablespoons, teaspoons).",
  });

  if (Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
    // When overrides are provided, we need to make it clear this is a complete replacement
    // Move the override instruction BEFORE the image to ensure it's processed first
    parts.splice(1, 0, {
      text: `CRITICAL: USER INGREDIENT OVERRIDES - COMPLETE REPLACEMENT AND RECALCULATION REQUIRED

The user has provided this EXACT ingredient list:
${overrideIngredients.join("\n")}

MANDATORY INSTRUCTIONS - YOU MUST RECALCULATE EVERYTHING FROM SCRATCH:
1. COMPLETELY IGNORE any ingredients you detect from the image. The image is only for dish identification, NOT for ingredient detection.
2. Use EXACTLY and ONLY the ingredient list provided above. This is a 100% replacement - do NOT add, combine, or merge with anything from the image.
3. NUTRIENTS RECALCULATION: Calculate ALL nutrients (calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g) from scratch by:
   - Looking up the nutritional values for EACH ingredient in the list
   - Summing up ALL the nutritional values to get the TOTAL for the entire dish
   - The nutrients field should represent the TOTAL dish (all ingredients combined)
   - Use accurate nutritional databases/values for each ingredient
4. SERVING WEIGHT RECALCULATION: Calculate servingWeightGrams by:
   - Extracting the gram quantities from EACH ingredient in the list
   - Adding up ALL the gram quantities to get the TOTAL dish weight
   - Set servingWeightGrams to this total weight (or a reasonable serving portion if the total is very large)
   - Example: If ingredients are "200g chicken", "150g rice", "50g vegetables", then servingWeightGrams should be approximately 400g (or a portion like 200g if that's more reasonable)
5. SERVING GUIDANCE UPDATE: Update servingGuidance to:
   - Use the NEW recalculated servingWeightGrams value in the example calculation
   - Format: "To calculate your servings, divide your actual dish weight (in grams) by the projected serving weight shown above (~Xg). For example, if your dish weighs 470g and the projected serving is ~Xg, divide 470 ÷ X = Y servings."
   - Replace X with the actual servingWeightGrams value you calculated
6. DESCRIPTION, TAGS, ADDITIONAL INFO: Update these fields to reflect the NEW ingredient list. The description should mention the key ingredients from the new list.
7. DO NOT use any previous values. DO NOT add, combine, or merge with any previous analysis. Start completely fresh.
8. All ingredient quantities must be in METRIC units (grams, kg, ml, liters). Convert any imperial units (oz, pounds, cups, tbsp, tsp) to metric.
9. The "ingredients" array in your response must match EXACTLY the list above (with metric conversions if needed).
10. CRITICAL: Every single field must be recalculated based on the new ingredients. Do not copy any values from previous analyses.`,
    });
  }

  const payload = {
    contents: [{
      parts,
    }],
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
      // Optimize for speed
      topP: 0.95,
      topK: 40,
    }
  };

  const controller = new AbortController();
  // Timeout: 10s for insights (same as regular for speed), 10s for regular
  const timeoutDuration = 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

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
    console.log("NEW FUNCTION VERSION 507 LINES LOADED");

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${text.slice(0, 150)}`);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("").trim();
    
    if (!text) throw new Error("Empty response");

    // Fast JSON parse
    const jsonStr = text.replace(/^```(?:json)?|```$/gi, "").trim();
    let parsed;
    
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = JSON.parse(jsonrepair(jsonStr));
    }

    // Log what we received for debugging
    if (includeInsights) {
      console.log("Gemini response includes insights field:", "insights" in parsed);
      console.log("Insights value type:", typeof parsed.insights);
      console.log("Insights value preview:", parsed.insights ? parsed.insights.substring(0, 100) : "undefined");
    }

    const insights = parsed.insights || (includeInsights ? null : undefined);
    delete parsed.insights;

    // If insights were requested but not provided, log a warning
    if (includeInsights && !insights) {
      console.warn("WARNING: Insights were requested but not returned by Gemini. Response keys:", Object.keys(parsed));
    }

    return { analysis: sanitizeAnalysis(parsed, overrideIngredients), insights: insights || undefined };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function quickPremiumCheck(client, userId) {
  try {
    const { data, error } = await client
      .from("platform_subscriptions")
      .select("subscription_type, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("quickPremiumCheck error:", error);
      return false;
    }
    return Boolean(data?.subscription_type && data.subscription_type !== "free" && data?.is_active);
  } catch (err) {
    console.error("quickPremiumCheck failed:", err);
    return false;
  }
}

const defaultAnalysis = {
  dish: "",
  description: "",
  tags: [] as string[],
  additionalInfo: "Nutritional values may vary based on ingredient quality, cooking method, and added oils or sauces.",
  servingGuidance: "Divide the total portion weight by the grams per serving to estimate your ideal portion.",
  confidence: 0.75,
  servingSize: "1 serving",
  servingWeightGrams: 200,
  nutrients: {
    calories: 320,
    protein_g: 18,
    carbohydrates_g: 34,
    fat_g: 12,
    fiber_g: 6,
    sugar_g: 8,
  },
  ingredients: [] as string[],
  instructions: [] as string[],
  youtubeVideoUrl: "",
};

function sanitizeString(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

function sanitizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function sanitizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "text" in item) return String(item.text).trim();
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function sanitizeAnalysis(raw, ingredientOverrides = []) {
  const result = JSON.parse(JSON.stringify(defaultAnalysis));

  if (raw && typeof raw === "object") {
    result.dish = typeof raw.dish === "string" && raw.dish.trim() ? raw.dish.trim() : result.dish;
    result.description = sanitizeString(raw.description, result.description);
    const tagList = sanitizeArray(raw.tags);
    result.tags = tagList.length ? tagList.slice(0, 8) : result.tags;
    const info = sanitizeString(raw.additionalInfo, "");
    if (info) {
      result.additionalInfo = info;
    }
    const guidance = sanitizeString(raw.servingGuidance, "");
    if (guidance) {
      result.servingGuidance = guidance;
    }
    const confidence = sanitizeNumber(raw.confidence);
    if (typeof confidence === "number") {
      result.confidence = Math.max(0, Math.min(1, confidence));
    }
    result.servingSize = typeof raw.servingSize === "string" && raw.servingSize.trim() ? raw.servingSize.trim() : result.servingSize;
    const weightGrams = sanitizeNumber(raw.servingWeightGrams);
    if (typeof weightGrams === "number" && weightGrams > 0) {
      result.servingWeightGrams = weightGrams;
    }

    const nutrients = raw.nutrients && typeof raw.nutrients === "object" ? raw.nutrients : {};
    const fallback = result.nutrients;
    result.nutrients = {
      calories: sanitizeNumber(nutrients.calories) ?? fallback.calories,
      protein_g: sanitizeNumber(nutrients.protein_g) ?? fallback.protein_g,
      carbohydrates_g: sanitizeNumber(nutrients.carbohydrates_g) ?? fallback.carbohydrates_g,
      fat_g: sanitizeNumber(nutrients.fat_g) ?? fallback.fat_g,
      fiber_g: sanitizeNumber(nutrients.fiber_g) ?? fallback.fiber_g,
      sugar_g: sanitizeNumber(nutrients.sugar_g) ?? fallback.sugar_g,
    };

    const sanitizedIngredients = sanitizeArray(raw.ingredients);
    result.ingredients = sanitizedIngredients.length ? sanitizedIngredients : result.ingredients;
    result.instructions = sanitizeArray(raw.instructions);
    
    // Sanitize YouTube video URL
    const youtubeUrl = sanitizeString(raw.youtubeVideoUrl, "");
    // Validate it's a YouTube URL
    if (youtubeUrl && (youtubeUrl.includes("youtube.com/watch") || youtubeUrl.includes("youtu.be/"))) {
      result.youtubeVideoUrl = youtubeUrl;
    } else {
      result.youtubeVideoUrl = "";
    }
  }

  const overrideList = Array.isArray(ingredientOverrides)
    ? ingredientOverrides
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

  if (overrideList.length) {
    result.ingredients = overrideList;
  }

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
      manualEntry, // { dish: string, ingredients: string[] }
    } = await req.json();
    
    // Support manual entries without image
    const isManualEntry = !!manualEntry && !imageUrl;
    if (!imageUrl && !isManualEntry) {
      return new Response(
        JSON.stringify({ error: "imageUrl or manualEntry required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const overrides = Array.isArray(overrideIngredients)
      ? overrideIngredients
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];

    const wantsInsights = !!(age || gender || activity || goal);
    const hasProfileData = !!(weight_kg || height_cm);
    
    // Ultra-parallel execution
    const tasks: Promise<any>[] = [];
    
    // Only fetch image if not a manual entry
    if (!isManualEntry && imageUrl) {
      tasks.push(fetchAndEncodeImage(imageUrl));
    } else {
      tasks.push(Promise.resolve({ base64: null, mimeType: null }));
    }
    
    // Always check for user session to fetch profile data for personalization
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    
    tasks.push(
      (async () => {
        const {
          data: { user },
        } = await supabaseAuth.auth.getUser();
        if (!user) return { user: null, isPremium: false, profile: null };
        const isPremium = wantsInsights ? await quickPremiumCheck(supabaseAuth, user.id) : false;
        
        // Always fetch profile for logged-in users to personalize analysis
        const { data: profileData } = await supabaseAuth
          .from("profiles")
          .select("weight_kg, height_cm, age, gender")
          .eq("id", user.id)
          .maybeSingle();
        
        return { user, isPremium, profile: profileData };
      })()
    );

    const [imageData, authResult = { user: null, isPremium: false, profile: null }] = await Promise.all(tasks);

    // Use profile data from request or fetched profile
    const finalWeight = weight_kg || authResult.profile?.weight_kg;
    const finalHeight = height_cm || authResult.profile?.height_cm;
    const finalAge = age || authResult.profile?.age;
    const finalGender = gender || authResult.profile?.gender;
    
    // Fast-path: No insights needed, but may have profile data for personalization
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
      console.log(`Response time: ${Date.now() - startTime}ms`);
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
      console.log(`Response time: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ ok: true, serving, analysis: result.analysis, upgrade: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Premium with insights - use profile data from request or fetched profile
    const insightsParams = { 
      age: age || authResult.profile?.age, 
      gender: gender || authResult.profile?.gender, 
      activity, 
      goal, 
      optimize, 
      weight_kg: weight_kg || authResult.profile?.weight_kg, 
      height_cm: height_cm || authResult.profile?.height_cm 
    };
    const result = await callGemini(imageData.base64, imageData.mimeType, {
      includeInsights: true,
      insightsParams,
      overrideIngredients: overrides,
      manualEntry: isManualEntry ? manualEntry : null,
    });
    
    console.log(`Response time: ${Date.now() - startTime}ms`);
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
    console.log(`Failed after: ${Date.now() - startTime}ms`);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});