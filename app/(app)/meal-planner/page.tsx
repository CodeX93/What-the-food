import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MealPlannerPage from "@/views/MealPlanner";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meal Planner | Personalize Your Diets With What The Food",
  description: "Use What The Food meal planner to create personalized meal plans, track nutrition, and accommodate allergies or diet preferences to achieve your health goals.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: [getPreviewImageUrl("Meal Planner.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meal Planner | Personalize Your Diets With What The Food",
    description: "Use What The Food meal planner to create personalized meal plans, track nutrition, and accommodate allergies or diet preferences to achieve your health goals.",
    images: [getPreviewImageUrl("Meal Planner.png")],
  },
};

export default async function MealPlannerRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const subscription = await getPlatformSubscriptionServer(session.user.id);

  return <MealPlannerPage initialSubscription={subscription} />;
}

