import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import { MealPlanViewClient } from "@/components/MealPlanner/MealPlanViewClient";

export default async function MealPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  const { data: mealPlanData, error } = await (supabase as any)
    .from("meal_plans")
    .select("id, user_id, title, goal, target_weight, timeframe_weeks, plan, created_at, language")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !mealPlanData) {
    redirect("/meal-planner");
  }

  return (
    <MealPlanViewClient
      mealPlanId={params.id}
      mealPlan={mealPlanData.plan}
      title={mealPlanData.title}
      goal={mealPlanData.goal}
      targetWeight={mealPlanData.target_weight}
      timeframeWeeks={mealPlanData.timeframe_weeks}
      createdAt={mealPlanData.created_at}
      language={mealPlanData.language || 'en'}
    />
  );
}

