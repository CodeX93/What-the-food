"use client";

import { Upload, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HowItWorksHero } from "@/components/HowItWorks/HowItWorksHero";
import { useLanguage } from "@/contexts/LanguageContext";

function HowItWorksPage() {
  const { t } = useLanguage();
  
  const steps = [
    {
      icon: Upload,
      title: t("howitworks.step1.title"),
      description: t("howitworks.step1.description"),
      number: "01",
      colorClass: "bg-gradient-hero",
    },
    {
      icon: Sparkles,
      title: t("howitworks.step2.title"),
      description: t("howitworks.step2.description"),
      number: "02",
      colorClass: "bg-gradient-hero",
    },
    {
      icon: TrendingUp,
      title: t("howitworks.step3.title"),
      description: t("howitworks.step3.description"),
      number: "03",
      colorClass: "bg-gradient-hero",
    },
  ];
  return (
    <div className="overflow-x-hidden bg-background">
      <HowItWorksHero />

      {/* Process */}
      <section className="bg-background">
        <div className="container mx-auto px-4 lg:px-12 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t("howitworks.section.title")}</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              {t("howitworks.section.description")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <Card
                  key={index}
                  className="relative flex flex-col border border-input bg-white/95 dark:bg-white/5 backdrop-blur-sm shadow-lg hover:shadow-strong transition-all duration-300 hover:border-primary/30 dark:hover:border-primary/30"
                >
                  <CardContent className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-xl ${step.colorClass} p-3 shadow-lg`}>
                        <IconComponent className="h-7 w-7 text-white" />
                      </div>
                      <span className="text-4xl font-black text-primary dark:text-primary">{step.number}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

   

      {/* CTA */}
      <section className="relative bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_70%)] pointer-events-none" />
        <div className="container relative z-10 mx-auto px-4 lg:px-16 py-16 sm:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-6 mb-10">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              {t("howitworkscta.joincommunity")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">{t("howitworkscta.title")}</h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("howitworkscta.description")}
            </p>
          </div>

          <div className="grid w-full max-w-5xl mx-auto gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch">
            <Card className="border border-primary/20 bg-white/95 dark:bg-white/5 backdrop-blur-md shadow-lg h-full">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-6 sm:p-10 text-left">
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-foreground">{t("howitworkscta.card1.title")}</h3>
                  <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-primary" />
                      {t("howitworkscta.card1.detail1")}
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-primary" />
                      {t("howitworkscta.card1.detail2")}
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-primary" />
                      {t("howitworkscta.card1.detail3")}
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary-hover" asChild>
                    <Link href="/auth">{t("howitworkscta.card1.button1")}</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/40 text-primary hover:bg-primary/10" asChild>
                    <Link href="/pricing">{t("howitworkscta.card1.button2")}</Link>
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("howitworkscta.card1.footer")}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-primary/25 bg-white/90 dark:bg-white/5 backdrop-blur-md shadow-lg h-full">
              <CardContent className="flex h-full flex-col gap-5 p-6 sm:p-10">
                <div className="space-y-3 text-left">
                  <p className="text-xs uppercase tracking-wide text-primary/70">{t("howitworkscta.card2.lovedby")}</p>
                  <blockquote className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                    &ldquo;{t("howitworkscta.card2.testimonial")}&rdquo;
                    <span className="mt-2 block text-xs font-semibold text-primary">{t("howitworkscta.card2.testimonialauthor")}</span>
                  </blockquote>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary/70">{t("howitworkscta.card2.timesaved")}</p>
                    <p className="text-3xl font-semibold text-primary mt-1">{t("howitworkscta.card2.timesavedvalue")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("howitworkscta.card2.timesaveddesc")}</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary/70">{t("howitworkscta.card2.habitstreaks")}</p>
                    <p className="text-3xl font-semibold text-primary mt-1">{t("howitworkscta.card2.habitstreaksvalue")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("howitworkscta.card2.habitstreaksdesc")}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-white/5 p-4 text-left space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("howitworkscta.card2.featured")}</p>
                  <div className="flex flex-wrap gap-2">
                    {[t("howitworkscta.card2.plan1"), t("howitworkscta.card2.plan2"), t("howitworkscta.card2.plan3"), t("howitworkscta.card2.plan4")].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HowItWorksPage;

