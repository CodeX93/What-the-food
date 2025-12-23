import type { Metadata } from "next";
import FeaturesPage from "@/views/Features";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Features.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/features');

  const title = "AI Food Calorie Finder & Estimator Features | What The Food";
  const description =
    "Discover WhatTheFood's powerful features: Food calorie finder, calorie estimator, meal planner, calorie counter for recipes, AI recipe generator, and more.";

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

export default function FeaturesRoute() {
  return <FeaturesPage />;
}
