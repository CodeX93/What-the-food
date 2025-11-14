'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { redirectToCheckout } from "@/utils/stripe";
import { getUrl } from "@/utils/url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WidgetPlanType = {
  name: string;
  subscriptionType: "free" | "plan1" | "plan2" | "plan3";
  price: string;
  period: string;
  yearlyPrice?: string;
  priceId?: string;
  yearlyPriceId?: string;
  features: string[];
  popular: boolean;
  siteLimit: number | string;
  scans: string;
  support: string;
  branding: string;
};

export function WidgetPlansClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<WidgetPlanType | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      // Fetch current widget subscription
      try {
        const { data: sub, error } = await supabase
          .from("widget_subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!error && sub) {
          setSubscription(sub);
        }
      } catch (error) {
        console.error("Error fetching widget subscription:", error);
      }
    };

    void checkAuth();
  }, [router]);

  const plans: WidgetPlanType[] = [
    {
      name: "Free",
      subscriptionType: "free",
      price: "$0",
      period: "/month",
      features: ["Branding included", "1 scan per day", "1 site", "Basic Support"],
      popular: false,
      siteLimit: 1,
      scans: "1/day",
      support: "Basic Support",
      branding: "No",
    },
    {
      name: "Premium Plan 1",
      subscriptionType: "plan1",
      price: "$4.99",
      period: "/month",
      yearlyPrice: "$49.99/year",
      priceId: process.env.NEXT_PUBLIC_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID,
      yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID,
      features: ["Remove branding", "Unlimited scans", "1 site", "Premium Support"],
      popular: false,
      siteLimit: 1,
      scans: "Unlimited",
      support: "Premium Support",
      branding: "Yes",
    },
    {
      name: "Premium Plan 2",
      subscriptionType: "plan2",
      price: "$9.99",
      period: "/month",
      yearlyPrice: "$99.90/year",
      priceId: process.env.NEXT_PUBLIC_STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID,
      yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID,
      features: ["Remove branding", "Unlimited scans", "Up to 3 sites", "Premium Support"],
      popular: true,
      siteLimit: 3,
      scans: "Unlimited",
      support: "Premium Support",
      branding: "Yes",
    },
    {
      name: "Premium Plan 3",
      subscriptionType: "plan3",
      price: "$14.99",
      period: "/month",
      yearlyPrice: "$149.99/year",
      priceId: process.env.NEXT_PUBLIC_STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID,
      yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID,
      features: ["Remove branding", "Unlimited scans", "Unlimited sites", "Premium Support"],
      popular: false,
      siteLimit: "Unlimited",
      scans: "Unlimited",
      support: "Premium Support",
      branding: "Yes",
    },
  ];

  const isCurrentPlan = (plan: WidgetPlanType) => {
    if (!subscription || !subscription.is_active) return false;
    return subscription.subscription_type === plan.subscriptionType;
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !planToCancel) return;

    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Error",
          description: "You must be logged in to cancel your subscription.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionType: "widget",
          userId: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      // Refresh subscription data
      const { data: sub, error } = await supabase
        .from("widget_subscriptions")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error && sub) {
        setSubscription(sub);
      }

      toast({
        title: "Subscription Cancelled",
        description: "Your widget subscription has been cancelled and you've been moved to the Free plan.",
      });

      setShowCancelDialog(false);
      setPlanToCancel(null);
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectPlan = async (plan: WidgetPlanType, billingCycle: "monthly" | "yearly" = "monthly") => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/auth");
      return;
    }

    setLoading(`${plan.subscriptionType}-${billingCycle}`);

    try {
      if (plan.subscriptionType === "free") {
        const { data: existingProfile, error: profileError } = await (supabase as any)
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!existingProfile) {
          const { error: createProfileError } = await (supabase as any)
            .from("profiles")
            .insert({ id: session.user.id, email: session.user.email || "" });

          if (createProfileError) {
            throw createProfileError;
          }
        }

        const { error } = await (supabase as any)
          .from("widget_subscriptions")
          .upsert(
            {
              user_id: session.user.id,
              subscription_type: "free",
              is_active: true,
              site_limit: 1,
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Free plan activated. You can now create your widget.",
        });

        router.push("/widget/dashboard");
        return;
      }

      const priceId = billingCycle === "yearly" ? plan.yearlyPriceId : plan.priceId;
      if (!priceId) {
        throw new Error("Price ID not configured for this plan");
      }

      const successUrl = `${getUrl('/checkout/success')}?session_id={CHECKOUT_SESSION_ID}&type=widget`;
      const cancelUrl = getUrl('/widget/plans');

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          billingCycle,
          userId: session.user.id,
          email: session.user.email,
          successUrl,
          cancelUrl,
          subscriptionType: 'widget',
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned from server. Check Edge Function logs for details.');
      }

      await redirectToCheckout(data.url);
    } catch (error: any) {
      console.error('Error selecting plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process plan selection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="flex-1">
      <section className="py-20 bg-gradient-hero/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent pb-1">
            Choose your Widget Pricing
            </h1>
            <p className="text-lg text-muted-foreground mb-6">Select the perfect plan for your website needs. You can upgrade or downgrade at any time.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan);
              const isPaidPlan = plan.subscriptionType !== "free";
              const isCurrentPaidPlan = isCurrent && isPaidPlan;

              return (
                <Card
                  key={plan.subscriptionType}
                  className={`relative ${plan.popular ? "border-primary shadow-strong" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                      {plan.yearlyPrice && (
                        <div className="text-xs text-muted-foreground mt-1">or {plan.yearlyPrice}</div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    {plan.subscriptionType === "free" ? (
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        disabled={loading === `${plan.subscriptionType}-monthly` || cancelling}
                      >
                        {loading === `${plan.subscriptionType}-monthly` ? (
                          <>
                            <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Activating...
                          </>
                        ) : (
                          "Get Started Free"
                        )}
                      </Button>
                    ) : isCurrentPaidPlan ? (
                      <Button
                        onClick={() => {
                          setPlanToCancel(plan);
                          setShowCancelDialog(true);
                        }}
                        className="w-full bg-destructive hover:bg-destructive/90"
                        variant="destructive"
                        disabled={cancelling}
                      >
                        {cancelling ? "Cancelling..." : "Cancel Plan"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleSelectPlan(plan, "monthly")}
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          disabled={loading?.startsWith(plan.subscriptionType) || cancelling}
                        >
                          {loading === `${plan.subscriptionType}-monthly` ? (
                            <>
                              <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Processing...
                            </>
                          ) : (
                            `Subscribe ${plan.price}/mo`
                          )}
                        </Button>
                        {plan.yearlyPriceId && (
                          <Button
                            onClick={() => handleSelectPlan(plan, "yearly")}
                            className="w-full"
                            variant="outline"
                            size="sm"
                            disabled={loading?.startsWith(plan.subscriptionType) || cancelling}
                          >
                            {loading === `${plan.subscriptionType}-yearly` ? (
                              <>
                                <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Processing...
                              </>
                            ) : (
                              "Save with Yearly"
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your widget subscription? You'll be moved to the Free plan and will lose access to premium widget features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? "Cancelling..." : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
