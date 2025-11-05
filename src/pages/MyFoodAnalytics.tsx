import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ArrowLeft } from "lucide-react";

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

const MyFoodAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [scans, setScans] = useState<FoodScan[]>([]);

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

  const stats = useMemo(() => {
    const daily: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }> = {};
    const dishes: Record<string, number> = {};
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const s of scans) {
      const d = formatDay(s.created_at);
      const mult = s.serving || 1;
      const n = s.result_json?.nutrients || {};
      const cal = (n.calories || 0) * mult;
      const pt = (n.protein_g || 0) * mult;
      const cb = (n.carbohydrates_g || 0) * mult;
      const ft = (n.fat_g || 0) * mult;
      if (!daily[d]) daily[d] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      daily[d].calories += cal; daily[d].protein += pt; daily[d].carbs += cb; daily[d].fat += ft; daily[d].count += 1;
      totals.calories += cal; totals.protein += pt; totals.carbs += cb; totals.fat += ft;
      const dish = (s.result_json?.dish || "Unknown").slice(0, 60);
      dishes[dish] = (dishes[dish] || 0) + 1;
    }

    const byDay = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0]));
    const topDishes = Object.entries(dishes).sort((a, b) => b[1] - a[1]).slice(0, 7);
    return { byDay, totals, topDishes };
  }, [scans]);

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

  const maxCal = Math.max(1, ...stats.byDay.map(([, v]: any) => v.calories));
  const maxCount = Math.max(1, ...stats.byDay.map(([, v]: any) => v.count));

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
            <div className="flex items-center gap-2">
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
                      <div className="h-48 flex items-end gap-2">
                        {stats.byDay.map(([d, v]: any) => (
                          <div key={d} className="flex-1 min-w-[14px]">
                            <div className="bg-primary/20 rounded-t-md" style={{ height: `${(v.calories / maxCal) * 100}%` }} />
                            <div className="text-[10px] text-muted-foreground mt-1 rotate-[-30deg] origin-left">{d.slice(5)}</div>
                          </div>
                        ))}
                      </div>
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
                      <div className="h-40 flex items-end gap-2">
                        {stats.byDay.map(([d, v]: any) => (
                          <div key={d} className="flex-1 min-w-[14px]">
                            <div className="bg-secondary rounded-t-md" style={{ height: `${(v.count / maxCount) * 100}%` }} />
                            <div className="text-[10px] text-muted-foreground mt-1 rotate-[-30deg] origin-left">{d.slice(5)}</div>
                          </div>
                        ))}
                      </div>
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


