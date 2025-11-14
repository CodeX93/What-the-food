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

const BASE_SCHEMA = `{"dish":string,"description":string,"tags":string[],"additionalInfo":string,"servingGuidance":string,"confidence":number,"servingSize":string,"nutrients":{"calories":number,"protein_g":number,"carbohydrates_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number},"ingredients":string[],"instructions":string[]}`;
const SCHEMA_WITH_INSIGHTS = `${BASE_SCHEMA.slice(0, -1)},"insights":string}`;
const PROMPT_GUIDELINES = `Guidelines:
- "description" should be a concise 1-2 sentence summary of the meal.
- Provide 3-6 descriptive "tags" (short lowercase keywords separated into an array).
- "additionalInfo" must mention that nutrition can vary based on ingredient quality, portion size, cooking method, or added oils/sauces. Tailor it to the dish.
- "servingGuidance" must explain how to weigh or divide the meal to estimate personal servings (e.g., divide total grams by grams-per-serving).
- Every entry in "ingredients" must begin with a quantity and unit in METRIC format ONLY (grams, kg, ml, liters). NEVER use imperial units (oz, pounds, cups, tbsp, tsp, etc.). Convert all measurements to metric. Examples: "250g cooked chickpeas", "30ml olive oil", "150g potatoes".
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
  }: {
    includeInsights?: boolean;
    insightsParams?: Record<string, unknown> | null;
    overrideIngredients?: string[];
  } = options;

  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  let prompt = buildPrompt(includeInsights);
  let maxTokens = 800; // Aggressive reduction

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
    
    let personalizedContext = `Insights: Provide a quick analysis tailored for ${age}yo, ${gender}, ${activity} activity, ${goal} goal.`;
    
    if (weight_kg && height_cm) {
      // Calculate BMI for context
      const heightM = height_cm / 100;
      const bmi = weight_kg / (heightM * heightM);
      personalizedContext += ` User profile: ${weight_kg}kg, ${height_cm}cm (BMI: ${bmi.toFixed(1)}).`;
    } else if (weight_kg) {
      personalizedContext += ` User weight: ${weight_kg}kg.`;
    } else if (height_cm) {
      personalizedContext += ` User height: ${height_cm}cm.`;
    }
    
    prompt = buildPrompt(true) + `\n${personalizedContext}`;
    maxTokens = 1200;
  }

  const parts: Array<Record<string, unknown>> = [
    { text: prompt },
    { inlineData: { mimeType, data: imageBase64 } },
    {
      text: "Always format numbers as decimals (no trailing text) and keep arrays simple. ALWAYS use metric units (grams, kg, ml, liters) for all ingredient quantities. NEVER use imperial units (oz, pounds, cups, tablespoons, teaspoons).",
    },
  ];

  if (Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
    // When overrides are provided, we need to make it clear this is a complete replacement
    // Move the override instruction BEFORE the image to ensure it's processed first
    parts.splice(1, 0, {
      text: `CRITICAL: USER INGREDIENT OVERRIDES - COMPLETE REPLACEMENT REQUIRED

The user has provided this EXACT ingredient list:
${overrideIngredients.join("\n")}

MANDATORY INSTRUCTIONS:
1. COMPLETELY IGNORE any ingredients you detect from the image. The image is only for dish identification, NOT for ingredient detection.
2. Use EXACTLY and ONLY the ingredient list provided above. This is a 100% replacement - do NOT add, combine, or merge with anything from the image.
3. Recalculate ALL nutrients (calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g) from scratch based SOLELY on these user-provided ingredients.
4. DO NOT add, combine, or merge with any previous values. Start fresh with ONLY these ingredients.
5. All ingredient quantities must be in METRIC units (grams, kg, ml, liters). Convert any imperial units (oz, pounds, cups, tbsp, tsp) to metric.
6. Calculate the total nutrition for the entire dish based exclusively on these ingredients.
7. The "ingredients" array in your response must match EXACTLY the list above (with metric conversions if needed).`,
    });
  }

  const payload = {
    contents: [{
      parts,
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json"
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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

    const insights = parsed.insights;
    delete parsed.insights;

    return { analysis: sanitizeAnalysis(parsed, overrideIngredients), insights };
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
    } = await req.json();
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl required" }),
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
    const tasks = [fetchAndEncodeImage(imageUrl)];
    
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