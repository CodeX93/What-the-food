import type { Metadata } from "next";
import PricingPage from "@/views/Pricing";

export const metadata: Metadata = {
  title: "What The Food Pricing & Packages | View Plans",
  description: "Compare our freemium plans to see how far personalized health context and account analytics can take you. Get started now for free - No signups required."

};

export default function PricingRoute() {
  return <PricingPage />;
}

