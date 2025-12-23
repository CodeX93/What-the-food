import type { Metadata } from "next";
import DisclaimerPage from "@/views/Disclaimer";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Disclaimer.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/disclaimer');

  const title = "Disclaimer | What The Food AI Food Scanner Accuracy and Info";
  const description =
    "Read the disclaimer for our AI food scanner app, What The Food. Understand limits, accuracy, and informational purposes to use the app safely and wisely.";

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

export default function DisclaimerRoute() {
  return <DisclaimerPage />;
}

