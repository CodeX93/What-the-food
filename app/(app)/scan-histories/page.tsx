import { redirect } from "next/navigation";
import ScanHistoriesPage from "@/views/ScanHistories";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

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

