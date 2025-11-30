// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ar: "Arabic",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const { content, sourceLanguage = "en", targetLanguage, contentType } = await req.json();

    if (!content || !targetLanguage || !contentType) {
      return new Response(
        JSON.stringify({ ok: false, error: "content, targetLanguage, and contentType are required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    if (sourceLanguage === targetLanguage) {
      return new Response(
        JSON.stringify({ ok: true, translatedContent: content }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Get auth token from headers
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is authenticated
    const supabaseClient = createClient(
      SUPABASE_URL ?? "",
      SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Build translation prompt based on content type
    let prompt = "";
    
    if (contentType === "meal_plan") {
      prompt = buildMealPlanTranslationPrompt(content, sourceLanguage, targetLanguage);
    } else if (contentType === "food_scan") {
      prompt = buildFoodScanTranslationPrompt(content, sourceLanguage, targetLanguage);
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid contentType. Must be 'meal_plan' or 'food_scan'" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Call Gemini API
    const GEMINI_MODEL = "gemini-2.0-flash-exp";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const geminiData = await response.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!generatedText) {
      throw new Error("No response from Gemini");
    }

    // Clean and parse JSON response
    let cleaned = generatedText.trim();
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    cleaned = cleaned.trim();

    let translatedContent;
    try {
      translatedContent = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error (first attempt):", parseError);
      console.error("Cleaned text (first 500 chars):", cleaned.substring(0, 500));
      try {
        const repaired = jsonrepair(cleaned);
        translatedContent = JSON.parse(repaired);
        console.log("Successfully repaired JSON");
      } catch (repairError) {
        console.error("JSON repair error:", repairError);
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = jsonrepair(jsonMatch[0]);
            translatedContent = JSON.parse(extracted);
            console.log("Successfully extracted and repaired JSON");
          } catch (extractError) {
            console.error("JSON extraction error:", extractError);
            throw new Error("Failed to parse Gemini response as JSON. The response may be malformed.");
          }
        } else {
          throw new Error("Failed to parse Gemini response as JSON even after repair attempt");
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        translatedContent,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Translate content error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Failed to translate content",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

function buildMealPlanTranslationPrompt(content: any, sourceLanguage: string, targetLanguage: string): string {
  const sourceLangName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  return `You are a professional translator specializing in nutritional and meal planning content. Translate the following meal plan JSON from ${sourceLangName} to ${targetLangName}.

CRITICAL REQUIREMENTS:
1. Translate ALL text fields while preserving the exact JSON structure
2. DO NOT modify numeric values (calories, grams, quantities, etc.) - keep them exactly as they are
3. Translate the following fields:
   - overview
   - dailyCalorieRationale
   - macroDistribution.rationale
   - weeklyMealPlan[].meals[].name
   - weeklyMealPlan[].meals[].foods[].name
   - weeklyMealPlan[].meals[].foods[].quantity (translate units if appropriate, e.g., "cup" → "taza" in Spanish, but keep numbers)
   - exercisePlan.types[] (translate each type)
   - exercisePlan.frequency
   - exercisePlan.duration
   - exercisePlan.intensity
   - exercisePlan.specificExercises[] (translate each exercise name)
   - exercisePlan.weeklySchedule
   - actionItems[].category
   - actionItems[].item
   - actionItems[].details
   - tips[] (translate each tip)

4. DO NOT translate or modify:
   - Numeric values (calories, protein_g, carbohydrates_g, fat_g, fiber_g, etc.)
   - Day names (keep as "Monday", "Tuesday", etc. or translate day labels appropriately)
   - Meal type keys ("breakfast", "lunch", "dinner", "snack")
   - JSON structure, keys, or formatting

5. For food quantities: Translate unit words (e.g., "cup" → "taza", "grams" → "gramos") but keep numbers unchanged

6. Maintain the exact same JSON structure - same keys, same nesting, same arrays

7. Ensure all translated text is natural and culturally appropriate for ${targetLangName} speakers

Here is the meal plan JSON to translate:

${JSON.stringify(content, null, 2)}

Return ONLY the translated JSON object, with no markdown formatting or additional text.`;
}

function buildFoodScanTranslationPrompt(content: any, sourceLanguage: string, targetLanguage: string): string {
  const sourceLangName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

  return `You are a professional translator specializing in food and nutritional content. Translate the following food scan analysis JSON from ${sourceLangName} to ${targetLangName}.

CRITICAL REQUIREMENTS:
1. Translate ALL text fields while preserving the exact JSON structure
2. DO NOT modify numeric values (calories, grams, etc.) - keep them exactly as they are
3. Translate the following fields:
   - dish
   - description
   - tags[] (translate each tag)
   - additionalInfo
   - servingGuidance
   - servingSize
   - ingredients[] (translate each ingredient name, but keep quantities and units - translate unit words if appropriate)
   - instructions[] (translate each instruction step completely)
   - insights (if present)

4. DO NOT translate or modify:
   - Numeric values (calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g, servingWeightGrams, confidence, etc.)
   - URLs (youtubeVideoUrl - keep unchanged)
   - JSON structure, keys, or formatting

5. For ingredient quantities: Translate unit words (e.g., "grams" → "gramos", "ml" → "ml") but keep numbers unchanged
   Example: "200g chicken breast" should become "200g pechuga de pollo" (translate food name, keep quantity)

6. Instructions should be fully translated but maintain the same detailed step-by-step structure

7. Maintain the exact same JSON structure - same keys, same nesting, same arrays

8. Ensure all translated text is natural and culturally appropriate for ${targetLangName} speakers

Here is the food scan JSON to translate:

${JSON.stringify(content, null, 2)}

Return ONLY the translated JSON object, with no markdown formatting or additional text.`;
}

