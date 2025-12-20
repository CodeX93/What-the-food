import type { Metadata } from "next";
import Index from "@/views/Index";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);

  return {
    title: "Free AI Food Scanner and Calorie Estimator",
    description: "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "Free AI Food Scanner and Calorie Estimator",
      description: "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.",
      images: [imageUrl],
    },
  };
}

export default function HomePage() {
  return <Index />;
}

