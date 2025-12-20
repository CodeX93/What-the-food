import type { Metadata } from "next";
import DisclaimerPage from "@/views/Disclaimer";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "Disclaimer | What The Food AI Food Scanner Accuracy and Info",
  description: "Read the disclaimer for our AI food scanner app, What The Food. Understand limits, accuracy, and informational purposes to use the app safely and wisely.",
  openGraph: {
    images: [getPreviewImageUrl("Disclaimer.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Disclaimer | What The Food AI Food Scanner Accuracy and Info",
    description: "Read the disclaimer for our AI food scanner app, What The Food. Understand limits, accuracy, and informational purposes to use the app safely and wisely.",
    images: [getPreviewImageUrl("Disclaimer.png")],
  },
};

export default function DisclaimerRoute() {
  return <DisclaimerPage />;
}

