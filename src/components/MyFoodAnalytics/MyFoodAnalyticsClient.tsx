'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  RefreshCw,
  ArrowLeft,
  CalendarRange,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Apple,
  Candy,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ManualItem = {
  name?: string;
  calories?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
};

type FoodScan = {
  id: string;
  created_at: string;
  serving: number | null;
  result_json: {
    dish?: string;
    nutrients?: {
      calories?: number;
      protein_g?: number;
      carbohydrates_g?: number;
      fat_g?: number;
      fiber_g?: number;
      sugar_g?: number;
    };
    manualItems?: ManualItem[];
  };
};

const formatDay = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const parseNumber = (value: any): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      if (Number.isFinite(num)) return num;
    }
  }
  return 0;
};

// Calculate daily macro requirements based on profile
const calculateDailyRequirements = (profile: any) => {
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
  if (goal === "weight_loss") {
    tdee = tdee * 0.85; // 15% deficit
  } else if (goal === "weight_gain") {
    tdee = tdee * 1.15; // 15% surplus
  }

  const calories = Math.round(tdee);

  // Macro distribution (can be adjusted based on goal)
  let proteinPercent = 0.25; // 25% protein
  let carbsPercent = 0.45; // 45% carbs
  let fatPercent = 0.30; // 30% fat

  if (goal === "weight_loss") {
    proteinPercent = 0.30;
    carbsPercent = 0.35;
    fatPercent = 0.35;
  } else if (goal === "weight_gain") {
    proteinPercent = 0.20;
    carbsPercent = 0.50;
    fatPercent = 0.30;
  }

  // Calculate macros in grams
  const protein = Math.round((calories * proteinPercent) / 4); // 4 cal/g
  const carbs = Math.round((calories * carbsPercent) / 4); // 4 cal/g
  const fat = Math.round((calories * fatPercent) / 9); // 9 cal/g

  // Fiber: 14g per 1000 calories (minimum)
  const fiber = Math.round((calories / 1000) * 14);
  
  // Sugar: Max 10% of calories (WHO recommendation)
  const sugar = Math.round((calories * 0.10) / 4);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
  };
};

type MyFoodAnalyticsClientProps = {
  initialSubscription?: any;
};

export function MyFoodAnalyticsClient({ initialSubscription = null }: MyFoodAnalyticsClientProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const [scans, setScans] = useState<FoodScan[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [manualFoods, setManualFoods] = useState<Array<{ id: string; value: string }>>([
    { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" },
  ]);
  const [manualLoading, setManualLoading] = useState(false);

  const manualPlaceholders = ["2 boiled eggs", "Greek yogurt (1 cup)", "1 banana", "Protein shake with almond milk"];
  const quickAddOptions = ["Handful of almonds", "Oatmeal packet", "Apple", "Dark chocolate square"];

  const addManualFoodField = () => {
    setManualFoods((prev) => [...prev, { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${prev.length}`, value: "" }]);
  };

  const updateManualFood = (id: string, value: string) => {
    setManualFoods((prev) => prev.map((food) => (food.id === id ? { ...food, value } : food)));
  };

  const removeManualFood = (id: string) => {
    setManualFoods((prev) => (prev.length > 1 ? prev.filter((food) => food.id !== id) : prev));
  };

  const quickAddFood = (text: string) => {
    setManualFoods((prev) => {
      const copy = [...prev];
      const emptyIndex = copy.findIndex((food) => !food.value.trim());
      if (emptyIndex !== -1) {
        copy[emptyIndex] = { ...copy[emptyIndex], value: text };
      } else {
        copy.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${copy.length}`, value: text });
      }
      return copy;
    });
  };

  const handleManualEntry = async () => {
    const foods = manualFoods.map((item) => item.value.trim()).filter(Boolean);

    if (!foods.length) {
      toast({
        title: "Add at least one item",
        description: "Include a short description like “2 eggs” or “1 banana”.",
        variant: "destructive",
      });
      return;
    }

    try {
      setManualLoading(true);
      const { data: manualData, error } = await supabase.functions.invoke("manual-food", {
        body: { foods },
      });
      if (error) throw error;
      if (!manualData?.ok) {
        throw new Error(manualData?.error || "Unable to estimate nutrition for these foods");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const totals = manualData.totals || {};
      const dishName = `Manual: ${foods.join(", ")}`.slice(0, 200);
      const manualResult = {
        dish: dishName,
        description: "Manually logged foods",
        tags: ["manual"],
        servingSize: "1 serving",
        servingWeightGrams: undefined,
        servingGuidance: "Manually added to analytics",
        nutrients: {
          calories: totals.calories ?? null,
          protein_g: totals.protein_g ?? null,
          carbohydrates_g: totals.carbohydrates_g ?? null,
          fat_g: totals.fat_g ?? null,
        },
        ingredients: manualData.items?.map((item: any) => `${item.name}`) ?? foods,
        instructions: [],
        additionalInfo: "Logged manually by the user for quick tracking.",
        youtubeVideoUrl: "",
        manualItems: manualData.items || [],
        isManualEntry: true,
      };

      const scanId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { error: insertError } = await (supabase as any).from("food_scans").insert({
        id: scanId,
        user_id: session.user.id,
        image_path: `manual-entry-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`,
        image_url: null,
        serving: 1,
        result_json: manualResult,
      });
      if (insertError) throw insertError;

      // Generate additionalInfo and insights using Gemini
      try {
        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke("analyze-food", {
          body: {
            manualEntry: {
              dish: dishName.replace(/^Manual:\s*/, ""),
              ingredients: manualData.items?.map((item: any) => `${item.name}`) ?? foods,
            },
          },
        });
        
        if (!analyzeError && analyzeData?.ok && analyzeData?.analysis) {
          // Update the scan with generated additionalInfo and insights
          const updatedResult = {
            ...manualResult,
            additionalInfo: analyzeData.analysis.additionalInfo || manualResult.additionalInfo,
            insights: analyzeData.insights || undefined,
          };
          
          await (supabase as any)
            .from("food_scans")
            .update({ result_json: updatedResult })
            .eq("id", scanId);
        }
      } catch (genError) {
        // Don't fail the whole operation if generation fails
        console.error("Failed to generate additionalInfo/insights:", genError);
      }

      setManualFoods([{ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" }]);

      toast({
        title: "Added to My Food Analytics",
        description: "Manual foods have been logged successfully.",
      });

      await reload();
    } catch (error: any) {
      console.error("Manual entry error:", error);
      toast({
        title: "Failed to log foods",
        description: error?.message || "Unable to estimate these foods.",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  const isPremium = initialSubscription?.subscription_type === "premium";

  const reload = useCallback(async () => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
      setProfile(profileData);

      const { data, error } = await supabase
        .from("food_scans")
        .select("id, created_at, serving, result_json")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setScans((data || []) as FoodScan[]);
    } finally {
      setLoading(false);
    }
  }, [router, isPremium]);

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    void reload();
  }, [reload, isPremium]);

  useEffect(() => {
    if (!scans.length) return;
    const firstDay = formatDay(scans[0].created_at);
    const lastDay = formatDay(scans[scans.length - 1].created_at);
    setStartDate((prev) => (!prev || firstDay < prev ? firstDay : prev));
    setEndDate((prev) => (!prev || lastDay > prev ? lastDay : prev));
  }, [scans]);

  const filteredScans = useMemo(() => {
    if (!scans.length) return [] as FoodScan[];
    return scans.filter((scan) => {
      const day = formatDay(scan.created_at);
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      return true;
    });
  }, [scans, startDate, endDate]);

  const stats = useMemo(() => {
    const daily: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; count: number }> = {};
    const dishes: Record<string, number> = {};
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

    for (const scan of filteredScans) {
      const day = formatDay(scan.created_at);
      const servingsMultiplier = parseNumber(scan.serving ?? 1) || 1;
      const nutrients = scan.result_json?.nutrients || {};
      const calories = parseNumber(nutrients.calories) * servingsMultiplier;
      const protein = parseNumber(nutrients.protein_g) * servingsMultiplier;
      const carbs = parseNumber(nutrients.carbohydrates_g) * servingsMultiplier;
      const fat = parseNumber(nutrients.fat_g) * servingsMultiplier;
      const fiber = parseNumber(nutrients.fiber_g) * servingsMultiplier;
      const sugar = parseNumber(nutrients.sugar_g) * servingsMultiplier;

      if (!daily[day]) {
        daily[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, count: 0 };
      }

      daily[day].calories += calories;
      daily[day].protein += protein;
      daily[day].carbs += carbs;
      daily[day].fat += fat;
      daily[day].fiber += fiber;
      daily[day].sugar += sugar;
      daily[day].count += 1;

      totals.calories += calories;
      totals.protein += protein;
      totals.carbs += carbs;
      totals.fat += fat;
      totals.fiber += fiber;
      totals.sugar += sugar;

      const addDishCount = (label: string) => {
        const key = label.slice(0, 60) || "Unknown";
        dishes[key] = (dishes[key] || 0) + 1;
      };

      const manualItems = scan.result_json?.manualItems;
      if (Array.isArray(manualItems) && manualItems.length > 0) {
        manualItems.forEach((item) => addDishCount(item?.name || "Manual item"));
      } else {
        addDishCount(scan.result_json?.dish || "Unknown");
      }
    }

    const byDay = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
    const topDishes = Object.entries(dishes).sort((a, b) => b[1] - a[1]).slice(0, 7);

    return { byDay, totals, topDishes };
  }, [filteredScans]);

  const exportCsv = () => {
    const rows = [
      ["date", "calories", "protein_g", "carbs_g", "fat_g", "scan_count"],
      ...stats.byDay.map(([date, values]: any) => [date, values.calories, values.protein, values.carbs, values.fat, values.count]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "food-analytics.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const calorieValues = stats.byDay.map(([, values]: any) => values.calories);
  const countValues = stats.byDay.map(([, values]: any) => values.count);
  const maxCal = Math.max(1, ...calorieValues);
  const maxCount = Math.max(1, ...countValues);

  const buildBarSeries = (
    entries: Array<[string, any]>,
    accessor: (value: any) => number,
    max: number
  ) => {
    const count = entries.length;
    if (!count || max <= 0) {
      return {
        bars: [] as Array<{ x: number; y: number; width: number; height: number; label: string; value: number }>,
        labels: [] as string[],
        hasData: false,
      };
    }

    const step = 100 / count;
    const width = Math.max(step * 0.55, 4);
    const offset = Math.max((step - width) / 2, 0);

    const bars = entries.map(([date, val]: any, index) => {
      const raw = accessor(val);
      const safeValue = Number.isFinite(raw) && raw > 0 ? raw : 0;
      const ratio = max ? Math.min(Math.max(safeValue / max, 0), 1) : 0;
      const height = ratio * 85;
      const x = index * step + offset;
      const y = 95 - height;
      return {
        x,
        y,
        width,
        height,
        label: date.slice(5),
        value: safeValue,
      };
    });

    const labels = bars.map((bar) => bar.label);
    const hasData = bars.some((bar) => bar.value > 0);
    return { bars, labels, hasData };
  };

  const calorieSeries = buildBarSeries(stats.byDay, (value) => value.calories, maxCal);
  const countSeries = buildBarSeries(stats.byDay, (value) => value.count, maxCount);

  // Calculate today's totals
  const today = formatDay(new Date().toISOString());
  const todayStats = stats.byDay.find(([date]) => date === today)?.[1] || {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
  };

  // Get daily requirements
  const dailyRequirements = useMemo(() => calculateDailyRequirements(profile), [profile]);

  if (!isPremium) {
    return (
      <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/30">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto border-primary/30 bg-background/80 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">Analytics is Premium</CardTitle>
                <CardDescription className="text-base">
                  Upgrade to visualize your nutrition trends, daily totals, and AI-estimated manual entries all in one
                  dashboard.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                    title: "Unified insights",
                    body: "See every scan plus manual food logs reflected instantly in your totals.",
                  },
                  {
                    icon: <Sparkles className="h-5 w-5 text-primary" />,
                    title: "Actionable trends",
                    body: "Track calories, macros, and top dishes over time with exportable reports.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {feature.icon}
                      {feature.title}
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.body}</p>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button size="lg" className="px-8" onClick={() => router.push("/plans")}>
                  Upgrade to Premium <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Already upgraded? Refresh this page after your plan activates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="px-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Food Analytics</h1>
              <p className="text-muted-foreground">Insights from your scan history</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground" htmlFor="start-date">
                From
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground" htmlFor="end-date">
                To
              </label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mt-4"
              onClick={() => {
                if (scans.length) {
                  setStartDate(formatDay(scans[0].created_at));
                  setEndDate(formatDay(scans[scans.length - 1].created_at));
                } else {
                  setStartDate("");
                  setEndDate("");
                }
              }}
              title="Reset date range"
            >
              <CalendarRange className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        

        {loading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Intake - Horizontal Layout */}
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Intake</CardTitle>
                <CardDescription>
                  {dailyRequirements
                    ? "Personalized targets based on your profile"
                    : "Complete your profile to see personalized targets"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    {
                      icon: Flame,
                      label: "Calories",
                      value: Math.round(todayStats.calories),
                      target: dailyRequirements?.calories,
                      unit: "kcal",
                      color: "orange",
                      bgColor: "bg-orange-100/90",
                      borderColor: "border-orange-200",
                      textColor: "text-orange-900",
                    },
                    {
                      icon: Beef,
                      label: "Protein",
                      value: Math.round(todayStats.protein),
                      target: dailyRequirements?.protein,
                      unit: "g",
                      color: "rose",
                      bgColor: "bg-rose-100/90",
                      borderColor: "border-rose-200",
                      textColor: "text-rose-900",
                    },
                    {
                      icon: Wheat,
                      label: "Carbs",
                      value: Math.round(todayStats.carbs),
                      target: dailyRequirements?.carbs,
                      unit: "g",
                      color: "yellow",
                      bgColor: "bg-yellow-100/90",
                      borderColor: "border-yellow-200",
                      textColor: "text-yellow-900",
                    },
                    {
                      icon: Droplet,
                      label: "Fat",
                      value: Math.round(todayStats.fat),
                      target: dailyRequirements?.fat,
                      unit: "g",
                      color: "sky",
                      bgColor: "bg-sky-100/90",
                      borderColor: "border-sky-200",
                      textColor: "text-sky-900",
                    },
                    {
                      icon: Apple,
                      label: "Fiber",
                      value: Math.round(todayStats.fiber),
                      target: dailyRequirements?.fiber,
                      unit: "g",
                      color: "emerald",
                      bgColor: "bg-emerald-100/90",
                      borderColor: "border-emerald-200",
                      textColor: "text-emerald-900",
                    },
                    {
                      icon: Candy,
                      label: "Sugar",
                      value: Math.round(todayStats.sugar),
                      target: dailyRequirements?.sugar,
                      unit: "g",
                      color: "rose",
                      bgColor: "bg-rose-100/90",
                      borderColor: "border-rose-200",
                      textColor: "text-rose-900",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const hasTarget = item.target !== undefined && item.target !== null;
                    const target = item.target ?? 0;
                    const isOver = hasTarget && item.value > target;
                    const isUnder = hasTarget && item.value < target * 0.9; // 10% tolerance
                    const isGood = hasTarget && !isOver && !isUnder;

                    return (
                      <div
                        key={item.label}
                        className={`p-3 rounded-lg border ${item.bgColor} ${item.borderColor} ${item.textColor} flex flex-col`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold">{item.value}</span>
                            <span className="text-xs opacity-70">{item.unit}</span>
                          </div>
                          {hasTarget && (
                            <>
                              <div className="flex items-center gap-1 text-xs">
                                {isOver ? (
                                  <>
                                    <TrendingUp className="h-3 w-3 text-red-600" />
                                    <span className="text-red-600 font-semibold">&gt; {target}</span>
                                  </>
                                ) : isUnder ? (
                                  <>
                                    <TrendingDown className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600 font-semibold">&lt; {target}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-green-600 font-semibold">✓ {target}</span>
                                  </>
                                )}
                              </div>
                              <div className="mt-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isOver
                                      ? "bg-red-500"
                                      : isUnder
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min((item.value / target) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Daily Calories Chart - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Calories</CardTitle>
                <CardDescription>Total calories per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="h-56">
                      {calorieSeries.bars.length && calorieSeries.hasData ? (
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="calorieBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#4ade80" />
                              <stop offset="100%" stopColor="#22c55e" />
                            </linearGradient>
                          </defs>
                          <rect x="0" y="0" width="100" height="100" fill="#14532d" opacity="0.05" />
                          <line x1="0" y1="95" x2="100" y2="95" stroke="#374151" strokeWidth="0.6" />
                          {calorieSeries.bars.map((bar, index) => (
                            <g key={`calorie-bar-${index}`}>
                              <rect
                                x={bar.x}
                                y={bar.height > 0 ? bar.y : 95}
                                width={bar.width}
                                height={bar.height > 0 ? bar.height : 0.8}
                                rx={1.2}
                                fill="url(#calorieBarGradient)"
                                opacity={0.9}
                              >
                                <title>{`${bar.value.toFixed(0)} kcal`}</title>
                              </rect>
                            </g>
                          ))}
                        </svg>
                      ) : (
                        <div className="w-full text-center text-sm text-muted-foreground py-10">
                          {calorieSeries.bars.length
                            ? "No calorie data in this range."
                            : "No scan data yet. Analyze a meal to see trends here."}
                        </div>
                      )}
                    </div>
                    {calorieSeries.labels.length > 0 && (
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-3">
                        {calorieSeries.labels.map((label, index) => (
                          <span key={`calorie-label-${index}`} className="flex-1 text-center">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scans per Day and My Eats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Scans per Day</CardTitle>
                  <CardDescription>Frequency over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[700px]">
                      <div className="h-56">
                        {countSeries.bars.length && countSeries.hasData ? (
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="countBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#60a5fa" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                            </defs>
                            <rect x="0" y="0" width="100" height="100" fill="#1e3a8a" opacity="0.05" />
                            <line x1="0" y1="95" x2="100" y2="95" stroke="#374151" strokeWidth="0.6" />
                            {countSeries.bars.map((bar, index) => (
                              <g key={`count-bar-${index}`}>
                                <rect
                                  x={bar.x}
                                  y={bar.height > 0 ? bar.y : 95}
                                  width={bar.width}
                                  height={bar.height > 0 ? bar.height : 0.8}
                                  rx={1.2}
                                  fill="url(#countBarGradient)"
                                  opacity={0.9}
                                >
                                  <title>{`${bar.value} scans`}</title>
                                </rect>
                              </g>
                            ))}
                          </svg>
                        ) : (
                          <div className="w-full text-center text-sm text-muted-foreground py-10">
                            {countSeries.bars.length
                              ? "No scans recorded in this range."
                              : "No scans recorded yet."}
                          </div>
                        )}
                      </div>
                      {countSeries.labels.length > 0 && (
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-3">
                          {countSeries.labels.map((label, index) => (
                            <span key={`count-label-${index}`} className="flex-1 text-center">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Eats</CardTitle>
                  <CardDescription>Most logged meals </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topDishes.map(([name, count]: any) => (
                      <div key={name} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="truncate mr-2" title={name}>
                            {name}
                          </span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded">
                          <div
                            className="h-full bg-primary rounded"
                            style={{ width: `${(count / (stats.topDishes[0]?.[1] || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          </div>
          </div>
        )}
        {/* Macro Distribution Chart */}
        {dailyRequirements && (
          <Card className="mb-8 mt-8">
            <CardHeader>
              <CardTitle>Macro Distribution</CardTitle>
              <CardDescription>Today&apos;s macro breakdown based on your intake</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      {(() => {
                        const totalCalories = todayStats.calories || 1;
                        const proteinCal = todayStats.protein * 4;
                        const carbsCal = todayStats.carbs * 4;
                        const fatCal = todayStats.fat * 9;
                        
                        const proteinPercent = (proteinCal / totalCalories) * 100;
                        const carbsPercent = (carbsCal / totalCalories) * 100;
                        const fatPercent = (fatCal / totalCalories) * 100;

                        let currentOffset = 0;
                        const circumference = 2 * Math.PI * 40;

                        return (
                          <>
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#f472b6"
                              strokeWidth="8"
                              strokeDasharray={circumference}
                              strokeDashoffset={circumference - (proteinPercent / 100) * circumference}
                              strokeLinecap="round"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#facc15"
                              strokeWidth="8"
                              strokeDasharray={circumference}
                              strokeDashoffset={
                                circumference -
                                ((proteinPercent + carbsPercent) / 100) * circumference
                              }
                              strokeLinecap="round"
                              transform={`rotate(${(proteinPercent / 100) * 360} 50 50)`}
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#93c5fd"
                              strokeWidth="8"
                              strokeDasharray={circumference}
                              strokeDashoffset={
                                circumference -
                                ((proteinPercent + carbsPercent + fatPercent) / 100) * circumference
                              }
                              strokeLinecap="round"
                              transform={`rotate(${((proteinPercent + carbsPercent) / 100) * 360} 50 50)`}
                            />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{Math.round(todayStats.calories)}</div>
                        <div className="text-xs text-muted-foreground">kcal</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3">
                  {[
                    {
                      label: "Protein",
                      value: todayStats.protein,
                      percent: todayStats.calories
                        ? ((todayStats.protein * 4) / todayStats.calories) * 100
                        : 0,
                      color: "bg-rose-500",
                      target: dailyRequirements.protein,
                    },
                    {
                      label: "Carbs",
                      value: todayStats.carbs,
                      percent: todayStats.calories
                        ? ((todayStats.carbs * 4) / todayStats.calories) * 100
                        : 0,
                      color: "bg-yellow-500",
                      target: dailyRequirements.carbs,
                    },
                    {
                      label: "Fat",
                      value: todayStats.fat,
                      percent: todayStats.calories
                        ? ((todayStats.fat * 9) / todayStats.calories) * 100
                        : 0,
                      color: "bg-sky-500",
                      target: dailyRequirements.fat,
                    },
                  ].map((macro) => (
                    <div key={macro.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${macro.color}`} />
                          <span className="font-medium">{macro.label}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {macro.value.toFixed(0)}g ({macro.percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${macro.color}`}
                          style={{ width: `${Math.min(macro.percent, 100)}%` }}
                        />
                      </div>
                      {macro.target && (
                        <div className="text-xs text-muted-foreground">
                          Target: {macro.target}g
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
