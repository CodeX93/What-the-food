'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { ArrowLeft, Loader2, Lock, ShieldCheck, Sparkles, ArrowRight, Calendar, BookOpen } from "lucide-react";
import { MealPlannerForm, MealPlannerFormData } from "./MealPlannerForm";
import { MealPlanResults } from "./MealPlanResults";

export interface MealPlan {
  overview: string;
  dailyCalorieTarget: number;
  dailyCalorieRationale: string;
  macroDistribution: {
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
    fiber_g: number;
    rationale: string;
  };
  weeklyMealPlan: Array<{
    day: string;
    meals: Array<{
      type: string;
      name: string;
      foods: Array<{
        name: string;
        quantity: string;
        calories: number;
      }>;
      totalCalories: number;
      macros: {
        protein_g: number;
        carbohydrates_g: number;
        fat_g: number;
      };
    }>;
    note?: string;
  }>;
  exercisePlan: {
    types: string[];
    frequency: string;
    duration: string;
    intensity: string;
    specificExercises: string[];
    weeklySchedule: string;
  };
  actionItems: Array<{
    category: string;
    item: string;
    details: string;
  }>;
  progressTracking: {
    methods: string[];
    frequency: string;
    milestones: string[];
  };
  tips: string[];
}

interface SavedMealPlanRecord {
  id: string;
  title: string | null;
  goal: string | null;
  target_weight: number | null;
  timeframe_weeks: number | null;
  plan: MealPlan;
  created_at: string;
}

const formatPlanDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

type MealPlannerClientProps = {
  initialSubscription?: any;
};

export function MealPlannerClient({ initialSubscription = null }: MealPlannerClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlanRecord[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [editablePlan, setEditablePlan] = useState<MealPlan | null>(null);
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [lastFormData, setLastFormData] = useState<MealPlannerFormData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const savedPlansRef = useRef<HTMLDivElement>(null);

  // Form state - keeping old state for backward compatibility with saved plans
  const [targetWeight, setTargetWeight] = useState<string>("");
  const [timeframeWeeks, setTimeframeWeeks] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [mealFrequency, setMealFrequency] = useState<string>("3");
  const [exercisePlan, setExercisePlan] = useState<string>("");
  const [otherTodos, setOtherTodos] = useState<string[]>([]);
  const [currentTodo, setCurrentTodo] = useState<string>("");

  const isPremium = initialSubscription?.subscription_type === "premium";

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }
    const loadProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/auth");
          return;
        }

        setUserId(session.user.id);

        const { data: profileData, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(profileData);
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: t("mealplanner.error.title"),
          description: t("mealplanner.error.profile"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router, toast, isPremium, t]);

  const addDietaryRestriction = () => {
    const input = document.getElementById("dietary-restriction") as HTMLInputElement;
    if (input?.value.trim()) {
      setDietaryRestrictions([...dietaryRestrictions, input.value.trim()]);
      input.value = "";
    }
  };

  const removeDietaryRestriction = (index: number) => {
    setDietaryRestrictions(dietaryRestrictions.filter((_, i) => i !== index));
  };

  const addTodo = () => {
    if (currentTodo.trim()) {
      setOtherTodos([...otherTodos, currentTodo.trim()]);
      setCurrentTodo("");
    }
  };

  const removeTodo = (index: number) => {
    setOtherTodos(otherTodos.filter((_, i) => i !== index));
  };

  const loadSavedPlans = useCallback(async () => {
    if (!userId || !isPremium) {
      setSavedPlans([]);
      return;
    }

    try {
      setSavedPlansLoading(true);
      const { data, error } = await (supabase as any)
        .from("meal_plans")
        .select("id,title,goal,target_weight,timeframe_weeks,plan,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const normalized = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        goal: item.goal,
        target_weight: item.target_weight,
        timeframe_weeks: item.timeframe_weeks,
        created_at: item.created_at,
        plan: item.plan as MealPlan,
      }));

      setSavedPlans(normalized);
    } catch (error) {
      console.error("Failed to load saved meal plans:", error);
      toast({
        title: t("mealplanner.error.title"),
        description: t("mealplanner.error.saved"),
        variant: "destructive",
      });
    } finally {
      setSavedPlansLoading(false);
    }
  }, [toast, userId, isPremium, t]);

  useEffect(() => {
    if (userId && isPremium) {
      void loadSavedPlans();
    }
  }, [userId, loadSavedPlans, isPremium]);

  useEffect(() => {
    if (mealPlan) {
      const defaultTitle = `${t("mealplanner.title")} - ${new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
      setPlanTitle((prev) => prev || defaultTitle);
      setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
      setIsEditingMeals(false);
    } else {
      setPlanTitle("");
      setEditablePlan(null);
      setIsEditingMeals(false);
    }
  }, [mealPlan, t]);

  const updateEditablePlan = (updater: (draft: MealPlan) => void) => {
    setEditablePlan((prev) => {
      if (!prev) {
        return prev;
      }
      const draft = JSON.parse(JSON.stringify(prev)) as MealPlan;
      updater(draft);
      return draft;
    });
  };

  const handleMealNameChange = (dayIndex: number, mealIndex: number, value: string) => {
    updateEditablePlan((draft) => {
      const day = draft.weeklyMealPlan?.[dayIndex];
      if (day?.meals?.[mealIndex]) {
        day.meals[mealIndex].name = value;
      }
    });
  };

  const handleIngredientChange = (
    dayIndex: number,
    mealIndex: number,
    ingredientIndex: number,
    field: "name" | "quantity" | "calories",
    value: string
  ) => {
    updateEditablePlan((draft) => {
      const meal = draft.weeklyMealPlan?.[dayIndex]?.meals?.[mealIndex];
      if (!meal) {
        return;
      }
      if (!Array.isArray(meal.foods)) {
        meal.foods = [];
      }
      if (!meal.foods[ingredientIndex]) {
        meal.foods[ingredientIndex] = { name: "", quantity: "", calories: 0 };
      }
      
      const food = meal.foods[ingredientIndex];
      
      if (field === "calories") {
        const parsed = Number(value);
        food.calories = Number.isFinite(parsed) ? parsed : 0;
      } else if (field === "quantity") {
        // Store the old quantity before updating
        const oldQuantity = food.quantity || "";
        
        // Extract numeric value from quantity string (e.g., "200g" -> 200, "1 cup" -> 1, "2 eggs" -> 2)
        const extractNumber = (str: string): number => {
          if (!str) return 0;
          const match = str.match(/(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        const oldQuantityNum = extractNumber(oldQuantity);
        const newQuantityNum = extractNumber(value);
        const currentCalories = food.calories || 0;
        
        // Update the quantity field first
        food.quantity = value;
        
        // Auto-calculate calories based on quantity change
        // If we have a valid quantity change and existing calories, recalculate proportionally
        if (newQuantityNum > 0 && oldQuantityNum > 0 && currentCalories > 0) {
          const ratio = newQuantityNum / oldQuantityNum;
          food.calories = Math.round(currentCalories * ratio);
        } else if (newQuantityNum > 0 && currentCalories === 0 && oldQuantityNum === 0) {
          // If no calories set and this is a new quantity, estimate based on common food densities
          // This is a fallback - ideally calories should already be set
          const estimatedCaloriesPer100g = 200; // Average estimate
          food.calories = Math.round((newQuantityNum / 100) * estimatedCaloriesPer100g);
        }
      } else {
        (food as any)[field] = value;
      }
      
      // Recalculate meal total calories
      if (Array.isArray(meal.foods)) {
        meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
      }
    });
  };
  
  const handleMoveDayUp = (dayIndex: number) => {
    if (dayIndex === 0) return; // Can't move first day up
    updateEditablePlan((draft) => {
      if (!draft.weeklyMealPlan || dayIndex === 0) return;
      const [movedDay] = draft.weeklyMealPlan.splice(dayIndex, 1);
      draft.weeklyMealPlan.splice(dayIndex - 1, 0, movedDay);
    });
  };
  
  const handleMoveDayDown = (dayIndex: number) => {
    updateEditablePlan((draft) => {
      if (!draft.weeklyMealPlan || dayIndex >= draft.weeklyMealPlan.length - 1) return;
      const [movedDay] = draft.weeklyMealPlan.splice(dayIndex, 1);
      draft.weeklyMealPlan.splice(dayIndex + 1, 0, movedDay);
    });
  };

  const handleRemoveIngredient = (dayIndex: number, mealIndex: number, ingredientIndex: number) => {
    updateEditablePlan((draft) => {
      const foods = draft.weeklyMealPlan?.[dayIndex]?.meals?.[mealIndex]?.foods;
      if (!foods) {
        return;
      }
      foods.splice(ingredientIndex, 1);
    });
  };

  const handleAddIngredient = (dayIndex: number, mealIndex: number) => {
    updateEditablePlan((draft) => {
      const meal = draft.weeklyMealPlan?.[dayIndex]?.meals?.[mealIndex];
      if (!meal) {
        return;
      }
      if (!Array.isArray(meal.foods)) {
        meal.foods = [];
      }
      meal.foods.push({
        name: "",
        quantity: "",
        calories: 0,
      });
    });
  };

  const handleStartEditingMeals = () => {
    if (!mealPlan) {
      return;
    }
    if (!editablePlan) {
      setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
    }
    setIsEditingMeals(true);
  };

  const handleCancelMealEdits = () => {
    if (mealPlan) {
      setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
    } else {
      setEditablePlan(null);
    }
    setIsEditingMeals(false);
  };

  const handleSaveMealEdits = () => {
    if (!editablePlan) {
      return;
    }
    setMealPlan(JSON.parse(JSON.stringify(editablePlan)));
    setIsEditingMeals(false);
    toast({
      title: t("mealplanner.results.updated.title"),
      description: t("mealplanner.results.updated.description"),
    });
  };

  const generateMealPlan = async (formData: MealPlannerFormData) => {
    if (!profile) {
      toast({
        title: t("mealplanner.profile.title"),
        description: t("mealplanner.profile.description"),
        variant: "destructive",
      });
      router.push("/profile");
      return;
    }

    try {
      setGenerating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      // Build dietary restrictions array from allergies and custom restrictions
      const allRestrictions = [
        ...formData.allergies,
        ...(formData.customRestrictions
          ? formData.customRestrictions.split(",").map((r) => r.trim()).filter(Boolean)
          : []),
      ];

      const exerciseSummaryParts: string[] = [];
      if (formData.exercisePreferences.length) {
        exerciseSummaryParts.push(`Preferred exercises: ${formData.exercisePreferences.join(", ")}`);
      }
      if (formData.exercisePlan) {
        exerciseSummaryParts.push(formData.exercisePlan);
      }

      setLastFormData(formData);

      const { data, error } = await supabase.functions.invoke("meal-planner", {
        body: {
          profile: {
            age: profile.age || null,
            gender: profile.gender || null,
            weight_kg: profile.weight_kg || null,
            height_cm: profile.height_cm || null,
            goal: profile.goal || null,
            activity_level: profile.activity_level || null,
          },
          goalDetails: {
            endGoal: formData.endGoal,
            targetWeight: formData.targetWeight,
            timeframeWeeks: formData.timeframe,
            exercisePlan: exerciseSummaryParts.join(". ") || undefined,
            additionalNotes: formData.additionalInfo || undefined,
          },
          preferences: {
            dietType: formData.dietType,
            mealFrequency: formData.mealsPerDay,
            includeSnacks: formData.includeSnacks,
            planDuration: formData.planDuration,
            dietaryRestrictions: allRestrictions.length > 0 ? allRestrictions : undefined,
            preferredExercises: formData.exercisePreferences.length > 0 ? formData.exercisePreferences : undefined,
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || t("mealplanner.generate.error.description"));
      }

      setMealPlan(data.mealPlan);
      // Update form state for backward compatibility
      setTargetWeight(formData.targetWeight.toString());
      setTimeframeWeeks(formData.timeframe.toString());
      setAdditionalNotes(formData.additionalInfo);
      setExercisePlan(formData.exercisePlan);
      setMealFrequency(formData.mealsPerDay.toString());
      
      // Close modal after successful generation
      setIsModalOpen(false);
      
      toast({
        title: t("mealplanner.generate.title"),
        description: t("mealplanner.generate.description"),
      });
    } catch (error: any) {
      console.error("Meal plan generation error:", error);
      toast({
        title: t("mealplanner.generate.error.title"),
        description: error?.message || t("mealplanner.generate.error.description"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleScrollToSavedPlans = () => {
    savedPlansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRegeneratePlan = async () => {
    if (!lastFormData) {
      toast({
        title: t("mealplanner.error.nodata"),
        description: t("mealplanner.error.nodata.description"),
        variant: "destructive",
      });
      return;
    }
    await generateMealPlan(lastFormData);
  };

  const handleSaveMealPlan = async () => {
    if (!mealPlan) {
      return;
    }

    if (!userId) {
      toast({
        title: t("mealplanner.error.title"),
        description: t("mealplanner.error.signin"),
        variant: "destructive",
      });
      router.push("/auth");
      return;
    }

    const titleToUse = planTitle.trim() || `${t("mealplanner.title")} - ${new Date().toLocaleDateString()}`;

    try {
      setSavingPlan(true);
      const { data, error } = await (supabase as any).from("meal_plans").insert({
        user_id: userId,
        title: titleToUse,
        goal: profile?.goal || null,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        timeframe_weeks: timeframeWeeks ? parseInt(timeframeWeeks) : null,
        plan: mealPlan,
      }).select().single();

      if (error) {
        throw error;
      }

      // Set share_id to the id for easy sharing
      if (data?.id) {
        await (supabase as any)
          .from("meal_plans")
          .update({ share_id: data.id })
          .eq("id", data.id);
      }

      toast({
        title: t("mealplanner.plan.saved.title"),
        description: t("mealplanner.plan.saved.description"),
      });
      await loadSavedPlans();
    } catch (error) {
      console.error("Failed to save meal plan:", error);
      toast({
        title: t("mealplanner.plan.save.error.title"),
        description: t("mealplanner.plan.save.error.description"),
        variant: "destructive",
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handleLoadSavedPlan = (record: SavedMealPlanRecord) => {
    try {
      const loadedPlan = record.plan;
      setMealPlan(loadedPlan);
      setPlanTitle(record.title || `${t("mealplanner.saved.title")} - ${formatPlanDate(record.created_at)}`);
      setTargetWeight(record.target_weight ? record.target_weight.toString() : "");
      setTimeframeWeeks(record.timeframe_weeks ? record.timeframe_weeks.toString() : "");

      toast({
        title: t("mealplanner.plan.loaded.title"),
        description: record.title ? `${t("mealplanner.plan.loaded.description")} ${record.title}.` : t("mealplanner.plan.loaded.description"),
      });
    } catch (error) {
      console.error("Failed to load saved meal plan:", error);
      toast({
        title: t("mealplanner.plan.load.error.title"),
        description: t("mealplanner.plan.load.error.description"),
        variant: "destructive",
      });
    }
  };

  const displayPlan = isEditingMeals && editablePlan ? editablePlan : mealPlan;

  if (!isPremium) {
    return (
      <main className="flex-1 bg-white dark:bg-[#000000] min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto border-primary/30 bg-background/80 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">{t("mealplanner.premium.title")}</CardTitle>
                <CardDescription className="text-base">
                  {t("mealplanner.premium.description")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                    title: t("mealplanner.premium.feature1.title"),
                    body: t("mealplanner.premium.feature1.body"),
                  },
                  {
                    icon: <Sparkles className="h-5 w-5 text-primary" />,
                    title: t("mealplanner.premium.feature2.title"),
                    body: t("mealplanner.premium.feature2.body"),
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
                  {t("mealplanner.premium.upgrade")} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  {t("mealplanner.premium.refresh")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-white dark:bg-[#000000] min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-green-50 dark:bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="px-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{t("mealplanner.title")}</h1>
            <p className="text-muted-foreground">{t("mealplanner.description")}</p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-12">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/20">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold">{t("mealplanner.hero.title")}</h2>
                <p className="text-lg text-muted-foreground">{t("mealplanner.hero.description")}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                  <Button
                    size="lg"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto min-w-[200px] bg-primary hover:bg-primary/90"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    {t("mealplanner.hero.generate")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleScrollToSavedPlans}
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    <BookOpen className="h-5 w-5 mr-2" />
                    {t("mealplanner.hero.saved")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved Meal Plans Section */}
        <div ref={savedPlansRef} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("mealplanner.saved.title")}</CardTitle>
              <CardDescription>{t("mealplanner.saved.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {savedPlansLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("mealplanner.saved.loading")}
                </div>
              ) : savedPlans.length > 0 ? (
                <div className="space-y-3">
                  {savedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="border rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium">{plan.title || t("mealplanner.saved.untitled")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("mealplanner.saved.view")} {formatPlanDate(plan.created_at)}
                          {plan.goal ? ` · ${t("mealplanner.saved.goal")}: ${plan.goal}` : ""}
                        </p>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                          {plan.target_weight !== null && <span>{t("mealplanner.saved.target")}: {plan.target_weight}kg</span>}
                          {plan.timeframe_weeks !== null && <span>{t("mealplanner.saved.timeline")}: {plan.timeframe_weeks} {t("mealplanner.saved.weeks")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/meal-plan/${plan.id}`)}
                        >
                          {t("mealplanner.saved.view")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("mealplanner.saved.none")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Meal Plan Results */}
        {mealPlan && (
          <div className="space-y-6">
            {displayPlan && (
              <MealPlanResults
                plan={displayPlan}
                isEditingMeals={isEditingMeals}
                onStartEditing={handleStartEditingMeals}
                onCancelEditing={handleCancelMealEdits}
                onSaveEdits={handleSaveMealEdits}
                onMealNameChange={handleMealNameChange}
                onIngredientChange={handleIngredientChange}
                onRemoveIngredient={handleRemoveIngredient}
                onAddIngredient={handleAddIngredient}
                onMoveDayUp={handleMoveDayUp}
                onMoveDayDown={handleMoveDayDown}
                userFirstName={profile?.full_name ? profile.full_name.split(" ")[0] : null}
                showShareButtons={true}
              />
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Label htmlFor="plan-title" className="sr-only">
                  {t("mealplanner.plan.title")}
                </Label>
                <Input
                  id="plan-title"
                  value={planTitle}
                  onChange={(event) => setPlanTitle(event.target.value)}
                  placeholder={t("mealplanner.plan.title")}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setMealPlan(null);
                    setEditablePlan(null);
                    setIsEditingMeals(false);
                  }}
                  variant="outline"
                >
                  {t("mealplanner.plan.create")}
                </Button>
                <Button onClick={handleRegeneratePlan} disabled={generating || !lastFormData}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("mealplanner.plan.regenerating")}
                    </>
                  ) : (
                    t("mealplanner.plan.regenerate")
                  )}
                </Button>
                <Button onClick={handleSaveMealPlan} disabled={savingPlan}>
                  {savingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("mealplanner.plan.saving")}
                    </>
                  ) : (
                    t("mealplanner.plan.save")
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Meal Planner Form */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("mealplanner.form.title")}</DialogTitle>
              <DialogDescription>{t("mealplanner.description")}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <MealPlannerForm profile={profile} onGenerate={generateMealPlan} generating={generating} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

