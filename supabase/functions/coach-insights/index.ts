// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash-exp"; // Fast and capable enough for text generation

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Types (Mirrors frontend Insight) ---
// type InsightType = "warning" | "success" | "neutral" | "error";
// type InsightCategory = "macro_balance" | "timing" | "consistency" | "meal_pattern" | "general";

const INSIGHTS_SCHEMA = {
    type: "array",
    items: {
        type: "object",
        properties: {
            id: { type: "string" },
            title: { type: "string" },
            copy: { type: "string" }, // 1-2 sentences explaining the insight
            action: { type: "string" }, // Single specific action item
            type: { type: "string", enum: ["warning", "success", "neutral"] },
            category: { type: "string", enum: ["macro_balance", "timing", "consistency", "meal_pattern", "general"] },
            impactScore: { type: "number" } // 0-100, used for sorting
        },
        required: ["id", "title", "copy", "action", "type", "category", "impactScore"]
    }
};

async function callGeminiForInsights(context) {
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

    const prompt = `
    Role: You are an expert Nutrition Coach. Your goal is to analyze the user's recent food log and provide 3-4 specific, high-impact insights.
    
    User Profile:
    - Goal: ${context.goal || "Maintain Weight"}
    - Daily Calorie Target: ${context.targetCalories || 2000} kcal
    - Daily Protein Target: ${context.targetProtein || 150}g

    Recent Data (Last 7 Days):
    - Average Calories: ${Math.round(context.avgCalories)} per day
    - Average Protein: ${Math.round(context.avgProtein)}g per day
    - Calorie Variance (Consistency): ${context.consistencyScore}/100
    - Meal Pattern: ${context.mealPatternText || "No specific pattern detected"}
    
    Task:
    Generate a JSON array of insights. 
    1. The first insight should be the most important one (highest impactScore).
    2. Focus on "Big Wins" first: huge calorie deficits/surpluses, low protein, or great consistency.
    3. If the user is doing well, give them a "Success" insight.
    4. Be specific. Don't say "Eat better." Say "Your protein is low on weekends." or "Great job hitting your calorie target."
    5. "copy" should be short and conversational. "action" should be a direct command like "Add a protein shake."
    
    Return pure JSON complying with this schema:
    [{ "id": "unique_id", "title": "...", "copy": "...", "action": "...", "type": "warning|success|neutral", "category": "...", "impactScore": 85 }]
  `;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
            responseSchema: INSIGHTS_SCHEMA
        }
    };

    const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }
    );

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Gemini Error ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) throw new Error("Empty response from AI");

    // Parse JSON (handle markdown code fences if any, though responseMimeType should prevent it)
    const jsonStr = textResponse.replace(/^```json\s*|```$/g, "").trim();
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        return JSON.parse(jsonrepair(jsonStr));
    }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        // Expected body: { goal, targetCalories, targetProtein, avgCalories, avgProtein, consistencyScore, mealPatternText, ... }

        console.log("Analyzing for:", body.goal);

        const insights = await callGeminiForInsights(body);

        return new Response(JSON.stringify({ insights }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("Coach Error:", err);
        return new Response(JSON.stringify({ error: err.message, insights: [] }), {
            status: 200, // Return 200 with empty array to verify frontend doesn't crash
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
