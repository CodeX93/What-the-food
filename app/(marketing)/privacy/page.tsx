import type { Metadata } from "next";
import PrivacyPage from "@/views/Privacy";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Privacy Policy.png", requestUrl);

  return {
    title: "Privacy Policy | What The Food AI Food Scanner App",
    description: "Learn how our AI food scanner, What The Food, collects, uses, and protects your data. Read our privacy policy for secure tracking, user info, and data safety.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "Privacy Policy | What The Food AI Food Scanner App",
      description: "Learn how our AI food scanner, What The Food, collects, uses, and protects your data. Read our privacy policy for secure tracking, user info, and data safety.",
      images: [imageUrl],
    },
  };
}

export default function PrivacyRoute() {
  return <PrivacyPage />;
}

