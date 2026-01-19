import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface BaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// --- Specific Modal 1: General Unlock ---

export function UnlockInsightsModal({ open, onOpenChange }: BaseModalProps) {
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        Understand what your meals mean
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        You’re already logging food. Unlock insights to see patterns, trends, and what to improve next.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {["Personalized nutrition insights", "Weekly trends & macro balance", "Actionable guidance based on your goal"].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                            <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium">{item}</span>
                        </div>
                    ))}
                </div>

                <DialogFooter className="flex-col gap-2 sm:gap-0">
                    <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={() => router.push("/plans")}>
                        Unlock insights
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                        Maybe later
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Specific Modal 2: Insight Context ---
interface InsightSpecificModalProps extends BaseModalProps {
    insightType?: string;
}

export function InsightSpecificModal({ open, onOpenChange, insightType = "protein" }: InsightSpecificModalProps) {
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        See your {insightType} trends
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        Understand how your {insightType} intake affects satiety, recovery, and progress over time.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button className="w-full" size="lg" onClick={() => router.push("/plans")}>
                        Unlock {insightType} insights
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Specific Modal 3: Meal Planner ---

export function MealPlannerModal({ open, onOpenChange }: BaseModalProps) {
    const router = useRouter();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">Plan meals that support your habits</DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        Your meal planner adapts to how you actually eat — not generic plans.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button className="w-full" size="lg" onClick={() => router.push("/plans")}>
                        Unlock meal planning
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
