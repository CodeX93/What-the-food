"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { hasActivePremiumSubscription } from "@/utils/subscription";

export function KetoMealPlannerHero() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { t } = useLanguage();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate checks
    if (hasCheckedRef.current) return;
    
    const checkAndRedirect = async () => {
      // Wait for auth to load
      if (authLoading) {
        setCheckingSubscription(true);
        return;
      }

      // Mark as checked
      hasCheckedRef.current = true;
      setCheckingSubscription(false);

      // Check if user is logged in and has premium subscription
      if (user) {
        try {
          const isPremium = await hasActivePremiumSubscription(user.id);
          if (isPremium) {
            console.log("Premium user detected, redirecting to meal planner dashboard...");
            router.push("/meal-planner");
            return;
          }
        } catch (error) {
          console.error("Error checking premium subscription:", error);
        }
      }
    };

    checkAndRedirect();
  }, [user, authLoading, router]);

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

  const handleHeroViewHowItWorks = () => {
    const howItWorksSection = document.getElementById("keto-meal-planner-how-it-works");
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Don't render the hero section if we're checking and user is premium (redirecting)
  // But still render H1 for SEO even during loading
  if (checkingSubscription) {
    return (
      <>
        {/* Hidden H1 for SEO during loading state */}
        <h1 className="sr-only">Keto Meal Planner | Personalized Meal Plans | What The Food</h1>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#000000]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("ketomealplanner.hero.redirecting")}</p>
          </div>
        </div>
      </>
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 leading-tight tracking-tight pb-2">
                <span className="text-primary">{t("ketomealplanner.hero.title")}</span>
                <br />
                <span className="text-black dark:text-white">{t("ketomealplanner.hero.subtitle")}</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
                {t("ketomealplanner.hero.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                  <Link href="/pricing">{t("ketomealplanner.hero.viewpricing")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base" onClick={handleHeroViewHowItWorks}>
                  {t("ketomealplanner.hero.howitworks")}
                </Button>
              </div>
            </div>

            {/* Right Section - Preview Card */}
            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2">
              <Card className="shadow-strong border border-input dark:border-white">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="space-y-4">
                    <div className="text-left">
                      <CardTitle className="text-2xl">{t("ketomealplanner.hero.card.title")}</CardTitle>
                      <CardDescription className="text-base mt-2">
                        {t("ketomealplanner.hero.card.description")}
                      </CardDescription>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          1
                        </div>
                        <p className="text-sm font-medium">{t("ketomealplanner.hero.step1")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          2
                        </div>
                        <p className="text-sm font-medium">{t("ketomealplanner.hero.step2")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          3
                        </div>
                        <p className="text-sm font-medium">{t("ketomealplanner.hero.step3")}</p>
                      </div>
                    </div>

                    <Button size="lg" className="w-full bg-primary hover:bg-primary-hover" asChild>
                      <Link href="/pricing">{t("ketomealplanner.hero.getstarted")}</Link>
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
