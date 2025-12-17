import type { Metadata } from "next";
import WidgetLandingPage from "@/views/Widget";

export const metadata: Metadata = {
  title: "AI Food Calorie Finder Widget for Websites | What The Food",
  description: "Add our AI food calorie finder widget to your website to boost engagement with nutritional insights. Let readers track macros with our smart calorie counter.",
};

export default function WidgetRoute() {
  return <WidgetLandingPage />;
}

