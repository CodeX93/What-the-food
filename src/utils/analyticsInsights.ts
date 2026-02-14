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

export type GoalProgress = {
    avgCaloriesDiff: number;
    macroAdherencePercent: number;
    status: "on_track" | "off_track" | "warning";
    message: string;
    prognosticText: string;
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
 * Factors: Days Logged (40%), Calorie Variance (30%), Macro Stability (30%)
 */
export const calculateConsistencyScore = (
    scans: FoodScan[],
    daysToCheck: number = 7
): ConsistencyBreakdown => {
    if (!scans || scans.length === 0) {
        return { score: 0, breakdown: ["Start logging to build consistency"] };
    }

    const dateMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};

    // Aggregate daily stats
    scans.forEach(scan => {
        const day = TIMEZONE_UTILS.formatDay(scan.created_at);
        const nutrients = scan.result_json?.nutrients;
        const mult = scan.serving || 1;
        const cals = (nutrients?.calories || 0) * mult;
        const protein = (nutrients?.protein_g || 0) * mult;
        const carbs = (nutrients?.carbohydrates_g || 0) * mult;
        const fat = (nutrients?.fat_g || 0) * mult;

        if (!dateMap[day]) dateMap[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        dateMap[day].calories += cals;
        dateMap[day].protein += protein;
        dateMap[day].carbs += carbs;
        dateMap[day].fat += fat;
    });

    const loggedDaysCount = Object.keys(dateMap).length;
    const daysArray = Object.values(dateMap);

    // 1. Frequency Score (40%)
    const frequencyScore = Math.min(40, (loggedDaysCount / daysToCheck) * 40);

    // 2. Variance Score (30%)
    const calories = daysArray.map(d => d.calories);
    const meanCals = calories.reduce((a, b) => a + b, 0) / calories.length;

    let varianceScore = 30;
    let varianceMsg = "Calorie intake is stable";

    if (loggedDaysCount > 1 && meanCals > 0) {
        const sqDiffs = calories.map(c => Math.pow(c - meanCals, 2));
        const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / calories.length;
        const stdDev = Math.sqrt(avgSqDiff);
        const cv = stdDev / meanCals;

        if (cv < 0.15) varianceScore = 30;
        else if (cv > 0.40) {
            varianceScore = 5;
            varianceMsg = "Large calorie swings detected";
        } else {
            const ratio = (cv - 0.15) / (0.40 - 0.15);
            varianceScore = 30 - (ratio * 25);
            varianceMsg = "Some variation in meal sizes";
        }
    } else if (loggedDaysCount <= 1) {
        varianceScore = 30;
        varianceMsg = "Keep logging to measure stability";
    }

    // 3. Macro Stability Score (30%)
    // Measure how consistent the P/C/F ratios are across days
    let macroScore = 30;
    let macroMsg = "Macro ratios are consistent";

    if (loggedDaysCount > 1) {
        const dailyRatios = daysArray.map(d => {
            const total = d.calories || 1;
            return {
                p: (d.protein * 4) / total,
                c: (d.carbs * 4) / total,
                f: (d.fat * 9) / total
            };
        });

        // Calculate average ratios
        const avgP = dailyRatios.reduce((sum, r) => sum + r.p, 0) / dailyRatios.length;
        const avgC = dailyRatios.reduce((sum, r) => sum + r.c, 0) / dailyRatios.length;
        const avgF = dailyRatios.reduce((sum, r) => sum + r.f, 0) / dailyRatios.length;

        // Calculate total deviation across all macros across all days
        const totalDev = dailyRatios.reduce((sum, r) => {
            return sum + Math.abs(r.p - avgP) + Math.abs(r.c - avgC) + Math.abs(r.f - avgF);
        }, 0) / dailyRatios.length;

        // Scoring: totalDev < 0.1 (10% avg swing) is great, > 0.3 is poor
        if (totalDev < 0.1) macroScore = 30;
        else if (totalDev > 0.3) {
            macroScore = 5;
            macroMsg = "Macro ratios shifting daily";
        } else {
            const ratio = (totalDev - 0.1) / (0.3 - 0.1);
            macroScore = 30 - (ratio * 25);
            macroMsg = "Minor macro ratio shifts";
        }
    } else {
        macroScore = 30;
        macroMsg = "Log more to track macro stability";
    }

    const finalScore = Math.round(frequencyScore + varianceScore + macroScore);

    const breakdown = [
        `Logged ${loggedDaysCount}/${daysToCheck} days`,
        varianceMsg,
        macroMsg
    ];

    return { score: finalScore, breakdown };
};




// --- The Core Insight Engine ---

/**
 * Generate Insights based on rules
 */
// --- The Core Insight Engine ---

/**
 * Generate Insights based on deterministic rules per goal
 */
export const generateInsights = (
    scans: FoodScan[],
    profile: UserProfile | null
): Insight[] => {
    const targets = calculateDailyRequirements(profile);
    if (!targets) return []; // Need profile

    const insights: Insight[] = [];

    // --- Pre-process Data ---
    // Sort scans: Newest first
    const sortedScans = [...scans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // We need "Active Logged Days" for calculations
    const dailyStats: Record<string, DailyStats> = {};
    let totalMealsLogged = 0;

    sortedScans.forEach(scan => {
        const day = TIMEZONE_UTILS.formatDay(scan.created_at);
        const nutrients = scan.result_json?.nutrients || {};
        const mult = scan.serving || 1;

        const cals = (nutrients.calories || 0) * mult;
        const protein = (nutrients.protein_g || 0) * mult;
        const carbs = (nutrients.carbohydrates_g || 0) * mult;
        const fat = (nutrients.fat_g || 0) * mult;

        const hour = TIMEZONE_UTILS.getHour(scan.created_at);

        if (!dailyStats[day]) {
            dailyStats[day] = { date: day, calories: 0, protein: 0, carbs: 0, fat: 0, count: 0, over8pmCalories: 0 };
        }

        dailyStats[day].calories += cals;
        dailyStats[day].protein += protein;
        dailyStats[day].carbs += carbs;
        dailyStats[day].fat += fat;
        dailyStats[day].count += 1;
        totalMealsLogged += 1;

        if (hour >= 20) {
            dailyStats[day].over8pmCalories += cals;
        }
    });

    const daysCount = Object.values(dailyStats).length;
    const daysArray = Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date)); // Newest first

    // --- UNIVERSAL SUPPRESSION RULE ---
    // If user has < 3 meals logged OR < 2 days of data -> Show NO insights
    if (totalMealsLogged < 3 || daysCount < 2) {
        return [];
    }

    // --- GLOBAL METRICS ---
    // Weekly Average (last 7 logged days)
    const last7Days = daysArray.slice(0, 7);
    const avgCals7Days = last7Days.reduce((sum, d) => sum + d.calories, 0) / (last7Days.length || 1);
    const avgProtein7Days = last7Days.reduce((sum, d) => sum + d.protein, 0) / (last7Days.length || 1);

    const goal = (profile?.goal || "maintenance").toLowerCase();

    // --- GOAL: CUT (Fat Loss) ---
    if (goal === "weight_loss" || goal === "cut") {

        // 1. Calories
        // Target: -10% to -20% below target (Note: 'targets.calories' ALREADY includes deficit in calculateDailyRequirements?)
        // Wait, calculateDailyRequirements applies a multiplier. 
        // "Daily calorie target = user’s calculated target". 
        // If calculateDailyRequirements returned 2000 (after deficit), then " > -5% below target" means > 1900?
        // Let's assume 'targets.calories' is the GOAL target.
        // Prompt says: "If weekly avg calories > -5% --> Deficit too small".
        // This implies the reference is the TDEE (Maintenance)? Or is "target" the Deficit Target?
        // Usually "below target" implies below the *Maintenance* TDEE.
        // BUT "Daily calorie target = user's calculated target".
        // If the user's target IS the deficit number (e.g. 2000), then "10% below target" means 1800.
        // User Prompt text: "Calories... On track: -10% to -20% below target".
        // If I assigned them a deficit target, asking them to be 20% *below* that seems harsh.
        // Likely 'target' refers to MAINTENANCE TDEE in the prompt's context, OR the language "below target" is relative to a standard baseline.
        // HOWEVER, "Daily calorie target = user’s calculated target" is a Global Definition.
        // Let's stick to the percentages relative to `targets.calories`.
        // Interpretation:
        // "Too high: > -5% below target" -> Avg > Target * 0.95
        // "On track: -10% to -20% below target" -> Avg between Target * 0.80 and Target * 0.90
        // "Too aggressive: < -30% below target" -> Avg < Target * 0.70
        // *Adjusted implementation based on likely intent:* 
        // If targets.calories is already the Deficit Number (e.g. TDEE * 0.85), then:
        // Checking "below target" again might double dip. 
        // Let's trust the logic: Compare Avg vs Target.
        // "Deficit too small" -> Avg > Target * 0.95 (Close to target is 'too high'? Maybe they mean relative to Maintenance?)
        // Let's use the exact math from the prompt relative to the *Goal Target*.

        // CUT Rule: Deficit too small
        if (avgCals7Days > (targets.calories * 0.95)) {
            insights.push({
                id: "cut_deficit_small",
                title: "Deficit Too Small",
                copy: "You're constantly hitting or exceeding your calorie target.\nTo burn fat, you need a slightly larger gap.",
                action: "Reduce portion sizes slightly at dinner.",
                type: "warning",
                category: "general",
                impactScore: 90
            });
        }
        // CUT Rule: Deficit too aggressive
        else if (avgCals7Days < (targets.calories * 0.70)) {
            insights.push({
                id: "cut_deficit_aggressive",
                title: "Deficit Too Aggressive",
                copy: "You're eating far below your target.\nThis risks muscle loss and bingeing later.",
                action: "Add a small snack to reach your goal.",
                type: "warning",
                category: "general",
                impactScore: 95
            });
        }

        // 2. Protein
        // Trigger if avg < 80% of target
        if (avgProtein7Days < (targets.protein * 0.80)) {
            insights.push({
                id: "cut_low_protein",
                title: "Protein Needs a Boost",
                copy: "Protein preserves muscle while you cut.\nYou're averaging below 80% of your target.",
                action: "Add 20-30g protein (e.g. chicken, tofu) to lunch.",
                type: "warning",
                category: "macro_balance",
                impactScore: 85
            });
        }

        // 3. Fat
        // Trigger if fat > 40% of total calories on 4+ days
        const highFatDays = last7Days.filter(d => d.calories > 0 && ((d.fat * 9) / d.calories > 0.40));
        if (highFatDays.length >= 4) {
            insights.push({
                id: "cut_high_fat",
                title: "Fat Intake is High",
                copy: "Fat is calorie-dense. High fat days make it harder to hit your deficit volume-wise.",
                action: "Swap fatty cuts for leaner options this week.",
                type: "neutral",
                category: "macro_balance",
                impactScore: 70
            });
        }

        // 4. Carbs
        // Trigger if carbs > 65% of calories AND protein < target
        const highCarbLowProteinDays = last7Days.filter(d =>
            d.calories > 0 &&
            ((d.carbs * 4) / d.calories > 0.65) &&
            (d.protein < targets.protein)
        );
        // Assuming "Trigger only if..." implies a pattern, let's say 3+ days
        if (highCarbLowProteinDays.length >= 3) {
            insights.push({
                id: "cut_carb_dominance",
                title: "Carb Dominance",
                copy: "High carbs with low protein can spike hunger and reduce satiety during a cut.",
                action: "Balance your carb meals with protein.",
                type: "neutral",
                category: "macro_balance",
                impactScore: 60
            });
        }

        // 5. Timing
        // Trigger late-eating if > 35% of calories after 8pm on 3+ days
        const lateDays = last7Days.filter(d => d.calories > 0 && (d.over8pmCalories / d.calories > 0.35));
        if (lateDays.length >= 3) {
            insights.push({
                id: "cut_late_eating",
                title: "Late Night Calories",
                copy: "Eating heavily late at night can disrupt digestion and sleep quality.",
                action: "Shift some calories to earlier in the day.",
                type: "neutral",
                category: "timing",
                impactScore: 50
            });
        }

    }

    // --- GOAL: MAINTAIN ---
    else if (goal === "maintenance") {

        // 1. Calories
        // Inconsistent: ±15% swings on 4+ days
        // We check if d.calories is outside [Target * 0.85, Target * 1.15]
        const swingDays = last7Days.filter(d =>
            d.calories < (targets.calories * 0.85) ||
            d.calories > (targets.calories * 1.15)
        );
        if (swingDays.length >= 4) {
            insights.push({
                id: "maintain_swings",
                title: "Calorie Swings",
                copy: "Maintenance requires stability. Large daily swings make it hard to find your baseline.",
                action: "Try to stay within ±100 kcals of target.",
                type: "warning",
                category: "consistency",
                impactScore: 80
            });
        }

        // 2. Protein
        // Trigger if avg < 75% of target
        if (avgProtein7Days < (targets.protein * 0.75)) {
            insights.push({
                id: "maintain_low_protein",
                title: "Protein Dip",
                copy: "Even at maintenance, protein is key.\nYou're falling short of your target.",
                action: "Prioritize protein in your first meal.",
                type: "neutral",
                category: "macro_balance",
                impactScore: 70
            });
        }

        // 3. Fat
        // Trigger if fat > 45% of calories on 4+ days (consistently)
        const highFatMaintainDays = last7Days.filter(d => d.calories > 0 && ((d.fat * 9) / d.calories > 0.45));
        if (highFatMaintainDays.length >= 4) {
            insights.push({
                id: "maintain_high_fat",
                title: "High Fat Ratio",
                copy: "Your diet is very fat-dominant (>45%). This is fine if intended (e.g. Keto), but watch total calories.",
                action: "Check if you're over-relying on oils or nuts.",
                type: "neutral",
                category: "macro_balance",
                impactScore: 50
            });
        }

        // 4. Consistency (Variance)
        // Trigger if daily calorie variance > 25%
        // Variance calc:
        const cals = last7Days.map(d => d.calories);
        if (cals.length > 1) {
            const mean = cals.reduce((a, b) => a + b, 0) / cals.length;
            const sqDiff = cals.map(c => Math.pow(c - mean, 2)).reduce((a, b) => a + b, 0) / cals.length;
            const stdDev = Math.sqrt(sqDiff);
            const cv = stdDev / (mean || 1); // Coefficient of Variation

            if (cv > 0.25) {
                insights.push({
                    id: "maintain_variance",
                    title: "Inconsistent Intake",
                    copy: "Your daily intake varies by >25%. Maintenance works best with routine.",
                    action: "Plan your meals to be more similar day-to-day.",
                    type: "warning",
                    category: "consistency",
                    impactScore: 60
                });
            }
        }
    }

    // --- GOAL: GAIN (Muscle Gain) ---
    else if (goal.includes("gain") || goal === "bulk") {

        // 1. Calories
        // Too low: < +3% (Target * 1.03) -> Assuming Target is Base? 
        // NOTE: calculateDailyRequirements ALREADY adds +15% for Gain.
        // So `targets.calories` = TDEE * 1.15.
        // If we want to check if they are hitting the surplus...
        // "Too low: < +3%" implies < TDEE * 1.03.
        // Since `targets.calories` is ~ TDEE * 1.15.
        // TDEE * 1.03 is approximately `targets.calories / 1.15 * 1.03` => `targets.calories * 0.895`.
        // Let's approximate: If Avg < Target * 0.90, they are barely in surplus (or in maintenance).
        // Let's stick to strict interpretation relative to *assigned target*.
        // If the prompt says "Too low < +3%", and the system assigned +15%, then "Too low" is basically "missing the target significantly".
        // Let's define "Too Low" as "Below Maintenance". 
        // If `targets.calories` is the Surplus Target, then `avg < targets.calories * 0.90` is roughly Maintenance.

        // Let's use the prompt's thresholds as "Deviation from Target"? No, prompt says "< +3%". That looks like "vs TDEE".
        // But I don't have raw TDEE easily available without recalculating. `calculateDailyRequirements` returns the final.
        // Let's calculate raw TDEE by reversing the 1.15 multiplier.
        const likelyTDEE = targets.calories / 1.15;

        // Too low: < +3% above TDEE
        if (avgCals7Days < (likelyTDEE * 1.03)) {
            insights.push({
                id: "gain_low_surplus",
                title: "Surplus Too Low",
                copy: "You're eating at maintenance, not a surplus. Muscle growth needs energy.",
                action: "Add an extra post-workout snack.",
                type: "warning",
                category: "general",
                impactScore: 90
            });
        }
        // Excessive: > +25% above TDEE
        else if (avgCals7Days > (likelyTDEE * 1.25)) {
            insights.push({
                id: "gain_high_surplus",
                title: "Excessive Surplus",
                copy: "You're eating >25% above maintenance. This gains fat, not just muscle.",
                action: "Scale back portion sizes slightly.",
                type: "warning",
                category: "general",
                impactScore: 85
            });
        }

        // 2. Protein
        // Trigger if avg < 85% of target
        if (avgProtein7Days < (targets.protein * 0.85)) {
            insights.push({
                id: "gain_low_protein",
                title: "Missed Protein Target",
                copy: "Muscle needs protein to rebuild. You're continuously under your target.",
                action: "Double your protein portion in one meal.",
                type: "warning",
                category: "macro_balance",
                impactScore: 95
            });
        }

        // 3. Fat
        // Trigger if fat > 35% of calories
        // Let's check average fat %? Or daily? "Trigger if fat >..." usually implies Average or Pattern. 
        // Let's use Average Fat % over the week.
        const avgFatPercent = ((avgCals7Days || 1) > 0)
            ? ((last7Days.reduce((s, d) => s + d.fat, 0) * 9) / (last7Days.reduce((s, d) => s + d.calories, 0)))
            : 0;

        if (avgFatPercent > 0.35) {
            insights.push({
                id: "gain_high_fat",
                title: "Fat Intake High",
                copy: "Carbs are better for muscle fuel than fat. Your fat intake is high (>35%).",
                action: "Swap fatty foods for carb sources like rice/oats.",
                type: "neutral",
                category: "macro_balance",
                impactScore: 60
            });
        }

        // 4. Meal Frequency
        // Trigger if < 3 meals/day avg
        const mealsPerDay = totalMealsLogged / (daysCount || 1);
        if (mealsPerDay < 3) {
            insights.push({
                id: "gain_frequency",
                title: "Eat More Often",
                copy: "It's hard to hit a surplus with few meals.",
                action: "Add a 4th meal or snack to your day.",
                type: "neutral",
                category: "timing",
                impactScore: 75
            });
        }
    }

    // --- SORTING ---
    // Sort by Impact Score (Highest First)
    return insights.sort((a, b) => b.impactScore - a.impactScore);
};

/**
 * Helper: Normalize Meal Names
 */
const normalizeMealName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/\b(\d+(\.\d+)?)\s*(g|kg|oz|lb|cup|tbsp|tsp|ml|l)\b/g, "")
        .replace(/\b(large|medium|small)\b/g, "")
        .replace(/[^\w\s]/g, "")
        .trim();
};

export const analyzeEatingPatterns = (scans: FoodScan[], dailyTargetCalories: number) => {
    if (!scans.length) return { repeatedMeals: [], triggerMeals: [], calorieDenseMeals: [], triggerInsights: [] };

    // 1. Group by Meal Name
    // Structure: { "oatmeal": { count: 3, dates: ["2023-01-01", "..."] } }
    const mealMap: Record<string, { count: number; name: string; dates: string[] }> = {};

    scans.forEach(s => {
        const name = normalizeMealName(s.result_json?.dish || "Unknown");
        if (!name) return;
        if (!mealMap[name]) mealMap[name] = { count: 0, name: s.result_json?.dish || name, dates: [] };

        mealMap[name].count++;
        mealMap[name].dates.push(TIMEZONE_UTILS.formatDay(s.created_at));
    });

    const totalMeals = scans.length;

    // --- C1: Repeated Meals Logic ---
    // Same meal appears ≥ 30% of logged meals
    const repeatedMeals = Object.values(mealMap)
        .filter(m => m.count >= 2) // Rule: Must appear >= 2 times (relaxed from 30% total)
        .map(m => ({
            name: m.name,
            frequency: `${Math.round((m.count / totalMeals) * 100)}%`,
            insight: "Repeated often"
        }));


    // --- C2: Trigger Meals Logic ---
    // Meal appears ≥ 3 times AND followed by calorie overages ≥ 70% of the time.
    // "Followed by calorie overage" -> implies the DAY it was eaten ended up being a high calorie day?
    // "followed by" could mean the NEXT meal, but usually in these generic analytics it means "Days containing this meal are high calorie".
    // Let's assume: "Days where this meal was consumed had Total Daily Calories > Target * 1.1"

    // First, map Days to Calorie Status (Overage or Not)
    const dayRelMap: Record<string, boolean> = {}; // date -> isOverage

    // We need to re-scan to build daily totals first? 
    // Actually we can pass in dailyStats or re-calc. 
    // To save complexity within this function, let's just do a quick calc based on the passed scans for the pattern check.
    const dayTotals: Record<string, number> = {};
    scans.forEach(s => {
        const d = TIMEZONE_UTILS.formatDay(s.created_at);
        dayTotals[d] = (dayTotals[d] || 0) + ((s.result_json?.nutrients?.calories || 0) * (s.serving || 1));
    });

    Object.keys(dayTotals).forEach(d => {
        dayRelMap[d] = dayTotals[d] > (dailyTargetCalories * 1.1); // > 10% overage threshold
    });

    const triggerMeals: { name: string; calories: number; insight: string }[] = [];

    for (const key in mealMap) {
        const m = mealMap[key];
        if (m.count < 2) continue; // Rule: Must appear >= 2 times (relaxed from 3)

        // Check how many of its appearance days were Overages
        let overageCount = 0;
        m.dates.forEach(d => {
            if (dayRelMap[d]) overageCount++;
        });

        const overageRate = overageCount / m.count;
        if (overageRate >= 0.70) {
            triggerMeals.push({
                name: m.name,
                calories: 0, // Not primarily used in new display
                insight: `Linked to high calorie days ${Math.round(overageRate * 100)}% of the time.`
            });
        }
    }

    // --- C3: Calorie Dense Meals Logic ---
    // Average calories per meal name, sort descending, return top 3
    const mealCaloriesMap: Record<string, { totalCals: number; count: number }> = {};

    scans.forEach(s => {
        const name = normalizeMealName(s.result_json?.dish || "Unknown");
        if (!name) return;
        const mult = s.serving || 1;
        const cals = (s.result_json?.nutrients?.calories || 0) * mult;

        if (!mealCaloriesMap[name]) mealCaloriesMap[name] = { totalCals: 0, count: 0 };
        mealCaloriesMap[name].totalCals += cals;
        mealCaloriesMap[name].count++;
    });

    const calorieDenseMeals = Object.entries(mealCaloriesMap)
        .map(([name, data]) => ({
            name: name, // We might want the original display name, but normalized is safer for grouping. 
            // To get display name, we could store it in the map.
            avgCals: Math.round(data.totalCals / data.count)
        }))
        .filter(m => m.avgCals > 500) // Only show actual dense meals (> 500 kcal)
        .sort((a, b) => b.avgCals - a.avgCals)
        .slice(0, 3)
        .map(m => ({
            name: m.name,
            calories: m.avgCals,
            insight: "High calorie density"
        }));

    // Sort by count for patterns
    repeatedMeals.sort((a, b) => parseInt(b.frequency) - parseInt(a.frequency));

    return {
        repeatedMeals,
        triggerMeals: triggerMeals.sort((a, b) => b.name.localeCompare(a.name)),
        calorieDenseMeals,
        triggerInsights: triggerMeals.map(t => t.insight)
    };
};

export type EatingPatterns = {
    repeatedMeals: { name: string; frequency: string; insight: string }[];
    calorieDenseMeals: { name: string; calories: number; insight: string }[];
    triggerInsights: string[];
};

export type AnalyticsAIResponse = {
    insights: Insight[];
    goalProgress: GoalProgress;
    eatingPatterns: EatingPatterns;
    nextBestActions: string[];
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

/**
 * Calculate Goal Progress
 */
export const calculateGoalProgress = (
    scans: FoodScan[],
    profile: UserProfile | null,
    targets: any
): GoalProgress => {
    if (!scans.length || !targets) {
        return {
            avgCaloriesDiff: 0,
            macroAdherencePercent: 0,
            status: "warning",
            message: "Not enough data yet",
            prognosticText: "Log more meals to see your progress."
        };
    }

    const dailyStats: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    scans.forEach(scan => {
        const day = TIMEZONE_UTILS.formatDay(scan.created_at);
        const nutrients = scan.result_json?.nutrients || {};
        const mult = scan.serving || 1;
        if (!dailyStats[day]) dailyStats[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        dailyStats[day].calories += (nutrients.calories || 0) * mult;
        dailyStats[day].protein += (nutrients.protein_g || 0) * mult;
        dailyStats[day].carbs += (nutrients.carbohydrates_g || 0) * mult;
        dailyStats[day].fat += (nutrients.fat_g || 0) * mult;
    });

    const daysCount = Object.keys(dailyStats).length;
    const days = Object.values(dailyStats);
    const avgCals = days.reduce((sum, d) => sum + d.calories, 0) / daysCount;
    const avgDiff = Math.round(avgCals - targets.calories);

    // Macro adherence (how close are we to P/C/F targets on average)
    const avgP = days.reduce((sum, d) => sum + d.protein, 0) / daysCount;
    const avgC = days.reduce((sum, d) => sum + d.carbs, 0) / daysCount;
    const avgF = days.reduce((sum, d) => sum + d.fat, 0) / daysCount;

    const pDev = Math.abs(avgP - targets.protein) / targets.protein;
    const cDev = Math.abs(avgC - targets.carbs) / targets.carbs;
    const fDev = Math.abs(avgF - targets.fat) / targets.fat;
    const macroAdherence = Math.max(0, Math.round((1 - (pDev + cDev + fDev) / 3) * 100));

    const goal = (profile?.goal || "maintenance").toLowerCase();
    let status: "on_track" | "off_track" | "warning" = "on_track";
    let message = "";
    let prognosticText = "";

    if (goal === "weight_loss" || goal === "cut") {
        if (avgDiff > 100) {
            status = "off_track";
            message = `Averaging +${avgDiff} kcal/day above target`;
            prognosticText = "At this pace, progress will stall.";
        } else if (avgDiff < -300) {
            status = "warning";
            message = `Averaging ${avgDiff} kcal/day (Large Deficit)`;
            prognosticText = "Too aggressive. Watch out for muscle loss.";
        } else {
            message = "Calorie intake aligns with weight loss.";
            prognosticText = "You're hitting your deficit consistently.";
        }
    } else if (goal.includes("gain")) {
        if (avgDiff < -50) {
            status = "off_track";
            message = `Averaging ${avgDiff} kcal/day (Deficit)`;
            prognosticText = "Need more calories for muscle growth.";
        } else if (avgDiff > 400) {
            status = "warning";
            message = `Averaging +${avgDiff} kcal/day above target`;
            prognosticText = "Surplus might lead to excessive fat gain.";
        } else {
            message = "Surplus is optimal for muscle gain.";
            prognosticText = "Keep fueling your workouts.";
        }
    } else {
        // Maintenance
        if (Math.abs(avgDiff) > 200) {
            status = "off_track";
            message = `Calories drifting ${avgDiff > 0 ? "+" : ""}${avgDiff} from maintenance`;
            prognosticText = "Your weight may start shifting.";
        } else {
            message = "Calories strictly hitting maintenance.";
            prognosticText = "Perfect for weight stability.";
        }
    }

    return { avgCaloriesDiff: avgDiff, macroAdherencePercent: macroAdherence, status, message, prognosticText };
};
