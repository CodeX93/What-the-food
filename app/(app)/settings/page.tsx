import type { Metadata } from "next";
import SettingsPage from "@/views/Settings";

export const metadata: Metadata = {
  title: "What The Food Account Settings | Edit Password and Language",
  description: "Manage your What The food account settings: Update your password, change language, and customize preferences to keep your profile secure and personal.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: ["/preview-images/Settings.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "What The Food Account Settings | Edit Password and Language",
    description: "Manage your What The food account settings: Update your password, change language, and customize preferences to keep your profile secure and personal.",
    images: ["/preview-images/Settings.png"],
  },
};

export default function SettingsRoute() {
  return <SettingsPage />;
}

