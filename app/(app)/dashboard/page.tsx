import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardPage from "@/views/Dashboard";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { fetchRecentScansServer } from "@/utils/foodScan.server";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "What The Food User Dashboard | Your Health Copilot",
  description: "Your health copilot that lets you track macros, scan history, save recipes, and plan meals. Manage your nutrition smarter with our What The Food.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: [getPreviewImageUrl("Dashboard.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "What The Food User Dashboard | Your Health Copilot",
    description: "Your health copilot that lets you track macros, scan history, save recipes, and plan meals. Manage your nutrition smarter with our What The Food.",
    images: [getPreviewImageUrl("Dashboard.png")],
  },
};

export default async function DashboardRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;

  let recentScans: any[] = [];
  try {
    recentScans = await fetchRecentScansServer(user.id, 6);
  } catch (fetchError) {
    console.error("Server: failed to preload recent scans", fetchError);
  }

  const subscription = await getPlatformSubscriptionServer(user.id);

  // Fetch user profile to get full_name
  let userFullName: string | null = null;
  try {
    const { data: profileData } = await (supabase as any)
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profileData?.full_name) {
      userFullName = profileData.full_name.trim();
    }
  } catch (error) {
    console.error("Server: failed to load user profile", error);
  }

  return (
    <DashboardPage
      initialUser={user}
      initialSubscription={subscription}
      initialScans={recentScans}
      initialFullName={userFullName}
    />
  );
}

