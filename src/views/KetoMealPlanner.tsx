"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, UtensilsCrossed, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { KetoMealPlannerHero } from "@/components/KetoMealPlanner/KetoMealPlannerHero";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { hasActivePremiumSubscription } from "@/utils/subscription";

export default function KetoMealPlannerPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPremium = async () => {
      if (user) {
        try {
          const premium = await hasActivePremiumSubscription(user.id);
          setIsPremium(premium);
        } catch (error) {
          console.error("Error checking premium status:", error);
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }
    };

    checkPremium();
  }, [user]);

  const steps = [
    {
      step: 1,
      title: t("ketomealplanner.step1.title"),
      description: t("ketomealplanner.step1.description"),
      icon: Target,
      image: "/ketopage/fitness-goal-light.jpeg",
      features: [
        t("ketomealplanner.step1.feature1"),
        t("ketomealplanner.step1.feature2"),
        t("ketomealplanner.step1.feature3"),
        t("ketomealplanner.step1.feature4")
      ]
    },
    {
      step: 2,
      title: t("ketomealplanner.step2.title"),
      description: t("ketomealplanner.step2.description"),
      icon: UtensilsCrossed,
      image: "/ketopage/diet-preference-light.jpeg",
      features: [
        t("ketomealplanner.step2.feature1"),
        t("ketomealplanner.step2.feature2"),
        t("ketomealplanner.step2.feature3"),
        t("ketomealplanner.step2.feature4")
      ]
    },
    {
      step: 3,
      title: t("ketomealplanner.step3.title"),
      description: t("ketomealplanner.step3.description"),
      icon: ShieldCheck,
      image: "/ketopage/allergies-light.jpeg",
      features: [
        t("ketomealplanner.step3.feature1"),
        t("ketomealplanner.step3.feature2"),
        t("ketomealplanner.step3.feature3"),
        t("ketomealplanner.step3.feature4")
      ]
    }
  ];

  const benefits = [
    t("ketomealplanner.benefits.1"),
    t("ketomealplanner.benefits.2"),
    t("ketomealplanner.benefits.3"),
    t("ketomealplanner.benefits.4"),
    t("ketomealplanner.benefits.5"),
    t("ketomealplanner.benefits.6")
  ];

  return (
    <main className="overflow-x-hidden bg-white dark:bg-[#000000] transition-colors duration-300">
      <KetoMealPlannerHero />

      {/* Benefits Section */}
      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("ketomealplanner.benefits.title")}</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              {t("ketomealplanner.benefits.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left w-full max-w-6xl mx-auto">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="h-full">
                <CardHeader className="p-5">
                  <CheckCircle2 className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-lg">{benefit}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Three Steps Section with Images */}
      <section id="keto-meal-planner-how-it-works" className="bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
              {t("ketomealplanner.howitworks.label")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              {t("ketomealplanner.howitworks.title")}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mt-4">
              {t("ketomealplanner.howitworks.subtitle")}
            </p>
          </div>

          <div className="space-y-20 sm:space-y-24">
            {steps.map((step, idx) => {
              const IconComponent = step.icon;
              const isEven = idx % 2 === 0;
              
              return (
                <div
                  key={step.step}
                  className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${
                    isEven ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  {/* Image Section */}
                  <div className={`${isEven ? "lg:order-1" : "lg:order-2"}`}>
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-muted/50">
                      <Image
                        src={step.image}
                        alt={`Step ${step.step}: ${step.title}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority={idx === 0}
                      />
                    </div>
                  </div>

                  {/* Text Section */}
                  <div className={`space-y-6 ${isEven ? "lg:order-2" : "lg:order-1"}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                        {step.step}
                      </div>
                      <div>
                        <h3 className="text-2xl sm:text-3xl font-bold leading-tight">{step.title}</h3>
                      </div>
                    </div>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    <div className="space-y-3">
                      {step.features.map((feature, featureIdx) => (
                        <div key={featureIdx} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-sm sm:text-base text-muted-foreground">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section id="keto-meal-planner-pricing" className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="flex justify-center mb-6">
                  <div className="rounded-full bg-primary/20 p-4">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  {isPremium === null ? (
                    t("ketomealplanner.premium.title.loading")
                  ) : isPremium ? (
                    t("ketomealplanner.premium.title.premium")
                  ) : (
                    t("ketomealplanner.premium.title.free")
                  )}
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  {isPremium === null ? (
                    t("ketomealplanner.premium.description.loading")
                  ) : isPremium ? (
                    t("ketomealplanner.premium.description.premium")
                  ) : (
                    t("ketomealplanner.premium.description.free")
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isPremium ? (
                    <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                      <Link href="/meal-planner">{t("ketomealplanner.premium.gotomealplanner")}</Link>
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                        <Link href="/pricing">{t("ketomealplanner.premium.viewpricing")}</Link>
                      </Button>
                      <Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10" asChild>
                        <Link href="/auth">{t("ketomealplanner.premium.signup")}</Link>
                      </Button>
                    </>
                  )}
                </div>
                {!isPremium && (
                  <p className="text-sm text-muted-foreground mt-6">
                    {t("ketomealplanner.premium.alreadyhaveaccount")}{" "}
                    <Link href="/auth" className="text-primary hover:underline">
                      {t("ketomealplanner.premium.signin")}
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
