// @ts-nocheck
// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash-exp";

const SYSTEM_PROMPT = `You are a nutrition assistant. Estimate macronutrients for each food entry provided by the user.

Return ONLY JSON matching this schema:
{
  "items": [
    {
      "name": string,            // short readable label e.g. "2 boiled eggs"
      "serving": string,         // optional human friendly serving detail
      "calories": number,        // kcal (integer or float)
      "protein_g": number,
      "carbohydrates_g": number,
      "fat_g": number,
      "weight_g": number,        // estimated weight in grams for this item
      "notes": string | null
    }
  ],
  "totals": {
    "calories": number,
    "protein_g": number,
    "carbohydrates_g": number,
    "fat_g": number,
    "weight_g": number          // total weight in grams (sum of all items)
  }
}

Rules:
- Adopt common US nutrition references (USDA, FDA labels) when possible.
- If quantity isn't specified, assume a typical single serving.
- Always provide positive numbers. Use decimals where helpful.
- weight_g should be the actual estimated weight in grams for the food item as specified (e.g., "1 banana" should estimate ~120g, "2 eggs" should estimate ~100g).
- totals.weight_g must equal the sum of all items' weight_g.
- totals must equal the sum of the items (rounded to one decimal place).
- Do not include any extra commentary or markdown, only the JSON.`;

async function callGemini(foods: string[]): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const foodList = foods.map((food, idx) => `${idx + 1}. ${food}`).join("\n");
  const prompt = `${SYSTEM_PROMPT}\n\nFoods:\n${foodList}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 800,
      topP: 0.9,
      topK: 40,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part?.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function sanitizeItems(rawItems: any[]): any[] {
  return rawItems
    .map((item) => ({
      name: String(item?.name ?? "").slice(0, 120) || "Unknown item",
      serving: item?.serving ? String(item.serving).slice(0, 160) : null,
      calories: Math.max(0, Math.round(normalizeNumber(item?.calories))),
      protein_g: Number(normalizeNumber(item?.protein_g).toFixed(1)),
      carbohydrates_g: Number(normalizeNumber(item?.carbohydrates_g).toFixed(1)),
      fat_g: Number(normalizeNumber(item?.fat_g).toFixed(1)),
      weight_g: Math.max(0, Math.round(normalizeNumber(item?.weight_g))),
      notes: item?.notes ? String(item.notes).slice(0, 160) : null,
    }))
    .filter((item) => item.name && (item.calories > 0 || item.protein_g > 0 || item.carbohydrates_g > 0 || item.fat_g > 0));
}

function computeTotals(items: any[]) {
  const totals = items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein_g += item.protein_g;
      acc.carbohydrates_g += item.carbohydrates_g;
      acc.fat_g += item.fat_g;
      acc.weight_g += item.weight_g || 0;
      return acc;
    },
    { calories: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, weight_g: 0 },
  );

  // If Gemini didn't provide weight_g, try to use it from parsed totals
  const parsedWeight = totals.weight_g > 0 ? totals.weight_g : null;

  return {
    calories: Math.round(totals.calories),
    protein_g: Number(totals.protein_g.toFixed(1)),
    carbohydrates_g: Number(totals.carbohydrates_g.toFixed(1)),
    fat_g: Number(totals.fat_g.toFixed(1)),
    weight_g: parsedWeight ? Math.round(parsedWeight) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { foods } = await req.json().catch(() => ({}));
    if (!Array.isArray(foods) || foods.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Provide an array of foods." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = await callGemini(foods);
    const items = sanitizeItems(Array.isArray(parsed?.items) ? parsed.items : []);

    if (!items.length) {
      throw new Error("Unable to parse items from Gemini response.");
    }

    const computedTotals = computeTotals(items);
    // Use weight_g from parsed totals if available, otherwise use computed
    const totals = {
      ...computedTotals,
      weight_g: parsed?.totals?.weight_g ? Math.round(normalizeNumber(parsed.totals.weight_g)) : computedTotals.weight_g,
    };

    return new Response(
      JSON.stringify({ ok: true, items, totals }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("manual-food error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || "Failed to process foods" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

