import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardPage from "@/views/Dashboard";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { fetchRecentScansServer } from "@/utils/foodScan.server";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/dashboard');

  const title = "What The Food User Dashboard | Your Health Copilot";
  const description = "Your health copilot that lets you track macros, scan history, save recipes, and plan meals. Manage your nutrition smarter with our What The Food.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DashboardRoute() {
  const supabase = await createServerSupabaseClient();
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

