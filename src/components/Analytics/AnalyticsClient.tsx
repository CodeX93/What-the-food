'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Calendar, Flame, Target, BarChart3 } from "lucide-react";

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

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
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
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, [router, toast]);

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
