import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { SharedMealPlanClient } from "@/components/MealPlanner/SharedMealPlanClient";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export default async function SharedMealPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const shareId = params.id;

  // Use service role key to bypass RLS for public access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    notFound();
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });

  // Try to find meal plan by share_id or id
  const { data: mealPlanData, error } = await (supabase as any)
    .from("meal_plans")
    .select("*")
    .or(`share_id.eq.${shareId},id.eq.${shareId}`)
    .single();

  if (error || !mealPlanData) {
    notFound();
  }

  return (
    <SharedMealPlanClient
      mealPlanId={mealPlanData.id}
      mealPlan={mealPlanData.plan}
      title={mealPlanData.title}
      goal={mealPlanData.goal}
      targetWeight={mealPlanData.target_weight}
      timeframeWeeks={mealPlanData.timeframe_weeks}
      createdAt={mealPlanData.created_at}
    />
  );
}

