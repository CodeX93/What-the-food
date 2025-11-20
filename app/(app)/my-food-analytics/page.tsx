import { redirect } from "next/navigation";
import MyFoodAnalyticsPage from "@/views/MyFoodAnalytics";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

export const dynamic = "force-dynamic";

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

