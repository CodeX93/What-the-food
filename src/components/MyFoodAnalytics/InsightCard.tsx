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

    // If NOT Premium, show the Locked view (Title visible, content hidden)
    if (!isPremium) {
        return (
            <Card className={cn("relative overflow-hidden group border-slate-200 dark:border-slate-800", className)}>
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {insight.category.replace('_', ' ')}
                        </span>
                    </div>
                    <CardTitle className="text-lg leading-tight text-foreground/80">
                        {insight.title}
                    </CardTitle>
                </CardHeader>

                <CardContent className="relative pt-2">
                    {/* Fake blurred lines to simulate content */}
                    <div className="space-y-2 opacity-20 filter blur-[2px] select-none">
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-[90%]"></div>
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-[80%]"></div>
                    </div>

                    {/* CTA Overlay positioned over content */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onUnlock}
                            className="shadow-sm border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs font-medium h-8"
                        >
                            Unlock to view
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Premium View - "Coach Note" Style
    return (
        <Card className={cn("transition-all duration-300 hover:shadow-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group", className)}>
            <CardHeader className="pb-3 md:pb-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className={cn(
                        "flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        insight.type === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            insight.type === "success" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{insight.category.replace('_', ' ')}</span>
                    </div>
                </div>

                <CardTitle className="text-xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                    {insight.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="pb-3 space-y-5">
                {/* Insight Copy */}
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {insight.copy}
                </p>

                {/* The "Action" Box - Card within a Card */}
                {insight.action && (
                    <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/10 relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1 bg-primary/20 rounded-full shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-primary uppercase tracking-wide">Coach Recommendation</p>
                                <p className="text-sm font-medium text-foreground leading-snug">
                                    {insight.action}
                                </p>
                            </div>
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
