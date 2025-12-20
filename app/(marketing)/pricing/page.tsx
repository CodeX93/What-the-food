import type { Metadata } from "next";
import PricingPage from "@/views/Pricing";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "What The Food Pricing & Packages | View Plans",
  description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required.",
  openGraph: {
    images: [getPreviewImageUrl("Pricing.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "What The Food Pricing & Packages | View Plans",
    description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required.",
    images: [getPreviewImageUrl("Pricing.png")],
  },
};

export default function PricingRoute() {
  return <PricingPage />;
}

