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
- CRITICAL NUTRITION ACCURACY REQUIREMENTS:
  * You MUST use established nutritional databases (USDA FoodData Central, FDA Nutrition Facts, or equivalent authoritative sources) for ALL nutrient calculations.
  * For EACH ingredient, look up its EXACT nutritional values per 100g (or per ml for liquids) from these databases.
  * Calculate nutrients by: (ingredient_quantity_in_grams / 100) × nutritional_value_per_100g, then SUM all ingredients.
  * For cooking oils and fats: Use accurate calorie density (9 calories per gram of fat). For example, 30ml vegetable oil = ~30g = ~270 calories, 30g fat, 0g protein, 0g carbs.
  * For proteins: Use accurate values (chicken breast ~165 cal/100g, 31g protein/100g; eggs ~155 cal/100g, 13g protein/100g).
  * For carbohydrates: Include all carbs (starch, sugar, fiber). Fiber should be separate from total carbs.
  * Account for cooking method: Boiled/steamed retains more nutrients; fried adds oil calories; roasted may reduce water content.
  * When ingredients are provided with quantities, you MUST calculate from those exact quantities, NOT estimate.
  * The total calories MUST equal: (protein_g × 4) + (carbohydrates_g × 4) + (fat_g × 9) ± 2 calories for rounding.
  * All nutrient values must be REALISTIC and CONSISTENT. If a dish has 200g of chicken breast, it should have approximately 330 calories and 62g protein, not random numbers.
  * NEVER guess or estimate nutrients. ALWAYS calculate from actual ingredient quantities using database values.
  * If you cannot find exact values for an ingredient, use the closest match from USDA database and note it in your calculation.
  * Double-check your math: Sum all ingredient nutrients to get total dish nutrients.
  * Ensure fiber_g is always a subset of carbohydrates_g (fiber cannot exceed total carbs).
  * Sugar_g should be realistic based on ingredients (natural sugars from fruits, added sugars from sweeteners).
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

// Dedicated function for recalculating nutrition from edited ingredients only
// This is simpler and more accurate than the full image analysis flow
async function recalculateNutritionFromIngredients(dishName: string, ingredients: string[], existingAnalysis: any) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("Ingredients list is required");
  }

  const RECALCULATION_PROMPT = `You are a nutrition calculation expert. Your ONLY job is to recalculate nutrition values from an ingredient list.

DISH NAME: ${dishName}

INGREDIENT LIST (EXACT - DO NOT MODIFY):
${ingredients.map((ing, idx) => `${idx + 1}. ${ing}`).join("\n")}

YOUR TASK: Calculate accurate nutrition values for this dish based ONLY on the ingredient list above.

CRITICAL REQUIREMENTS:
1. For EACH ingredient, look up its EXACT nutritional values per 100g (or per ml for liquids) from USDA FoodData Central database
2. Calculate nutrients for each ingredient using: (ingredient_quantity_in_grams / 100) × nutritional_value_per_100g
3. IMPORTANT EXAMPLES:
   - Vegetable oil: 100ml = 100g = 884 calories, 0g protein, 0g carbs, 100g fat
   - Potatoes: 100g = 77 calories, 2g protein, 17g carbs, 0.1g fat, 2.2g fiber, 0.8g sugar
   - Chicken breast: 100g = 165 calories, 31g protein, 0g carbs, 3.6g fat
   - Salt/seasonings: Negligible calories (0 or near 0)
4. Sum up ALL calculated nutritional values from ALL ingredients to get the TOTAL for the entire dish
5. CRITICAL VALIDATION: Total calories MUST equal: (protein_g × 4) + (carbohydrates_g × 4) + (fat_g × 9) ± 2 calories
6. Ensure fiber_g ≤ carbohydrates_g (fiber is a subset of total carbs)
7. Calculate servingWeightGrams by summing all gram quantities from ingredients
8. If an ingredient quantity increases, nutrition values MUST increase proportionally
9. If an ingredient quantity decreases, nutrition values MUST decrease proportionally
10. NEVER guess or estimate. ALWAYS calculate from exact ingredient quantities using USDA database values

Return ONLY a JSON object with this exact structure:
{
  "nutrients": {
    "calories": number,
    "protein_g": number,
    "carbohydrates_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number
  },
  "servingWeightGrams": number
}

DO NOT include any other fields. DO NOT add explanations. Return ONLY the JSON object.`;

  const payload = {
    contents: [{
      parts: [{ text: RECALCULATION_PROMPT }],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 500,
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

    // Validate the response
    if (!parsed.nutrients || !parsed.servingWeightGrams) {
      throw new Error("Invalid response structure");
    }

    // Validate calorie math
    const { calories, protein_g, carbohydrates_g, fat_g } = parsed.nutrients;
    const calculatedCal = (protein_g * 4) + (carbohydrates_g * 4) + (fat_g * 9);
    const diff = Math.abs(calories - calculatedCal);
    
    if (diff > 5) {
      console.warn(`Calorie validation failed: ${calories} vs calculated ${calculatedCal} (diff: ${diff})`);
      // Use calculated calories for accuracy
      parsed.nutrients.calories = Math.round(calculatedCal);
    }

    // Update the existing analysis with new nutrition values
    const updatedAnalysis = {
      ...existingAnalysis,
      nutrients: parsed.nutrients,
      servingWeightGrams: parsed.servingWeightGrams,
      ingredients: ingredients, // Update ingredients list
    };

    // Update serving guidance with new weight
    if (parsed.servingWeightGrams) {
      updatedAnalysis.servingGuidance = `To calculate your servings, divide your actual dish weight (in grams) by the projected serving weight shown above (~${Math.round(parsed.servingWeightGrams)}g). For example, if your dish weighs ${Math.round(parsed.servingWeightGrams * 1.5)}g and the projected serving is ~${Math.round(parsed.servingWeightGrams)}g, divide ${Math.round(parsed.servingWeightGrams * 1.5)} ÷ ${Math.round(parsed.servingWeightGrams)} = 1.5 servings. This tells you how many servings your portion contains.`;
    }

    return updatedAnalysis;
  } catch (e) {
    clearTimeout(timeoutId);
    throw new Error(`Recalculation failed: ${e?.message || e}`);
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
    text: "Always format numbers as decimals (no trailing text) and keep arrays simple. ALWAYS use metric units (grams, kg, ml, liters) for all ingredient quantities. NEVER use imperial units (oz, pounds, cups, tablespoons, teaspoons).\n\nFINAL ACCURACY CHECK: Before returning your response, verify that:\n1. All nutrient values are calculated from actual ingredient quantities using USDA/authoritative database values\n2. Total calories = (protein_g × 4) + (carbohydrates_g × 4) + (fat_g × 9) ± 2 calories\n3. Fiber_g ≤ carbohydrates_g (fiber cannot exceed total carbs)\n4. All values are realistic and consistent with the ingredient quantities provided\n5. If ingredients list '30ml vegetable oil', the fat_g should be ~30g and calories should include ~270 from the oil\n6. Nutrient values match the actual quantities - double-check your calculations before responding.",
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
3. NUTRIENTS RECALCULATION - THIS IS CRITICAL FOR ACCURACY:
   - For EACH ingredient in the list, you MUST look up its EXACT nutritional values per 100g (or per ml for liquids) from USDA FoodData Central database
   - Calculate nutrients for each ingredient using: (ingredient_quantity_in_grams / 100) × nutritional_value_per_100g
   - IMPORTANT EXAMPLES:
     * Vegetable oil: 100ml = 100g = 884 calories, 0g protein, 0g carbs, 100g fat
     * Potatoes: 100g = 77 calories, 2g protein, 17g carbs, 0.1g fat
     * Chicken breast: 100g = 165 calories, 31g protein, 0g carbs, 3.6g fat
     * Salt/seasonings: Negligible calories (0 or near 0)
   - Sum up ALL the calculated nutritional values from ALL ingredients to get the TOTAL for the entire dish
   - The nutrients field must represent the TOTAL dish (all ingredients combined)
   - CRITICAL VALIDATION: The total calories MUST equal: (protein_g × 4) + (carbohydrates_g × 4) + (fat_g × 9) ± 2 calories for rounding
   - Ensure fiber_g is always ≤ carbohydrates_g (fiber is a subset of total carbs)
   - Use REALISTIC values based on actual ingredient quantities - if you have 500g potatoes, it should be ~385 calories and ~10g protein, NOT random numbers
   - If you reduce an ingredient quantity (e.g., 500ml oil → 250ml oil), the calories and fat MUST decrease proportionally and similarly for other ingredients. Also if an ingredient quantity increases, the calories and fat MUST increase proportionally.If if an ingredient quantity is decreases, the calories and fat MUST decrease proportionally and similarly for other ingredients.
   - NEVER guess or estimate. ALWAYS calculate from exact ingredient quantities using USDA database values
   - Double-check your math by summing all ingredient nutrients before finalizing
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

    const sanitized = sanitizeAnalysis(parsed, overrideIngredients);
    
    // Trust Gemini's calculations when overrideIngredients are provided
    // Gemini has been instructed to recalculate from scratch using USDA database values
    // No need to override with our limited database - let Gemini do the work
    
    return { analysis: sanitized, insights: insights || undefined };
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

// Generic nutrition calculator from ingredients
// Uses USDA-standard nutritional values per 100g
function calculateNutrientsFromIngredients(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return null;
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSugar = 0;
  let totalWeight = 0;

  // Standard nutritional values per 100g (from USDA FoodData Central)
  // Format: keyword(s) -> {cal, protein, carbs, fat, fiber, sugar}
  const nutritionDB = {
    // Oils and fats (per 100g/ml - using 1:1 ratio for ml to g for oils)
    'vegetable oil': { cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    'olive oil': { cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    'canola oil': { cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    'sunflower oil': { cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    'cooking oil': { cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    'oil': { cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0 },
    'butter': { cal: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1 },
    
    // Potatoes and starches
    'potato': { cal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8 },
    'potatoes': { cal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8 },
    'russet': { cal: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8 },
    
    // Salt and seasonings (negligible nutrition)
    'salt': { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    'pepper': { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
    
    // Proteins
    'chicken breast': { cal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
    'chicken': { cal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 },
    'beef': { cal: 250, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0 },
    'ground beef': { cal: 250, protein: 26, carbs: 0, fat: 17, fiber: 0, sugar: 0 },
    'pork': { cal: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0 },
    'fish': { cal: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    'salmon': { cal: 208, protein: 20, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    'tuna': { cal: 144, protein: 30, carbs: 0, fat: 1, fiber: 0, sugar: 0 },
    'egg': { cal: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 0.7 },
    'eggs': { cal: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 0.7 },
    
    // Grains and carbs
    'rice': { cal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
    'white rice': { cal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
    'brown rice': { cal: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, sugar: 0.4 },
    'pasta': { cal: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6 },
    'bread': { cal: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5.7 },
    'wheat': { cal: 327, protein: 13, carbs: 71, fat: 1.5, fiber: 12, sugar: 0.4 },
    
    // Vegetables
    'onion': { cal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2 },
    'onions': { cal: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2 },
    'tomato': { cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6 },
    'tomatoes': { cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6 },
    'carrot': { cal: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7 },
    'carrots': { cal: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7 },
    'broccoli': { cal: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.5 },
    'lettuce': { cal: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8 },
    'spinach': { cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4 },
    'bell pepper': { cal: 31, protein: 1, carbs: 7, fat: 0.3, fiber: 2.5, sugar: 5 },
    'pepper': { cal: 31, protein: 1, carbs: 7, fat: 0.3, fiber: 2.5, sugar: 5 },
    
    // Fruits
    'apple': { cal: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10 },
    'banana': { cal: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12 },
    'orange': { cal: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9 },
  };

  for (const ingredient of ingredients) {
    if (typeof ingredient !== 'string') continue;
    
    const lowerIngredient = ingredient.toLowerCase().trim();
    
    // Extract quantity and unit - handle various formats
    // Matches: "500g", "500 g", "500ml", "500 ml", "1.5kg", "500g potatoes", "500ml vegetable oil", etc.
    // The regex now allows text after the unit
    const quantityMatch = lowerIngredient.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gram|grams|kilogram|kilograms|milliliter|milliliters|liter|liters)\b/i);
    if (!quantityMatch) {
      console.log(`Could not parse quantity from: ${ingredient}`);
      continue;
    }
    
    const quantity = parseFloat(quantityMatch[1]);
    const unit = quantityMatch[2].toLowerCase();
    
    // Convert to grams
    let grams = quantity;
    if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
      grams = quantity * 1000;
    } else if (unit === 'ml' || unit === 'l' || unit === 'milliliter' || unit === 'milliliters' || unit === 'liter' || unit === 'liters') {
      // For liquids, use 1:1 ratio (1ml = 1g)
      // For oils specifically, this is close enough (actual density ~0.92g/ml)
      grams = quantity;
    }
    
    totalWeight += grams;
    
    // Extract food name by removing quantity and unit
    const foodName = lowerIngredient
      .replace(quantityMatch[0], '') // Remove quantity and unit
      .trim()
      .replace(/^(of|and|or|with|in|on|at|the|a|an)\s+/i, '') // Remove common prepositions/articles
      .trim();
    
    // Find matching food in database (check for longest match first)
    let nutrition = null;
    let matchedKey = '';
    
    // Sort keys by length (longest first) to match more specific terms first
    const sortedKeys = Object.keys(nutritionDB).sort((a, b) => b.length - a.length);
    
    // First try to match the extracted food name
    for (const key of sortedKeys) {
      if (foodName.includes(key) || lowerIngredient.includes(key)) {
        nutrition = nutritionDB[key];
        matchedKey = key;
        break;
      }
    }
    
    // If no match found, skip this ingredient (log for debugging)
    if (!nutrition) {
      console.log(`No nutrition data found for: ${ingredient} (extracted food: "${foodName}")`);
      continue;
    }
    
    console.log(`Matched "${ingredient}" -> ${matchedKey}: ${grams}g`);
    
    // Calculate nutrients for this ingredient: (grams / 100) × nutrition_per_100g
    const ratio = grams / 100;
    totalCalories += nutrition.cal * ratio;
    totalProtein += nutrition.protein * ratio;
    totalCarbs += nutrition.carbs * ratio;
    totalFat += nutrition.fat * ratio;
    totalFiber += nutrition.fiber * ratio;
    totalSugar += nutrition.sugar * ratio;
  }

  // Validate calorie math: calories should equal (protein × 4) + (carbs × 4) + (fat × 9)
  const calculatedCalFromMacros = (totalProtein * 4) + (totalCarbs * 4) + (totalFat * 9);
  const finalCalories = Math.abs(totalCalories - calculatedCalFromMacros) < 5 
    ? calculatedCalFromMacros 
    : totalCalories;

  // Ensure fiber doesn't exceed carbs
  const finalFiber = Math.min(totalFiber, totalCarbs);

  // Round to reasonable precision
  return {
    calories: Math.round(finalCalories),
    protein_g: Math.round(totalProtein * 10) / 10,
    carbohydrates_g: Math.round(totalCarbs * 10) / 10,
    fat_g: Math.round(totalFat * 10) / 10,
    fiber_g: Math.round(finalFiber * 10) / 10,
    sugar_g: Math.round(totalSugar * 10) / 10,
    totalWeightGrams: Math.round(totalWeight),
  };
}

// Validate and correct nutrients based on ingredients
// Always uses calculated values when ingredients are provided to ensure accuracy
function validateAndCorrectNutrients(analysis, ingredientOverrides) {
  if (!analysis || !ingredientOverrides || ingredientOverrides.length === 0) {
    return analysis;
  }

  // Calculate correct nutrients from ingredients
  const calculated = calculateNutrientsFromIngredients(ingredientOverrides);
  
  // If calculation failed or returned all zeros, keep Gemini's values but log warning
  if (!calculated || (calculated.calories === 0 && calculated.protein_g === 0 && calculated.carbohydrates_g === 0 && calculated.fat_g === 0)) {
    console.warn(`Nutrition calculation failed for ingredients: ${ingredientOverrides.join(', ')}. Using Gemini's values.`);
    return analysis;
  }

  // Always use calculated values when we have valid ingredient data
  // This ensures 100% accuracy based on actual ingredient quantities
  const currentCal = analysis.nutrients?.calories || 0;
  const diffPercent = currentCal > 0 ? Math.abs((calculated.calories - currentCal) / currentCal) * 100 : 100;
  
  // Log correction if significant difference
  if (diffPercent > 5) {
    console.log(`Correcting nutrients: Gemini gave ${currentCal} cal, calculated ${calculated.calories} cal (${diffPercent.toFixed(1)}% diff)`);
  }
  
  // Always use calculated values to ensure accuracy
  analysis.nutrients = {
    calories: calculated.calories,
    protein_g: calculated.protein_g,
    carbohydrates_g: calculated.carbohydrates_g,
    fat_g: calculated.fat_g,
    fiber_g: calculated.fiber_g,
    sugar_g: calculated.sugar_g,
  };
  
  // Update serving weight if calculated
  if (calculated.totalWeightGrams > 0) {
    analysis.servingWeightGrams = calculated.totalWeightGrams;
  }

  return analysis;
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
      recalculateOnly = false, // New flag for ingredient-only recalculation
      existingAnalysis = null, // Existing analysis to update
    } = await req.json();
    
    // Handle ingredient-only recalculation (no image analysis)
    if (recalculateOnly && existingAnalysis && Array.isArray(overrideIngredients) && overrideIngredients.length > 0) {
      const dishName = existingAnalysis.dish || "Custom Dish";
      const updatedAnalysis = await recalculateNutritionFromIngredients(
        dishName,
        overrideIngredients,
        existingAnalysis
      );
      console.log(`Recalculation time: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ ok: true, serving, analysis: updatedAnalysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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