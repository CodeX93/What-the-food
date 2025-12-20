import type { Metadata } from "next";
import WidgetLandingPage from "@/views/Widget";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "AI Food Calorie Finder Widget for Websites | What The Food",
  description: "Add our AI food calorie finder widget to your website to boost engagement with nutritional insights. Let readers track macros with our smart calorie counter.",
  openGraph: {
    images: [getPreviewImageUrl("Widget.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Food Calorie Finder Widget for Websites | What The Food",
    description: "Add our AI food calorie finder widget to your website to boost engagement with nutritional insights. Let readers track macros with our smart calorie counter.",
    images: [getPreviewImageUrl("Widget.png")],
  },
};

export default function WidgetRoute() {
  return <WidgetLandingPage />;
}

