import { supabase } from "@/integrations/supabase/client";

/**
 * Checks user's subscription status and returns the appropriate navigation path
 * @returns '/plans' if email verified but no active subscription, '/dashboard' if has subscription
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
      // Email not verified yet
      return "/auth";
    }

    // Check if user has a subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // If no subscription found or subscription is not active, navigate to plans page
    // This handles cases where subscription wasn't created or is inactive
    if (subError || !subscription || !subscription.is_active) {
      return "/plans";
    }

    // User has an active subscription (free or premium), navigate to dashboard
    return "/dashboard";
  } catch (error) {
    console.error("Error checking subscription:", error);
    return "/auth";
  }
}

