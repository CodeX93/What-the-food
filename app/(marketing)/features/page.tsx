import type { Metadata } from "next";
import FeaturesPage from "@/views/Features";

export const metadata: Metadata = {
  title: "AI Food Calorie Finder & Estimator Features | What The Food",
  description: "Discover WhatTheFood’s powerful features: Food calorie finder, calorie estimator, meal planner, calorie counter for recipes, AI recipe generator, and more."
};

export default function FeaturesRoute() {
  return <FeaturesPage />;
}

