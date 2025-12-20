import type { Metadata } from "next";
import SettingsPage from "@/views/Settings";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Settings.png", requestUrl);

  return {
    title: "What The Food Account Settings | Edit Password and Language",
    description: "Manage your What The food account settings: Update your password, change language, and customize preferences to keep your profile secure and personal.",
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "What The Food Account Settings | Edit Password and Language",
      description: "Manage your What The food account settings: Update your password, change language, and customize preferences to keep your profile secure and personal.",
      images: [imageUrl],
    },
  };
}

export default function SettingsRoute() {
  return <SettingsPage />;
}

