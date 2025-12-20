import type { Metadata } from "next";
import HowItWorksPage from "@/views/HowItWorks";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "How Does Our Food Analyzer Work? | What The Food",
  description: "The WhatTheFood food analyzer recognizes your meal, estimates portions, and surfaces accurate nutrition instantly. Get started to skip the manual tracking.",
  openGraph: {
    images: [getPreviewImageUrl("How it Works.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "How Does Our Food Analyzer Work? | What The Food",
    description: "The WhatTheFood food analyzer recognizes your meal, estimates portions, and surfaces accurate nutrition instantly. Get started to skip the manual tracking.",
    images: [getPreviewImageUrl("How it Works.png")],
  },
};

export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}

