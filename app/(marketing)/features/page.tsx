import type { Metadata } from "next";
import FeaturesPage from "@/views/Features";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Features.png", requestUrl);

  return {
    title: "AI Food Calorie Finder & Estimator Features | What The Food",
    description: "Discover WhatTheFood's powerful features: Food calorie finder, calorie estimator, meal planner, calorie counter for recipes, AI recipe generator, and more.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "AI Food Calorie Finder & Estimator Features | What The Food",
      description: "Discover WhatTheFood's powerful features: Food calorie finder, calorie estimator, meal planner, calorie counter for recipes, AI recipe generator, and more.",
      images: [imageUrl],
    },
  };
}

export default function FeaturesRoute() {
  return <FeaturesPage />;
}
