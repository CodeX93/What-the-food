import type { Metadata } from "next";
import Index from "@/views/Index";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "Free AI Food Scanner and Calorie Estimator",
  description: "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.",
  openGraph: {
    images: [getPreviewImageUrl("Homepage.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Food Scanner and Calorie Estimator",
    description: "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.",
    images: [getPreviewImageUrl("Homepage.png")],
  },
};

export default function HomePage() {
  return <Index />;
}

