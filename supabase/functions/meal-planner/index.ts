// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MealPlannerRequest {
  profile: {
    age?: number;
    gender?: string;
    weight_kg?: number;
    height_cm?: number;
    goal?: string;
    activity_level?: string;
  };
  goalDetails: {
    endGoal?: string;
    targetWeight?: number;
    timeframeWeeks?: number;
    exercisePlan?: string;
    additionalNotes?: string;
  };
  preferences?: {
    dietType?: string;
    mealFrequency?: number;
    includeSnacks?: boolean;
    planDuration?: number;
    dietaryRestrictions?: string[];
    preferredExercises?: string[];
    exercisePlan?: string;
    otherTodos?: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const { profile, goalDetails, preferences } = await req.json().catch(() => ({}));

    if (!profile || !goalDetails) {
      return new Response(
        JSON.stringify({ ok: false, error: "Profile and goal details are required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Get auth token from headers (Supabase automatically includes it)
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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    // Calculate BMI if we have weight and height
    let bmi = null;
    let bmiCategory = "";
    if (profile.weight_kg && profile.height_cm) {
      bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
      if (bmi < 18.5) bmiCategory = "Underweight";
      else if (bmi < 25) bmiCategory = "Normal";
      else if (bmi < 30) bmiCategory = "Overweight";
      else bmiCategory = "Obese";
    }

    // Build comprehensive prompt for Gemini
    const endGoalLabels: Record<string, string> = {
      lose_weight: "Lose Weight",
      gain_weight: "Gain Weight",
      maintain_weight: "Maintain Weight",
      build_muscle: "Build Muscle",
      improve_fitness: "Improve Fitness",
    };

    const dietTypeLabels: Record<string, string> = {
      balanced: "Balanced",
      keto: "Ketogenic (Keto)",
      intermittent_fasting: "Intermittent Fasting",
      high_protein: "High Protein",
      high_carb: "High Carbohydrate",
      low_carb: "Low Carbohydrate",
      mediterranean: "Mediterranean",
      paleo: "Paleo",
      vegan: "Vegan",
      vegetarian: "Vegetarian",
      gluten_free: "Gluten-Free",
      dairy_free: "Dairy-Free",
      low_fodmap: "Low-FODMAP",
      pescatarian: "Pescatarian",
    };

    const planDuration = preferences?.planDuration || 7;
    const daysText = planDuration === 7 ? "7 days (1 week)" : `${planDuration} days`;

    const prompt = `You are an expert nutritionist and meal planning specialist. Create a comprehensive, personalized meal plan based on the following user profile and goals.

USER PROFILE:
- Age: ${profile.age || "Not specified"}
- Gender: ${profile.gender || "Not specified"}
- Current Weight: ${profile.weight_kg ? `${profile.weight_kg} kg` : "Not specified"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "Not specified"}
${bmi ? `- BMI: ${bmi.toFixed(1)} (${bmiCategory})` : ""}
- Activity Level: ${profile.activity_level || "Not specified"}
- Goal: ${goalDetails.endGoal ? endGoalLabels[goalDetails.endGoal] || goalDetails.endGoal : profile.goal || "Not specified"}

GOAL DETAILS:
- End Goal: ${goalDetails.endGoal ? endGoalLabels[goalDetails.endGoal] || goalDetails.endGoal : "Not specified"}
- Target Weight: ${goalDetails.targetWeight ? `${goalDetails.targetWeight} kg` : "Not specified"}
- Timeframe: ${goalDetails.timeframeWeeks ? `${goalDetails.timeframeWeeks} weeks` : "Not specified"}
${goalDetails.exercisePlan ? `- Exercise Plan: ${goalDetails.exercisePlan}` : ""}
${goalDetails.additionalNotes ? `- Additional Notes: ${goalDetails.additionalNotes}` : ""}

DIET PREFERENCES:
- Diet Type: ${preferences?.dietType ? dietTypeLabels[preferences.dietType] || preferences.dietType : "Not specified"}
- Meals per Day: ${preferences?.mealFrequency || 3}
- Include Snacks: ${preferences?.includeSnacks !== undefined ? (preferences.includeSnacks ? "Yes" : "No") : "Not specified"}
- Plan Duration: ${daysText}
${preferences?.preferredExercises?.length ? `- Preferred Exercises: ${preferences.preferredExercises.join(", ")}` : "- Preferred Exercises: Not specified"}
${preferences?.dietaryRestrictions?.length ? `- Dietary Restrictions/Allergies: ${preferences.dietaryRestrictions.join(", ")}` : "- Dietary Restrictions/Allergies: None specified"}
${preferences?.exercisePlan ? `- Exercise Plan Notes: ${preferences.exercisePlan}` : ""}
${preferences?.otherTodos?.length ? `- Other Todos: ${preferences.otherTodos.join(", ")}` : ""}

TASK:
Create a detailed, actionable meal plan that includes:

1. **Overview**: A brief summary of the plan, explaining how it aligns with the user's goals and timeframe.

2. **Daily Calorie Target**: Calculate and specify the daily calorie target based on the user's profile, goal, and activity level. Explain the rationale.

3. **Macro Distribution**: Provide recommended daily targets for:
   - Protein (grams)
   - Carbohydrates (grams)
   - Fats (grams)
   - Fiber (grams)
   Explain why these ratios are optimal for the user's goal.

4. **Weekly Meal Plan**: CRITICAL - Provide a COMPLETE meal plan covering ${planDuration} days. ${planDuration === 7 ? "For a 7-day plan, cover ALL days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday. DO NOT skip weekends." : `For a ${planDuration}-day plan, provide meals for each day sequentially (Day 1, Day 2, etc.).`} Each day must include:
   - Breakfast (with specific foods, quantities in grams/ml, and estimated calories)
   - Lunch (with specific foods, quantities in grams/ml, and estimated calories)
   - Dinner (with specific foods, quantities in grams/ml, and estimated calories)
   ${preferences?.includeSnacks ? "- Snacks (with quantities and calories)" : ""}
   Each meal should include variety and be practical to prepare. You MUST provide meals for all ${planDuration} days.
   IMPORTANT: The meal plan must align with the specified diet type (${preferences?.dietType ? dietTypeLabels[preferences.dietType] || preferences.dietType : "balanced"}) and respect all dietary restrictions and allergies.

5. **Exercise Plan** (MANDATORY): This section is REQUIRED and must be included. Based on the user's goal and activity level, provide a comprehensive exercise plan with:
   - Recommended exercise types (e.g., "Cardio", "Strength Training", "Yoga", "HIIT")
   - Frequency (e.g., "5 days per week", "3-4 times weekly")
   - Duration per session (e.g., "30-45 minutes", "45-60 minutes")
   - Intensity level (e.g., "Moderate", "High", "Low to Moderate")
   - Specific exercises or workout routines (list 5-10 specific exercises)
   - Weekly schedule (e.g., "Monday/Wednesday/Friday: Strength training, Tuesday/Thursday: Cardio, Saturday: Active recovery")

6. **Additional Action Items**: List other important todos or habits to support the goal, such as:
   - Hydration targets
   - Sleep recommendations
   - Meal timing tips
   - Supplement suggestions (if relevant)
   - Any other lifestyle modifications

7. **Tips & Considerations** (MANDATORY): This section is REQUIRED and must be included. Provide practical, actionable tips as an array of strings. Include tips for:
   - Meal prep strategies
   - Staying motivated
   - Handling setbacks
   - Adjusting the plan as needed
   - Shopping tips
   - Cooking tips
   - Time management
   - Provide at least 5-8 practical tips

CRITICAL REQUIREMENTS:
- **ALL DAYS REQUIRED**: The weeklyMealPlan array MUST contain exactly ${planDuration} entries, one for each day. ${planDuration === 7 ? "For 7-day plans, use day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday. DO NOT skip weekends." : `For ${planDuration}-day plans, use sequential day labels like "Day 1", "Day 2", etc.`}
- **DIET TYPE COMPLIANCE**: All meals MUST strictly follow the specified diet type (${preferences?.dietType ? dietTypeLabels[preferences.dietType] || preferences.dietType : "balanced"}). For example, if Keto is selected, meals must be high-fat and low-carb. If Intermittent Fasting is selected, adjust meal timing accordingly.
- **ALLERGY COMPLIANCE**: Absolutely NO foods from the allergy/restriction list should be included in any meal.
- **Exercise Plan is MANDATORY**: The exercisePlan object MUST be included with all required fields (types, frequency, duration, intensity, specificExercises, weeklySchedule).
- **Tips & Considerations is MANDATORY**: The tips array MUST be included with at least 5-8 practical tips.
- Be specific with food quantities (use grams, ml, cups, etc.)
- Ensure meals are balanced and nutritious
- Consider the user's dietary restrictions if provided
- Make the plan realistic and sustainable
- Provide variety to prevent boredom
- Include foods that are commonly available
- Consider the timeframe for the goal (be realistic about weight change rates)
- Make exercise recommendations appropriate for the user's current activity level

Format your response as a well-structured JSON object with the following structure:
{
  "overview": "string",
  "dailyCalorieTarget": number,
  "dailyCalorieRationale": "string",
  "macroDistribution": {
    "protein_g": number,
    "carbohydrates_g": number,
    "fat_g": number,
    "fiber_g": number,
    "rationale": "string"
  },
  "weeklyMealPlan": [
    {
      "day": "${planDuration === 7 ? "Monday" : "Day 1"}",
      "meals": [
        {
          "type": "breakfast",
          "name": "string",
          "foods": [
            {
              "name": "string",
              "quantity": "string (e.g., '200g', '1 cup', '2 eggs')",
              "calories": number
            }
          ],
          "totalCalories": number,
          "macros": {
            "protein_g": number,
            "carbohydrates_g": number,
            "fat_g": number
          }
        }
      ]
    }${planDuration > 1 ? (planDuration === 7 ? `,
    {
      "day": "Tuesday",
      "meals": [...]
    },
    {
      "day": "Wednesday",
      "meals": [...]
    },
    {
      "day": "Thursday",
      "meals": [...]
    },
    {
      "day": "Friday",
      "meals": [...]
    },
    {
      "day": "Saturday",
      "meals": [...]
    },
    {
      "day": "Sunday",
      "meals": [...]
    }` : `,
    ... (repeat for Day 2 through Day ${planDuration})`) : ""}
  ],
  "exercisePlan": {
    "types": ["string"], // MANDATORY: Array of exercise types (e.g., ["Cardio", "Strength Training", "Yoga"])
    "frequency": "string", // MANDATORY: How often (e.g., "5 days per week")
    "duration": "string", // MANDATORY: Time per session (e.g., "30-45 minutes")
    "intensity": "string", // MANDATORY: Intensity level (e.g., "Moderate", "High")
    "specificExercises": ["string"], // MANDATORY: List of 5-10 specific exercises
    "weeklySchedule": "string" // MANDATORY: Day-by-day breakdown (e.g., "Monday/Wednesday/Friday: Strength, Tuesday/Thursday: Cardio")
  },
  "actionItems": [
    {
      "category": "string (e.g., 'Hydration', 'Sleep', 'Meal Timing')",
      "item": "string",
      "details": "string"
    }
  ],
  "tips": ["string"] // MANDATORY: Array of at least 5-8 practical tips for meal prep, motivation, setbacks, adjustments, etc.
}

Return ONLY valid JSON. Do not include any markdown formatting or code blocks.`;

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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4000,
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
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    let mealPlan;
    try {
      mealPlan = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON parse error (first attempt):", parseError);
      console.error("Cleaned text (first 500 chars):", cleaned.substring(0, 500));
      // Try to repair malformed JSON
      try {
        const repaired = jsonrepair(cleaned);
        mealPlan = JSON.parse(repaired);
        console.log("Successfully repaired JSON");
      } catch (repairError) {
        console.error("JSON repair error:", repairError);
        // Try to extract JSON from the text if it's embedded
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = jsonrepair(jsonMatch[0]);
            mealPlan = JSON.parse(extracted);
            console.log("Successfully extracted and repaired JSON");
          } catch (extractError) {
            console.error("JSON extraction error:", extractError);
            console.error("Full cleaned text length:", cleaned.length);
            throw new Error("Failed to parse Gemini response as JSON. The response may be malformed.");
          }
        } else {
          throw new Error("Failed to parse Gemini response as JSON even after repair attempt");
        }
      }
    }

    // Validate and fix required fields with fallbacks
    if (!mealPlan.exercisePlan) {
      console.warn("Missing exercisePlan, creating default");
      mealPlan.exercisePlan = {
        types: ["Cardio", "Strength Training"],
        frequency: "3-4 days per week",
        duration: "30-45 minutes",
        intensity: "Moderate",
        specificExercises: ["Walking", "Bodyweight exercises", "Light weights"],
        weeklySchedule: "Monday/Wednesday/Friday: Strength training, Tuesday/Thursday: Cardio"
      };
    } else {
      // Ensure all required fields exist
      if (!mealPlan.exercisePlan.types || !Array.isArray(mealPlan.exercisePlan.types) || mealPlan.exercisePlan.types.length === 0) {
        mealPlan.exercisePlan.types = ["Cardio", "Strength Training"];
      }
      if (!mealPlan.exercisePlan.frequency) {
        mealPlan.exercisePlan.frequency = "3-4 days per week";
      }
      if (!mealPlan.exercisePlan.duration) {
        mealPlan.exercisePlan.duration = "30-45 minutes";
      }
      if (!mealPlan.exercisePlan.intensity) {
        mealPlan.exercisePlan.intensity = "Moderate";
      }
      if (!mealPlan.exercisePlan.specificExercises || !Array.isArray(mealPlan.exercisePlan.specificExercises) || mealPlan.exercisePlan.specificExercises.length === 0) {
        mealPlan.exercisePlan.specificExercises = ["Walking", "Bodyweight exercises", "Light weights"];
      }
      if (!mealPlan.exercisePlan.weeklySchedule) {
        mealPlan.exercisePlan.weeklySchedule = "Monday/Wednesday/Friday: Strength training, Tuesday/Thursday: Cardio";
      }
    }

    if (!mealPlan.tips || !Array.isArray(mealPlan.tips) || mealPlan.tips.length === 0) {
      console.warn("Missing tips, creating default");
      mealPlan.tips = [
        "Meal prep on weekends to save time during the week",
        "Stay hydrated throughout the day",
        "Track your progress weekly to stay motivated",
        "Adjust portion sizes based on your hunger levels",
        "Don't skip meals - consistency is key"
      ];
    }

    // Validate all days are present (auto-fill missing days with guidance)
    const requiredDays = planDuration === 7
      ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      : Array.from({ length: planDuration }, (_, i) => `Day ${i + 1}`);
    if (!mealPlan.weeklyMealPlan || !Array.isArray(mealPlan.weeklyMealPlan)) {
      console.error("Missing or invalid weeklyMealPlan");
      throw new Error("Weekly meal plan is required but was not generated. Please try again.");
    }

    const createPlaceholderDay = (day: string) => {
      const baseMeals = [
        {
          type: "breakfast",
          name: `Repeat a protein-rich breakfast for ${day}`,
          foods: [
            {
              name: "Use your favorite weekday breakfast or prep overnight oats with fruit and nuts",
              quantity: "1 serving",
              calories: 0,
            },
          ],
          totalCalories: 0,
          macros: { protein_g: 0, carbohydrates_g: 0, fat_g: 0 },
        },
        {
          type: "lunch",
          name: `Balanced lunch suggestion for ${day}`,
          foods: [
            {
              name: "Combine lean protein, complex carbs, and colorful veggies (e.g., grilled chicken, quinoa, roasted veggies)",
              quantity: "1 plate",
              calories: 0,
            },
          ],
          totalCalories: 0,
          macros: { protein_g: 0, carbohydrates_g: 0, fat_g: 0 },
        },
        {
          type: "dinner",
          name: `Smart dinner guidance for ${day}`,
          foods: [
            {
              name: "Mirror a previous dinner or try salmon, sweet potato, steamed greens, and healthy fats (e.g., olive oil)",
              quantity: "1 plate",
              calories: 0,
            },
          ],
          totalCalories: 0,
          macros: { protein_g: 0, carbohydrates_g: 0, fat_g: 0 },
        },
      ];

      if (preferences?.includeSnacks) {
        baseMeals.push({
          type: "snack",
          name: `Snack ideas for ${day}`,
          foods: [
            {
              name: "Greek yogurt with berries, handful of nuts, smoothie, or protein bar",
              quantity: "1 snack",
              calories: 0,
            },
          ],
          totalCalories: 0,
          macros: { protein_g: 0, carbohydrates_g: 0, fat_g: 0 },
        });
      }

      return {
        day,
        meals: baseMeals,
        note: "This placeholder balances protein, carbs, and healthy fats. Adjust calories to hit your daily target.",
      };
    };

    const dayMap = new Map<string, any>();
    for (const dayEntry of mealPlan.weeklyMealPlan) {
      if (dayEntry?.day) {
        dayMap.set(dayEntry.day, dayEntry);
      }
    }

    const normalizedPlan = requiredDays.map((day) => {
      if (dayMap.has(day)) return dayMap.get(day);
      console.warn(`Missing ${day} in meal plan. Generating placeholder guidance.`);
      return createPlaceholderDay(day);
    });

    mealPlan.weeklyMealPlan = normalizedPlan;

    return new Response(
      JSON.stringify({
        ok: true,
        mealPlan,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Meal planner error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Failed to generate meal plan",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

