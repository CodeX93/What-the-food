import type { Metadata } from "next";
import Index from "@/views/Index";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";
export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/');
  const title = "Free AI Food Scanner and Calorie Estimator | What the Food";
  const description =
    "Get accurate nutritional analysis and recipe preparation instructions from any food image with our free AI food scanner and calorie estimator; What The Food.";
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