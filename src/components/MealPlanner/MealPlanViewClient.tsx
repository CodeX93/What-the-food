'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MealPlan } from "./MealPlannerClient";
import { MealPlanResults } from "./MealPlanResults";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

type MealPlanViewClientProps = {
  mealPlanId: string;
  mealPlan: MealPlan;
  title: string | null;
  goal: string | null;
  targetWeight: number | null;
  timeframeWeeks: number | null;
  createdAt: string;
  language?: string;
};

export function MealPlanViewClient({
  mealPlanId,
  mealPlan,
  title,
  goal,
  targetWeight,
  timeframeWeeks,
  createdAt,
  language: planLanguage = 'en',
}: MealPlanViewClientProps) {
  const router = useRouter();
  const t = useTranslation();
  const { toast } = useToast();
  const { language: userLanguage } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [editablePlan, setEditablePlan] = useState<MealPlan | null>(null);
  const [isEditingMeals, setIsEditingMeals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

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

  // Translate plan if needed when component loads
  useEffect(() => {
    const translatePlanIfNeeded = async () => {
      const currentLanguage = planLanguage || 'en';
      
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
        return;
      }
      
      // Get user's default language
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("default_language")
        .eq("id", session.user.id)
        .maybeSingle();
      
      const targetLanguage = profileData?.default_language || userLanguage || 'en';
      
      // If language doesn't match, translate it
      if (currentLanguage !== targetLanguage) {
        setTranslating(true);
        
        try {
          toast({
            title: t("mealplanner.plan.loading.title") || "Loading plan...",
            description: t("mealplanner.plan.loading.translating") || "Translating to your preferred language...",
          });

          const { data: translateData, error: translateError } = await supabase.functions.invoke("translate-content", {
            body: {
              content: mealPlan,
              sourceLanguage: currentLanguage,
              targetLanguage: targetLanguage,
              contentType: 'meal_plan',
            },
          });

          console.log("Translation response:", { 
            ok: translateData?.ok, 
            hasContent: !!translateData?.translatedContent,
            error: translateError 
          });

          if (!translateError && translateData?.ok && translateData.translatedContent) {
            // Update database with translated content
            const { error: updateError } = await (supabase as any)
              .from("meal_plans")
              .update({
                plan: translateData.translatedContent,
                language: targetLanguage,
              })
              .eq("id", mealPlanId);

            if (updateError) {
              console.error("Failed to update database with translated plan:", updateError);
            } else {
              console.log("Database updated successfully with translated plan");
            }

            // Update local state with translated plan
            setEditablePlan(translateData.translatedContent);
          } else {
            console.error("Translation failed, using original:", translateError);
            setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
          }
        } catch (error) {
          console.error("Translation error:", error);
          setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
        } finally {
          setTranslating(false);
        }
      } else {
        console.log("Languages match, no translation needed");
        setEditablePlan(JSON.parse(JSON.stringify(mealPlan)));
      }
    };

    void translatePlanIfNeeded();
  }, [mealPlan, planLanguage, userLanguage, mealPlanId, t, toast]);

  // Removed - translation logic now handles setting editablePlan

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

        {translating ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                {t("mealplanner.plan.loading.translating") || "Translating to your preferred language..."}
              </p>
            </div>
          </div>
        ) : displayPlan ? (
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
        ) : null}
      </div>
    </main>
  );
}

