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

    // Calculate daily calorie target based on user profile
    const calculateDailyCalorieTarget = () => {
      if (!profile.weight_kg || !profile.height_cm) {
        return null;
      }

      const weight = profile.weight_kg;
      const height = profile.height_cm;
      const age = profile.age || 30;
      const gender = profile.gender || "male";
      const activityLevel = profile.activity_level || "moderate";

      // Map activity levels
      const activityMap: Record<string, string> = {
        "lightly_active": "light",
        "moderately_active": "moderate",
        "very_active": "active",
        "extremely_active": "very_active",
      };
      const normalizedActivity = activityMap[activityLevel] || activityLevel;

      // Calculate BMR using Mifflin-St Jeor Equation
      let bmr: number;
      if (gender.toLowerCase() === "female") {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      }

      // Activity multipliers
      const activityMultipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        light_active: 1.375,
        moderate: 1.55,
        moderately_active: 1.55,
        active: 1.725,
        very_active: 1.9,
        extremely_active: 1.9,
      };

      const multiplier = activityMultipliers[normalizedActivity] || 1.55;
      let tdee = bmr * multiplier;

      // Determine goal from endGoal or profile goal
      const goal = goalDetails.endGoal || profile.goal || "maintain_weight";

      // Adjust for goal
      if (goal === "lose_weight" || goal === "weight_loss") {
        // Calculate deficit based on timeframe and target weight
        if (goalDetails.targetWeight && goalDetails.timeframeWeeks && profile.weight_kg) {
          const weightToLose = profile.weight_kg - goalDetails.targetWeight;
          const weeklyDeficit = weightToLose / goalDetails.timeframeWeeks;
          // 1 kg = ~7700 calories, so weekly deficit needed
          const weeklyCalorieDeficit = weeklyDeficit * 7700;
          const dailyDeficit = weeklyCalorieDeficit / 7;
          tdee = tdee - dailyDeficit;
          // Ensure minimum 1200 calories for safety
          tdee = Math.max(tdee, 1200);
        } else {
          tdee = tdee * 0.85; // 15% deficit
        }
      } else if (goal === "gain_weight" || goal === "weight_gain") {
        if (goalDetails.targetWeight && goalDetails.timeframeWeeks && profile.weight_kg) {
          const weightToGain = goalDetails.targetWeight - profile.weight_kg;
          const weeklySurplus = weightToGain / goalDetails.timeframeWeeks;
          const weeklyCalorieSurplus = weeklySurplus * 7700;
          const dailySurplus = weeklyCalorieSurplus / 7;
          tdee = tdee + dailySurplus;
        } else {
          tdee = tdee * 1.15; // 15% surplus
        }
      } else if (goal === "build_muscle") {
        tdee = tdee * 1.10; // 10% surplus for muscle building
      }

      return Math.round(tdee);
    };

    const calculatedCalorieTarget = calculateDailyCalorieTarget();

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

1. **Overview**: Provide a ONE-LINE summary (single sentence, maximum 150 characters) that concisely describes the meal plan's purpose and goal. This will be used as the main heading. Example: "This comprehensive meal plan is designed to help you lose weight gradually and sustainably over 52 weeks, aiming for a target weight of 75 kg from your current weight of 88 kg."

2. **Daily Calorie Rationale**: Provide a detailed description that includes:
   - How the plan aligns with the user's goals and timeframe
   - The comprehensive explanation of the meal plan approach
   - Dietary strategy and approach
   - Any other relevant context about the plan
   This will be used as the description paragraph below the heading.

3. **Daily Calorie Target**: ${calculatedCalorieTarget ? `The daily calorie target is EXACTLY ${calculatedCalorieTarget} calories per day.` : "Calculate and specify the daily calorie target based on the user's profile, goal, and activity level."} This target MUST be used for ALL days in the meal plan. The rationale for the calorie target should be included in the "Daily Calorie Rationale" field above.

3. **Macro Distribution**: Provide recommended daily targets for:
   - Protein (grams)
   - Carbohydrates (grams)
   - Fats (grams)
   - Fiber (grams)
   Explain why these ratios are optimal for the user's goal.

4. **Weekly Meal Plan**: CRITICAL - Provide a COMPLETE meal plan covering ${planDuration} days. ${planDuration === 7 ? "For a 7-day plan, cover ALL days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday. DO NOT skip weekends." : `For a ${planDuration}-day plan, provide meals for each day sequentially (Day 1, Day 2, etc.).`} Each day must include:
   - Breakfast (with specific foods, quantities in grams/ml, and estimated calories)
   ${preferences?.includeSnacks ? "- Morning Snack (between breakfast and lunch, with quantities and calories)" : ""}
   - Lunch (with specific foods, quantities in grams/ml, and estimated calories)
   ${preferences?.includeSnacks ? "- Afternoon Snack (between lunch and dinner, with quantities and calories)" : ""}
   - Dinner (with specific foods, quantities in grams/ml, and estimated calories)
   ${preferences?.includeSnacks ? "- Evening Snack (optional, only if needed to reach daily calorie target, with quantities and calories)" : ""}
   
   **CRITICAL MEAL ORDERING**: ${preferences?.includeSnacks ? "When snacks are included, they MUST be placed BETWEEN meals throughout the day, NOT at the end. The order should be: Breakfast → Morning Snack → Lunch → Afternoon Snack → Dinner → (Evening Snack if needed). This ensures snacks are distributed throughout the day to maintain energy levels and prevent overeating at main meals." : "Meals should be ordered: Breakfast → Lunch → Dinner."}
   
   Each meal should include variety and be practical to prepare. You MUST provide meals for all ${planDuration} days.
   IMPORTANT: The meal plan must align with the specified diet type (${preferences?.dietType ? dietTypeLabels[preferences.dietType] || preferences.dietType : "balanced"}) and respect all dietary restrictions and allergies.
   
   **CRITICAL CALORIE ACCURACY REQUIREMENT**: 
   - For EACH day, the SUM of ALL meal calories (breakfast + lunch + dinner${preferences?.includeSnacks ? " + snacks" : ""}) MUST EXACTLY equal the dailyCalorieTarget${calculatedCalorieTarget ? ` (${calculatedCalorieTarget} calories)` : ""}.
   - Calculate each food item's calories accurately based on standard nutritional values (use USDA database values when possible).
   - Sum all food calories within each meal to get the meal's totalCalories.
   - Sum all meal totalCalories for each day to ensure it equals the dailyCalorieTarget EXACTLY.
   - If the daily total is off, adjust food quantities proportionally or add/remove items to match the target EXACTLY.
   - Double-check your math: daily total = Σ(breakfast calories + lunch calories + dinner calories${preferences?.includeSnacks ? " + snack calories" : ""}) = dailyCalorieTarget.
   - This is MANDATORY - each day's total must be within ±2 calories of the target (ideally exact).
   - Example: If target is ${calculatedCalorieTarget || 1800} calories and you have breakfast=500, lunch=600, dinner=500${preferences?.includeSnacks ? ", snack=200" : ""}, the total is ${calculatedCalorieTarget ? calculatedCalorieTarget - 200 : 1600} - you need to add ${calculatedCalorieTarget ? 200 : 200} more calories by increasing quantities or adding items.

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
- **MACROS ARE MANDATORY**: Every meal MUST include complete macros (protein_g, carbohydrates_g, fat_g). These values MUST be positive numbers (never 0, null, or empty). Calculate macros accurately based on the foods in each meal. Use standard nutritional values: protein and carbs = 4 calories per gram, fat = 9 calories per gram.
- **Exercise Plan is MANDATORY**: The exercisePlan object MUST be included with all required fields (types, frequency, duration, intensity, specificExercises, weeklySchedule).
- **Tips & Considerations is MANDATORY**: The tips array MUST be included with at least 5-8 practical tips.
- **NO MANUAL ADJUSTMENT NOTES**: Do NOT include any notes, suggestions, or instructions telling users to manually adjust calories or quantities. The plan must be complete and ready to use as-is, meeting all calorie and macro targets exactly.
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
  "overview": "string (ONE LINE ONLY - single sentence, max 150 characters, concise summary for heading)",
  "dailyCalorieTarget": number,
  "dailyCalorieRationale": "string (DETAILED DESCRIPTION - comprehensive explanation of the plan, goals alignment, dietary strategy, and calorie target rationale. This will be displayed as the description paragraph)",
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
            "protein_g": number (REQUIRED - must be a positive number, never 0 or empty),
            "carbohydrates_g": number (REQUIRED - must be a positive number, never 0 or empty),
            "fat_g": number (REQUIRED - must be a positive number, never 0 or empty)
          }
        }${preferences?.includeSnacks ? `,
        {
          "type": "snack",
          "name": "Morning Snack",
          "foods": [...],
          "totalCalories": number,
          "macros": {...}
        }` : ""},
        {
          "type": "lunch",
          "name": "string",
          "foods": [...],
          "totalCalories": number,
          "macros": {...}
        }${preferences?.includeSnacks ? `,
        {
          "type": "snack",
          "name": "Afternoon Snack",
          "foods": [...],
          "totalCalories": number,
          "macros": {...}
        }` : ""},
        {
          "type": "dinner",
          "name": "string",
          "foods": [...],
          "totalCalories": number,
          "macros": {...}
        }${preferences?.includeSnacks ? `,
        {
          "type": "snack",
          "name": "Evening Snack (if needed)",
          "foods": [...],
          "totalCalories": number,
          "macros": {...}
        }` : ""}
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

    const GEMINI_MODEL = "gemini-2.0-flash";
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
      const targetCal = mealPlan.dailyCalorieTarget || calculatedCalorieTarget || 2000;
      const numMeals = preferences?.includeSnacks ? 5 : 3; // breakfast, lunch, dinner + 2 snacks if included
      const mealCalories = Math.round(targetCal / numMeals);

      // Calculate macros for each meal type (30% protein, 40% carbs, 30% fat)
      const calculateMealMacros = (calories: number) => {
        return {
          protein_g: Math.max(1, Math.round((calories * 0.30) / 4)),
          carbohydrates_g: Math.max(1, Math.round((calories * 0.40) / 4)),
          fat_g: Math.max(1, Math.round((calories * 0.30) / 9)),
        };
      };

      const breakfastCal = Math.round(mealCalories * 1.1); // Slightly more for breakfast
      const lunchCal = Math.round(mealCalories * 1.2); // More for lunch
      const dinnerCal = Math.round(mealCalories * 1.1); // Slightly more for dinner
      const snackCal = Math.round(mealCalories * 0.6); // Less for snacks

      const baseMeals = [
        {
          type: "breakfast",
          name: `Repeat a protein-rich breakfast for ${day}`,
          foods: [
            {
              name: "Use your favorite weekday breakfast or prep overnight oats with fruit and nuts",
              quantity: "1 serving",
              calories: breakfastCal,
            },
          ],
          totalCalories: breakfastCal,
          macros: calculateMealMacros(breakfastCal),
        },
      ];

      if (preferences?.includeSnacks) {
        baseMeals.push({
          type: "snack",
          name: `Morning Snack for ${day}`,
          foods: [
            {
              name: "Greek yogurt with berries, handful of nuts, smoothie, or protein bar",
              quantity: "1 snack",
              calories: snackCal,
            },
          ],
          totalCalories: snackCal,
          macros: calculateMealMacros(snackCal),
        });
      }

      baseMeals.push({
        type: "lunch",
        name: `Balanced lunch suggestion for ${day}`,
        foods: [
          {
            name: "Combine lean protein, complex carbs, and colorful veggies (e.g., grilled chicken, quinoa, roasted veggies)",
            quantity: "1 plate",
            calories: lunchCal,
          },
        ],
        totalCalories: lunchCal,
        macros: calculateMealMacros(lunchCal),
      });

      if (preferences?.includeSnacks) {
        baseMeals.push({
          type: "snack",
          name: `Afternoon Snack for ${day}`,
          foods: [
            {
              name: "Apple with almond butter, vegetable sticks with hummus, or a small protein smoothie",
              quantity: "1 snack",
              calories: snackCal,
            },
          ],
          totalCalories: snackCal,
          macros: calculateMealMacros(snackCal),
        });
      }

      baseMeals.push({
        type: "dinner",
        name: `Smart dinner guidance for ${day}`,
        foods: [
          {
            name: "Mirror a previous dinner or try salmon, sweet potato, steamed greens, and healthy fats (e.g., olive oil)",
            quantity: "1 plate",
            calories: dinnerCal,
          },
        ],
        totalCalories: dinnerCal,
        macros: calculateMealMacros(dinnerCal),
      });

      return {
        day,
        meals: baseMeals,
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

    // Sort meals in correct order: breakfast → morning snack → lunch → afternoon snack → dinner → evening snack
    const mealOrder = ["breakfast", "snack", "lunch", "dinner"];
    const sortMeals = (meals: any[]) => {
      if (!meals || !Array.isArray(meals)) return meals;

      // Separate snacks by position (we'll determine this by checking meal names or order)
      const breakfast = meals.find(m => m.type === "breakfast");
      const lunch = meals.find(m => m.type === "lunch");
      const dinner = meals.find(m => m.type === "dinner");
      const snacks = meals.filter(m => m.type === "snack");

      // Determine snack positions based on meal names or order
      const morningSnacks: any[] = [];
      const afternoonSnacks: any[] = [];
      const eveningSnacks: any[] = [];

      for (const snack of snacks) {
        const name = (snack.name || "").toLowerCase();
        if (name.includes("morning") || name.includes("mid-morning") || name.includes("am")) {
          morningSnacks.push(snack);
        } else if (name.includes("afternoon") || name.includes("mid-afternoon") || name.includes("pm") && !name.includes("evening")) {
          afternoonSnacks.push(snack);
        } else if (name.includes("evening") || name.includes("night") || name.includes("late")) {
          eveningSnacks.push(snack);
        } else {
          // If no clear indicator, distribute evenly
          if (snacks.length === 1) {
            afternoonSnacks.push(snack);
          } else if (snacks.length === 2) {
            if (snacks.indexOf(snack) === 0) {
              morningSnacks.push(snack);
            } else {
              afternoonSnacks.push(snack);
            }
          } else {
            const index = snacks.indexOf(snack);
            if (index === 0) morningSnacks.push(snack);
            else if (index === 1) afternoonSnacks.push(snack);
            else eveningSnacks.push(snack);
          }
        }
      }

      // Build ordered array
      const ordered: any[] = [];
      if (breakfast) ordered.push(breakfast);
      if (morningSnacks.length > 0) ordered.push(...morningSnacks);
      if (lunch) ordered.push(lunch);
      if (afternoonSnacks.length > 0) ordered.push(...afternoonSnacks);
      if (dinner) ordered.push(dinner);
      if (eveningSnacks.length > 0) ordered.push(...eveningSnacks);

      // Add any remaining meals that weren't categorized
      const remaining = meals.filter(m =>
        !ordered.includes(m) &&
        m.type !== "breakfast" &&
        m.type !== "lunch" &&
        m.type !== "dinner" &&
        m.type !== "snack"
      );
      if (remaining.length > 0) ordered.push(...remaining);

      return ordered;
    };

    // Sort meals for each day
    for (const dayPlan of mealPlan.weeklyMealPlan) {
      if (dayPlan.meals && Array.isArray(dayPlan.meals)) {
        dayPlan.meals = sortMeals(dayPlan.meals);
      }
    }

    // Validate and fix calorie totals to match daily target
    const targetCalories = mealPlan.dailyCalorieTarget || calculatedCalorieTarget;
    if (targetCalories && mealPlan.weeklyMealPlan) {
      for (const dayPlan of mealPlan.weeklyMealPlan) {
        if (!dayPlan.meals || !Array.isArray(dayPlan.meals)) continue;

        // Calculate actual total calories for the day
        let dayTotal = 0;
        for (const meal of dayPlan.meals) {
          if (meal.foods && Array.isArray(meal.foods)) {
            const mealTotal = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
            meal.totalCalories = mealTotal;
            dayTotal += mealTotal;
          } else if (meal.totalCalories) {
            dayTotal += meal.totalCalories;
          }
        }

        // Ensure all meals have complete macros (NEVER zero) - do this BEFORE calorie adjustment
        for (const meal of dayPlan.meals) {
          if (!meal.macros) {
            meal.macros = { protein_g: 0, carbohydrates_g: 0, fat_g: 0 };
          }

          // If any macro is zero, recalculate from calories
          if (meal.macros.protein_g === 0 || meal.macros.carbohydrates_g === 0 || meal.macros.fat_g === 0) {
            const mealCal = meal.totalCalories || 0;
            let estimatedCalories = mealCal;

            if (estimatedCalories === 0) {
              // Estimate calories based on meal type
              if (meal.type === "breakfast") estimatedCalories = Math.round(targetCalories * 0.25);
              else if (meal.type === "lunch") estimatedCalories = Math.round(targetCalories * 0.35);
              else if (meal.type === "dinner") estimatedCalories = Math.round(targetCalories * 0.30);
              else if (meal.type === "snack") estimatedCalories = Math.round(targetCalories * 0.10);
              else estimatedCalories = Math.round(targetCalories * 0.30);
            }

            // Standard ratios: 30% protein, 40% carbs, 30% fat
            meal.macros.protein_g = Math.max(1, Math.round((estimatedCalories * 0.30) / 4));
            meal.macros.carbohydrates_g = Math.max(1, Math.round((estimatedCalories * 0.40) / 4));
            meal.macros.fat_g = Math.max(1, Math.round((estimatedCalories * 0.30) / 9));

            // Update meal calories if it was 0
            if (meal.totalCalories === 0) {
              meal.totalCalories = estimatedCalories;
              if (meal.foods && Array.isArray(meal.foods) && meal.foods.length > 0) {
                meal.foods[0].calories = estimatedCalories;
              }
              // Recalculate day total
              dayTotal += estimatedCalories;
            }
          } else {
            // Ensure all macros are at least 1
            meal.macros.protein_g = Math.max(1, meal.macros.protein_g);
            meal.macros.carbohydrates_g = Math.max(1, meal.macros.carbohydrates_g);
            meal.macros.fat_g = Math.max(1, meal.macros.fat_g);
          }
        }

        // If there's a mismatch, adjust proportionally
        if (Math.abs(dayTotal - targetCalories) > 5) {
          const adjustmentFactor = targetCalories / (dayTotal || 1);

          for (const meal of dayPlan.meals) {
            if (meal.foods && Array.isArray(meal.foods)) {
              for (const food of meal.foods) {
                if (food.calories) {
                  food.calories = Math.round(food.calories * adjustmentFactor);
                }
              }
              // Recalculate meal total
              meal.totalCalories = meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
            } else if (meal.totalCalories) {
              meal.totalCalories = Math.round(meal.totalCalories * adjustmentFactor);
            }
          }

          // Verify final total
          let finalTotal = 0;
          for (const meal of dayPlan.meals) {
            if (meal.foods && Array.isArray(meal.foods)) {
              finalTotal += meal.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
            } else if (meal.totalCalories) {
              finalTotal += meal.totalCalories;
            }
          }

          // If still off, make a small adjustment to the largest meal
          if (Math.abs(finalTotal - targetCalories) > 2) {
            const diff = targetCalories - finalTotal;
            let largestMeal = null;
            let largestCalories = 0;

            for (const meal of dayPlan.meals) {
              const mealCal = meal.totalCalories || 0;
              if (mealCal > largestCalories) {
                largestCalories = mealCal;
                largestMeal = meal;
              }
            }

            if (largestMeal && largestMeal.foods && Array.isArray(largestMeal.foods) && largestMeal.foods.length > 0) {
              // Distribute the difference across the largest meal's foods
              const perFood = Math.round(diff / largestMeal.foods.length);
              for (const food of largestMeal.foods) {
                if (food.calories) {
                  food.calories = Math.max(1, food.calories + perFood);
                }
              }
              largestMeal.totalCalories = largestMeal.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
            } else if (largestMeal && largestMeal.totalCalories) {
              largestMeal.totalCalories = Math.max(1, largestMeal.totalCalories + diff);
            }
          }

          // After calorie adjustment, ensure macros are updated proportionally
          for (const meal of dayPlan.meals) {
            if (meal.totalCalories > 0) {
              // Recalculate macros based on updated calories (30% protein, 40% carbs, 30% fat)
              meal.macros.protein_g = Math.max(1, Math.round((meal.totalCalories * 0.30) / 4));
              meal.macros.carbohydrates_g = Math.max(1, Math.round((meal.totalCalories * 0.40) / 4));
              meal.macros.fat_g = Math.max(1, Math.round((meal.totalCalories * 0.30) / 9));
            }
          }
        }

        // Ensure ALL meals have complete macros (NEVER zero) - run for all days regardless of calorie match
        for (const meal of dayPlan.meals) {
          if (!meal.macros) {
            meal.macros = { protein_g: 0, carbohydrates_g: 0, fat_g: 0 };
          }

          // If any macro is zero, recalculate from calories
          if (meal.macros.protein_g === 0 || meal.macros.carbohydrates_g === 0 || meal.macros.fat_g === 0) {
            const mealCal = meal.totalCalories || 0;
            let estimatedCalories = mealCal;

            if (estimatedCalories === 0) {
              // Estimate calories based on meal type
              if (meal.type === "breakfast") estimatedCalories = Math.round(targetCalories * 0.25);
              else if (meal.type === "lunch") estimatedCalories = Math.round(targetCalories * 0.35);
              else if (meal.type === "dinner") estimatedCalories = Math.round(targetCalories * 0.30);
              else if (meal.type === "snack") estimatedCalories = Math.round(targetCalories * 0.10);
              else estimatedCalories = Math.round(targetCalories * 0.30);
            }

            // Standard ratios: 30% protein, 40% carbs, 30% fat
            meal.macros.protein_g = Math.max(1, Math.round((estimatedCalories * 0.30) / 4));
            meal.macros.carbohydrates_g = Math.max(1, Math.round((estimatedCalories * 0.40) / 4));
            meal.macros.fat_g = Math.max(1, Math.round((estimatedCalories * 0.30) / 9));

            // Update meal calories if it was 0
            if (meal.totalCalories === 0) {
              meal.totalCalories = estimatedCalories;
              if (meal.foods && Array.isArray(meal.foods) && meal.foods.length > 0) {
                meal.foods[0].calories = estimatedCalories;
              }
            }
          } else {
            // Ensure all macros are at least 1
            meal.macros.protein_g = Math.max(1, meal.macros.protein_g);
            meal.macros.carbohydrates_g = Math.max(1, meal.macros.carbohydrates_g);
            meal.macros.fat_g = Math.max(1, meal.macros.fat_g);
          }
        }
      }

      // Ensure dailyCalorieTarget is set correctly
      mealPlan.dailyCalorieTarget = targetCalories;
    }

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

