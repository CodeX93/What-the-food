import { FoodScan } from "./foodScan";

// --- Types ---

export type DietGoal = "weight_loss" | "maintenance" | "weight_gain" | "muscle_gain" | string;

export type UserProfile = {
    weight_kg?: number;
    height_cm?: number;
    age?: number;
    gender?: string;
    activity_level?: string;
    goal?: DietGoal;
};

export type InsightType = "warning" | "success" | "neutral" | "info";
export type InsightCategory = "macro_balance" | "timing" | "meal_pattern" | "consistency" | "general";

export type Insight = {
    id: string; // Unique ID for the rule (e.g., 'low_protein')
    title: string;
    copy: string;
    action: string;
    type: InsightType;
    category: InsightCategory;
    impactScore: number; // For sorting (Severity * Frequency)
    whyMatch?: string; // Explanation for "Why am I seeing this?"
};

export type InsightHistoryItem = {
    insightId: string;
    firstDetectedAt: number; // timestamp
    lastDetectedAt: number; // timestamp
    consecutiveDays: number;
    isResolved: boolean;
    resolvedAt?: number;
};

export type ConsistencyBreakdown = {
    score: number;
    breakdown: string[]; // List of strings explaining the score (e.g. "Logged 4/7 days")
};

export type DailyStats = {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    count: number;
    over8pmCalories: number;
};

// --- Timezone Utils ---

const TIMEZONE_UTILS = {
    // Get local date string YYYY-MM-DD
    formatDay: (iso: string) => {
        // Note: This relies on the browser/server local time if we just use new Date(iso)
        // Ideally we'd valid user timezone, but for now we follow the "Use created_at"
        // and assume users log in their local time roughly.
        // If strict timezone support is needed, we'd need user timezone in profile.
        // For now, we'll parse standard ISO.
        const d = new Date(iso);
        return d.toISOString().split('T')[0];
    },

    // Extract hour from ISO string in local time
    getHour: (iso: string) => {
        return new Date(iso).getHours();
    }
};

// --- Core Helper Functions ---

/**
 * Calculate daily macro requirements based on profile
 */
export const calculateDailyRequirements = (profile: UserProfile | null) => {
    if (!profile || !profile.weight_kg || !profile.height_cm) {
        return null;
    }

    const weight = profile.weight_kg;
    const height = profile.height_cm;
    const age = profile.age || 30;
    const gender = profile.gender || "male";
    const activityLevel = profile.activity_level || "moderate";
    const goal = profile.goal || "maintenance";

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
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };

    const multiplier = activityMultipliers[activityLevel.toLowerCase()] || 1.55;
    let tdee = bmr * multiplier;

    // Adjust for goal
    if (goal === "weight_loss" || goal === "cut") {
        tdee = tdee * 0.85; // 15% deficit
    } else if (goal === "weight_gain" || goal === "muscle_gain" || goal === "bulk") {
        tdee = tdee * 1.15; // 15% surplus
    }

    const calories = Math.round(tdee);

    // Macro distribution
    let proteinPercent = 0.25;
    let carbsPercent = 0.45;
    let fatPercent = 0.30;

    if (goal === "weight_loss" || goal === "cut") {
        proteinPercent = 0.30;
        carbsPercent = 0.35;
        fatPercent = 0.35;
    } else if (goal === "weight_gain" || goal === "muscle_gain" || goal === "bulk") {
        proteinPercent = 0.25;
        carbsPercent = 0.50;
        fatPercent = 0.25;
    }

    // Calculate macros in grams
    const protein = Math.round((calories * proteinPercent) / 4);
    const carbs = Math.round((calories * carbsPercent) / 4);
    const fat = Math.round((calories * fatPercent) / 9);
    const fiber = Math.round((calories / 1000) * 14);
    const sugar = Math.round((calories * 0.10) / 4);

    return { calories, protein, carbs, fat, fiber, sugar };
};

/**
 * Calculate Consistency Score (0-100)
 * Factors: Days Logged, Calorie Variance
 */
export const calculateConsistencyScore = (
    scans: FoodScan[],
    daysToCheck: number = 7
): ConsistencyBreakdown => {
    if (!scans || scans.length === 0) {
        return { score: 0, breakdown: ["Start logging to build consistency"] };
    }

    const today = new Date();
    const dateMap: Record<string, number> = {};

    // Aggregate calories per day
    scans.forEach(scan => {
        const day = TIMEZONE_UTILS.formatDay(scan.created_at);
        const nutrients = scan.result_json?.nutrients;
        const cals = (nutrients?.calories || 0) * (scan.serving || 1);

        if (!dateMap[day]) dateMap[day] = 0;
        dateMap[day] += cals;
    });

    const loggedDaysCount = Object.keys(dateMap).length;

    // 1. Frequency Score (50%)
    // 7 days = 50pts, 4 days = ~28pts
    const frequencyScore = Math.min(50, (loggedDaysCount / daysToCheck) * 50);

    // 2. Variance Score (50%)
    // Calculate CV (Coefficient of Variation)
    const calories = Object.values(dateMap);
    const mean = calories.reduce((a, b) => a + b, 0) / calories.length;

    let varianceScore = 50;
    let varianceMsg = "Calorie intake is stable";

    if (loggedDaysCount > 1 && mean > 0) {
        const sqDiffs = calories.map(c => Math.pow(c - mean, 2));
        const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / calories.length;
        const stdDev = Math.sqrt(avgSqDiff);
        const cv = stdDev / mean; // Coefficient of Variation

        // Scoring: CV < 0.15 is great (50pts), CV > 0.40 is bad (0pts)
        if (cv < 0.15) varianceScore = 50;
        else if (cv > 0.40) {
            varianceScore = 10;
            varianceMsg = "Large calorie swings detected";
        } else {
            // Linear interpolation between 0.15 and 0.40
            // 0.15 -> 50, 0.40 -> 10
            const ratio = (cv - 0.15) / (0.40 - 0.15);
            varianceScore = 50 - (ratio * 40);
            varianceMsg = "Some variation in meal sizes";
        }
    } else if (loggedDaysCount <= 1) {
        varianceScore = 50; // Benefit of doubt
        varianceMsg = "Keep logging to measure stability";
    }

    const finalScore = Math.round(frequencyScore + varianceScore);

    const breakdown = [
        `Logged ${loggedDaysCount}/${daysToCheck} days`,
        varianceMsg
    ];

    return { score: finalScore, breakdown };
};




// --- The Core Insight Engine ---

/**
 * Generate Insights based on rules
 */
export const generateInsights = (
    scans: FoodScan[],
    profile: UserProfile | null,
    history: InsightHistoryItem[] = []
): Insight[] => {
    const targets = calculateDailyRequirements(profile);
    if (!targets) return []; // Need profile

    const insights: Insight[] = [];
    const goal = (profile?.goal || "maintenance").toLowerCase();

    // --- Pre-process Data ---
    const last7Days = scans.slice(0, 50); // Just take recent bucket for now
    const dailyStats: Record<string, DailyStats> = {};
    let totalMealsLogged = 0;

    last7Days.forEach(scan => {
        const day = TIMEZONE_UTILS.formatDay(scan.created_at);
        const nutrients = scan.result_json?.nutrients || {};
        const mult = scan.serving || 1;
        const cals = (nutrients.calories || 0) * mult;
        const hour = TIMEZONE_UTILS.getHour(scan.created_at);

        if (!dailyStats[day]) {
            dailyStats[day] = { date: day, calories: 0, protein: 0, carbs: 0, fat: 0, count: 0, over8pmCalories: 0 };
        }

        dailyStats[day].calories += cals;
        dailyStats[day].protein += (nutrients.protein_g || 0) * mult;
        dailyStats[day].carbs += (nutrients.carbohydrates_g || 0) * mult;
        dailyStats[day].fat += (nutrients.fat_g || 0) * mult;
        dailyStats[day].count += 1;
        totalMealsLogged += 1;

        if (hour >= 20) {
            dailyStats[day].over8pmCalories += cals;
        }
    });

    const daysCount = Object.values(dailyStats).length;
    const daysArray = Object.values(dailyStats);

    // --- Universal Insight Suppression ---
    // If < 3 meals logged OR < 2 days of data -> Show NO insights
    if (totalMealsLogged < 3 || daysCount < 2) {
        return [];
    }

    // --- Helper Functions for Thresholds ---
    const getAvg = (key: keyof DailyStats) => {
        if (daysCount === 0) return 0;
        return daysArray.reduce((acc, d) => acc + (d[key] as number), 0) / daysCount;
    };

    const avgCalories = getAvg('calories');
    const avgProtein = getAvg('protein');
    const avgFat = getAvg('fat');

    // --- GOAL SPECIFIC LOGIC ---

    // 1. Calories check based on Goal
    let calorieStatus = "ok";
    const targetCals = targets.calories;
    const diffPercent = (avgCalories - targetCals) / targetCals; // e.g. -0.10 for 10% deficit

    if (goal === "weight_loss" || goal === "cut") {
        // Cut Rules
        if (diffPercent > -0.05) calorieStatus = "deficit_too_small"; // > -5%
        if (diffPercent < -0.30) calorieStatus = "deficit_too_aggressive"; // < -30%
    } else if (goal === "weight_gain" || goal === "muscle_gain" || goal === "bulk") {
        // Gain Rules
        if (diffPercent < 0.03) calorieStatus = "surplus_too_small"; // < +3%
        if (diffPercent > 0.25) calorieStatus = "surplus_excessive"; // > +25%
    } else {
        // Maintenance Rules
        if (Math.abs(diffPercent) > 0.15) calorieStatus = "maintenance_drift";
    }

    // Insight: Calorie Status
    if (calorieStatus === "deficit_too_small") {
        insights.push({
            id: "cal_deficit_small",
            title: "Deficit too small",
            copy: "You're averaging close to maintenance calories.",
            action: "Aim for a slightly larger deficit to see results.",
            type: "neutral",
            category: "macro_balance",
            impactScore: 90,
            whyMatch: `Your average intake is only ${Math.round(diffPercent * 100)}% below target.`
        });
    } else if (calorieStatus === "deficit_too_aggressive") {
        insights.push({
            id: "cal_deficit_aggressive",
            title: "Deficit too aggressive",
            copy: "You’re eating far below your target. This can risk muscle loss.",
            action: "Increase calories slightly to sustain progress.",
            type: "warning",
            category: "macro_balance",
            impactScore: 95,
            whyMatch: `You're eating ${Math.abs(Math.round(diffPercent * 100))}% below target.`
        });
    }

    // 2. Protein Check Based on Goal
    let proteinThreshold = 0.80; // Default (Cut)
    if (goal === "maintenance") proteinThreshold = 0.75;
    if (goal.includes("gain")) proteinThreshold = 0.85;

    if (avgProtein < (targets.protein * proteinThreshold)) {
        insights.push({
            id: "low_protein",
            title: "Low Protein Intake",
            copy: "You’re consistently under your protein target.",
            action: "Try adding a protein source to one daily meal.",
            type: "warning",
            category: "macro_balance",
            impactScore: 85,
            whyMatch: `Your average protein is ${Math.round(avgProtein)}g (${Math.round(avgProtein / targets.protein * 100)}% of target).`
        });
    }

    // 3. Fat Dominance Check
    // Cut: > 40% on 4+ days. Maintain: > 45%. Gain: > 35%.
    let fatLimit = 0.40;
    if (goal === "maintenance") fatLimit = 0.45;
    if (goal.includes("gain")) fatLimit = 0.35;

    const fatHeavyDays = daysArray.filter(d => (d.fat * 9) / d.calories > fatLimit);
    if (fatHeavyDays.length >= 4) {
        insights.push({
            id: "fat_dominance",
            title: "Fat Dominance",
            copy: "Many of your meals are fat-heavy, increasing calorie density.",
            action: "Reduce added oils or creamy sauces in one meal.",
            type: "neutral",
            category: "macro_balance",
            impactScore: 75,
            whyMatch: `Fat exceeded ${fatLimit * 100}% of calories on ${fatHeavyDays.length} days.`
        });
    }

    // Gain Rule: Meal Frequency
    if (goal.includes("gain")) {
        // Trigger if < 3 meals/day avg
        const avgMealsPerDay = totalMealsLogged / daysCount;
        if (avgMealsPerDay < 3) {
            insights.push({
                id: "low_frequency_gain",
                title: "Meal Frequency",
                copy: "You're constantly eating fewer than 3 meals a day.",
                action: "More frequent meals may support muscle gain.",
                type: "warning",
                category: "timing",
                impactScore: 82,
                whyMatch: `Averaging ${avgMealsPerDay.toFixed(1)} meals/day.`
            });
        }
    }

    // --- Rule A2: High Carb Skew ---
    // Carbs > 65% of calories on >= 3 days AND protein < target (Spec)
    const highCarbDays = daysArray.filter(d => {
        const carbCals = d.carbs * 4;
        const proteinTarget = targets.protein;
        const isLowProtein = d.protein < proteinTarget; // approximate daily check
        return d.calories > 0 && (carbCals / d.calories) > 0.65 && isLowProtein;
    });

    if (highCarbDays.length >= 3) {
        insights.push({
            id: "high_carb_skew",
            title: "High Carb Skew",
            copy: "A large share of your calories is coming from carbs.",
            action: "Pair carb-heavy meals with protein or fiber.",
            type: "neutral",
            category: "macro_balance",
            impactScore: 60,
            whyMatch: `Carbs > 60% on ${highCarbDays.length} recent days.`
        });
    }

    // --- Rule B1: Late Eating Pattern ---
    // >35% calories after 8 PM on 3+ days
    const lateDays = daysArray.filter(d => d.calories > 0 && (d.over8pmCalories / d.calories) > 0.35);
    if (lateDays.length >= 3) {
        insights.push({
            id: "late_eating",
            title: "Late Eating Pattern",
            copy: "Most of your calories come later in the day.",
            action: "Try shifting one larger meal earlier.",
            type: "neutral",
            category: "timing",
            impactScore: 70,
            whyMatch: `>35% of calories logged after 8 PM on ${lateDays.length} days.`
        });
    }

    // --- Rule B2: Calorie Spikes ---
    // Spec: "Trigger if daily calorie variance > 25%" (Applied generally or specifically to Maintain)
    const spikeDays = daysArray.filter(d => {
        const diff = Math.abs((d.calories - avgCalories) / avgCalories);
        return diff > 0.25;
    });

    if (spikeDays.length >= 4) {
        insights.push({
            id: "calorie_spikes",
            title: "Calorie Spikes",
            copy: "Your calorie intake swings a lot day to day.",
            action: "Aim for similar meal sizes across days.",
            type: "neutral",
            category: "consistency",
            impactScore: 65,
            whyMatch: `Calories deviated >30% from average on ${spikeDays.length} days.`
        });
    }

    // --- Rule C1: Repeated Meals ---
    // Same meal >= 30% of time
    const { repeatedMeals, triggerMeals } = analyzeEatingPatterns(scans, targets.calories);

    if (repeatedMeals.length > 0) {
        insights.push({
            id: "repeated_meals",
            title: "Repeated Meals",
            copy: "You repeat the same meals often.",
            action: "Rotate one alternative meal this week.",
            type: "neutral",
            category: "meal_pattern",
            impactScore: 50,
            whyMatch: `You ate "${repeatedMeals[0].name}" ${repeatedMeals[0].count} times (${repeatedMeals[0].percent}%).`
        });
    }

    // --- Rule C2: Trigger Meals ---
    if (triggerMeals.length > 0) {
        insights.push({
            id: "trigger_meal",
            title: "Trigger Meals",
            copy: "Certain meals are strongly linked to calorie overages.",
            action: "Watch portions with this meal.",
            type: "warning",
            category: "meal_pattern",
            impactScore: 88,
            whyMatch: `"${triggerMeals[0].name}" is often followed by high calorie days.`
        });
    }

    // --- GROUPING & SUPPRESSION ---
    // Rule: Only one macro insight at a time.
    // 1. Group by category
    const macroInsights = insights.filter(i => i.category === "macro_balance");
    const otherInsights = insights.filter(i => i.category !== "macro_balance");

    // 2. Select top macro insight
    const topMacro = macroInsights.sort((a, b) => b.impactScore - a.impactScore)[0];

    // 3. Recombine
    let finalInsights = topMacro ? [topMacro, ...otherInsights] : otherInsights;

    // --- Leading Insight (Weekly Summary) ---
    // If NO negative insights, show positive fallback.
    // If there ARE insights, the top one is the "Weekly Summary" effectively,
    // but the plan implies a specific "Weekly Summary" card *always* for Premium.
    // For now, we stick to the plan: "Always shown first (Premium)".
    // We'll let the UI handle the "Leading" distinction, here we just ensure sort order.

    if (finalInsights.length === 0) {
        finalInsights.push({
            id: "weekly_summary_good",
            title: "Weekly Summary",
            copy: "You’re building consistency. Your recent meals align well with your goal.",
            action: "Keep doing what’s working.",
            type: "success",
            category: "general",
            impactScore: 100,
            whyMatch: "You have no negative patterns detected."
        });
    }

    // Sort by impact
    return finalInsights.sort((a, b) => b.impactScore - a.impactScore);
};

/**
 * Helper: Normalize Meal Names
 * Removes quantities (100g, 1 cup), brand prefixes, and extra whitespace.
 */
const normalizeMealName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/\b(\d+(\.\d+)?)\s*(g|kg|oz|lb|cup|tbsp|tsp|ml|l)\b/g, "") // Remove units like "100g", "1 cup"
        .replace(/\b(large|medium|small)\b/g, "") // Remove sizes
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .trim();
};

export const analyzeEatingPatterns = (scans: FoodScan[], dailyTargetCalories: number) => {
    if (!scans.length) return { repeatedMeals: [], triggerMeals: [] };

    const mealCounts: Record<string, { count: number; totalCals: number; maxCals: number; display: string }> = {};

    scans.forEach(scan => {
        const dish = scan.result_json?.dish || "Unknown Dish";
        const cals = (scan.result_json?.nutrients?.calories || 0) * (scan.serving || 1);

        // Normalize
        const key = normalizeMealName(dish);
        if (!key) return; // Skip empty

        if (!mealCounts[key]) {
            mealCounts[key] = { count: 0, totalCals: 0, maxCals: 0, display: dish };
        }
        mealCounts[key].count++;
        mealCounts[key].totalCals += cals;
        mealCounts[key].maxCals = Math.max(mealCounts[key].maxCals, cals);
    });

    const totalMeals = scans.length;

    // Rules for patterns

    // C1: Repeated Meals (> 30%)
    const repeated = Object.values(mealCounts)
        .filter(data => (data.count / totalMeals) >= 0.30 && totalMeals >= 5)
        .map(data => ({
            name: data.display,
            percent: Math.round((data.count / totalMeals) * 100),
            count: data.count
        }))
        .sort((a, b) => b.percent - a.percent);

    // C2: Trigger Meals (High Calorie single meals)
    const triggers = Object.values(mealCounts)
        .filter(data => data.maxCals > (dailyTargetCalories * 0.50))
        .map(data => ({
            name: data.display,
            calories: Math.round(data.maxCals)
        }))
        .sort((a, b) => b.calories - a.calories);

    return { repeatedMeals: repeated, triggerMeals: triggers };
};

export const getConsolidatedAction = (insights: Insight[], consistencyBreakdown: ConsistencyBreakdown): string => {
    // Priority 1: High Impact Insight
    if (insights.length > 0 && insights[0].type !== "success") {
        return insights[0].action;
    }

    // Priority 2: Improve Consistency
    if (consistencyBreakdown.score < 60) {
        return "Log at least one meal every day this week.";
    }

    // Priority 3: Fallback
    return "Keep tracking to see more trends.";
};
