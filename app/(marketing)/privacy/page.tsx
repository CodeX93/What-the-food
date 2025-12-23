import type { Metadata } from "next";
import PrivacyPage from "@/views/Privacy";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Privacy Policy.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/privacy');

  const title = "Privacy Policy | What The Food AI Food Scanner App";
  const description =
    "Learn how our AI food scanner, What The Food, collects, uses, and protects your data. Read our privacy policy for secure tracking, user info, and data safety.";

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

export default function PrivacyRoute() {
  return <PrivacyPage />;
}

