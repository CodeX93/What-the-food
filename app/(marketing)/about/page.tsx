import type { Metadata } from "next";
import AboutPage from "@/views/About";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "About Us | What The Food AI Food Scanner Team and Mission",
  description: "Learn about the team behind the AI food scanner app; What The Food. Discover our mission, vision, and dedication to helping you track calories and eat smarter.",
  openGraph: {
    images: [getPreviewImageUrl("About Us.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | What The Food AI Food Scanner Team and Mission",
    description: "Learn about the team behind the AI food scanner app; What The Food. Discover our mission, vision, and dedication to helping you track calories and eat smarter.",
    images: [getPreviewImageUrl("About Us.png")],
  },
};

export default function AboutRoute() {
  return <AboutPage />;
}

