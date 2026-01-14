import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfilePage from "@/views/Profile";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { fetchProfileDataServer } from "@/utils/profile.server";
import { getUserStreaks, getUserAchievements, type UserStreak, type UserAchievement } from "@/utils/streaks.server";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/profile');

  const title = "Your What The Food Health Profile | Personalize Your Goals";
  const description = "Add your personal info: Age, weight, height, and health goals to your profile for tailored and personalized health insights that can optimize your nutrition.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProfileRoute() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/auth");
  }

  const user = session.user;
  const profileData = await fetchProfileDataServer(user.id);

  // Fetch streaks and achievements
  let initialStreaks: UserStreak[] = [];
  let initialAchievements: UserAchievement[] = [];
  try {
    [initialStreaks, initialAchievements] = await Promise.all([
      getUserStreaks(user.id),
      getUserAchievements(user.id),
    ]);
  } catch (error) {
    console.error("Server: failed to load streaks/achievements", error);
  }

  return (
    <ProfilePage
      initialUser={user}
      initialProfile={profileData.profile}
      initialSubscription={profileData.subscription}
      initialPlanName={profileData.planName}
      initialStreaks={initialStreaks}
      initialAchievements={initialAchievements}
    />
  );
}

