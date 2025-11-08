import { redirect } from "next/navigation";
import ProfilePage from "@/views/Profile";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { fetchProfileDataServer } from "@/utils/profile.server";

export default async function ProfileRoute() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;
  const profileData = await fetchProfileDataServer(user.id);

  return (
    <ProfilePage
      initialUser={user}
      initialProfile={profileData.profile}
      initialSubscription={profileData.subscription}
      initialWidgetSubscription={profileData.widgetSubscription}
      initialPlanName={profileData.planName}
      initialWidgetPlanName={profileData.widgetPlanName}
    />
  );
}

