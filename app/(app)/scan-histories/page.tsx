import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ScanHistoriesPage from "@/views/ScanHistories";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Scan History.png", requestUrl);

  return {
    title: "What The Food Scan History | Track Scanned Foods and Meals",
    description: "View all your scanned meals in one place. What The Food all-in-one food calorie finder helps you keep track of all your scanned food photos for smarter eating.",
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "What The Food Scan History | Track Scanned Foods and Meals",
      description: "View all your scanned meals in one place. What The Food all-in-one food calorie finder helps you keep track of all your scanned food photos for smarter eating.",
      images: [imageUrl],
    },
  };
}

export default async function ScanHistoriesRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const subscription = await getPlatformSubscriptionServer(session.user.id);

  return <ScanHistoriesPage initialSubscription={subscription} />;
}

