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
      const cachedData = DataCache.get<{ scans: FoodScan[]; profile: any }>(cacheKey);

      let fetchedScans: FoodScan[] = [];
      let fetchedProfile: any = null;

      if (cachedData) {
        fetchedScans = cachedData.scans;
        fetchedProfile = cachedData.profile;
        setScans(fetchedScans);
        setProfile(fetchedProfile);
        setLoading(false);
      } else {
        // Fetch fresh
        const [profileResult, scansResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("food_scans")
            .select("id, created_at, serving, result_json")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }) // Oldest first for calculation, useful for range finding
        ]);

        if (profileResult.data) fetchedProfile = profileResult.data;
        if (scansResult.data) fetchedScans = scansResult.data as FoodScan[];

        setScans(fetchedScans);
        setProfile(fetchedProfile);

        // Cache
        DataCache.set(cacheKey, { scans: fetchedScans, profile: fetchedProfile }, CACHE_DURATION.SHORT);
      }
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
  useEffect(() => {
    if (!scans.length) return;
    if (!startDate) {
      // Default to last 7 days or full range if small
      const end = formatDay(new Date().toISOString());
      // Start date: 7 days ago
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const start = formatDay(d.toISOString());

      setStartDate(start);
      setEndDate(end);
    }
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

      // 3. Fetch AI Insights
      const fetchAIInsights = async () => {
        try {
          // Add a tiny loading note or flag if desired
          const { data, error } = await supabase.functions.invoke('coach-insights', {
            body: aiContext
          });

          if (error) throw error;

          if (data?.insights && Array.isArray(data.insights)) {
            setInsights(data.insights);
            if (data.goalProgress) {
              setGoalProgress(data.goalProgress);
            }
            if (data.eatingPatterns) {
              setAiEatingPatterns(data.eatingPatterns);
            }
            if (data.nextBestActions) {
              setNextBestActions(data.nextBestActions);
            }
            const nextAction = getConsolidatedAction(data.insights, generatedConsistency); // Use AI insights to determine next action
            setWhatToImproveNext(nextAction);
          } else {
            // Fallback to local if AI returns nothing
            console.warn("AI returned no insights, falling back to local.");
            const localInsights = generateInsights(filteredScans, profile);
            setInsights(localInsights);
            setWhatToImproveNext(getConsolidatedAction(localInsights, generatedConsistency));
          }

        } catch (err) {
          console.error("Failed to fetch AI insights:", err);
          // Silent fallback
          const localInsights = generateInsights(filteredScans, profile);
          setInsights(localInsights);
          setWhatToImproveNext(getConsolidatedAction(localInsights, generatedConsistency));
        }
      };

      void fetchAIInsights();

      // Track View
      track("insights_generated", { count: filteredScans.length, isPremium });

    } else {
      // Reset if no data
      setInsights([]);
      setConsistency({ score: 0, breakdown: [] });
    }
  }, [filteredScans, profile, dailyReqs, isPremium]);


  // --- Helper for Today's Stats ---
  const todayStats = useMemo(() => {
    const today = formatDay(new Date().toISOString());
    const todayScans = scans.filter(s => formatDay(s.created_at) === today);

    const stats = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    todayScans.forEach(s => {
      const m = s.serving || 1;
      const n = s.result_json?.nutrients || {};
      stats.calories += (n.calories || 0) * m;
      stats.protein += (n.protein_g || 0) * m;
      stats.carbs += (n.carbohydrates_g || 0) * m;
      stats.fat += (n.fat_g || 0) * m;
    });
    return stats;
  }, [scans]);


  // --- Onboarding State Logic ---
  const totalDaysLogged = useMemo(() => {
    const days = new Set(scans.map(s => formatDay(s.created_at)));
    return days.size;
  }, [scans]);

  const isOnboarding = totalDaysLogged < 2;

  const handleUnlockClick = (type: string) => {
    track("insight_blurred_click", { type });
    setSelectedInsightType(type);
    setShowUnlockModal(true);
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
              {isOnboarding ? "Start logging to unlock your personal coach." : "These insights update as you log more meals."}
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
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={reload}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
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

            {/* SECTION 1: Today's Intake & Goal Alignment (Top Row) */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Today at a Glance
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Calories Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Daily Calories</CardTitle>
                    <CardDescription>Daily Energy Balance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="text-3xl font-bold">{Math.round(todayStats.calories)}</span>
                      <span className="text-sm text-muted-foreground mb-1">/ {dailyReqs?.calories || 2000} kcal</span>
                    </div>
                    <Progress value={(todayStats.calories / (dailyReqs?.calories || 2000)) * 100} className="h-3" />
                  </CardContent>
                </Card>

                {/* Macros Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Macro Balance</CardTitle>
                    <CardDescription>Target vs Reality</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    {/* Protein */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1"><Beef className="w-3 h-3" /> Protein</span>
                        <span className="text-muted-foreground">{Math.round(todayStats.protein)} / {dailyReqs?.protein}g</span>
                      </div>
                      <Progress value={(todayStats.protein / (dailyReqs?.protein || 100)) * 100} className="bg-red-100 dark:bg-red-900/20" indicatorClassName="bg-red-500" />
                    </div>

                    {/* Carbs */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1"><Wheat className="w-3 h-3" /> Carbs</span>
                        <span className="text-muted-foreground">{Math.round(todayStats.carbs)} / {dailyReqs?.carbs}g</span>
                      </div>
                      <Progress value={(todayStats.carbs / (dailyReqs?.carbs || 100)) * 100} className="bg-yellow-100 dark:bg-yellow-900/20" indicatorClassName="bg-yellow-500" />
                    </div>

                    {/* Fat */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-1"><Droplet className="w-3 h-3" /> Fat</span>
                        <span className="text-muted-foreground">{Math.round(todayStats.fat)} / {dailyReqs?.fat}g</span>
                      </div>
                      <Progress value={(todayStats.fat / (dailyReqs?.fat || 100)) * 100} className="bg-blue-100 dark:bg-blue-900/20" indicatorClassName="bg-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Progress Toward Your Goal */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
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

            {/* SECTION 2: Weekly Insights (The Coach) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Weekly Insights
                </h2>
                {!isPremium && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                    Preview Mode
                  </span>
                )}
              </div>

              {isOnboarding ? (
                <Card className="bg-slate-50 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <BarChart2 className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                    <p className="font-semibold text-muted-foreground">Insights unlock as patterns form.</p>
                    <p className="text-sm text-muted-foreground mt-1">Log more meals to unlock insights.</p>
                    {/* Tiny progress indicator logic previously used is good, but spec copy is priority */}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {insights.length > 0 ? (
                    insights.slice(0, 3).map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        isPremium={isPremium}
                        onUnlock={() => handleUnlockClick(insight.category)}
                      />
                    ))
                  ) : (
                    <Card className="col-span-full bg-slate-50 border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <Sparkles className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                        <p className="font-semibold text-muted-foreground">No critical insights this week.</p>
                        <p className="text-sm text-muted-foreground mt-1">You&apos;re staying consistent! Keep logging.</p>
                      </CardContent>
                    </Card>
                  )}
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
                onUnlock={() => handleUnlockClick('nutrition')}
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
                      <div className="text-center py-6">
                        <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">Unlock to see your trigger meals</p>
                      </div>
                    ) : (
                      <>
                        {/* Repeated Meals */}
                        {aiEatingPatterns?.repeatedMeals && aiEatingPatterns.repeatedMeals.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Most Repeated</p>
                            {aiEatingPatterns.repeatedMeals.map((meal, i) => (
                              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium">{meal.name}</p>
                                  <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">{meal.frequency}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{meal.insight}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Calorie Dense */}
                        {aiEatingPatterns?.calorieDenseMeals && aiEatingPatterns.calorieDenseMeals.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Most Calorie-Dense</p>
                            {aiEatingPatterns.calorieDenseMeals.map((meal, i) => (
                              <div key={i} className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-lg">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-orange-900 dark:text-orange-400">{meal.name}</p>
                                  <span className="text-xs font-bold text-orange-700">{meal.calories} kcal</span>
                                </div>
                                <p className="text-xs text-orange-800/70 dark:text-orange-400/70 mt-1">{meal.insight}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Trigger Insights */}
                        {aiEatingPatterns?.triggerInsights && aiEatingPatterns.triggerInsights.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Trigger Insights</p>
                            {aiEatingPatterns.triggerInsights.map((insight, i) => (
                              <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-lg flex gap-3 items-start">
                                <Zap className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-blue-900 dark:text-blue-400 font-medium leading-tight">{insight}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {!aiEatingPatterns && (
                          <p className="text-sm text-muted-foreground italic">Analyzing your eating patterns...</p>
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
                      <Button onClick={() => handleUnlockClick('nutrition')} className="shadow-lg bg-primary hover:bg-primary/90 text-white gap-2">
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
                      onClick={() => window.open("/meal-planner", "_blank")}
                      className="w-full sm:w-auto h-11 px-8 rounded-full shadow-lg hover:shadow-xl transition-all"
                    >
                      Plan my Meals
                      <ChevronRight className="w-4 h-4 ml-2" />
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
