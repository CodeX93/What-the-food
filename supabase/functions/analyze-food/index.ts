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

// Ultra-concise prompt for speed
const systemPrompt = `Return JSON only:
{"dish":string,"confidence":number,"servingSize":string,"nutrients":{"calories":number,"protein_g":number,"carbohydrates_g":number,"fat_g":number,"fiber_g":number,"sugar_g":number},"ingredients":string[],"instructions":string[]}`;

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

async function callGemini(imageBase64, mimeType, includeInsights, insightsParams) {
  if (!GEMINI_API_KEY) throw new Error("Missing API key");

  let prompt = systemPrompt;
  let maxTokens = 800; // Aggressive reduction

  if (includeInsights && insightsParams) {
    const { age = "30", gender = "any", activity = "moderate", goal = "maintenance" } = insightsParams;
    prompt = `${systemPrompt.slice(0, -2)},"insights":string}
Insights: Quick analysis for ${age}yo, ${gender}, ${activity} activity, ${goal} goal.`;
    maxTokens = 1200;
  }

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: imageBase64 } }
      ]
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

    return { analysis: sanitizeAnalysis(parsed), insights };
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function quickPremiumCheck(userId) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from("platform_subscriptions")
      .select("subscription_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return data?.subscription_type && data.subscription_type !== "free";
  } catch {
    return false;
  }
}

const defaultAnalysis = {
  dish: "",
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
  ingredients: [],
  instructions: [],
};

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

function sanitizeAnalysis(raw) {
  const result = JSON.parse(JSON.stringify(defaultAnalysis));

  if (raw && typeof raw === "object") {
    result.dish = typeof raw.dish === "string" && raw.dish.trim() ? raw.dish.trim() : result.dish;
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

    result.ingredients = sanitizeArray(raw.ingredients);
    result.instructions = sanitizeArray(raw.instructions);
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

    const { imageUrl, serving = 1, age, gender, activity, goal, optimize } = await req.json();
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wantsInsights = !!(age || gender || activity || goal);
    
    // Ultra-parallel execution
    const tasks = [fetchAndEncodeImage(imageUrl)];
    
    if (wantsInsights) {
      const authHeader = req.headers.get("Authorization") || "";
      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      
      tasks.push(
        (async () => {
          const { data: { user } } = await supabaseAuth.auth.getUser();
          if (!user) return { user: null, isPremium: false };
          const isPremium = await quickPremiumCheck(user.id);
          return { user, isPremium };
        })()
      );
    }

    const [imageData, authResult = { user: null, isPremium: false }] = await Promise.all(tasks);

    // Fast-path: No insights needed
    if (!wantsInsights) {
      const result = await callGemini(imageData.base64, imageData.mimeType, false, null);
      console.log(`Response time: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ ok: true, serving, analysis: result.analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle auth/premium for insights
    if (!authResult.user || !authResult.isPremium) {
      const result = await callGemini(imageData.base64, imageData.mimeType, false, null);
      console.log(`Response time: ${Date.now() - startTime}ms`);
      return new Response(
        JSON.stringify({ ok: true, serving, analysis: result.analysis, upgrade: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Premium with insights
    const insightsParams = { age, gender, activity, goal, optimize };
    const result = await callGemini(imageData.base64, imageData.mimeType, true, insightsParams);
    
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