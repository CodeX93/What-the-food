import type { Metadata } from "next";
import TermsPage from "@/views/Terms";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "Terms and Conditions | What The Food AI Food Scanner App",
  description: "Read the terms and conditions for our AI food scanner app, What The Food. Learn about user rights, responsibilities, and app usage rules for a safe experience.",
  openGraph: {
    images: [getPreviewImageUrl("Terms & Conditions.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms and Conditions | What The Food AI Food Scanner App",
    description: "Read the terms and conditions for our AI food scanner app, What The Food. Learn about user rights, responsibilities, and app usage rules for a safe experience.",
    images: [getPreviewImageUrl("Terms & Conditions.png")],
  },
};

export default function TermsRoute() {
  return <TermsPage />;
}

