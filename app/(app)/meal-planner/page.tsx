import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MealPlannerPage from "@/views/MealPlanner";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Meal Planner.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/meal-planner');

  const title = "Meal Planner | Personalize Your Diets With What The Food";
  const description = "Use What The Food meal planner to create personalized meal plans, track nutrition, and accommodate allergies or diet preferences to achieve your health goals.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

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

