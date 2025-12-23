import type { Metadata } from "next";
import AboutPage from "@/views/About";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("About Us.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/about');

  const title = "About Us | What The Food AI Food Scanner Team and Mission";
  const description =
    "Learn about the team behind the AI food scanner app; What The Food. Discover our mission, vision, and dedication to helping you track calories and eat smarter.";

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

export default function AboutRoute() {
  return <AboutPage />;
}

