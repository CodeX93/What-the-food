// @ts-nocheck
// Edge Function: Premium-only personalized health context and smart substitutions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InsightsRequest = {
  scanId: string;
  age?: number;
  gender?: string;
  activity?: string; // sedentary, light, moderate, active
  goal?: string; // weight_loss, muscle_gain, maintenance, etc.
  optimize?: boolean; // request healthier variant suggestions
};

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY env");
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 768, responseMimeType: "text/plain" },
  };
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return String(text || "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });

    // Ensure user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = (await req.json()) as InsightsRequest;
    if (!body.scanId) return new Response(JSON.stringify({ ok: false, error: "scanId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check premium subscription (server-side gate)
    const { data: sub } = await supabase
      .from("platform_subscriptions")
      .select("subscription_type,is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isPremium = sub && sub.subscription_type && sub.subscription_type !== "free";
    if (!isPremium) {
      return new Response(JSON.stringify({ ok: false, upgrade: true, message: "Premium required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load scan and ensure ownership via RLS
    const { data: scan, error: scanErr } = await supabase
      .from("food_scans")
      .select("result_json, serving")
      .eq("id", body.scanId)
      .maybeSingle();
    if (scanErr || !scan) return new Response(JSON.stringify({ ok: false, error: "scan not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const nutrients = scan.result_json?.nutrients || {};
    const dish = scan.result_json?.dish || "Dish";
    const ingredients = scan.result_json?.ingredients || [];

    const demographics = `Age: ${body.age ?? "-"}, Gender: ${body.gender ?? "-"}, Activity: ${body.activity ?? "-"}, Goal: ${body.goal ?? "-"}`;
    const optimizeStr = body.optimize ? "Also provide 3 smart substitutions to make it healthier with expected % impact." : "Also include 2-3 thoughtful substitutions.";

    const prompt = `You are a nutrition coach. Given this analysis and user context, provide:
1) Personalized Health Context: quantify how this food fits their goals with daily % estimate for calories/macros based on typical needs for the demographics.
2) Smart Substitution Suggestions: concrete swaps and brief rationale (bullet list).

Food: ${dish}
Nutrients per current serving (scaled): calories=${nutrients.calories||0}, protein_g=${nutrients.protein_g||0}, carbs_g=${nutrients.carbohydrates_g||0}, fat_g=${nutrients.fat_g||0}, fiber_g=${nutrients.fiber_g||0}, sugar_g=${nutrients.sugar_g||0}
Ingredients: ${ingredients.join(", ")}
User context: ${demographics}
${optimizeStr}
Be concise and actionable.
`;

    const text = await callGemini(prompt);
    return new Response(JSON.stringify({ ok: true, insights: text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("food-insights error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


