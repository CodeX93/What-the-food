import type { Metadata } from "next";
import WidgetLandingPage from "@/views/Widget";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Widget.png", requestUrl);

  return {
    title: "AI Food Calorie Finder Widget for Websites | What The Food",
    description: "Add our AI food calorie finder widget to your website to boost engagement with nutritional insights. Let readers track macros with our smart calorie counter.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "AI Food Calorie Finder Widget for Websites | What The Food",
      description: "Add our AI food calorie finder widget to your website to boost engagement with nutritional insights. Let readers track macros with our smart calorie counter.",
      images: [imageUrl],
    },
  };
}

export default function WidgetRoute() {
  return <WidgetLandingPage />;
}

