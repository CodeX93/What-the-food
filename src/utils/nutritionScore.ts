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
}): number {
  if (!nutrients || !nutrients.calories || nutrients.calories <= 0) {
    return 0;
  }

  const calories = nutrients.calories;
  const protein = nutrients.protein_g || 0;
  const carbs = nutrients.carbohydrates_g || 0;
  const fat = nutrients.fat_g || 0;
  const fiber = nutrients.fiber_g || 0;
  const sugar = nutrients.sugar_g || 0;

  // SPECIAL CASE: Very low-calorie, nutrient-dense foods (leafy greens, vegetables)
  // These should score high (75-95) regardless of macro ratios
  if (calories < 50 && fiber > 0 && sugar < 5) {
    // Check if it's a vegetable/leafy green pattern
    const isLowCalorieVegetable = calories < 30 && (fiber > 0.3 || protein > 1);
    if (isLowCalorieVegetable) {
      // Base score for nutrient density
      let vegScore = 75;
      
      // Bonus for high fiber relative to calories
      const fiberPer100Cal = (fiber * 4) / calories;
      if (fiberPer100Cal > 2) vegScore += 10;
      else if (fiberPer100Cal > 1) vegScore += 5;
      
      // Bonus for protein relative to calories
      const proteinPer100Cal = (protein * 4) / calories;
      if (proteinPer100Cal > 1) vegScore += 5;
      
      // Bonus for very low sugar
      if (sugar < 1) vegScore += 5;
      
      // Watercress and similar superfoods get extra points
      if (calories < 15 && fiber > 0.4) vegScore += 5;
      
      return Math.min(95, Math.max(75, Math.round(vegScore)));
    }
  }

  // Calculate actual macro percentages (by calories)
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

  // Avoid division by zero
  if (totalMacroCalories === 0) {
    return 0;
  }

  const actualCarbsPercent = (carbsCalories / totalMacroCalories) * 100;
  const actualProteinPercent = (proteinCalories / totalMacroCalories) * 100;
  const actualFatPercent = (fatCalories / totalMacroCalories) * 100;

  // Ideal ratios: 40% carbs, 30% protein, 30% fat
  const idealCarbs = 40;
  const idealProtein = 30;
  const idealFat = 30;

  let score = 0;

  // Macro distribution score (0-60 points)
  // Calculate how close each macro is to ideal (max 20 points each)
  const carbsDeviation = Math.abs(actualCarbsPercent - idealCarbs);
  const proteinDeviation = Math.abs(actualProteinPercent - idealProtein);
  const fatDeviation = Math.abs(actualFatPercent - idealFat);

  // Carbs score (0-20 points) - closer to 40% is better
  if (carbsDeviation <= 5) {
    score += 20; // Within 5% of ideal
  } else if (carbsDeviation <= 10) {
    score += 15; // Within 10% of ideal
  } else if (carbsDeviation <= 15) {
    score += 10; // Within 15% of ideal
  } else if (carbsDeviation <= 20) {
    score += 5; // Within 20% of ideal
  } else {
    score += 2; // Far from ideal
  }

  // Protein score (0-20 points) - closer to 30% is better
  if (proteinDeviation <= 5) {
    score += 20;
  } else if (proteinDeviation <= 10) {
    score += 15;
  } else if (proteinDeviation <= 15) {
    score += 10;
  } else if (proteinDeviation <= 20) {
    score += 5;
  } else {
    score += 2;
  }

  // Fat score (0-20 points) - closer to 30% is better
  if (fatDeviation <= 5) {
    score += 20;
  } else if (fatDeviation <= 10) {
    score += 15;
  } else if (fatDeviation <= 15) {
    score += 10;
  } else if (fatDeviation <= 20) {
    score += 5;
  } else {
    score += 2;
  }

  // Fiber quality score (0-15 points)
  // Ideal: 3-5g per 100 calories (0.75-1.25g per 100 cal)
  const fiberPer100Cal = (fiber * 4) / calories;
  if (fiberPer100Cal >= 0.75 && fiberPer100Cal <= 1.25) {
    score += 15;
  } else if (fiberPer100Cal >= 0.5 && fiberPer100Cal < 0.75) {
    score += 10;
  } else if (fiberPer100Cal > 1.25 && fiberPer100Cal <= 1.5) {
    score += 12;
  } else if (fiberPer100Cal > 0.25 && fiberPer100Cal < 0.5) {
    score += 5;
  } else {
    score += 2;
  }

  // Sugar quality score (0-15 points) - lower is better
  // Ideal: < 10% of calories from sugar
  const sugarCalories = sugar * 4;
  const sugarPercent = totalMacroCalories > 0 ? (sugarCalories / totalMacroCalories) * 100 : 0;
  if (sugarPercent < 5) {
    score += 15;
  } else if (sugarPercent < 10) {
    score += 12;
  } else if (sugarPercent < 15) {
    score += 8;
  } else if (sugarPercent < 20) {
    score += 5;
  } else {
    score += 2;
  }

  // Calorie density bonus (0-10 points)
  // Lower calorie density is generally better for nutrition
  if (calories < 200) {
    score += 10;
  } else if (calories < 300) {
    score += 8;
  } else if (calories < 400) {
    score += 6;
  } else if (calories < 500) {
    score += 4;
  } else {
    score += 2;
  }

  // Ensure score is between 0-100
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
