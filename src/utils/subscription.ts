// ============================================
// CLEAN SUBSCRIPTION UTILITIES
// ============================================

import { supabase } from "@/integrations/supabase/client";

/**
 * Get user's platform subscription
 */
export async function getPlatformSubscription(userId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const targetUserId = userId || session.user.id;

  // Select specific columns to avoid deep type inference issues
  const { data, error } = await supabase
    .from("platform_subscriptions" as any)
    .select("id, user_id, subscription_type, platform_plan_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_cycle, is_active, current_period_end, created_at, updated_at")
    .eq("user_id", targetUserId)
    .maybeSingle() as { data: any; error: any };

  if (error) {
    console.error("Error fetching platform subscription:", error);
    return null;
  }

  return data;
}

/**
 * Get user's widget subscription
 */
export async function getWidgetSubscription(userId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const targetUserId = userId || session.user.id;

  // Select specific columns to avoid deep type inference issues
  const { data, error } = await supabase
    .from("widget_subscriptions")
    .select("id, user_id, subscription_type, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_cycle, is_active, site_limit, current_period_end, created_at, updated_at")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching widget subscription:", error);
    return null;
  }

  return data;
}

/**
 * Check if user has active premium platform subscription
 */
export async function hasActivePremiumSubscription(userId?: string): Promise<boolean> {
  const subscription = await getPlatformSubscription(userId);
  return subscription?.subscription_type === 'premium' && subscription?.is_active === true;
}

/**
 * Check if user has active widget subscription
 */
export async function hasActiveWidgetSubscription(userId?: string): Promise<boolean> {
  const subscription = await getWidgetSubscription(userId);
  return subscription?.subscription_type !== 'free' && subscription?.is_active === true;
}

