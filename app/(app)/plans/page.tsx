import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PlansPage from "@/views/Plans";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { fetchActivePlatformPlansServer } from "@/utils/plans.server";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/plans');

  return {
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  };
}

export default async function PlansRoute() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;

  const plans = await fetchActivePlatformPlansServer();
  const subscription = await getPlatformSubscriptionServer(user.id);

  return (
    <PlansPage
      initialUser={user}
      initialPlans={plans}
      initialSubscription={subscription}
    />
  );
}

