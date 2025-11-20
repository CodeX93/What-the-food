'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, ArrowLeft, CalendarRange, Loader2, Plus, X } from "lucide-react";
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

export function MyFoodAnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const [scans, setScans] = useState<FoodScan[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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

      const { error: insertError } = await (supabase as any).from("food_scans").insert({
        user_id: session.user.id,
        image_path: `manual-entry-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`,
        image_url: null,
        serving: 1,
        result_json: manualResult,
      });
      if (insertError) throw insertError;

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

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }
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
  }, [router]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
    const daily: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }> = {};
    const dishes: Record<string, number> = {};
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const scan of filteredScans) {
      const day = formatDay(scan.created_at);
      const servingsMultiplier = parseNumber(scan.serving ?? 1) || 1;
      const nutrients = scan.result_json?.nutrients || {};
      const calories = parseNumber(nutrients.calories) * servingsMultiplier;
      const protein = parseNumber(nutrients.protein_g) * servingsMultiplier;
      const carbs = parseNumber(nutrients.carbohydrates_g) * servingsMultiplier;
      const fat = parseNumber(nutrients.fat_g) * servingsMultiplier;

      if (!daily[day]) {
        daily[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      }

      daily[day].calories += calories;
      daily[day].protein += protein;
      daily[day].carbs += carbs;
      daily[day].fat += fat;
      daily[day].count += 1;

      totals.calories += calories;
      totals.protein += protein;
      totals.carbs += carbs;
      totals.fat += fat;

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
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

            <Card>
              <CardHeader>
                <CardTitle>Totals</CardTitle>
                <CardDescription>Cumulative macros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                    <div className="text-xl font-semibold">{Math.round(stats.totals.calories)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Protein (g)</div>
                    <div className="text-xl font-semibold">{Math.round(stats.totals.protein)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Carbs (g)</div>
                    <div className="text-xl font-semibold">{Math.round(stats.totals.carbs)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Fat (g)</div>
                    <div className="text-xl font-semibold">{Math.round(stats.totals.fat)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                <CardTitle>Top Dishes</CardTitle>
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
        )}
        <Card className="mb-8 mt-8">
          <CardHeader>
            <CardTitle>Log foods manually</CardTitle>
            <CardDescription>Add quick bites without scanning. We’ll estimate macros and include them in these analytics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Describe each item with quantity (e.g., “2 eggs”, “1 banana”, “protein shake with almond milk”).
              </p>
              <div className="flex flex-wrap gap-2">
                {quickAddOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => quickAddFood(item)}
                    className="px-3 py-1 rounded-full border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {item}
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
              <Button variant="outline" size="sm" onClick={addManualFoodField} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Add another food
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
             
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
