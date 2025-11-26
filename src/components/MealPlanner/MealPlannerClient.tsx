'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Lock, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
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
  new Date(dateString).toLocaleDateString(undefined, {
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
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [router, toast, isPremium]);

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
        title: "Error",
        description: "Could not load your saved meal plans.",
        variant: "destructive",
      });
    } finally {
      setSavedPlansLoading(false);
    }
  }, [toast, userId, isPremium]);

  useEffect(() => {
    if (userId && isPremium) {
      void loadSavedPlans();
    }
  }, [userId, loadSavedPlans, isPremium]);

  useEffect(() => {
    if (mealPlan) {
      const defaultTitle = `Meal Plan - ${new Date().toLocaleDateString(undefined, {
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
  }, [mealPlan]);

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
      if (field === "calories") {
        const parsed = Number(value);
        meal.foods[ingredientIndex].calories = Number.isFinite(parsed) ? parsed : 0;
      } else {
        (meal.foods[ingredientIndex] as any)[field] = value;
      }
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
      title: "Meals updated",
      description: "Ingredient changes have been applied.",
    });
  };

  const generateMealPlan = async (formData: MealPlannerFormData) => {
    if (!profile) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
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
        throw new Error(data?.error || "Failed to generate meal plan");
      }

      setMealPlan(data.mealPlan);
      // Update form state for backward compatibility
      setTargetWeight(formData.targetWeight.toString());
      setTimeframeWeeks(formData.timeframe.toString());
      setAdditionalNotes(formData.additionalInfo);
      setExercisePlan(formData.exercisePlan);
      setMealFrequency(formData.mealsPerDay.toString());
      
      toast({
        title: "Meal Plan Generated!",
        description: "Your personalized meal plan is ready.",
      });
    } catch (error: any) {
      console.error("Meal plan generation error:", error);
      toast({
        title: "Generation Failed",
        description: error?.message || "Unable to generate meal plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!lastFormData) {
      toast({
        title: "No form data",
        description: "Please create a new plan first.",
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
        title: "Sign in required",
        description: "Please sign in again to save this meal plan.",
        variant: "destructive",
      });
      router.push("/auth");
      return;
    }

    const titleToUse = planTitle.trim() || `Meal Plan - ${new Date().toLocaleDateString()}`;

    try {
      setSavingPlan(true);
      const { error } = await (supabase as any).from("meal_plans").insert({
        user_id: userId,
        title: titleToUse,
        goal: profile?.goal || null,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        timeframe_weeks: timeframeWeeks ? parseInt(timeframeWeeks) : null,
        plan: mealPlan,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Meal plan saved",
        description: "You can revisit this plan anytime from your saved list.",
      });
      await loadSavedPlans();
    } catch (error) {
      console.error("Failed to save meal plan:", error);
      toast({
        title: "Save failed",
        description: "We couldn't save this plan. Please try again.",
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
      setPlanTitle(record.title || `Saved Meal Plan - ${formatPlanDate(record.created_at)}`);
      setTargetWeight(record.target_weight ? record.target_weight.toString() : "");
      setTimeframeWeeks(record.timeframe_weeks ? record.timeframe_weeks.toString() : "");

      toast({
        title: "Meal plan loaded",
        description: record.title ? `Viewing ${record.title}.` : "Viewing saved meal plan.",
      });
    } catch (error) {
      console.error("Failed to load saved meal plan:", error);
      toast({
        title: "Load failed",
        description: "We couldn't open that meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const displayPlan = isEditingMeals && editablePlan ? editablePlan : mealPlan;

  if (!isPremium) {
    return (
      <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/30">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto border-primary/30 bg-background/80 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">Meal Planner is Premium</CardTitle>
                <CardDescription className="text-base">
                  Upgrade to unlock personalized 7-day meal plans, AI exercise guidance, and saved plans tailored to your
                  goals.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                    title: "Personalized plans",
                    body: "Gemini crafts daily meals, macros, and serving details using your profile data.",
                  },
                  {
                    icon: <Sparkles className="h-5 w-5 text-primary" />,
                    title: "7-day coverage",
                    body: "Get meals, exercise plans, and pro tips for every day of the week plus save for later.",
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
                  Upgrade to Premium <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Already upgraded? Refresh once your subscription is active.
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
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="px-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Meal Planner</h1>
            <p className="text-muted-foreground">Get a personalized meal plan tailored to your goals</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Saved Meal Plans</CardTitle>
            <CardDescription>Load any plan you&apos;ve saved previously.</CardDescription>
          </CardHeader>
          <CardContent>
            {savedPlansLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved plans...
              </div>
            ) : savedPlans.length > 0 ? (
              <div className="space-y-3">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{plan.title || "Untitled meal plan"}</p>
                      <p className="text-xs text-muted-foreground">
                        Saved {formatPlanDate(plan.created_at)}
                        {plan.goal ? ` · Goal: ${plan.goal}` : ""}
                      </p>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                        {plan.target_weight !== null && <span>Target: {plan.target_weight}kg</span>}
                        {plan.timeframe_weeks !== null && <span>Timeline: {plan.timeframe_weeks} weeks</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleLoadSavedPlan(plan)}>
                        View plan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved meal plans yet. Generate a plan and tap “Save Plan” to keep it here.
              </p>
            )}
          </CardContent>
        </Card>

        {!mealPlan ? (
          <MealPlannerForm profile={profile} onGenerate={generateMealPlan} generating={generating} />
        ) : (
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
              />
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Label htmlFor="plan-title" className="sr-only">
                  Plan title
                </Label>
                <Input
                  id="plan-title"
                  value={planTitle}
                  onChange={(event) => setPlanTitle(event.target.value)}
                  placeholder="Name this meal plan"
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
                  Create New Plan
                </Button>
                <Button onClick={handleRegeneratePlan} disabled={generating || !lastFormData}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Regenerating...
                    </>
                  ) : (
                    "Regenerate Plan"
                  )}
                </Button>
                <Button onClick={handleSaveMealPlan} disabled={savingPlan}>
                  {savingPlan ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Plan"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

