'use client';

import { MealPlan } from "./MealPlannerClient";
import { MealPlanResults } from "./MealPlanResults";

type SharedMealPlanClientProps = {
  mealPlanId: string;
  mealPlan: MealPlan;
  title: string | null;
  goal: string | null;
  targetWeight: number | null;
  timeframeWeeks: number | null;
  createdAt: string;
};

export function SharedMealPlanClient({
  mealPlanId,
  mealPlan,
  title,
  goal,
  targetWeight,
  timeframeWeeks,
  createdAt,
}: SharedMealPlanClientProps) {
  return (
    <main className="flex-1 bg-white dark:bg-[#000000] min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {title && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        )}

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
          mealPlanId={mealPlanId}
          showShareButtons={true}
        />
      </div>
    </main>
  );
}

