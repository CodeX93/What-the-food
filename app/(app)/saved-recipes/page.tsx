import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SavedRecipesPage from "@/views/SavedRecipes";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { getPlatformSubscriptionServer } from "@/utils/subscription.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved Recipes | What The Food AI Recipe Analyzer",
  description: "Access your saved recipes and plan meals effortlessly. What The Food helps you track calories, macros, and organize recipes for smarter nutrition.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    images: ["/preview-images/Saved Recipes.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saved Recipes | What The Food AI Recipe Analyzer",
    description: "Access your saved recipes and plan meals effortlessly. What The Food helps you track calories, macros, and organize recipes for smarter nutrition.",
    images: ["/preview-images/Saved Recipes.png"],
  },
};

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
