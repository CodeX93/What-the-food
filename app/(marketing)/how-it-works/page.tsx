import type { Metadata } from "next";
import HowItWorksPage from "@/views/HowItWorks";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("How it Works.png", requestUrl);

  return {
    title: "How Does Our Food Analyzer Work? | What The Food",
    description: "The WhatTheFood food analyzer recognizes your meal, estimates portions, and surfaces accurate nutrition instantly. Get started to skip the manual tracking.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "How Does Our Food Analyzer Work? | What The Food",
      description: "The WhatTheFood food analyzer recognizes your meal, estimates portions, and surfaces accurate nutrition instantly. Get started to skip the manual tracking.",
      images: [imageUrl],
    },
  };
}

export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}

