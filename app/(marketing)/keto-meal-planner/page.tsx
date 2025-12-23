import type { Metadata } from "next";
import KetoMealPlannerPage from "@/views/KetoMealPlanner";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("keto-meal-planner.jpeg", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/keto-meal-planner');

  const title = "Keto Meal Planner | Personalize Your Diet With What The Food";
  const description =
    "Get keto meal plans based on your diet, allergies, health goals, and preferences. Use What The Food's keto meal planner to track macros and stay low-carb.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
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

export default function KetoMealPlannerRoute() {
  return (
    <>
      {/* H1 for SEO - always visible to crawlers */}
      <h1 className="sr-only">Keto Meal Planner | Personalized Meal Plans | What The Food</h1>
      <KetoMealPlannerPage />
    </>
  );
}
