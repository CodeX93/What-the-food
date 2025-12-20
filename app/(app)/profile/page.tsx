import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfilePage from "@/views/Profile";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { fetchProfileDataServer } from "@/utils/profile.server";
import { getPreviewImageUrl } from "@/lib/seo/siteUrl";

export const metadata: Metadata = {
  title: "Your What The Food Health Profile | Personalize Your Goals",
  description: "Add your personal info: Age, weight, height, and health goals to your profile for tailored and personalized health insights that can optimize your nutrition.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: [getPreviewImageUrl("Profile.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your What The Food Health Profile | Personalize Your Goals",
    description: "Add your personal info: Age, weight, height, and health goals to your profile for tailored and personalized health insights that can optimize your nutrition.",
    images: [getPreviewImageUrl("Profile.png")],
  },
};

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
      initialPlanName={profileData.planName}
    />
  );
}

