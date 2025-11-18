"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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

export function WidgetHero() {
  const router = useRouter();
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { toast } = useToast();
  const supabaseClient = supabase as any;

  useEffect(() => {
    const checkAndRedirect = async () => {
      setCheckingSubscription(true);
      try {
        const sessionResult = await withTimeout<any>(supabaseClient.auth.getSession());
        const {
          data: { session },
        } = sessionResult;

        // If user is logged in, redirect to dashboard
        // The dashboard will handle showing appropriate content based on subscription status
        if (session?.user) {
          console.log("User is logged in, redirecting to widget dashboard...");
          // Use both router.push and window.location as fallback to ensure redirect works
          try {
            router.push("/widget/dashboard");
            // Fallback: if router.push doesn't work, use window.location
            setTimeout(() => {
              if (window.location.pathname === "/widget") {
                window.location.href = "/widget/dashboard";
              }
            }, 100);
          } catch (redirectError) {
            console.error("Router redirect failed, using window.location:", redirectError);
            window.location.href = "/widget/dashboard";
          }
          return;
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        // Only show toast for actual network issues
        if (error instanceof Error && error.message.includes("timed out")) {
          toast({
            title: "Network issue",
            description: "We couldn't verify your access quickly. You can still explore the page.",
          });
        }
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkAndRedirect();
  }, [router, supabaseClient, toast]);

  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector("header");
      if (!header) return;
      const { height } = header.getBoundingClientRect();
      setHeaderHeight(Math.round(height));
    };

    measureHeader();
    window.addEventListener("resize", measureHeader);
    return () => window.removeEventListener("resize", measureHeader);
  }, []);

  const handleHeroViewPlans = () => {
    const pricingSection = document.getElementById("widget-pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Don't render the hero section if we're checking and user is logged in (redirecting)
  if (checkingSubscription) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#000000]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <section 
        className="relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#000000] transition-colors duration-300 min-h-screen"
        style={{ minHeight: headerHeight ? `calc(100vh - ${headerHeight}px)` : undefined }}
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />
        <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px] flex items-center">
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            {/* Left Section - Content */}
            <div className="w-full text-center lg:text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
                Embeddable Widget included in your plan
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
                Add WhatTheFood&apos;s AI-powered food scanning to your blog or website. Perfect for food bloggers,
                nutrition sites, and health platforms—without an extra subscription.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                  <Link href="/pricing">View Platform Pricing</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                  <Link href="/how-it-works">How It Works</Link>
                </Button>
              </div>
            </div>

            {/* Right Section - Preview Card */}
            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2">
              <Card className="shadow-strong">
                <CardContent className="p-4 sm:p-6 md:p-8">
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
    </>
  );
}

