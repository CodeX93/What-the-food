/**
 * Calculates a nutrition score (0-100) based on macro distribution and nutrient quality
 * Uses the 40/30/30 ideal ratio (40% carbs, 30% protein, 30% fat) as the baseline
 * Higher score = better nutrition profile
 */
export function calculateNutritionScore(nutrients: {
  calories?: number | null;
  protein_g?: number | null;
  carbohydrates_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
}, ingredients: string[] = []): number {
  if (!nutrients || !nutrients.calories || nutrients.calories <= 0) {
    return 0;
  }

  const {
    calories
  } = nutrients;

  const protein = nutrients.protein_g || 0;
  const carbs = nutrients.carbohydrates_g || 0;
  const fat = nutrients.fat_g || 0;
  const fiber = nutrients.fiber_g || 0;
  const sugar = nutrients.sugar_g || 0;
  const sodium = nutrients.sodium_mg || 0;

  let score = 70; // Start with a neutral baseline 

  // --- MACRO QUALITY SCORING ---

  // 1. Protein Density (High protein is generally good)
  // Target: > 3g per 100 kcal is decent, > 8g is high
  const proteinPer100Cal = (protein * 4) / calories * 25; // approximated scaling
  if (proteinPer100Cal > 25) score += 15; // Very high protein
  else if (proteinPer100Cal > 15) score += 10;
  else if (proteinPer100Cal > 8) score += 5;
  else if (proteinPer100Cal < 2) score -= 5; // Very low protein

  // 2. Fiber Density (Fiber is critical for health)
  // Target: > 3g per 100g serving or substantial amount per calorie
  // Using per 100 kcal metric: > 3g/100kcal is excellent
  const fiberPer100Cal = (fiber * 100) / calories;
  if (fiberPer100Cal > 3) score += 15;
  else if (fiberPer100Cal > 1.5) score += 10;
  else if (fiberPer100Cal > 0.5) score += 5;
  else score -= 5; // Very low fiber

  // 3. Sugar Impact (Lower is better)
  // Penalize high sugar content relative to total calories
  const sugarCal = sugar * 4;
  const sugarPct = (sugarCal / calories) * 100;
  if (sugarPct > 40) score -= 20; // High sugar bomb
  else if (sugarPct > 20) score -= 10;
  else if (sugarPct > 10) score -= 5;
  else if (sugarPct < 5) score += 5; // Low sugar bonus

  // 4. Saturated Fat / Sodium indications (rough proxies if data missing, assumption based on fat/salt)
  // If sodium is available and high (> 800mg is a lot for a meal)
  if (sodium > 1000) score -= 15;
  else if (sodium > 600) score -= 5;


  // --- INGREDIENT QUALITY SCORING ---
  // Simple keyword matching for positives (whole foods) and negatives (processed)

  // Normalize ingredients
  const normalizedIngredients = ingredients.map(i => i.toLowerCase());

  const negativeKeywords = [
    "corn syrup", "high fructose", "hydrogenated", "partially hydrogenated",
    "artificial flavor", "artificial color", "red 40", "blue 1", "yellow 5", "yellow 6",
    "preservative", "sodium benzoate", "aspartame", "sucralose", "saccharin",
    "soybean oil", "palm oil", "msg", "monosodium glutamate", "carrageenan",
    "sugar", "added sugar", "dextrose", "maltodextrin"
  ];

  const positiveKeywords = [
    "whole grain", "whole wheat", "oats", "quinoa", "brown rice",
    "spinach", "kale", "broccoli", "cauliflower", "carrot", "vegetable",
    "fruit", "apple", "banana", "berry", "berries", "avocado",
    "olive oil", "extra virgin", "coconut oil", "nut", "almond", "walnut", "seed", "chia", "flax",
    "chicken breast", "turkey", "salmon", "tuna", "egg", "legume", "bean", "lentil", "chickpea",
    "yogurt", "kefir", "fermented"
  ];

  // Count matches (capped to prevent extreme skewing)
  let negativeCount = 0;
  let positiveCount = 0;

  normalizedIngredients.forEach(ing => {
    // Check negatives
    if (negativeKeywords.some(keyword => ing.includes(keyword))) {
      negativeCount++;
    }
    // Check positives
    if (positiveKeywords.some(keyword => ing.includes(keyword))) {
      positiveCount++;
    }
  });

  // Apply Ingredient Penalties/Bonuses
  score -= (negativeCount * 5); // -5 per bad ingredient
  score += (positiveCount * 4); // +4 per good ingredient

  // Cap modifier impact to avoid overriding nutrition completely
  // No strict cap logic needed here as 0-100 clamping handles the result, 
  // but logically we trust macros first, ingredients as quality modifiers.


  // --- CALORIE DENSITY / SPECIAL CASES ---

  // Low calorie vegetable bonus (retained concept from previous logic but simplified)
  if (calories < 100 && fiber > 1 && sugar < 5) {
    score += 15; // Healthy snack / veg bonus
  }

  // Ensure bounds
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get color class based on nutrition score
 * Red for low scores (0-40), Yellow for medium (41-70), Green for high (71-100)
 */
export function getNutritionScoreColor(score: number): string {
  if (score >= 70) {
    return "text-green-600 bg-green-50 border-green-200";
  } else if (score >= 50) {
    return "text-yellow-600 bg-yellow-50 border-yellow-200";
  } else if (score >= 30) {
    return "text-orange-600 bg-orange-50 border-orange-200";
  } else {
    return "text-red-600 bg-red-50 border-red-200";
  }
}

/**
 * Get progress bar color based on nutrition score
 */
export function getNutritionScoreBarColor(score: number): string {
  if (score >= 70) {
    return "bg-green-500";
  } else if (score >= 50) {
    return "bg-yellow-500";
  } else if (score >= 30) {
    return "bg-orange-500";
  } else {
    return "bg-red-500";
  }
}
