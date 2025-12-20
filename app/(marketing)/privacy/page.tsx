import type { Metadata } from "next";
import PrivacyPage from "@/views/Privacy";

export const metadata: Metadata = {
  title: "Privacy Policy | What The Food AI Food Scanner App",
  description: "Learn how our AI food scanner, What The Food, collects, uses, and protects your data. Read our privacy policy for secure tracking, user info, and data safety.",
  openGraph: {
    images: ["/preview-images/Privacy Policy.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | What The Food AI Food Scanner App",
    description: "Learn how our AI food scanner, What The Food, collects, uses, and protects your data. Read our privacy policy for secure tracking, user info, and data safety.",
    images: ["/preview-images/Privacy Policy.png"],
  },
};

export default function PrivacyRoute() {
  return <PrivacyPage />;
}

