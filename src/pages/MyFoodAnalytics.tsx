import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, ArrowLeft, CalendarRange } from "lucide-react";

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

const MyFoodAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [scans, setScans] = useState<FoodScan[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/auth";
        return;
      }
      const { data, error } = await supabase
        .from("food_scans")
        .select("id, created_at, serving, result_json")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setScans((data || []) as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!scans.length) return;
    const firstDay = formatDay(scans[0].created_at);
    const lastDay = formatDay(scans[scans.length - 1].created_at);
    if (!startDate) setStartDate(firstDay);
    if (!endDate) setEndDate(lastDay);
  }, [scans, startDate, endDate]);

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
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const s of filteredScans) {
      const d = formatDay(s.created_at);
      const mult = parseNumber(s.serving ?? 1) || 1;
      const n = s.result_json?.nutrients || {};
      const cal = parseNumber(n.calories) * mult;
      const pt = parseNumber(n.protein_g) * mult;
      const cb = parseNumber(n.carbohydrates_g) * mult;
      const ft = parseNumber(n.fat_g) * mult;
      if (!daily[d]) daily[d] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      daily[d].calories += cal; daily[d].protein += pt; daily[d].carbs += cb; daily[d].fat += ft; daily[d].count += 1;
      totals.calories += cal; totals.protein += pt; totals.carbs += cb; totals.fat += ft;
      const dish = (s.result_json?.dish || "Unknown").slice(0, 60);
      dishes[dish] = (dishes[dish] || 0) + 1;
    }

    const byDay = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
    const topDishes = Object.entries(dishes).sort((a, b) => b[1] - a[1]).slice(0, 7);
    return { byDay, totals, topDishes };
  }, [filteredScans]);

  const exportCsv = () => {
    const rows = [
      ["date", "calories", "protein_g", "carbs_g", "fat_g", "scan_count"],
      ...stats.byDay.map(([d, v]: any) => [d, v.calories, v.protein, v.carbs, v.fat, v.count])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "food-analytics.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const calorieValues = stats.byDay.map(([, v]: any) => v.calories);
  const countValues = stats.byDay.map(([, v]: any) => v.count);
  const maxCal = Math.max(1, ...calorieValues);
  const maxCount = Math.max(1, ...countValues);

  const buildBarSeries = (entries: Array<[string, any]>, accessor: (val: any) => number, max: number) => {
    const count = entries.length;
    if (!count || max <= 0) return { bars: [] as Array<{ x: number; y: number; width: number; height: number; label: string; value: number }>, labels: [] as string[], hasData: false };

    const step = 100 / count;
    const width = Math.max(step * 0.55, 4);
    const offset = Math.max((step - width) / 2, 0);

    const bars = entries.map(([date, val]: any, idx) => {
      const raw = accessor(val);
      const safeValue = Number.isFinite(raw) && raw > 0 ? raw : 0;
      const ratio = max ? Math.min(Math.max(safeValue / max, 0), 1) : 0;
      const height = ratio * 85; // leave top & bottom padding
      const x = idx * step + offset;
      const y = 95 - height; // bottom margin = 5
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

  const calorieSeries = buildBarSeries(stats.byDay, (v) => v.calories, maxCal);
  const countSeries = buildBarSeries(stats.byDay, (v) => v.count, maxCount);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="px-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">My Food Analytics</h1>
                <p className="text-muted-foreground">Insights from your scan history</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground" htmlFor="start-date">From</label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground" htmlFor="end-date">To</label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
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
              <Button variant="outline" onClick={reload}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button>
              <Button onClick={exportCsv}><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
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
                            {calorieSeries.bars.map((bar, idx) => (
                              <g key={`calorie-bar-${idx}`}>
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
                            {calorieSeries.bars.length ? "No calorie data in this range." : "No scan data yet. Analyze a meal to see trends here."}
                          </div>
                        )}
                      </div>
                      {calorieSeries.labels.length > 0 && (
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-3">
                          {calorieSeries.labels.map((label, idx) => (
                            <span key={`calorie-label-${idx}`} className="flex-1 text-center">
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
                            {countSeries.bars.map((bar, idx) => (
                              <g key={`count-bar-${idx}`}>
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
                            {countSeries.bars.length ? "No scans recorded in this range." : "No scans recorded yet."}
                          </div>
                        )}
                      </div>
                      {countSeries.labels.length > 0 && (
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-3">
                          {countSeries.labels.map((label, idx) => (
                            <span key={`count-label-${idx}`} className="flex-1 text-center">
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
                  <CardDescription>Most scanned items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topDishes.map(([name, cnt]: any) => (
                      <div key={name} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="truncate mr-2" title={name}>{name}</span>
                          <span className="text-muted-foreground">{cnt}</span>
                        </div>
                        <div className="h-2 bg-muted rounded">
                          <div className="h-full bg-primary rounded" style={{ width: `${(cnt / (stats.topDishes[0]?.[1] || 1)) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyFoodAnalytics;


