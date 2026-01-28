// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash"; // Fast and capable enough for text generation

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Types (Mirrors frontend Insight) ---
// type InsightType = "warning" | "success" | "neutral" | "error";
// type InsightCategory = "macro_balance" | "timing" | "consistency" | "meal_pattern" | "general";

const INSIGHTS_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        insights: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    copy: { type: "string" },
                    action: { type: "string" },
                    type: { type: "string", enum: ["warning", "success", "neutral"] },
                    category: { type: "string", enum: ["macro_balance", "timing", "consistency", "meal_pattern", "general"] },
                    impactScore: { type: "number" }
                },
                required: ["id", "title", "copy", "action", "type", "category", "impactScore"]
            }
        },
        goalProgress: {
            type: "object",
            properties: {
                status: { type: "string", enum: ["on_track", "off_track", "warning"] },
                message: { type: "string" }, // e.g. "Averaging +220 kcal/day above target"
                prognosticText: { type: "string" }, // e.g. "At this pace, progress will stall."
                macroAdherencePercent: { type: "number" } // 0-100
            },
            required: ["status", "message", "prognosticText", "macroAdherencePercent"]
        },
        eatingPatterns: {
            type: "object",
            properties: {
                repeatedMeals: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            frequency: { type: "string" }, // e.g. "3x this week"
                            insight: { type: "string" }
                        },
                        required: ["name", "frequency", "insight"]
                    }
                },
                calorieDenseMeals: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            calories: { type: "number" },
                            insight: { type: "string" }
                        },
                        required: ["name", "calories", "insight"]
                    }
                },
                triggerInsights: {
                    type: "array",
                    items: { type: "string" } // e.g. "Meals with creamy sauces push you over calories 70% of the time."
                }
            },
            required: ["repeatedMeals", "calorieDenseMeals", "triggerInsights"]
        },
        nextBestActions: {
            type: "array",
            items: { type: "string" } // e.g. ["Add 20–30g protein to lunch", "Reduce late-night calories"]
        }
    },
    required: ["insights", "goalProgress", "eatingPatterns", "nextBestActions"]
};

async function callGeminiForInsights(context) {
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

    const prompt = `
    Role: You are an expert Nutrition Coach. Your goal is to analyze the user's recent food log and provide 3-4 specific insights, a goal progress assessment, eating pattern analysis, AND 3 specific next best actions.
    
    User Profile:
    - Goal: ${context.goal || "Maintain Weight"}
    - Daily Target: ${context.targetCalories || 2000} kcal, ${context.targetProtein || 150}g Protein, ${context.targetCarbs || 200}g Carbs, ${context.targetFat || 70}g Fat

    Recent Data (Last 7 Days):
    - Average Intake: ${Math.round(context.avgCalories)} kcal, ${Math.round(context.avgProtein)}g Protein, ${Math.round(context.avgCarbs || 0)}g Carbs, ${Math.round(context.avgFat || 0)}g Fat
    - Calorie Variance (Consistency): ${context.consistencyScore}/100
    - Meal History Summary: ${context.mealSummaryText || "No data"}
    
    Task 1: Generate a JSON array of insights. Focus on "Big Wins".
    
    Task 2: Generate a "goalProgress" object with status, message, prognosticText, and macroAdherencePercent.
    
    Task 3: Generate an "eatingPatterns" object with repeatedMeals, calorieDenseMeals, and triggerInsights (behavioral lessons).
    
    Task 4: Generate a "nextBestActions" array of 3 specific, actionable tips.
    Examples: "Add 20–30g protein to lunch", "Reduce late-night calories", "Try rotating one new meal this week".
    
    Return pure JSON matching the response schema.
  `;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            responseMimeType: "application/json",
            responseSchema: INSIGHTS_RESPONSE_SCHEMA
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

        const result = await callGeminiForInsights(body);

        return new Response(JSON.stringify(result), {
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
