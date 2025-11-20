export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import WidgetDashboardPage from "@/views/WidgetDashboard";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

export default async function WidgetDashboardRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const subscription = await getPlatformSubscriptionServer(session.user.id);

  return <WidgetDashboardPage initialSubscription={subscription} />;
}

