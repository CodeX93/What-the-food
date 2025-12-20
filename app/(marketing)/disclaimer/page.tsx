import type { Metadata } from "next";
import DisclaimerPage from "@/views/Disclaimer";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Disclaimer.png", requestUrl);

  return {
    title: "Disclaimer | What The Food AI Food Scanner Accuracy and Info",
    description: "Read the disclaimer for our AI food scanner app, What The Food. Understand limits, accuracy, and informational purposes to use the app safely and wisely.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "Disclaimer | What The Food AI Food Scanner Accuracy and Info",
      description: "Read the disclaimer for our AI food scanner app, What The Food. Understand limits, accuracy, and informational purposes to use the app safely and wisely.",
      images: [imageUrl],
    },
  };
}

export default function DisclaimerRoute() {
  return <DisclaimerPage />;
}

