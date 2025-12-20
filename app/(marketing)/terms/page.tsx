import type { Metadata } from "next";
import TermsPage from "@/views/Terms";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Terms & Conditions.png", requestUrl);

  return {
    title: "Terms and Conditions | What The Food AI Food Scanner App",
    description: "Read the terms and conditions for our AI food scanner app, What The Food. Learn about user rights, responsibilities, and app usage rules for a safe experience.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "Terms and Conditions | What The Food AI Food Scanner App",
      description: "Read the terms and conditions for our AI food scanner app, What The Food. Learn about user rights, responsibilities, and app usage rules for a safe experience.",
      images: [imageUrl],
    },
  };
}

export default function TermsRoute() {
  return <TermsPage />;
}

