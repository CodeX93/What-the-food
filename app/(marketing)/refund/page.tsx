import type { Metadata } from "next";
import RefundPage from "@/views/Refund";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "Refund Policy | What The Food AI Food Scanner App",
  description: "Read our refund policy for the AI food scanner app; What The Food. Learn how refunds, cancellations, and purchases are handled to ensure a smooth experience.",
  openGraph: {
    images: [getPreviewImageUrl("Refund Policy.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Refund Policy | What The Food AI Food Scanner App",
    description: "Read our refund policy for the AI food scanner app; What The Food. Learn how refunds, cancellations, and purchases are handled to ensure a smooth experience.",
    images: [getPreviewImageUrl("Refund Policy.png")],
  },
};

export default function RefundRoute() {
  return <RefundPage />;
}

