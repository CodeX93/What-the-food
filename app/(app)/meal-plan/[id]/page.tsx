import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import { MealPlanViewClient } from "@/components/MealPlanner/MealPlanViewClient";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/meal-plan');

  return {
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  };
}

export default async function MealPlanPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerSupabaseClient();
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <TopBar />
      <Header />
    <MealPlanViewClient
      mealPlanId={params.id}
      mealPlan={mealPlanData.plan}
      title={mealPlanData.title}
      goal={mealPlanData.goal}
      targetWeight={mealPlanData.target_weight}
      timeframeWeeks={mealPlanData.timeframe_weeks}
      createdAt={mealPlanData.created_at}
        language={mealPlanData.language || "en"}
    />
      <Footer />
    </div>
  );
}

