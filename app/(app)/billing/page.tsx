import { redirect } from "next/navigation";
import BillingPage from "@/views/Billing";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export default async function BillingRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("Server: error fetching subscription for billing", subscriptionError);
  }

  return (
    <BillingPage
      initialUser={user}
      initialSubscription={subscription ?? null}
    />
  );
}

