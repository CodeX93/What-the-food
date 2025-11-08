import { redirect } from "next/navigation";
import DashboardPage from "@/views/Dashboard";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";
import { fetchRecentScansServer } from "@/utils/foodScan.server";

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

  return (
    <DashboardPage
      initialUser={user}
      initialSubscription={subscription}
      initialScans={recentScans}
    />
  );
}

