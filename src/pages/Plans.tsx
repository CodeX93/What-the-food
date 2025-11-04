// ============================================
// CLEAN PLANS PAGE
// ============================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSession, redirectToCheckout } from "@/utils/stripe";
import { getPlatformSubscription } from "@/utils/subscription";

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isFetchingPlans, setIsFetchingPlans] = useState<boolean>(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }

        // Fetch plans
        const { data: plansData } = await supabase
          .from("platform_plans")
          .select("*")
          .eq("is_active", true)
          .order("price_cents", { ascending: true });

        setPlans(plansData || []);
        setIsFetchingPlans(false);

        // Fetch subscription to show current plan status (no redirect)
        const sub = await getPlatformSubscription(session.user.id);
        setSubscription(sub);
      } catch (error) {
        console.error("Error loading plans:", error);
        setIsFetchingPlans(false);
      }
    };

    loadData();
  }, [navigate]);

  const formatPrice = (price_cents: number, interval: string) => {
    if (interval === 'free') return '$0';
    return `$${(price_cents / 100).toFixed(2)}`;
  };

  // Check if a plan is the user's current active plan
  const isCurrentPlan = (plan: any) => {
    if (!subscription || !subscription.is_active) return false;
    
    // Free plan check
    if (subscription.subscription_type === 'free') {
      const planCycle = plan.billing_cycle || 
        (plan.interval === 'free' ? 'free' : null);
      return planCycle === 'free';
    }
    
    // Premium plan check - match by platform_plan_id
    if (subscription.platform_plan_id && plan.id) {
      return subscription.platform_plan_id === plan.id;
    }
    
    // Fallback: match by billing cycle for premium plans
    if (subscription.subscription_type === 'premium') {
      const planCycle = plan.billing_cycle || 
        (plan.interval === 'month' ? 'monthly' : 
         plan.interval === 'year' ? 'yearly' : null);
      const subCycle = subscription.billing_cycle;
      return planCycle === subCycle && planCycle !== 'free';
    }
    
    return false;
  };

  const handleSelectPlan = async (plan: any) => {
    try {
      // Use billing_cycle or derive from interval for loading state
      const planCycle = plan.billing_cycle || 
        (plan.interval === 'month' ? 'monthly' : 
         plan.interval === 'year' ? 'yearly' : 
         plan.interval === 'free' ? 'free' : 'monthly');
      setLoading(`${plan.name}-${planCycle}`);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      // Helper: ensure a profile row exists to satisfy FK constraint
      // Profile should already exist from the handle_new_user trigger, but we verify
      const ensureProfile = async () => {
        // First, check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (existingProfile) {
          // Profile exists, we're good
          return;
        }
        
        // Profile doesn't exist - try to create it
        // This should only happen if the trigger didn't fire
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email || '',
          });
        
        if (insertError) {
          console.error('Failed to ensure profile exists:', insertError);
          // If FK constraint error, the constraint is wrong and needs to be fixed
          if (insertError.code === '23503') {
            throw new Error(
              'Profile foreign key constraint error. Please run the migration: ' +
              '20250105000000_fix_profiles_fk_constraint.sql in Supabase SQL Editor.'
            );
          }
          throw new Error(`Failed to create profile: ${insertError.message}`);
        }
      };

      // Free plan - update or insert subscription directly
      if (plan.billing_cycle === 'free' || plan.interval === 'free') {
        // Ensure profile exists first (required for FK constraint)
        await ensureProfile();

        const { data: existing } = await supabase
          .from('platform_subscriptions')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        let subscriptionId: string | null = null;
        let error: any = null;
        
        if (existing?.id) {
          // Update existing subscription
          const { data: updateData, error: updateError } = await supabase
            .from('platform_subscriptions')
            .update({
              subscription_type: 'free',
              is_active: true,
              platform_plan_id: plan.id,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              stripe_price_id: null,
              billing_cycle: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', session.user.id)
            .select('id')
            .single();
          subscriptionId = updateData?.id || existing.id;
          error = updateError;
        } else {
          // Insert new subscription
          const { data: insertData, error: insertError } = await supabase
            .from('platform_subscriptions')
            .insert({
              user_id: session.user.id,
              subscription_type: 'free',
              is_active: true,
              platform_plan_id: plan.id,
              billing_cycle: 'free',
            })
            .select('id')
            .single();
          subscriptionId = insertData?.id || null;
          error = insertError;
        }

        if (error) {
          console.error('Subscription update error:', error);
          throw error;
        }

        // Manually update profile to sync subscription info
        // The trigger should handle this, but we'll update manually as backup
        if (subscriptionId) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              platform_subscription_id: subscriptionId,
              platform_subscription_type: 'free',
              platform_subscription_plan_id: plan.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.user.id);
          
          if (profileUpdateError) {
            console.warn('Profile sync failed (trigger should handle it):', profileUpdateError);
          }
        }

        toast({
          title: "Plan selected!",
          description: "You're now on the Free plan. Enjoy 3 scans per day!",
        });

        navigate("/dashboard");
        return;
      }

      // Premium plan - create Stripe checkout
      // Determine billing cycle from plan (check both billing_cycle and interval fields)
      const billingCycle = plan.billing_cycle || 
        (plan.interval === 'month' ? 'monthly' : 
         plan.interval === 'year' ? 'yearly' : 
         'monthly'); // default to monthly
      
      const priceId = plan.stripe_price_id ||
        (billingCycle === 'monthly'
          ? (import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID as string | undefined)
          : billingCycle === 'yearly'
          ? (import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID as string | undefined)
          : undefined);

      if (!priceId) {
        toast({
          title: "Error",
          description: `Price ID not configured for ${billingCycle} plan. Please contact support.`,
          variant: "destructive",
        });
        console.error('Missing price ID:', { 
          planId: plan.id, 
          planName: plan.name, 
          billingCycle, 
          stripe_price_id: plan.stripe_price_id,
          envMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
          envYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID,
        });
        return;
      }

      // Create checkout session
      let checkoutUrl: string;
      try {
        checkoutUrl = await createCheckoutSession(
          priceId,
          billingCycle as 'monthly' | 'yearly',
          'platform',
          plan.id,
          plan.name
        );
      } catch (err: any) {
        console.error('create-checkout-session failed:', err);
        console.error('Error details:', {
          priceId,
          billingCycle,
          planId: plan.id,
          planName: plan.name,
          error: err?.message,
        });
        throw new Error(err?.message || 'Failed to start checkout. Please check your plan configuration.');
      }

      // Redirect to Stripe Checkout
      await redirectToCheckout(checkoutUrl);
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to select plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="text-lg text-muted-foreground">
              Select a plan that works best for you. You can upgrade or downgrade at any time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
            {isFetchingPlans ? (
              <div className="col-span-3 text-center text-muted-foreground">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="col-span-3 text-center text-muted-foreground">No plans configured.</div>
            ) : plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.is_popular
                    ? "border-primary border-2 shadow-lg md:scale-105"
                    : "border-2"
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.billing_cycle === "free" && (
                      <Sparkles className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{formatPrice(plan.price_cents, plan.interval)}</span>
                    <span className="text-muted-foreground">
                      {plan.billing_cycle === 'monthly' ? '/month' : plan.billing_cycle === 'yearly' ? '/year' : 'forever'}
                    </span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {(() => {
                    const planCycle = plan.billing_cycle || 
                      (plan.interval === 'month' ? 'monthly' : 
                       plan.interval === 'year' ? 'yearly' : 
                       plan.interval === 'free' ? 'free' : 'monthly');
                    const isLoading = loading === `${plan.name}-${planCycle}`;
                    const isCurrent = isCurrentPlan(plan);
                    
                    const buttonText = isLoading
                      ? "Processing..."
                      : isCurrent
                      ? "Current Plan"
                      : planCycle === 'free'
                      ? "Get Started"
                      : planCycle === 'yearly'
                      ? "Subscribe Yearly"
                      : "Subscribe Monthly";
                    
                    return (
                      <Button
                        className="w-full"
                        variant={isCurrent ? "outline" : plan.is_popular ? "default" : "outline"}
                        onClick={() => !isCurrent && handleSelectPlan(plan)}
                        disabled={isLoading || isCurrent}
                      >
                        {buttonText}
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Plans;
