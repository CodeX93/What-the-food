"use client";

import { Camera, BarChart3, History, FileText, Sliders, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FeaturesHero } from "@/components/Features/FeaturesHero";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FeaturesPage() {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Camera,
      title: t("features.ai.title"),
      description: t("features.ai.description"),
      details: [
        t("features.ai.detail1"),
        t("features.ai.detail2"),
        t("features.ai.detail3"),
        t("features.ai.detail4"),
      ],
    },
    {
      icon: BarChart3,
      title: t("features.nutrition.title"),
      description: t("features.nutrition.description"),
      details: [
        t("features.nutrition.detail1"),
        t("features.nutrition.detail2"),
        t("features.nutrition.detail3"),
        t("features.nutrition.detail4"),
      ],
    },
    {
      icon: History,
      title: t("features.history.title"),
      description: t("features.history.description"),
      details: [
        t("features.history.detail1"),
        t("features.history.detail2"),
        t("features.history.detail3"),
        t("features.history.detail4"),
      ],
    },
    {
      icon: FileText,
      title: t("features.pdf.title"),
      description: t("features.pdf.description"),
      details: [
        t("features.pdf.detail1"),
        t("features.pdf.detail2"),
        t("features.pdf.detail3"),
        t("features.pdf.detail4"),
      ],
    },
    {
      icon: Sliders,
      title: t("features.serving.title"),
      description: t("features.serving.description"),
      details: [
        t("features.serving.detail1"),
        t("features.serving.detail2"),
        t("features.serving.detail3"),
        t("features.serving.detail4"),
      ],
    },
    {
      icon: Sparkles,
      title: t("features.adfree.title"),
      description: t("features.adfree.description"),
      details: [
        t("features.adfree.detail1"),
        t("features.adfree.detail2"),
        t("features.adfree.detail3"),
        t("features.adfree.detail4"),
      ],
    },
  ];
  return (
    <div className="bg-background">
      <FeaturesHero />

      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-strong transition-all duration-300 border border-slate-200/60 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/30 backdrop-blur-sm bg-white/90 dark:bg-white/5 h-full flex flex-col"
                >
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center mb-4">
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/30">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-5">
              <h2 className="text-3xl sm:text-4xl font-bold">{t("featurespage.ready")}</h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("featurespage.readydescription")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                  <Link href="/auth">{t("featurespage.starttrial")}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">{t("featurespage.seeplans")}</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl border border-primary/15 bg-white/80 dark:bg-white/5 px-4 py-5 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-primary mb-1 font-semibold">{t("featurespage.whensignup")}</p>
                <p className="text-3xl font-bold text-primary">{t("featurespage.scansperday")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("featurespage.stayontrack")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-5 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">{t("featurespage.upgradeanytime")}</p>
                <p className="text-3xl font-bold text-foreground">{t("featurespage.unlimitedscans")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("featurespage.unlockcomplete")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-5 shadow-sm backdrop-blur sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{t("featurespage.communityresults")}</p>
                    <p className="text-lg font-semibold text-foreground mt-1">{t("featurespage.trustedworldwide")}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:gap-8 text-left sm:text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">35+</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("featurespage.countries")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">4.8★</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("featurespage.userrating")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">2M+</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("featurespage.mealsanalyzed")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">24/7</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("featurespage.aisupport")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

