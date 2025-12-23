import type { Metadata } from "next";
import HowItWorksPage from "@/views/HowItWorks";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("How it Works.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/how-it-works');

  const title = "How Does Our Food Analyzer Work? | What The Food";
  const description =
    "The WhatTheFood food analyzer recognizes your meal, estimates portions, and surfaces accurate nutrition instantly. Get started to skip the manual tracking.";

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

export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}

