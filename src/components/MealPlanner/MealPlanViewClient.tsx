'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MealPlan } from "./MealPlannerClient";
import { MealPlanResults } from "./MealPlanResults";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type MealPlanViewClientProps = {
  mealPlanId: string;
  mealPlan: MealPlan;
  title: string | null;
  goal: string | null;
  targetWeight: number | null;
  timeframeWeeks: number | null;
  createdAt: string;
};

export function MealPlanViewClient({
  mealPlanId,
  mealPlan,
  title,
  goal,
  targetWeight,
  timeframeWeeks,
  createdAt,
}: MealPlanViewClientProps) {
  const router = useRouter();
  const t = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [editablePlan, setEditablePlan] = useState<MealPlan | null>(null);
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
      }
    };
    void loadProfile();
  }, []);

  useEffect(() => {
    if (mealPlan) {
      setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
    }
  }, [mealPlan]);

  const userFirstName = profile?.full_name?.split(' ')[0] || null;
  const displayPlan = editablePlan || mealPlan;

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
        const oldQuantity = food.quantity || "";
        const extractNumber = (str: string): number => {
          if (!str) return 0;
          const match = str.match(/(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : 0;
        };
        
        const oldQuantityNum = extractNumber(oldQuantity);
        const newQuantityNum = extractNumber(value);
        const currentCalories = food.calories || 0;
        
        food.quantity = value;
        
        if (newQuantityNum > 0 && oldQuantityNum > 0 && currentCalories > 0) {
          const ratio = newQuantityNum / oldQuantityNum;
          food.calories = Math.round(currentCalories * ratio);
        } else if (newQuantityNum > 0 && currentCalories === 0 && oldQuantityNum === 0) {
          const estimatedCaloriesPer100g = 200;
          food.calories = Math.round((newQuantityNum / 100) * estimatedCaloriesPer100g);
        }
      } else {
        (food as any)[field] = value;
      }
      
      if (Array.isArray(meal.foods)) {
        meal.totalCalories = meal.foods.reduce((sum, f) => sum + (f.calories || 0), 0);
      }
    });
  };
  
  const handleMoveDayUp = (dayIndex: number) => {
    if (dayIndex === 0) return;
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

  const handleSwapDays = (fromIndex: number, toIndex: number) => {
    updateEditablePlan((draft) => {
      if (!draft.weeklyMealPlan || fromIndex === toIndex) return;
      const [movedDay] = draft.weeklyMealPlan.splice(fromIndex, 1);
      draft.weeklyMealPlan.splice(toIndex, 0, movedDay);
    });
  };

  const handleSwapMeals = (fromDayIndex: number, fromMealIndex: number, toDayIndex: number, toMealIndex: number) => {
    updateEditablePlan((draft) => {
      if (!draft.weeklyMealPlan) return;
      const fromDay = draft.weeklyMealPlan[fromDayIndex];
      const toDay = draft.weeklyMealPlan[toDayIndex];
      if (!fromDay || !toDay || !fromDay.meals || !toDay.meals) return;
      
      const [movedMeal] = fromDay.meals.splice(fromMealIndex, 1);
      toDay.meals.splice(toMealIndex, 0, movedMeal);
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

  const handleSaveMealEdits = async () => {
    if (!editablePlan) {
      toast({
        title: "Error",
        description: "No changes to save.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from("meal_plans")
        .update({
          plan: editablePlan,
        })
        .eq("id", mealPlanId)
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from update");
      }

      // Update the local state with the saved data
      setEditablePlan(data.plan);
      
      toast({
        title: t("mealplanner.results.updated.title") || "Meal plan updated",
        description: t("mealplanner.results.updated.description") || "Your changes have been saved successfully.",
      });
      
      setIsEditingMeals(false);
      
      // Refresh the server component data
      router.refresh();
    } catch (error: any) {
      console.error("Failed to save meal plan edits:", error);
      toast({
        title: "Save failed",
        description: error?.message || "Could not save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 bg-white dark:bg-[#000000] min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/meal-planner")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meal Planner
          </Button>
          {title && (
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
          )}
          <p className="text-sm text-muted-foreground">
            Created {new Date(createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {displayPlan && (
          <MealPlanResults
            plan={displayPlan}
            isEditingMeals={isEditingMeals}
            onStartEditing={handleStartEditingMeals}
            onCancelEditing={handleCancelMealEdits}
            onSaveEdits={handleSaveMealEdits}
            saving={saving}
            onMealNameChange={handleMealNameChange}
            onIngredientChange={handleIngredientChange}
            onRemoveIngredient={handleRemoveIngredient}
            onAddIngredient={handleAddIngredient}
            onMoveDayUp={handleMoveDayUp}
            onMoveDayDown={handleMoveDayDown}
            onSwapDays={handleSwapDays}
            onSwapMeals={handleSwapMeals}
            userFirstName={userFirstName}
            mealPlanId={mealPlanId}
            showShareButtons={true}
          />
        )}
      </div>
    </main>
  );
}

