import type { Metadata } from "next";
import FeaturesPage from "@/views/Features";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "AI Food Calorie Finder & Estimator Features | What The Food",
  description: "Discover WhatTheFood's powerful features: Food calorie finder, calorie estimator, meal planner, calorie counter for recipes, AI recipe generator, and more.",
  openGraph: {
    images: [getPreviewImageUrl("Features.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Food Calorie Finder & Estimator Features | What The Food",
    description: "Discover WhatTheFood's powerful features: Food calorie finder, calorie estimator, meal planner, calorie counter for recipes, AI recipe generator, and more.",
    images: [getPreviewImageUrl("Features.png")],
  },
};

export default function FeaturesRoute() {
  return <FeaturesPage />;
}
