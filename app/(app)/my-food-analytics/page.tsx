import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MyFoodAnalyticsPage from "@/views/MyFoodAnalytics";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics | Track Macros and Nutrition with What The Food",
  description: "Analyze your daily, weekly, and monthly food intake. Our AI Food Scanner helps you track macros, calories, and nutrition trends for smarter eating habits.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: ["/preview-images/My Food Analytics.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Analytics | Track Macros and Nutrition with What The Food",
    description: "Analyze your daily, weekly, and monthly food intake. Our AI Food Scanner helps you track macros, calories, and nutrition trends for smarter eating habits.",
    images: ["/preview-images/My Food Analytics.png"],
  },
};

export default async function MyFoodAnalyticsRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const subscription = await getPlatformSubscriptionServer(session.user.id);

  return <MyFoodAnalyticsPage initialSubscription={subscription} />;
}

