import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfilePage from "@/views/Profile";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { fetchProfileDataServer } from "@/utils/profile.server";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Profile.png", requestUrl);
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

