"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { FoodScan } from "@/utils/foodScan";

type MacroTrendsChartProps = {
    scans: FoodScan[];
    isPremium: boolean;
    onUnlock: () => void;
};

export function MacroTrendsChart({ scans, isPremium, onUnlock }: MacroTrendsChartProps) {
    // Aggregate Data by Day
    const data = useMemo(() => {
        if (!scans.length) return [];

        const days: Record<string, { date: string; protein: number; carbs: number; fat: number }> = {};

        // Initialize last 7 days to 0 to ensure continuous chart
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue
            days[key] = { date: label, protein: 0, carbs: 0, fat: 0 };
        }

        scans.forEach((scan) => {
            const dayKey = scan.created_at.split("T")[0];
            if (days[dayKey]) {
                const mult = scan.serving || 1;
                const n = scan.result_json?.nutrients || {};
                days[dayKey].protein += (n.protein_g || 0) * mult;
                days[dayKey].carbs += (n.carbohydrates_g || 0) * mult;
                days[dayKey].fat += (n.fat_g || 0) * mult;
            }
        });

        return Object.values(days);
    }, [scans]);

    if (!isPremium) {
        return (
            <Card className="relative overflow-hidden border-slate-200 dark:border-slate-800">
                <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[6px] flex flex-col items-center justify-center p-4">
                    <div className="text-center space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">See how your macros trend over time.</p>
                        <Button onClick={onUnlock} className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90">
                            <Lock className="w-3.5 h-3.5 mr-2" />
                            Unlock Macro Trends
                        </Button>
                    </div>
                </div>
                <CardHeader className="pb-2 opacity-20">
                    <CardTitle className="text-lg">Macro Balance Over Time</CardTitle>
                    <CardDescription>7-Day Trend</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px] opacity-20 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800/50 rounded-md animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Macro Balance Over Time</CardTitle>
                <CardDescription>Your automated nutrition tracking</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProtein" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCarbs" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "var(--background)",
                                    borderColor: "var(--border)",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                                }}
                                itemStyle={{ fontSize: "12px", fontWeight: "500" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="protein"
                                name="Protein (g)"
                                stroke="#f43f5e"
                                fillOpacity={1}
                                fill="url(#colorProtein)"
                                strokeWidth={2}
                                stackId="1"
                            />
                            <Area
                                type="monotone"
                                dataKey="carbs"
                                name="Carbs (g)"
                                stroke="#f59e0b"
                                fillOpacity={1}
                                fill="url(#colorCarbs)"
                                strokeWidth={2}
                                stackId="1"
                            />
                            <Area
                                type="monotone"
                                dataKey="fat"
                                name="Fat (g)"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill="url(#colorFat)"
                                strokeWidth={2}
                                stackId="1"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
