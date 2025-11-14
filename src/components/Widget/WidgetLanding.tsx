'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Code, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 8000): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("Request timed out"));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const widgetPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: ["Branding included", "1 scan per day", "1 site", "Basic support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium Plan 1",
    price: "$4.99",
    period: "/month",
    yearlyPrice: "$49.99/year",
    features: ["Remove branding", "Unlimited scans", "1 site", "Premium support"],
    cta: "Upgrade Now",
    popular: false,
  },
  {
    name: "Premium Plan 2",
    price: "$9.99",
    period: "/month",
    yearlyPrice: "$99.99/year",
    features: ["Remove branding", "Unlimited scans", "Up to 3 sites", "Premium support"],
    cta: "Upgrade Now",
    popular: true,
  },
  {
    name: "Premium Plan 3",
    price: "$14.99",
    period: "/month",
    yearlyPrice: "$149.99/year",
    features: ["Remove branding", "Unlimited scans", "Unlimited sites", "Premium support"],
    cta: "Upgrade Now",
    popular: false,
  },
];

export function WidgetLanding() {
  const router = useRouter();
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const { toast } = useToast();
  const supabaseClient = supabase as any;

  useEffect(() => {
    const checkSubscription = async () => {
      setCheckingSubscription(true);
      try {
        const sessionResult = await withTimeout<any>(supabaseClient.auth.getSession());
        const {
          data: { session },
        } = sessionResult;

        if (session?.user) {
          const subscriptionResponse = await withTimeout<any>(
            supabaseClient
              .from("widget_subscriptions")
              .select("*")
              .eq("user_id", session.user.id)
              .maybeSingle()
          );
          const { data: subscription } = subscriptionResponse;

          if (subscription) {
            router.replace("/widget/dashboard");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        toast({
          title: "Network issue",
          description: "We couldn’t verify your widget access quickly. You can still explore the page.",
        });
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [router, supabaseClient, toast]);

  const handleHeroViewPlans = () => {
    const pricingSection = document.getElementById("widget-pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="overflow-x-hidden bg-white dark:bg-[#000000] transition-colors duration-300">
      {checkingSubscription && (
        <div className="fixed inset-x-0 top-0 z-20 flex justify-center">
          <div className="mt-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking your widget access…</span>
          </div>
        </div>
      )}
      <section className="relative flex items-center overflow-hidden bg-slate-50 dark:bg-[#050505] transition-colors duration-300 min-h-[80vh] lg:min-h-screen">
        <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px]">
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            <div className="w-full text-center lg:text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[34rem] self-start lg:-mt-1">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
                Embeddable Widget for Your Website
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
                Add WhatTheFood&apos;s AI-powered food scanning to your blog or website. Perfect for food bloggers,
                nutrition sites, and health platforms.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                  <Link href="/widget/plans">Get Your Widget</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                  <Link href="/how-it-works">How It Works</Link>
                </Button>
              </div>
            </div>

            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1 xl:mt-[6px]">
              <Card className="shadow-strong">
                <CardContent className="p-6 sm:p-8">
                  <div className="space-y-4">
                    <div className="text-left">
                      <CardTitle className="text-2xl">Launch in Minutes</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Copy the embed code, paste it into your site, and start offering instant nutrition analysis to
                        your visitors.
                      </CardDescription>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Embed Preview</p>
                      <pre className="bg-background border rounded-lg p-4 text-xs overflow-x-auto">
                        {`<iframe
  src="https://widget.whatthefood.io/embed?ref=YOUR_ID"
  width="100%"
  height="600"
  style="border-radius: 16px; border: none;"
></iframe>`}
                      </pre>
                    </div>

                    <Button size="lg" className="w-full bg-primary hover:bg-primary-hover" onClick={handleHeroViewPlans}>
                      View Plans
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Widget Features</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Everything you need to embed WhatTheFood seamlessly
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left w-full">
            <Card className="h-full">
              <CardHeader>
                <Code className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Easy Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Simple iframe embed code. Copy, paste, and you&apos;re done. No technical expertise required.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <svg className="h-10 w-10 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                <CardTitle>Fully Customizable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Customize colors, borders, text, and styling to match your brand perfectly.
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <svg className="h-10 w-10 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <CardTitle>Usage Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track widget performance and API usage through your dedicated dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

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
                    className={`w-full ${plan.popular ? "bg-primary hover:bg-primary-hover" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href="/widget/plans">{plan.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
