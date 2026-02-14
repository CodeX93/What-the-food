'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  RefreshCw,
  ArrowLeft,
  CalendarRange,
  Loader2,
  Lock,
  Zap,
  Target,
  Utensils,
  BarChart2,
  AlertCircle,
  TrendingUp,
  Award,
  ChevronRight,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/contexts/AuthContext";
import { DataCache, CACHE_DURATION } from "@/utils/dataCache";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// New Core Logic Imports
import {
  calculateDailyRequirements,
  generateInsights,
  calculateConsistencyScore,
  calculateGoalProgress,
  analyzeEatingPatterns,
  getConsolidatedAction,
  Insight,
  ConsistencyBreakdown,
  GoalProgress,
  EatingPatterns,
  AnalyticsAIResponse,
  UserProfile
} from "@/utils/analyticsInsights";
import { InsightCard } from "./InsightCard";
import { UnlockInsightsModal, InsightSpecificModal, MealPlannerModal } from "./UpgradeModals";
import { MacroTrendsChart } from "./MacroTrendsChart";
import { FoodScan } from "@/utils/foodScan";

// --- Types ---
// Re-using types from existing where possible, but adapting to new structure
type ManualItem = {
  name?: string;
  calories?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
};

// --- Tracking Stub (Placeholder for future Analytics service) ---
const track = (event: string, properties?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Event Tracked]: ${event}`, properties);
  }
  // In production, this would send to Mixpanel/Amplitude/GA
};

const FEATURE_INSIGHTS_V2 = true;

// Helper to format Date for comparison
const formatDay = (iso: string) => {
  const d = new Date(iso);
  return d.toISOString().split('T')[0];
};

type MyFoodAnalyticsClientProps = {
  initialSubscription?: any;
};

export function MyFoodAnalyticsClient({ initialSubscription = null }: MyFoodAnalyticsClientProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();

  // Data State
  const [scans, setScans] = useState<FoodScan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Insights State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyBreakdown>({ score: 0, breakdown: [] });
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [aiEatingPatterns, setAiEatingPatterns] = useState<EatingPatterns | null>(null);
  const [nextBestActions, setNextBestActions] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<{ repeatedMeals: any[], triggerMeals: any[] }>({ repeatedMeals: [], triggerMeals: [] });
  const [whatToImproveNext, setWhatToImproveNext] = useState<string>("");

  // Modals State
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [showMealPlannerModal, setShowMealPlannerModal] = useState(false);
  const [selectedInsightType, setSelectedInsightType] = useState("nutrition");
  const [activePatternTab, setActivePatternTab] = useState<'repeated' | 'dense' | 'triggers'>('repeated');

  // Premium Check
  const isPremium = initialSubscription?.subscription_type === "premium";

  // --- Data Loading ---
  const reload = useCallback(async () => {
    // Note: We allow loading for Free users now to show "Blurred" insights, 
    // unless strictly blocked. The plan says "Blurred previews", so we need data.
    setLoading(true);
    try {
      if (!user) {
        router.push("/auth");
        return;
      }

      const cacheKey = `analytics_scans_v2_${user.id}`;
      // Check cache
      // Check cache (Disabled)
      // const cachedData = DataCache.get<{ scans: FoodScan[]; profile: any }>(cacheKey);

      let fetchedScans: FoodScan[] = [];
      let fetchedProfile: any = null;

      // Always fetch fresh data
      const [profileResult, scansResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("food_scans")
          .select("id, created_at, serving, result_json")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }) // Oldest first for calculation, useful for range finding
      ]);

      if (profileResult.data) fetchedProfile = profileResult.data;
      if (scansResult.data) fetchedScans = scansResult.data as FoodScan[];

      console.log(`[AnalyticsLoad] Fetched ${fetchedScans.length} scans from DB`);

      setScans(fetchedScans);
      setProfile(fetchedProfile);

      // Cache
      DataCache.set(cacheKey, { scans: fetchedScans, profile: fetchedProfile }, CACHE_DURATION.SHORT);
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      toast({ title: "Error loading data", description: "Could not load your food history.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, router, toast]);

  // Initial Load
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (authLoading || !user) return;
    hasLoadedRef.current = true;
    void reload();
  }, [user, authLoading, reload]);

  // Date Range Defaults
  // Date Range Defaults (Smart Check)
  useEffect(() => {
    if (!scans.length || startDate) return;

    // Find the date of the most recent scan
    // Scans are ordered by created_at ascending (oldest first) in the fetch query
    const lastScan = scans[scans.length - 1];
    const lastScanDate = new Date(lastScan.created_at);
    const today = new Date();

    // Check if the last scan is "recent" (within the last 7 days)
    const timeDiff = today.getTime() - lastScanDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    let end: Date;
    let start: Date;

    if (daysDiff > 7) {
      // If data is old, shift the view to when the data actually IS
      end = lastScanDate;
      // Show 7 days ending on that last scan
      start = new Date(lastScanDate);
      start.setDate(start.getDate() - 6);

      // Notify user visually or via toast? Maybe just let them see the data.
      // We could add a toast: "Showing your last logged data from [Date]"
    } else {
      // Default: Last 7 days ending today
      end = today;
      start = new Date(today);
      start.setDate(start.getDate() - 6);
    }

    setStartDate(formatDay(start.toISOString()));
    setEndDate(formatDay(end.toISOString()));
  }, [scans, startDate]);

  // --- Core Calculations (Memoized) ---

  const filteredScans = useMemo(() => {
    if (!scans.length) return [];
    return scans.filter(s => {
      const d = formatDay(s.created_at);
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });
  }, [scans, startDate, endDate]);

  const dailyReqs = useMemo(() => calculateDailyRequirements(profile), [profile]);

  // --- AI Coach Integration ---
  useEffect(() => {
    if (filteredScans.length > 0) {
      // 1. Calculate base stats locally to pass to AI
      const generatedConsistency = calculateConsistencyScore(filteredScans, 7);
      const generatedPatterns = analyzeEatingPatterns(filteredScans, dailyReqs?.calories || 2000); // Keep local pattern detection for inputs
      const generatedGoalProgress = calculateGoalProgress(filteredScans, profile, dailyReqs);

      setConsistency(generatedConsistency);
      setPatterns(generatedPatterns);
      setAiEatingPatterns(generatedPatterns); // Fix: Determine "AI" patterns locally now
      setGoalProgress(generatedGoalProgress);

      // 2. Prepare context for AI
      const totalCals = filteredScans.reduce((sum, s) => sum + ((s.result_json?.nutrients?.calories || 0) * (s.serving || 1)), 0);
      const totalProtein = filteredScans.reduce((sum, s) => sum + ((s.result_json?.nutrients?.protein_g || 0) * (s.serving || 1)), 0);
      const totalCarbs = filteredScans.reduce((sum, s) => sum + ((s.result_json?.nutrients?.carbohydrates_g || 0) * (s.serving || 1)), 0);
      const totalFat = filteredScans.reduce((sum, s) => sum + ((s.result_json?.nutrients?.fat_g || 0) * (s.serving || 1)), 0);

      // Better: Group by day for accurate daily averages
      const days = new Set(filteredScans.map(s => formatDay(s.created_at)));
      const dayCount = days.size || 1;
      const trueAvgCalories = totalCals / dayCount;
      const trueAvgProtein = totalProtein / dayCount;
      const trueAvgCarbs = totalCarbs / dayCount;
      const trueAvgFat = totalFat / dayCount;

      const aiContext = {
        goal: profile?.goal || "maintenance",
        targetCalories: dailyReqs?.calories || 2000,
        targetProtein: dailyReqs?.protein || 150,
        targetCarbs: dailyReqs?.carbs || 200,
        targetFat: dailyReqs?.fat || 70,
        avgCalories: trueAvgCalories,
        avgProtein: trueAvgProtein,
        avgCarbs: trueAvgCarbs,
        avgFat: trueAvgFat,
        consistencyScore: generatedConsistency.score,
        mealSummaryText: filteredScans.slice(-15).map(s => {
          return `${s.result_json?.dish} (${s.result_json?.nutrients?.calories} kcal)`;
        }).join(", "),
        mealPatternText: generatedPatterns.repeatedMeals.length
          ? `User repeats ${generatedPatterns.repeatedMeals[0].name} often.`
          : "Varied diet."
      };

      // 3. Generate Insights (Deterministic, no AI call needed)
      // The generateInsights function now handles all rule-based logic locally
      const generatedInsights = generateInsights(filteredScans, profile);

      setInsights(generatedInsights);
      setWhatToImproveNext(getConsolidatedAction(generatedInsights, generatedConsistency));

      // Calculate Next Best Actions (simplified local logic or just take from insights)
      const actions = generatedInsights.map(i => i.action).slice(0, 3);
      setNextBestActions(actions);

      // Track View
      track("insights_generated", { count: filteredScans.length, isPremium });

    } else {
      // Reset if no data
      setInsights([]);
      setConsistency({ score: 0, breakdown: [] });
    }
  }, [filteredScans, profile, dailyReqs, isPremium]);


  // --- Helper for Range Stats (Average) ---
  const rangeStats = useMemo(() => {
    // We use filteredScans which respects the Start/End date selection
    if (!filteredScans.length) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Group by Day
    const dayMap = new Set<string>();
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    filteredScans.forEach(s => {
      dayMap.add(formatDay(s.created_at));
      const m = s.serving || 1;
      const n = s.result_json?.nutrients || {};
      totals.calories += (n.calories || 0) * m;
      totals.protein += (n.protein_g || 0) * m;
      totals.carbs += (n.carbohydrates_g || 0) * m;
      totals.fat += (n.fat_g || 0) * m;
    });

    const daysCount = dayMap.size || 1;

    return {
      calories: totals.calories / daysCount,
      protein: totals.protein / daysCount,
      carbs: totals.carbs / daysCount,
      fat: totals.fat / daysCount
    };
  }, [filteredScans]);


  // --- Onboarding State Logic ---
  const totalDaysLogged = useMemo(() => {
    const days = new Set(scans.map(s => formatDay(s.created_at)));
    return days.size;
  }, [scans]);

  const isOnboarding = totalDaysLogged < 2;

  const handleUnlockClick = (type: string) => {
    track("insight_blurred_click", { type });

    if (type === 'meal_planner') {
      setShowMealPlannerModal(true);
    } else if (type === 'nutrition') {
      setShowUnlockModal(true);
    } else {
      // Specific insight category
      setSelectedInsightType(type.replace('_', ' ')); // Humanize for the modal prop
      setShowInsightModal(true);
    }
  };

  const handleDownloadData = () => {
    track("download_data_click");

    if (!scans.length) {
      toast({ title: "No data to download", description: "Log some meals first!", variant: "default" });
      return;
    }

    // CSV Header
    const headers = ["Date", "Time", "Dish Name", "Calories (kcal)", "Protein (g)", "Carbs (g)", "Fat (g)", "Serving Size"];

    // CSV Rows
    const rows = scans.map(scan => {
      const dateObj = new Date(scan.created_at);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString();
      const n = scan.result_json?.nutrients || {};
      const serving = scan.serving || 1;

      // Nutrients are per serving in the JSON usually, or per 1 serving unit? 
      // Based on analytics usage: "stats.calories += (n.calories || 0) * m;"
      // So we should export the *consumed* amount (multiplied by serving) or the base?
      // Analytics view shows total consumed. Let's export total consumed for clarity.

      return [
        date,
        time,
        `"${(scan.result_json?.dish || "Unknown Meal").replace(/"/g, '""')}"`, // Escape quotes
        ((n.calories || 0) * serving).toFixed(0),
        ((n.protein_g || 0) * serving).toFixed(1),
        ((n.carbohydrates_g || 0) * serving).toFixed(1),
        ((n.fat_g || 0) * serving).toFixed(1),
        serving.toString()
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `food_log_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Analyzing your nutrition patterns...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Insights</h1>
            </div>
            <p className="text-muted-foreground text-lg pl-10">
              {isOnboarding
                ? "Start logging to unlock your personal coach."
                : new Date(endDate) < new Date(new Date().setDate(new Date().getDate() - 2))
                  ? `Showing data from ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                  : "These insights update as you log more meals."}
            </p>
          </div>

          {/* Date Controls */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border shadow-sm">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-auto border-0 focus-visible:ring-0 px-2 text-xs"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 w-auto border-0 focus-visible:ring-0 px-2 text-xs"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={reload}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 bg-white dark:bg-slate-900 ml-2" onClick={handleDownloadData}>
            <Download className="w-4 h-4" />
            Download your data
          </Button>
        </div>

        {/* Empty State (Day 0-1) */}
        {scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Utensils className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No meals logged yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Log your meals for at least 3 days to unlock personalized insights about your nutrition, timing, and habits.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Log New Meal</Button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* SECTION 1: Daily Intake */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                {startDate === endDate ? `Intake for ${new Date(endDate).toLocaleDateString()}` : "Average Daily Intake"}
              </h2>
              <p className="text-sm text-muted-foreground -mt-3 ml-7">
                {startDate === endDate
                  ? "Daily stats for this date; Compared to daily needs"
                  : "Average over selected dates; Compared to daily needs"
                }
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Calories Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Daily Calories</CardTitle>
                    <CardDescription>Average intake vs Target</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold">{Math.round(rangeStats.calories)}</span>
                      <span className="text-sm text-muted-foreground mb-1">/ {dailyReqs?.calories || 2000} kcal</span>
                    </div>
                    <Progress value={(rangeStats.calories / (dailyReqs?.calories || 2000)) * 100} className="h-3" />
                  </CardContent>
                </Card>

                {/* Macros Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Macro Balance</CardTitle>
                    <CardDescription>Average macro intake vs Targets</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    {/* Protein */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1"><Beef className="w-3 h-3" /> Protein</span>
                        <span className="text-muted-foreground">{Math.round(rangeStats.protein)} / {dailyReqs?.protein}g</span>
                      </div>
                      <Progress value={(rangeStats.protein / (dailyReqs?.protein || 100)) * 100} className="bg-red-100 dark:bg-red-900/20" indicatorClassName="bg-red-500" />
                    </div>

                    {/* Carbs */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1"><Wheat className="w-3 h-3" /> Carbs</span>
                        <span className="text-muted-foreground">{Math.round(rangeStats.carbs)} / {dailyReqs?.carbs}g</span>
                      </div>
                      <Progress value={(rangeStats.carbs / (dailyReqs?.carbs || 100)) * 100} className="bg-yellow-100 dark:bg-yellow-900/20" indicatorClassName="bg-yellow-500" />
                    </div>

                    {/* Fat */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1"><Droplet className="w-3 h-3" /> Fat</span>
                        <span className="text-muted-foreground">{Math.round(rangeStats.fat)} / {dailyReqs?.fat}g</span>
                      </div>
                      <Progress value={(rangeStats.fat / (dailyReqs?.fat || 100)) * 100} className="bg-blue-100 dark:bg-blue-900/20" indicatorClassName="bg-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Progress Toward Your Goal */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Progress Toward Your Goal
              </h2>
              <Card className="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b">
                    {/* Status Column */}
                    <div className="p-6 flex flex-col items-center justify-center text-center">
                      <div className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${goalProgress?.status === 'on_track' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        goalProgress?.status === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {goalProgress?.status === 'on_track' ? 'On Track' :
                          goalProgress?.status === 'warning' ? 'Caution' : 'Off Track'}
                      </div>
                      <p className="font-semibold text-lg">{profile?.goal?.replace('_', ' ') || 'Maintenance'}</p>
                      <p className="text-sm text-muted-foreground mt-1">Goal Status</p>
                    </div>

                    {/* Calorie Variance Column */}
                    <div className="p-6">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Calorie Comparison</span>
                        <span className={`text-lg font-bold ${(goalProgress?.avgCaloriesDiff || 0) > 100 ? 'text-red-500' :
                          (goalProgress?.avgCaloriesDiff || 0) < -100 ? 'text-amber-500' : 'text-green-500'
                          }`}>
                          {goalProgress?.avgCaloriesDiff && goalProgress.avgCaloriesDiff > 0 ? '+' : ''}{goalProgress?.avgCaloriesDiff} kcal/day
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {goalProgress?.message}
                      </p>
                    </div>

                    {/* Macro Adherence Column */}
                    <div className="p-6">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Macro Adherence</span>
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {goalProgress?.macroAdherencePercent}%
                        </span>
                      </div>
                      <Progress value={goalProgress?.macroAdherencePercent || 0} className="h-2 bg-indigo-50 dark:bg-indigo-900/20" indicatorClassName="bg-indigo-500" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Alignment with your {profile?.goal?.replace('_', ' ') || 'maintenance'} macro splits.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Prognosis Strip */}
                  <div className={`px-6 py-3 flex items-center gap-3 ${goalProgress?.status === 'on_track' ? 'bg-green-50/50 dark:bg-green-900/10' :
                    goalProgress?.status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                      'bg-red-50/50 dark:bg-red-900/10'
                    }`}>
                    {goalProgress?.status === 'on_track' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    <p className="text-sm font-medium">
                      {goalProgress?.prognosticText}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SECTION 2: Weekly Insights (The Coach) - RENAMED to "What your meals are telling us" */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    What your meals are telling us
                  </h2>
                  <p className="text-sm text-muted-foreground ml-7">
                    These insights update as you log more meals.
                  </p>
                </div>
                {!isPremium && (
                  <Button variant="ghost" size="sm" className="hidden sm:flex text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => handleUnlockClick('nutrition')}>
                    <Lock className="w-4 h-4 mr-2" />
                    Unlock
                  </Button>
                )}
              </div>

              {isOnboarding || insights.length === 0 ? (
                <Card className="bg-slate-50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart2 className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                    <p className="font-semibold text-muted-foreground">Insights unlock as patterns form.</p>
                    <p className="text-sm text-muted-foreground mt-1">Log at least 3 meals to unlock insights.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {insights.slice(0, 3).map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      isPremium={isPremium}
                      onUnlock={() => handleUnlockClick(insight.category)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 3: Macro Balance Over Time (New Chart) */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Macro Trends
              </h2>
              <MacroTrendsChart
                scans={filteredScans}
                isPremium={isPremium}
                onUnlock={() => handleUnlockClick('Macros')}
              />
            </section>

            {/* SECTION 4: Patterns & Consistency */}
            <div className="grid gap-8 md:grid-cols-2">

              {/* Eating Patterns */}
              <section className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Eating Patterns
                </h2>
                <Card className={!isPremium ? "opacity-70 flex-1" : "flex-1"}>
                  <CardHeader>
                    <CardTitle className="text-lg">Behavioral Analysis</CardTitle>
                    <CardDescription>Recurring meals and potential triggers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!isPremium ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Button onClick={() => handleUnlockClick('Eating_Patterns')} className="shadow-lg bg-primary hover:bg-primary/90 text-white gap-2">
                          <Lock className="w-4 h-4" />
                          Unlock Insights
                        </Button>
                        <p className="text-xs text-muted-foreground">Unlock to see your trigger meals</p>
                      </div>
                    ) : (
                      <>
                        {/* Custom Tab Header */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg mb-4">
                          <button
                            onClick={() => setActivePatternTab('repeated')}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${activePatternTab === 'repeated'
                              ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            Repeated
                          </button>
                          <button
                            onClick={() => setActivePatternTab('dense')}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${activePatternTab === 'dense'
                              ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            Calorie Dense
                          </button>
                          <button
                            onClick={() => setActivePatternTab('triggers')}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${activePatternTab === 'triggers'
                              ? "bg-white dark:bg-slate-800 shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            Triggers
                          </button>
                        </div>

                        {/* Repeated Meals Content */}
                        {activePatternTab === 'repeated' && (
                          aiEatingPatterns?.repeatedMeals && aiEatingPatterns.repeatedMeals.length > 0 ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                              {aiEatingPatterns.repeatedMeals.map((meal, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <p className="text-sm font-medium line-clamp-1">{meal.name}</p>
                                    <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded whitespace-nowrap">{meal.frequency}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{meal.insight}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">No repeated meals detected yet.</div>
                          )
                        )}

                        {/* Calorie Dense Content */}
                        {activePatternTab === 'dense' && (
                          aiEatingPatterns?.calorieDenseMeals && aiEatingPatterns.calorieDenseMeals.length > 0 ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                              {aiEatingPatterns.calorieDenseMeals.map((meal, i) => (
                                <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <p className="text-sm font-medium text-orange-900 dark:text-orange-400 line-clamp-1">{meal.name}</p>
                                    <span className="text-xs font-bold text-orange-700 whitespace-nowrap">{meal.calories} kcal</span>
                                  </div>
                                  <p className="text-xs text-orange-800/70 dark:text-orange-400/70 mt-1">{meal.insight}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">No high-density meals found.</div>
                          )
                        )}

                        {/* Trigger Insights Content */}
                        {activePatternTab === 'triggers' && (
                          aiEatingPatterns?.triggerInsights && aiEatingPatterns.triggerInsights.length > 0 ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                              {/* The 'triggerInsights' array is just strings per existing type definition, but usually we want structured data if possible. 
                                   Currently analyticsInsights returns just strings in triggerInsights array. 
                                   But we DO satisfy the check with `triggerMeals` in the backend logic.
                                   However, the client state `aiEatingPatterns.triggerInsights` is `string[]`.
                                   Wait, if I look at `analyticsInsights.ts`, `triggerInsights` maps to `t.insight`.
                                   But `triggerMeals` has names.
                                   The UI below previously rendered just strings: `{insight}`.
                                   I should stick to the existing data structure or use `aiEatingPatterns.triggerMeals` if available on the client type?
                                   Actually `activePatternTab` logic in previous code was:
                                   `aiEatingPatterns.triggerInsights.map(...)`
                                   Note: `analyticsInsights.ts` returns `triggerMeals` in the object too!
                                   Let's check the type definition in `MyFoodAnalyticsClient` (step 98).
                                   It imports `EatingPatterns` from `analyticsInsights`.
                                   `analyticsInsights` exports `triggerMeals` in the return object but the TYPE definition might vary?
                                   Step 119: `export type EatingPatterns = { ... triggerInsights: string[] }`. 
                                   Ah, `triggerMeals` is NOT on the type definition!
                                   So I can only access `triggerInsights` (strings) unless I updated the type.
                                   I did NOT update the type definition in `analyticsInsights.ts` to include `triggerMeals` array in the exported type, only the return value of the function.
                                   So I must use `triggerInsights` (strings) for now to be safe, or quickly patch the type.
                                   Given the user just wants a redesign, using strings is safer to avoid TS errors.
                               */ }
                              {aiEatingPatterns.triggerInsights.map((insight, i) => (
                                <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg flex gap-3 items-start">
                                  <Zap className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                  <p className="text-sm text-blue-900 dark:text-blue-400 font-medium leading-tight">{insight}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">No trigger patterns detected yet.</div>
                          )
                        )}

                        {!aiEatingPatterns && (
                          <p className="text-sm text-muted-foreground italic text-center py-8">Analyzing your eating patterns...</p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Consistency */}
              <section className="flex flex-col gap-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-500" />
                  Consistency Score
                </h2>
                <Card className="relative overflow-hidden flex-1">
                  {!isPremium && (
                    <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[4px] flex flex-col items-center justify-center p-4">
                      <Button onClick={() => handleUnlockClick('Consistency_Score')} className="shadow-lg bg-primary hover:bg-primary/90 text-white gap-2">
                        <Lock className="w-4 h-4" />
                        Unlock Score
                      </Button>
                    </div>
                  )}
                  <CardHeader className="pb-0">
                    <CardTitle className="text-lg">Consistency Score</CardTitle>
                    <CardDescription className="text-xs">Improve consistency to see better results.</CardDescription>
                  </CardHeader>
                  <CardContent className={isPremium ? "pt-6 flex flex-col items-center justify-center" : "pt-6 flex flex-col items-center justify-center opacity-30"}>
                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                      {/* Simple SVG Ring */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-primary transition-all duration-1000 ease-out"
                          strokeDasharray={365}
                          strokeDashoffset={365 - (365 * consistency.score) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{consistency.score}</span>
                        <span className="text-xs text-muted-foreground font-medium uppercase">Score</span>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="w-full space-y-2 mt-2">
                      {consistency.breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          {item.includes("✓") || item.includes("consistent") || item.includes("stable") ? <TrendingUp className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                          <span>{item.replace("✓ ", "").replace("⚠ ", "")}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>

            </div>

            {/* SECTION 5: What to Improve Next (Full Width Bottom) */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                What to Improve Next
              </h2>
              <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                {!isPremium && (
                  <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[4px] flex flex-col items-center justify-center p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Get personalized coaching on what to do next.</p>
                    <Button onClick={() => handleUnlockClick('nutrition')} className="shadow-lg bg-primary hover:bg-primary/90 text-white gap-2">
                      <Lock className="w-4 h-4" />
                      Unlock Coaching
                    </Button>
                  </div>
                )}
                <CardHeader className={!isPremium ? "opacity-20" : ""}>
                  <CardTitle className="text-xl font-bold text-primary">Priority Focus</CardTitle>
                  <CardDescription className="text-sm font-medium">Personalized recommendations based on your recent activity.</CardDescription>
                </CardHeader>
                <CardContent className={!isPremium ? "opacity-20" : ""}>
                  <div className="space-y-6">
                    <p className="text-lg font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                      {whatToImproveNext}
                    </p>

                    {nextBestActions.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-primary/10">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Next best actions</h4>
                        <ul className="grid gap-3 sm:grid-cols-2">
                          {nextBestActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg border border-primary/5 shadow-sm">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                              <span className="text-sm font-medium">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="mt-8">
                    <Button
                      onClick={() => isPremium ? window.open("/meal-planner", "_blank") : handleUnlockClick('meal_planner')}
                      className="w-full sm:w-auto h-11 px-8 rounded-full shadow-lg hover:shadow-xl transition-all relative z-20"
                    >
                      {!isPremium && <Lock className="w-4 h-4 mr-2" />}
                      Plan my Meals
                      {isPremium && <ChevronRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Missing Data Note (Premium Only) */}
            {isPremium && (
              <p className="text-xs text-center text-muted-foreground mt-8 opacity-70">
                * Some meals may be excluded from analytics if calorie or time details are missing.
              </p>
            )}

          </div>
        )}
      </div>

      {/* Modals */}
      <UnlockInsightsModal open={showUnlockModal} onOpenChange={setShowUnlockModal} />
      <InsightSpecificModal open={showInsightModal} onOpenChange={setShowInsightModal} insightType={selectedInsightType} />
      <MealPlannerModal open={showMealPlannerModal} onOpenChange={setShowMealPlannerModal} />
    </main>
  );
}
