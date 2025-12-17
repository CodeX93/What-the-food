import type { Metadata } from "next";
import HowItWorksPage from "@/views/HowItWorks";

export const metadata: Metadata = {
  title: "How Does Our Food Analyzer Work? | What The Food",
  description: "The WhatTheFood food analyzer recognizes your meal, estimates portions, and surfaces accurate nutrition instantly. Get started to skip the manual tracking.",
};

export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}

