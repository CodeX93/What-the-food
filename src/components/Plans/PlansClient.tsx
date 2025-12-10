"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { createCheckoutSession, redirectToCheckout } from "@/utils/stripe";
import { getPlatformSubscription } from "@/utils/subscription";
import type { User } from "@supabase/supabase-js";
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

// Helper function to parse features from JSON string to array
function parseFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      // Try parsing as JSON string
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed;
      // If it's still a string, try parsing again (double-encoded case)
      if (typeof parsed === 'string') {
        const doubleParsed = JSON.parse(parsed);
        if (Array.isArray(doubleParsed)) return doubleParsed;
      }
      return [];
    } catch (e) {
      console.error("Error parsing features:", e);
      return [];
    }
  }
  return [];
}

// Helper function to parse not included items
function parseNotIncluded(notIncluded: any): string[] {
  return parseFeatures(notIncluded);
}

interface Plan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  previous_price_cents?: number | null;
  billing_cycle: "free" | "monthly" | "yearly";
  interval: string;
  features?: string[];
  not_included?: string[];
  is_popular?: boolean;
  stripe_price_id?: string | null;
}

export type PlansClientProps = {
  initialUser?: User | null;
  initialPlans?: Plan[];
  initialSubscription?: any;
};

export function PlansClient({
  initialUser = null,
  initialPlans = [],
  initialSubscription = null,
}: PlansClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [isFetchingPlans, setIsFetchingPlans] = useState(initialPlans.length === 0);
  const [subscription, setSubscription] = useState<any>(initialSubscription);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [planToCancel, setPlanToCancel] = useState<Plan | null>(null);

  useEffect(() => {
    if (initialPlans.length > 0) {
      // Parse features from JSON string to array for each plan
      const parsedPlans = initialPlans.map((plan: any) => ({
        ...plan,
        features: parseFeatures(plan.features),
        not_included: parseNotIncluded((plan as any).not_included),
      }));
      setPlans(parsedPlans);
    }
  }, [initialPlans]);

  useEffect(() => {
    if (initialSubscription) {
      setSubscription(initialSubscription);
    }
  }, [initialSubscription]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push("/auth");
          return;
        }

        if (initialPlans.length === 0) {
          setIsFetchingPlans(true);
          const { data: plansData } = await supabase
            .from("platform_plans")
            .select("*")
            .eq("is_active", true)
            .order("price_cents", { ascending: true });

          if (!cancelled) {
            // Parse features from JSON string to array for each plan
            const parsedPlans = (plansData || []).map((plan: any) => ({
              ...plan,
              features: parseFeatures(plan.features),
              not_included: parseNotIncluded(plan.not_included),
            }));
            setPlans(parsedPlans);
          }
        }

        if (!initialSubscription) {
          const sub = await getPlatformSubscription(session.user.id);
          if (!cancelled) {
            setSubscription(sub);
          }
        }
      } catch (error) {
        console.error("Error loading plans:", error);
        if (!cancelled && initialPlans.length === 0) {
          toast({
            title: t("plans.error.title"),
            description: t("plans.error.load"),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsFetchingPlans(false);
        }
      }
    };

    if (!initialUser || initialPlans.length === 0 || !initialSubscription) {
      void loadData();
    } else {
      setIsFetchingPlans(false);
    }

    return () => {
      cancelled = true;
    };
  }, [initialUser, initialPlans.length, initialSubscription, router, toast, t]);

  const formatPrice = (price_cents: number, interval: string) => {
    if (interval === "free") return "$0";
    return `$${(price_cents / 100).toFixed(2)}`;
  };

  const translateFeature = (feature: string): string => {
    if (!feature) return feature;
    
    // If the feature is already a translation key (starts with "plans.feature."), translate it directly
    if (feature.startsWith("plans.feature.")) {
      const translated = t(feature);
      // If translation returns the key itself (not found), return original
      return translated !== feature ? translated : feature;
    }
    
    // Map English feature strings to translation keys
    const featureMap: Record<string, string> = {
      "Unlimited scans": "plans.feature.unlimitedscans",
      "Advanced nutritional analysis": "plans.feature.advancednutritional",
      "Macro tracking": "plans.feature.macrotracking",
      "Meal planning": "plans.feature.mealplanning",
      "Export reports": "plans.feature.exportreports",
      "Priority support": "plans.feature.prioritysupport",
      "3 scans per day": "plans.feature.scansperday",
      "10 scans per day": "plans.feature.scansperday",
      "Basic nutritional information": "plans.feature.basicnutritional",
      "Scan history": "plans.feature.scanhistory",
      "Email support": "plans.feature.emailsupport",
    };
    
    // Check if we have a translation key for this feature
    const translationKey = featureMap[feature];
    if (translationKey) {
      const translated = t(translationKey);
      // If translation returns the key itself (not found), return original feature
      return translated !== translationKey ? translated : feature;
    }
    
    // If no mapping found, return the original feature (might already be in user's language)
    return feature;
  };

  const translateDescription = (description: string | undefined, billingCycle: string): string => {
    if (!description) return "";
    
    // If the description is already a translation key (starts with "plans.description."), translate it directly
    if (description.startsWith("plans.description.")) {
      const translated = t(description);
      // If translation returns the key itself (not found), return original
      return translated !== description ? translated : description;
    }
    
    // Map English descriptions to translation keys
    const descriptionMap: Record<string, string> = {
      "Perfect for trying out our service": "plans.description.free",
      "Unlimited access to all features": "plans.description.premium.monthly",
      "Best value - Save with yearly billing": "plans.description.premium.yearly",
    };
    
    // Check if we have a translation key for this description
    const translationKey = descriptionMap[description];
    if (translationKey) {
      const translated = t(translationKey);
      // If translation returns the key itself (not found), return original description
      return translated !== translationKey ? translated : description;
    }
    
    // If no mapping found, return the original description (might already be in user's language)
    return description;
  };

  const getNotIncluded = (plan: Plan): string[] => {
    if (Array.isArray(plan.not_included)) {
      return plan.not_included.filter(Boolean);
    }
    return [];
  };

  const isCurrentPlan = (plan: Plan) => {
    if (!subscription) return false;

    // For free plan, check even if is_active is false (after cancellation)
    if (subscription.subscription_type === "free") {
      const planCycle = plan.billing_cycle || (plan.interval === "free" ? "free" : null);
      return planCycle === "free";
    }

    // For paid plans, require is_active to be true
    if (!subscription.is_active) return false;

    if (subscription.platform_plan_id && plan.id) {
      return subscription.platform_plan_id === plan.id;
    }

    if (subscription.subscription_type === "premium") {
      const planCycle = plan.billing_cycle ||
        (plan.interval === "month" ? "monthly" : plan.interval === "year" ? "yearly" : null);
      return planCycle === subscription.billing_cycle && planCycle !== "free";
    }

    return false;
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !planToCancel) return;

    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: t("plans.error.title"),
          description: t("plans.error.login"),
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
        throw new Error(data.error || t("plans.error.cancel"));
      }

      // Refresh subscription data
      const sub = await getPlatformSubscription(session.user.id);
      setSubscription(sub);

      toast({
        title: t("plans.success.cancelled.title"),
        description: t("plans.success.cancelled.description"),
      });

      setShowCancelDialog(false);
      setPlanToCancel(null);
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      toast({
        title: t("plans.error.title"),
        description: error.message || t("plans.error.cancel"),
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    try {
      const billingCycle = plan.billing_cycle ||
        (plan.interval === "month" ? "monthly" : plan.interval === "year" ? "yearly" : plan.interval === "free" ? "free" : "monthly");
      setLoading(`${plan.name}-${billingCycle}`);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const ensureProfile = async () => {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (existingProfile) return;

        const { error } = await (supabase as any)
          .from("profiles")
          .insert({ id: session.user.id, email: session.user.email || "" });

        if (error) {
          if (error.code === "23503") {
            throw new Error(
              t("plans.error.profile.fk") || "Profile foreign key constraint error. Please run the migration: 20250105000000_fix_profiles_fk_constraint.sql"
            );
          }
          throw new Error(t("plans.error.profile.create").replace("{message}", error.message) || `Failed to create profile: ${error.message}`);
        }
      };

      if (billingCycle === "free") {
        await ensureProfile();

        const { data: existing } = await (supabase as any)
          .from("platform_subscriptions")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        let subscriptionId: string | null = null;
        let error: any = null;

        if (existing?.id) {
          const { data: updateData, error: updateError } = await (supabase as any)
            .from("platform_subscriptions")
            .update({
              subscription_type: "free",
              is_active: true,
              platform_plan_id: plan.id,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              stripe_price_id: null,
              billing_cycle: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", session.user.id)
            .select("id")
            .single();

          subscriptionId = updateData?.id || existing.id;
          error = updateError;
        } else {
          const { data: insertData, error: insertError } = await (supabase as any)
            .from("platform_subscriptions")
            .insert({
              user_id: session.user.id,
              subscription_type: "free",
              is_active: true,
              platform_plan_id: plan.id,
              billing_cycle: "free",
            })
            .select("id")
            .single();

          subscriptionId = insertData?.id || null;
          error = insertError;
        }

        if (error) {
          throw error;
        }

        if (subscriptionId) {
          await (supabase as any)
            .from("profiles")
            .update({
              platform_subscription_id: subscriptionId,
              platform_subscription_type: "free",
              platform_subscription_plan_id: plan.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.user.id);
        }

        toast({
          title: t("plans.success.free.title"),
          description: t("plans.success.free.description"),
        });

        router.push("/dashboard");
        return;
      }

      const priceId = plan.stripe_price_id ||
        (billingCycle === "monthly"
          ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID
          : billingCycle === "yearly"
          ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID
          : undefined);

      if (!priceId) {
        toast({
          title: t("plans.error.title"),
          description: t("plans.error.priceid").replace("{billingCycle}", billingCycle),
          variant: "destructive",
        });
        return;
      }

      const checkoutUrl = await createCheckoutSession(
        priceId,
        billingCycle as "monthly" | "yearly",
        "platform",
        plan.id,
        plan.name
      );

      await redirectToCheckout(checkoutUrl);
    } catch (error: any) {
      console.error("Error selecting plan:", error);
      toast({
        title: t("plans.error.title"),
        description: error.message || t("plans.error.select"),
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            {t("plans.title")}
          </h1>
          <p className="text-lg text-muted-foreground mb-6 pb-1" >
            {t("plans.description")}
          </p>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="mx-auto">
            {t("plans.keepusing")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-lg">
            <span className="text-sm text-muted-foreground">Monthly</span>
            <Switch
              checked={billingToggle === "yearly"}
              onCheckedChange={(val) => setBillingToggle(val ? "yearly" : "monthly")}
              aria-label="Toggle yearly billing"
            />
            <span className="text-sm text-muted-foreground">Annually</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {isFetchingPlans ? (
            <div className="col-span-3 text-center text-muted-foreground">{t("plans.loading")}</div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 text-center text-muted-foreground">{t("plans.noplans")}</div>
          ) : (
            plans
              .filter(
                (plan) =>
                  (plan.billing_cycle || "") === "free" ||
                  (plan.billing_cycle || plan.interval) === billingToggle ||
                  ((plan.interval === "month" || plan.interval === "monthly") && billingToggle === "monthly") ||
                  ((plan.interval === "year" || plan.interval === "yearly") && billingToggle === "yearly")
              )
              .map((plan) => {
              const billingCycle = plan.billing_cycle ||
                (plan.interval === "month" ? "monthly" : plan.interval === "year" ? "yearly" : plan.interval === "free" ? "free" : "monthly");
              const isLoading = loading === `${plan.name}-${billingCycle}`;
              const isCurrent = isCurrentPlan(plan);

              const isPaidPlan = billingCycle !== "free";
              const isCurrentPaidPlan = isCurrent && isPaidPlan;
              
              // Determine button text based on current subscription and target plan
              const getButtonText = () => {
                if (isLoading) return t("plans.button.processing");
                if (isCurrentPaidPlan) return t("plans.button.cancel");
                if (isCurrent) return t("plans.button.current");
                
                // Check if user has an active premium subscription
                const hasActivePremium = subscription?.subscription_type === "premium" && subscription?.is_active;
                const currentBillingCycle = subscription?.billing_cycle;
                const isOnFreePlan = !hasActivePremium && (subscription?.subscription_type === "free" || !subscription);
                
                if (billingCycle === "free") {
                  // If user is on premium (monthly or yearly), show "Go Free"
                  if (hasActivePremium) {
                    return t("plans.button.gofree");
                  }
                  return t("plans.button.getstarted");
                }
                
                if (billingCycle === "yearly") {
                  // If user is on premium monthly, show "Go Annually"
                  if (hasActivePremium && currentBillingCycle === "monthly") {
                    return t("plans.button.goannually");
                  }
                  // If user is on free plan, show "Go Yearly"
                  if (isOnFreePlan) {
                    return t("plans.button.goyearly");
                  }
                  return t("plans.button.subscribeyearly");
                }
                
                if (billingCycle === "monthly") {
                  // If user is on premium yearly, show "Go Monthly"
                  if (hasActivePremium && currentBillingCycle === "yearly") {
                    return t("plans.button.gomonthly");
                  }
                  // If user is on free plan, show "Go Monthly"
                  if (isOnFreePlan) {
                    return t("plans.button.gomonthly");
                  }
                  return t("plans.button.subscribemonthly");
                }
                
                return t("plans.button.go");
              };
              
              const buttonText = getButtonText();

              return (
                <Card
                  key={plan.id}
                  className={`relative h-full ${plan.is_popular ? "border-primary border-2 shadow-lg md:scale-105" : "border-2"}`}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                        {t("plans.mostpopular")}
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      {plan.billing_cycle === "free" && <Sparkles className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                      {plan.previous_price_cents ? (
                        <span className="text-lg text-muted-foreground line-through">
                          {formatPrice(plan.previous_price_cents, plan.interval)}
                        </span>
                      ) : null}
                      <span className="text-4xl font-bold">{formatPrice(plan.price_cents, plan.interval)}</span>
                      <span className="text-muted-foreground">
                        {plan.billing_cycle === "monthly" ? t("plans.period.month") : plan.billing_cycle === "yearly" ? t("plans.period.year") : t("plans.period.forever")}
                      </span>
                    </div>
                    <CardDescription className="mt-2">{translateDescription(plan.description, billingCycle)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {(() => {
                      const features = Array.isArray(plan.features) ? plan.features : [];
                      const notIncluded = getNotIncluded(plan);

                      return (
                        <div className="max-h-[440px] overflow-y-auto pr-1 space-y-4">
                          <Tabs defaultValue="included" className="space-y-4">
                            <TabsList className="flex justify-center w-full bg-transparent p-0 gap-2 shadow-none border-0">
                              <TabsTrigger value="included">{t("plans.included")}</TabsTrigger>
                              <TabsTrigger value="not-included">{t("plans.notincluded.title")}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="included">
                              <ul className="space-y-3">
                                {features.map((feature, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">{translateFeature(feature)}</span>
                                  </li>
                                ))}
                              </ul>
                            </TabsContent>
                            <TabsContent value="not-included">
                              {notIncluded.length > 0 ? (
                                <div className="rounded-lg border bg-muted/40 p-4">
                                  <ul className="space-y-2">
                                    {notIncluded.map((item, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground">{translateFeature(item)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  {t("plans.notincluded.none", { defaultValue: "No exclusions listed" })}
                                </p>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      );
                    })()}
                    <Button
                      className={`w-full ${isCurrentPaidPlan ? "bg-destructive hover:bg-destructive/90" : ""}`}
                      variant={isCurrentPaidPlan ? "destructive" : isCurrent ? "outline" : plan.is_popular ? "default" : "outline"}
                      onClick={() => {
                        if (isCurrentPaidPlan) {
                          setPlanToCancel(plan);
                          setShowCancelDialog(true);
                        } else if (!isCurrent) {
                          handleSelectPlan(plan);
                        }
                      }}
                      disabled={isLoading || cancelling || (isCurrent && !isCurrentPaidPlan)}
                    >
                      {buttonText}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plans.cancel.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plans.cancel.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{t("plans.cancel.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {cancelling ? t("plans.cancel.cancelling") : t("plans.cancel.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
