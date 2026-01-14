import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp";

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { nutrients } = body;

    if (!nutrients || !nutrients.calories || nutrients.calories <= 0) {
      return NextResponse.json({ score: 0 });
    }

    const prompt = `You are a nutrition expert. Calculate a nutrition score (0-100) for a meal based on the following nutritional information.
        
Input Data (per meal):
Calories: ${nutrients.calories || 0}
Protein: ${nutrients.protein_g || 0}g
Carbohydrates: ${nutrients.carbohydrates_g || 0}g
Fat: ${nutrients.fat_g || 0}g
Fiber: ${nutrients.fiber_g || 0}g
Sugar: ${nutrients.sugar_g || 0}g

Scoring Criteria (apply contextually):
1. For low-calorie foods (<50 calories): Prioritize nutrient density. Leafy greens, vegetables, and nutrient-dense foods should score 70-100 even if they don't fit macro ratios. These foods are extremely healthy despite low macro counts.

2. For moderate-calorie foods (50-300 calories): Consider macro balance (ideal ~40% carbs, 30% protein, 30% fat by calories), but also factor in fiber, low sugar, and overall quality.

3. For higher-calorie foods (300+ calories): Strictly evaluate macro balance, fiber content (aim for 3-5g per 100 calories), sugar content (<10% of calories from sugar), and calorie density.

4. General principles:
   - High fiber relative to calories = bonus points
   - Low sugar relative to calories = bonus points
   - Nutrient-dense vegetables and leafy greens = high scores (70-100)
   - Processed foods with high sugar/fat and low fiber = low scores (0-40)
   - Balanced meals with good macro distribution = medium-high scores (50-80)

CRITICAL SCORING RULES FOR SPECIFIC FOODS:
- Watercress: MUST score 85-95. It's one of the most nutrient-dense foods on Earth despite low calories.
- Spinach, kale, arugula, lettuce: Score 80-95. These are extremely healthy leafy greens.
- Other vegetables (broccoli, carrots, bell peppers): Score 70-90 based on nutrient density.
- Low-calorie fruits (berries, citrus): Score 65-85.
- Processed foods, high-sugar items: Score 0-40.

The 40/30/30 macro ratio ONLY applies to complete meals (300+ calories), NOT to individual vegetables or low-calorie foods.

Return ONLY a JSON object with this exact structure. Ensure the JSON is valid and requires no cleaning.
{
  "score": <number between 0 and 100>,
  "reasoning": "<brief explanation in 1-2 sentences>"
}`;

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
          maxOutputTokens: 200,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
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

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      // Try to extract just the score if JSON parsing fails
      const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/);
      if (scoreMatch) {
        result = { score: parseInt(scoreMatch[1], 10) };
      } else {
        throw new Error("Failed to parse Gemini response");
      }
    }

    // Validate and clamp score
    let score = typeof result.score === "number" ? result.score : 0;
    score = Math.max(0, Math.min(100, Math.round(score)));

    return NextResponse.json({ score, reasoning: result.reasoning || null });
  } catch (error: any) {
    console.error("Error calculating nutrition score:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    // Return error but don't fail - client will use fallback
    return NextResponse.json(
      { error: "Failed to calculate nutrition score", score: null, details: error?.message },
      { status: 500 }
    );
  }
}
