'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PlatformSubscriptionSummary = {
  subscription_type: "free" | "premium" | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  is_active: boolean | null;
};

const widgetAccessHighlights = [
  {
    title: "Free plan access",
    description: "Embed with WhatTheFood branding, single website connection, community support.",
    features: ["1 website connection", "Branding stays visible", "Community email support"],
  },
  {
    title: "Premium plan access",
    description: "Full customization, unlimited sites, priority support—everything your clients expect.",
    features: ["Remove branding", "Unlimited websites", "Priority chat support"],
    highlighted: true,
  },
];

export function WidgetPlansClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<PlatformSubscriptionSummary | null>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("platform_subscriptions")
        .select("subscription_type, billing_cycle, current_period_end, is_active")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading platform subscription", error);
      }

      setSubscription(
        data ?? {
          subscription_type: "free",
          billing_cycle: "free",
          current_period_end: null,
          is_active: true,
        }
      );
      setLoading(false);
    };

    void loadSubscription();
  }, [router]);

  const planLabel =
    subscription?.subscription_type === "premium"
      ? `Premium · ${subscription.billing_cycle === "yearly" ? "Yearly" : "Monthly"}`
      : "Free plan";

  return (
    <main className="flex-1">
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-hero/5">
        <div className="container mx-auto px-4 max-w-5xl space-y-10">
          <div className="text-center space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs uppercase tracking-wide px-4 py-1">
              Widget access included
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold">
              Manage the widget through your WhatTheFood subscription
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-3xl mx-auto">
              There&apos;s no separate widget billing anymore. Choose the platform plan that fits your workflow and
              unlock the widget instantly.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-2">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Shield className="h-5 w-5 text-primary" />
                  Current access
                </CardTitle>
                <CardDescription>
                  {loading
                    ? "Checking your subscription..."
                    : `You have ${planLabel} access. Widget features follow this plan.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!loading && (
                  <div className="rounded-xl bg-muted p-4 space-y-2">
                    <p className="text-sm text-muted-foreground uppercase tracking-wide">Widget status</p>
                    <p className="text-lg font-semibold">
                      {subscription?.subscription_type === "premium"
                        ? "Premium widget features enabled"
                        : "Free widget features enabled"}
                    </p>
                    {subscription?.current_period_end && subscription.subscription_type === "premium" && (
                      <p className="text-xs text-muted-foreground">
                        Next renewal: {new Date(subscription.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {widgetAccessHighlights.map((highlight) => (
                    <div
                      key={highlight.title}
                      className={`rounded-xl border p-4 ${
                        highlight.highlighted ? "border-primary bg-primary/5" : "border-border bg-background"
                      }`}
                    >
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {highlight.highlighted && <Sparkles className="h-4 w-4 text-primary" />}
                        {highlight.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 mb-3">{highlight.description}</p>
                      <ul className="space-y-1 text-sm">
                        {highlight.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                            <Check className="h-4 w-4 text-primary mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-2xl">Need more widget power?</CardTitle>
                <CardDescription>
                  Upgrade your platform subscription to Premium for unlimited custom embeds and priority support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/60 p-4">
                  <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">Premium unlocks</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Unlimited websites & white-label embeds
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      PDF exports & advanced analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      Priority chat + onboarding support
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <Button asChild>
                    <Link href="/plans">View platform plans</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Back to dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}


