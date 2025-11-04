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

        // Check subscription - if premium, redirect to dashboard
        const sub = await getPlatformSubscription(session.user.id);
        if (sub && sub.subscription_type === 'premium' && sub.is_active) {
          navigate("/dashboard");
          return;
        }
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

  const handleSelectPlan = async (plan: any) => {
    try {
      setLoading(`${plan.name}-${plan.billing_cycle}`);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      // Free plan - update subscription directly
      if (plan.billing_cycle === 'free') {
        const { error } = await supabase
          .from("platform_subscriptions")
          .upsert({
            user_id: session.user.id,
            subscription_type: "free",
            is_active: true,
            platform_plan_id: plan.id,
          }, {
            onConflict: 'user_id',
          });

        if (error) throw error;

        toast({
          title: "Plan selected!",
          description: "You're now on the Free plan. Enjoy 3 scans per day!",
        });

        navigate("/dashboard");
        return;
      }

      // Premium plan - create Stripe checkout
      const priceId = plan.stripe_price_id ||
        (plan.billing_cycle === 'monthly'
          ? (import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID as string | undefined)
          : plan.billing_cycle === 'yearly'
          ? (import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID as string | undefined)
          : undefined);

      if (!priceId) {
        toast({
          title: "Error",
          description: "Price ID not configured. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Create checkout session
      const checkoutUrl = await createCheckoutSession(
        priceId,
        plan.billing_cycle,
        'platform',
        plan.id,
        plan.name
      );

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
                  <Button
                    className="w-full"
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={loading === `${plan.name}-${plan.billing_cycle}`}
                  >
                    {loading === `${plan.name}-${plan.billing_cycle}`
                      ? "Processing..."
                      : plan.billing_cycle === 'free'
                      ? "Get Started"
                      : plan.billing_cycle === 'yearly'
                      ? "Subscribe Yearly"
                      : "Subscribe Monthly"}
                  </Button>
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
