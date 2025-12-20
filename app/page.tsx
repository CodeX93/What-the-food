import type { Metadata } from "next";
import Index from "@/views/Index";

export const metadata: Metadata = {
  title: "Free AI Food Scanner and Calorie Estimator",
  description: "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.",
  openGraph: {
    images: ["/preview-images/Homepage.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Food Scanner and Calorie Estimator",
    description: "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.",
    images: ["/preview-images/Homepage.png"],
  },
};

export default function HomePage() {
  return <Index />;
}

