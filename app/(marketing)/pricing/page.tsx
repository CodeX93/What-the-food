import type { Metadata } from "next";
import PricingPage from "@/views/Pricing";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Pricing.png", requestUrl);

  return {
    title: "What The Food Pricing & Packages | View Plans",
    description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "What The Food Pricing & Packages | View Plans",
      description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required.",
      images: [imageUrl],
    },
  };
}

export default function PricingRoute() {
  return <PricingPage />;
}

