import type { Metadata } from "next";
import Index from "@/views/Index";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";
export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/');
  const title = "Free AI Food Scanner and Calorie Estimator | What the Food";
  const description =
    "What The Food is a macro tracker and food calorie finder that helps you track meals, understand macros, and spot eating patterns to build healthier habits.";
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
};
}
export default function HomePage() {
  return <Index />;
}