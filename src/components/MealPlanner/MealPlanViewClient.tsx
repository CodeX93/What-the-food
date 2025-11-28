'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MealPlan } from "./MealPlannerClient";
import { MealPlanResults } from "./MealPlanResults";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

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
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
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

  const userFirstName = profile?.full_name?.split(' ')[0] || null;

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

        <MealPlanResults
          plan={mealPlan}
          isEditingMeals={false}
          onStartEditing={() => {}}
          onCancelEditing={() => {}}
          onSaveEdits={() => {}}
          onMealNameChange={() => {}}
          onIngredientChange={() => {}}
          onRemoveIngredient={() => {}}
          onAddIngredient={() => {}}
          userFirstName={userFirstName}
          mealPlanId={mealPlanId}
          showShareButtons={true}
        />
      </div>
    </main>
  );
}

