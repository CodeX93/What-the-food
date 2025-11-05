// @ts-nocheck
// Edge Function: Analyze Food image using Google Gemini and return structured nutrition JSON

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: "Bearer " } },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyzeRequest = {
  imageUrl: string;
  serving?: number;
  // Optional premium insights params
  age?: number;
  gender?: string;
  activity?: string;
  goal?: string;
  optimize?: boolean;
};

type AnalyzeResponse = {
  dish: string;
  confidence: number;
  servingSize: string;
  nutrients: {
    calories?: number;
    protein_g?: number;
    carbohydrates_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  ingredients: string[];
  instructions: string[];
};

const systemPrompt = `You are a nutrition analyst. Given a food photo, extract structured nutrition info.
Respond ONLY as minified JSON with this exact shape and keys:
{
  "dish": string,
  "confidence": number between 0 and 1,
  "servingSize": string,  // e.g. "1 burger (~250g)"
  "nutrients": {
    "calories": number,      // kcal per given serving
    "protein_g": number,
    "carbohydrates_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number
  },
  "ingredients": string[],
  "instructions": string[]
}
If uncertain, estimate reasonable values and keep the JSON valid.`;

async function fetchBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}. ${errorText.substring(0, 200)}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("Empty image response");
    // Best-effort content-type sniffing
    return btoa(String.fromCharCode(...buf));
  } catch (e: any) {
    if (e.message.includes("Failed to fetch image")) throw e;
    throw new Error(`Image fetch error: ${e?.message || e}`);
  }
}

async function callGemini(imageUrl: string, includeInsights: boolean, insightsParams?: any): Promise<{ analysis: AnalyzeResponse; insights?: string }> {
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY env");
  const imageBase64 = await fetchBase64(imageUrl);

  let prompt = systemPrompt;
  if (includeInsights && insightsParams) {
    const demographics = `Age: ${insightsParams.age ?? "-"}, Gender: ${insightsParams.gender ?? "-"}, Activity: ${insightsParams.activity ?? "-"}, Goal: ${insightsParams.goal ?? "-"}`;
    const optimizeStr = insightsParams.optimize ? "Also provide 3 smart substitutions to make it healthier with expected % impact." : "Also include 2-3 thoughtful substitutions.";
    prompt = `You are a nutrition analyst. Given a food photo, extract structured nutrition info.
Respond ONLY as minified JSON with this exact shape and keys:
{
  "dish": string,
  "confidence": number between 0 and 1,
  "servingSize": string,
  "nutrients": {
    "calories": number,
    "protein_g": number,
    "carbohydrates_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number
  },
  "ingredients": string[],
  "instructions": string[],
  "insights": string
}

The "insights" field should contain:
1) Personalized Health Context: quantify how this food fits their goals with daily % estimate for calories/macros based on typical needs for: ${demographics}
2) Smart Substitution Suggestions: ${optimizeStr}

If uncertain, estimate reasonable values and keep the JSON valid.`;
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: includeInsights ? 2048 : 1024,
      responseMimeType: "application/json",
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Empty model response");

  // Parse JSON response (always JSON format now)
  const jsonStr = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const parsed = JSON.parse(jsonStr);
  
  // Extract insights if present
  const insights = parsed.insights;
  delete parsed.insights; // Remove insights from analysis object
  
  return { 
    analysis: parsed as AnalyzeResponse, 
    insights: insights || undefined 
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { ...corsHeaders } });
    
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    
    const { imageUrl, serving = 1, age, gender, activity, goal, optimize } = (await req.json()) as AnalyzeRequest;
    if (!imageUrl) return new Response(JSON.stringify({ error: "imageUrl required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check if user wants insights (has demographic data)
    const wantsInsights = !!(age || gender || activity || goal);
    let isPremium = false;
    let insightsParams: any = null;

    if (wantsInsights) {
      // Verify user is authenticated
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ ok: false, error: "unauthorized", upgrade: true }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check premium subscription (server-side gate)
      const { data: sub } = await supabaseAuth
        .from("platform_subscriptions")
        .select("subscription_type,is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      isPremium = sub && sub.subscription_type && sub.subscription_type !== "free";
      if (!isPremium) {
        // Still return analysis, but no insights
        const result = await callGemini(imageUrl, false);
        return new Response(
          JSON.stringify({ ok: true, serving, analysis: result.analysis, upgrade: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      insightsParams = { age, gender, activity, goal, optimize };
    }

    // Call Gemini with or without insights
    const result = await callGemini(imageUrl, wantsInsights && isPremium, insightsParams);

    // Return analysis and optional insights
    return new Response(
      JSON.stringify({ ok: true, serving, analysis: result.analysis, insights: result.insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("analyze-food error", e);
    console.error("Error stack:", e?.stack);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: String(e?.message || e),
        details: process.env.NODE_ENV === "development" ? String(e?.stack) : undefined
      }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


