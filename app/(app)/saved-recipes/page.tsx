import { redirect } from "next/navigation";
import SavedRecipesPage from "@/views/SavedRecipes";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

export const dynamic = "force-dynamic";

export default async function SavedRecipesRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const subscription = await getPlatformSubscriptionServer(session.user.id);

  return <SavedRecipesPage initialSubscription={subscription} />;
}
