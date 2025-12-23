import type { Metadata } from "next";
import RefundPage from "@/views/Refund";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Refund Policy.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/refund');

  const title = "Refund Policy | What The Food AI Food Scanner App";
  const description =
    "Read our refund policy for the AI food scanner app; What The Food. Learn how refunds, cancellations, and purchases are handled to ensure a smooth experience.";

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

export default function RefundRoute() {
  return <RefundPage />;
}

