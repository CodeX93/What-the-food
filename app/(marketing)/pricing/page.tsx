import type { Metadata } from "next";
import PricingPage from "@/views/Pricing";

export const metadata: Metadata = {
  title: "What The Food Pricing & Packages | View Plans",
  description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required.",
  openGraph: {
    images: ["/preview-images/Pricing.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "What The Food Pricing & Packages | View Plans",
    description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required.",
    images: ["/preview-images/Pricing.png"],
  },
};

export default function PricingRoute() {
  return <PricingPage />;
}

