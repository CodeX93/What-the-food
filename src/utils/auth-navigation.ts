// ============================================
// CLEAN AUTH NAVIGATION UTILITY
// ============================================

import { supabase } from "@/integrations/supabase/client";

/**
 * Get navigation path after authentication
 * Returns '/plans' if user is on free plan, '/dashboard' if premium
 */
export async function getPostAuthNavigationPath(): Promise<string> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return "/auth";
    }

    const user = session.user;

    // Check if email is verified
    if (!user.email_confirmed_at && !user.confirmed_at) {
      return "/auth";
    }

    // Check platform subscription
    const { data: subscription, error: subError } = await supabase
      .from("platform_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // If no subscription or not premium, redirect to plans
    if (subError || !subscription || subscription.subscription_type !== 'premium') {
      return "/plans";
    }

    // User has premium subscription, go to dashboard
    return "/dashboard";
  } catch (error) {
    console.error("Error checking subscription:", error);
    return "/auth";
  }
}
