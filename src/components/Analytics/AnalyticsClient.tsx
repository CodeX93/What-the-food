'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Calendar, Flame, Target, BarChart3, Loader2, Plus, X } from "lucide-react";

interface ScanRecord {
  id: string;
  user_id: string;
  created_at: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface AnalyticsData {
  totalScans: number;
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  scansThisWeek: number;
  scansThisMonth: number;
}

interface ManualFoodItem {
  name: string;
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  notes?: string;
}

interface ManualSummary {
  foods: string[];
  items: ManualFoodItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  };
  createdAt: string;
}

export function AnalyticsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalScans: 0,
    totalCalories: 0,
    avgCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    scansThisWeek: 0,
    scansThisMonth: 0,
  });
  const [manualFoods, setManualFoods] = useState<Array<{ id: string; value: string }>>([
    { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" },
  ]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSummary, setManualSummary] = useState<ManualSummary | null>(null);

  const fetchAnalytics = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          router.push("/auth");
          return;
        }

        const { data: scansData, error: scansError } = await supabase
          .from("scans")
          .select("*")
          .eq("user_id", session.user.id);

        if (scansError) {
          throw scansError;
        }

        const scans = (scansData as ScanRecord[] | null) || [];
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const scansThisWeek = scans.filter((scan) => new Date(scan.created_at) >= weekAgo).length;
        const scansThisMonth = scans.filter((scan) => new Date(scan.created_at) >= monthAgo).length;

        const totalCalories = scans.reduce((sum, scan) => sum + (scan.calories || 0), 0);
        const totalProtein = scans.reduce((sum, scan) => sum + (scan.protein || 0), 0);
        const totalCarbs = scans.reduce((sum, scan) => sum + (scan.carbs || 0), 0);
        const totalFat = scans.reduce((sum, scan) => sum + (scan.fat || 0), 0);

        setAnalytics({
          totalScans: scans.length,
          totalCalories,
          avgCalories: scans.length > 0 ? Math.round(totalCalories / scans.length) : 0,
          totalProtein: Math.round(totalProtein),
          totalCarbs: Math.round(totalCarbs),
          totalFat: Math.round(totalFat),
          scansThisWeek,
          scansThisMonth,
        });
      } catch (err) {
        console.error("Error fetching analytics:", err);
        toast({
          title: "Error",
          description: "Failed to load analytics data.",
          variant: "destructive",
        });
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [router, toast]
  );

  useEffect(() => {
    void fetchAnalytics(true);
  }, [fetchAnalytics]);

  const manualPlaceholders = ["2 boiled eggs", "1 banana", "Protein shake with almond milk", "Handful of almonds"];
  const sampleFoods = ["1 apple", "Greek yogurt (1 cup)", "Dark chocolate square", "1 tbsp peanut butter"];

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
      const emptyIndex = copy.findIndex((item) => !item.value.trim());
      const value = text;
      if (emptyIndex !== -1) {
        copy[emptyIndex] = { ...copy[emptyIndex], value };
      } else {
        copy.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${copy.length}`, value });
      }
      return copy;
    });
  };

  const handleManualEntry = async () => {
    const foods = manualFoods.map((food) => food.value.trim()).filter(Boolean);

    if (foods.length === 0) {
      toast({
        title: "Add at least one food",
        description: "Enter foods like “2 eggs”, “1 banana”, “protein shake”, each on its own line.",
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
        throw new Error(manualData?.error || "Failed to estimate nutrition");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const totals = manualData.totals || {};
      const dishName = `Manual Input: ${foods.join(", ")}`.slice(0, 200);

      const { error: insertError } = await (supabase as any).from("scans").insert({
        user_id: session.user.id,
        dish_name: dishName,
        calories: Math.round(totals.calories ?? 0),
        protein: Math.round(totals.protein_g ?? 0),
        carbs: Math.round(totals.carbohydrates_g ?? 0),
        fat: Math.round(totals.fat_g ?? 0),
        analysis_data: { manualItems: manualData.items },
      });

      if (insertError) throw insertError;

      setManualSummary({
        foods,
        items: manualData.items || [],
        totals: {
          calories: Math.round(totals.calories ?? 0),
          protein_g: Math.round(totals.protein_g ?? 0),
          carbohydrates_g: Math.round(totals.carbohydrates_g ?? 0),
          fat_g: Math.round(totals.fat_g ?? 0),
        },
        createdAt: new Date().toISOString(),
      });
      setManualFoods([{ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" }]);

      toast({
        title: "Manual foods logged",
        description: "We added these foods to your analytics.",
      });

      await fetchAnalytics(false);
    } catch (error: any) {
      console.error("Manual entry error:", error);
      toast({
        title: "Failed to add foods",
        description: error?.message || "Unable to estimate nutrition for these foods.",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">Track your nutrition insights and scanning habits</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalScans}</div>
              <p className="text-xs text-muted-foreground mt-1">All time scans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.scansThisWeek}</div>
              <p className="text-xs text-muted-foreground mt-1">Scans in last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.scansThisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">Scans in last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Calories</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgCalories}</div>
              <p className="text-xs text-muted-foreground mt-1">Per scan average</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Calories</CardTitle>
              <CardDescription>Sum of all scanned items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{analytics.totalCalories.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">kcal total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average per Scan</CardTitle>
              <CardDescription>Nutrition averages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Protein</span>
                <span className="font-semibold">
                  {analytics.totalScans > 0 ? Math.round(analytics.totalProtein / analytics.totalScans) : 0}g
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Carbs</span>
                <span className="font-semibold">
                  {analytics.totalScans > 0 ? Math.round(analytics.totalCarbs / analytics.totalScans) : 0}g
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fat</span>
                <span className="font-semibold">
                  {analytics.totalScans > 0 ? Math.round(analytics.totalFat / analytics.totalScans) : 0}g
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Total Protein
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalProtein.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">grams</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Total Carbs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalCarbs.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">grams</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Total Fat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalFat.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-1">grams</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Log foods manually</CardTitle>
            <CardDescription>
              Add snacks or quick bites without scanning. We’ll estimate nutrition and include it in your analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Describe each item with a quick quantity (e.g., “2 boiled eggs”, “1 banana”, “protein shake with almond milk”).
              </p>
              <div className="flex flex-wrap gap-2">
                {sampleFoods.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => quickAddFood(sample)}
                    className="px-3 py-1 rounded-full border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {manualFoods.map((food, index) => (
                <div className="flex gap-2" key={food.id}>
                  <Input
                    value={food.value}
                    onChange={(event) => updateManualFood(food.id, event.target.value)}
                    placeholder={manualPlaceholders[index % manualPlaceholders.length]}
                  />
                  {manualFoods.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeManualFood(food.id)}
                      aria-label="Remove food"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addManualFoodField}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" /> Add another food
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Uses Gemini + USDA references. Totals will appear in Analytics and Scan History as “Manual entry”.
              </p>
              <Button onClick={handleManualEntry} disabled={manualLoading}>
                {manualLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging…
                  </>
                ) : (
                  "Add to analytics"
                )}
              </Button>
            </div>

            {manualSummary && (
              <div className="rounded-2xl border bg-muted/40 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Last manual entry</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(manualSummary.createdAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {manualSummary.foods.map((food, idx) => (
                    <span
                      key={`${food}-${idx}`}
                      className="px-3 py-1 rounded-full border text-xs font-medium bg-background"
                    >
                      {food}
                    </span>
                  ))}
                </div>
                {manualSummary.items.length > 0 && (
                  <div className="space-y-2">
                    {manualSummary.items.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-background px-3 py-2"
                      >
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(item.calories)} kcal · P {Math.round(item.protein_g)}g · C{" "}
                          {Math.round(item.carbohydrates_g)}g · F {Math.round(item.fat_g)}g
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border bg-background py-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Calories</p>
                    <p className="text-lg font-semibold">{manualSummary.totals.calories} kcal</p>
                  </div>
                  <div className="rounded-xl border bg-background py-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Protein</p>
                    <p className="text-lg font-semibold">{manualSummary.totals.protein_g} g</p>
                  </div>
                  <div className="rounded-xl border bg-background py-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Carbs</p>
                    <p className="text-lg font-semibold">{manualSummary.totals.carbohydrates_g} g</p>
                  </div>
                  <div className="rounded-xl border bg-background py-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Fat</p>
                    <p className="text-lg font-semibold">{manualSummary.totals.fat_g} g</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {analytics.totalScans === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
              <p className="text-muted-foreground mb-4">
                Start scanning food items to see your nutrition insights here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
