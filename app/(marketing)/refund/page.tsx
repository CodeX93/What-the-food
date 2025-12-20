import type { Metadata } from "next";
import RefundPage from "@/views/Refund";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Refund Policy.png", requestUrl);

  return {
    title: "Refund Policy | What The Food AI Food Scanner App",
    description: "Read our refund policy for the AI food scanner app; What The Food. Learn how refunds, cancellations, and purchases are handled to ensure a smooth experience.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "Refund Policy | What The Food AI Food Scanner App",
      description: "Read our refund policy for the AI food scanner app; What The Food. Learn how refunds, cancellations, and purchases are handled to ensure a smooth experience.",
      images: [imageUrl],
    },
  };
}

export default function RefundRoute() {
  return <RefundPage />;
}

