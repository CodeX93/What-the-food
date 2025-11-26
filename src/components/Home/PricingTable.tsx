"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformSubscription } from "@/utils/subscription";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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

const PricingTable = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const plans = [
    {
      name: t("pricing.free.name"),
      price: t("pricing.free.price"),
      period: t("pricing.free.period"),
      description: t("pricing.free.description"),
      features: [
        t("pricing.free.feature1"),
        t("pricing.free.feature2"),
        t("pricing.free.feature3"),
        t("pricing.free.feature4"),
        t("pricing.free.feature5"),
        t("pricing.free.feature6"),
        t("pricing.free.feature7"),
      ],
      cta: t("pricing.free.cta"),
      popular: false,
    },
    {
      name: t("pricing.premium.name"),
      price: t("pricing.premium.price"),
      period: t("pricing.premium.period"),
      yearlyPrice: t("pricing.premium.yearly"),
      description: t("pricing.premium.description"),
      features: [
        t("pricing.premium.feature1"),
        t("pricing.premium.feature2"),
        t("pricing.premium.feature3"),
        t("pricing.premium.feature4"),
        t("pricing.premium.feature5"),
        t("pricing.premium.feature6"),
        t("pricing.premium.feature7"),
      ],
      cta: t("pricing.premium.cta"),
      popular: true,
    },
  ];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      if (session?.user) {
        try {
          const sub = await getPlatformSubscription(session.user.id);
          setSubscription(sub);
        } catch (error) {
          console.error("Error fetching subscription:", error);
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
          const sub = await getPlatformSubscription(session.user.id);
          setSubscription(sub);
        } catch (error) {
          console.error("Error fetching subscription:", error);
        }
      } else {
        setSubscription(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getPlanCTA = (planName: string) => {
    if (!isLoggedIn || !subscription) {
      return planName === t("pricing.free.name") ? t("pricing.free.cta") : t("pricing.premium.cta");
    }

    const isPremium = subscription.subscription_type === "premium" && subscription.is_active;
    const isFree = subscription.subscription_type === "free";
    const billingCycle = subscription.billing_cycle;

    if (planName === "Premium") {
      // For premium plan - if user is on this plan, show billing cycle switch option
      if (isPremium) {
        if (billingCycle === "monthly") {
          return "Go Annually";
        } else if (billingCycle === "yearly") {
          return "Go Monthly";
        }
        // Fallback if billing cycle is not set
        return "Change to another plan";
      }
      return "Upgrade Now";
    } else {
      // For free plan - if user is on free plan, show "Current Plan"
      if (isFree) {
        return t("pricing.current");
      }
      // If user is on premium, they can't cancel to free from here, just show "Get Started"
      return "Get Started";
    }
  };

  const isCurrentPlan = (planName: string) => {
    if (!isLoggedIn || !subscription) return false;
    const isPremium = subscription.subscription_type === "premium" && subscription.is_active;
    const isFree = subscription.subscription_type === "free";
    
    if (planName === "Premium") {
      return isPremium;
    } else if (planName === "Free") {
      return isFree;
    }
    return false;
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !isLoggedIn) return;

    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: t("common.error"),
          description: t("pricing.cancel"),
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
          subscriptionType: "platform",
          userId: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      // Refresh subscription data
      const sub = await getPlatformSubscription(session.user.id);
      setSubscription(sub);

      toast({
        title: t("common.success"),
        description: t("pricing.canceldialog.description"),
      });

      setShowCancelDialog(false);
      setPlanToCancel(null);
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("common.error"),
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handlePlanClick = (e: React.MouseEvent, planName: string) => {
    e.preventDefault();
    if (!isLoggedIn) {
      router.push("/auth");
      return;
    }

    const cta = getPlanCTA(planName);
    
    // Don't do anything if it's the current plan (for Free plan)
    if (cta === t("pricing.current")) {
      return;
    }
    
    // Navigate to /plans for all cases
    router.push("/plans");
  };

  return (
    <section className="w-full bg-white dark:bg-[#000000] transition-colors duration-300">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16 relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{t("pricing.title")}</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
          {plans.map((plan, index) => (
            <Card key={index} 
              className={`relative ${plan.popular ? 'border-primary shadow-strong' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  {t("pricing.premium.name")}
                </div>
              )}
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm sm:text-base">{plan.description}</CardDescription>
                <div className="mt-3 sm:mt-4">
                  <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm sm:text-base">{plan.period}</span>
                  {plan.yearlyPrice && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      or {plan.yearlyPrice}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <ul className="space-y-2 sm:space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 pt-0">
                <Button 
                  className={`w-full text-sm sm:text-base ${plan.popular && !isCurrentPlan(plan.name) ? 'bg-primary hover:bg-primary-hover' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={(e) => handlePlanClick(e, plan.name)}
                  disabled={loading || cancelling || (isCurrentPlan(plan.name) && plan.name === t("pricing.free.name"))}
                >
                  {loading || cancelling ? t("common.loading") : getPlanCTA(plan.name)}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pricing.canceldialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pricing.canceldialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{t("pricing.canceldialog.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? t("common.loading") : t("pricing.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default PricingTable;