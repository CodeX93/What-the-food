import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Lock, Sparkles, TrendingUp, AlertTriangle, CheckCircle, Info, Utensils, Flame, Target } from "lucide-react";
import { Insight } from "@/utils/analyticsInsights";
import { cn } from "@/lib/utils";

interface InsightCardProps {
    insight: Insight;
    isPremium: boolean;
    onUnlock: () => void;
    className?: string;
}

export function InsightCard({ insight, isPremium, onUnlock, className }: InsightCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Categories map to icons, but use neutral coloring
    const Icon = {
        macro_balance: Utensils,
        timing: TrendingUp,
        meal_pattern: Flame,
        consistency: Target,
        general: Sparkles
    }[insight.category] || Sparkles;

    // If NOT Premium, show the "teaser" view (Blurred)
    if (!isPremium) {
        return (
            <Card className={cn("relative overflow-hidden group border-slate-200 dark:border-slate-800", className)}>
                {/* Blurring Overlay */}
                <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[6px] flex flex-col items-center justify-center p-4 transition-all hover:backdrop-blur-[4px]">
                    <div className="text-center space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Insights unlock as patterns form.</p>
                        <Button onClick={onUnlock} className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90">
                            <Lock className="w-3.5 h-3.5 mr-2" />
                            Unlock insights
                        </Button>
                    </div>
                </div>

                <CardHeader className="pb-2 opacity-20">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {insight.category.replace('_', ' ')}
                        </span>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                        {insight.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="opacity-20">
                    <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                </CardContent>
            </Card>
        );
    }

    // Premium View - "Coach Note" Style
    return (
        <Card className={cn("transition-all duration-200 hover:shadow-md border-slate-200 dark:border-slate-800", className)}>
            <CardHeader className="pb-3 md:pb-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {insight.category.replace('_', ' ')}
                    </span>
                </div>
                <CardTitle className="text-lg font-semibold leading-tight text-foreground">
                    {insight.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="pb-3 space-y-4">
                {/* Insight Copy */}
                <p className="text-base text-muted-foreground leading-relaxed">
                    {insight.copy}
                </p>

                {/* The "Action" Box - Clearly Separated */}
                {insight.action && (
                    <div className="flex items-start gap-3 pl-3 border-l-2 border-primary/40 py-1">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-primary uppercase tracking-wide"> Recommendation</p>
                            <p className="text-sm font-medium text-foreground">
                                {insight.action}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0">
                {insight.whyMatch && (
                    <div className="w-full pt-2 border-t border-slate-100 dark:border-slate-800/50 mt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent flex items-center gap-1"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? "Hide details" : "Learn more"}
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>

                        {expanded && (
                            <p className="text-xs text-muted-foreground mt-2 animate-in fade-in slide-in-from-top-1 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                {insight.whyMatch}
                            </p>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
