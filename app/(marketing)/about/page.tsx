import type { Metadata } from "next";
import AboutPage from "@/views/About";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("About Us.png", requestUrl);

  return {
    title: "About Us | What The Food AI Food Scanner Team and Mission",
    description: "Learn about the team behind the AI food scanner app; What The Food. Discover our mission, vision, and dedication to helping you track calories and eat smarter.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "About Us | What The Food AI Food Scanner Team and Mission",
      description: "Learn about the team behind the AI food scanner app; What The Food. Discover our mission, vision, and dedication to helping you track calories and eat smarter.",
      images: [imageUrl],
    },
  };
}

export default function AboutRoute() {
  return <AboutPage />;
}

