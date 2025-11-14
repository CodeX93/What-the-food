"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const widgetPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: ["Branding included", "1 scan per day", "1 site", "Basic support"],
    cta: "Get Started",
    popular: false,
    planType: "free",
  },
  {
    name: "Premium Plan 1",
    price: "$4.99",
    period: "/month",
    yearlyPrice: "$49.99/year",
    features: ["Remove branding", "Unlimited scans", "1 site", "Premium support"],
    cta: "Upgrade Now",
    popular: false,
    planType: "plan1",
  },
  {
    name: "Premium Plan 2",
    price: "$9.99",
    period: "/month",
    yearlyPrice: "$99.99/year",
    features: ["Remove branding", "Unlimited scans", "Up to 3 sites", "Premium support"],
    cta: "Upgrade Now",
    popular: true,
    planType: "plan2",
  },
  {
    name: "Premium Plan 3",
    price: "$14.99",
    period: "/month",
    yearlyPrice: "$149.99/year",
    features: ["Remove branding", "Unlimited scans", "Unlimited sites", "Premium support"],
    cta: "Upgrade Now",
    popular: false,
    planType: "plan3",
  },
];

export function WidgetPricing() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      if (session?.user) {
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
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        try {
          const { data: sub, error } = await supabase
            .from("widget_subscriptions")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!error && sub) {
            setSubscription(sub);
          } else {
            setSubscription(null);
          }
        } catch (error) {
          console.error("Error fetching widget subscription:", error);
        }
      } else {
        setSubscription(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getPlanCTA = (planType: string) => {
    if (!isLoggedIn || !subscription) {
      return planType === "free" ? "Get Started" : "Upgrade Now";
    }

    const isActive = subscription.is_active;
    const currentPlanType = subscription.subscription_type;
    const billingCycle = subscription.billing_cycle;

    if (planType === "free") {
      // For free plan
      if (isActive && currentPlanType !== "free") {
        return "Cancel Subscription";
      }
      return "Get Started";
    } else {
      // For premium plans
      if (isActive && currentPlanType === planType) {
        // User is on this plan - show "Cancel Plan"
        return "Cancel Plan";
      } else if (isActive && currentPlanType !== "free") {
        // User is on a different premium plan
        return "Switch Plan";
      }
      return "Upgrade Now";
    }
  };

  const isCurrentPlan = (planType: string) => {
    if (!isLoggedIn || !subscription) return false;
    const isActive = subscription.is_active;
    const currentPlanType = subscription.subscription_type;
    return isActive && currentPlanType === planType;
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !isLoggedIn) return;

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

  const handlePlanClick = (e: React.MouseEvent, planType: string) => {
    e.preventDefault();
    if (!isLoggedIn) {
      window.location.href = "/auth";
      return;
    }

    const cta = getPlanCTA(planType);
    
    if (cta === "Cancel Plan" || cta === "Cancel Subscription") {
      setPlanToCancel(planType);
      setShowCancelDialog(true);
    } else {
      window.location.href = "/widget/plans";
    }
  };

  return (
    <section id="widget-pricing" className="bg-muted/30">
      <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Widget Pricing</h2>
          <p className="text-muted-foreground">
            Choose the plan that fits your needs—upgrade anytime as your audience grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {widgetPlans.map((plan, index) => (
            <Card key={index} className={`relative h-full ${plan.popular ? "border-primary shadow-strong" : ""}`}>
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
                  {plan.yearlyPrice && <div className="text-xs text-muted-foreground mt-1">or {plan.yearlyPrice}</div>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${plan.popular && !isCurrentPlan(plan.planType) ? "bg-primary hover:bg-primary-hover" : ""} ${isCurrentPlan(plan.planType) ? "bg-destructive hover:bg-destructive/90" : ""}`}
                  variant={isCurrentPlan(plan.planType) ? "destructive" : plan.popular ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => handlePlanClick(e, plan.planType)}
                  disabled={loading || cancelling}
                >
                  {loading || cancelling ? "Loading..." : getPlanCTA(plan.planType)}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your widget subscription? You&apos;ll be moved to the Free plan and will lose access to premium widget features.
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
    </section>
  );
}

