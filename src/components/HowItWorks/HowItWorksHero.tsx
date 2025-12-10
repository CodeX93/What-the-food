"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, Flame, Beef, Apple, Droplet, Wheat, Candy } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export function HowItWorksHero() {
  const { t } = useLanguage();
  const [headerHeight, setHeaderHeight] = useState(0);

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

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#000000] transition-colors duration-300 min-h-screen"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />
      <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px] flex items-start">
        <div className="w-full flex flex-col lg:flex-row items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16 mt-11 lg:mt-15">
          {/* Left Section - Content */}
          <div className="w-full text-center lg:text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 leading-tight tracking-tight break-words inline-block" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              {(() => {
                const title = t("howitworkshero.title");
                // Split on "works" or "Works" (case insensitive) and similar words in other languages
                const parts = title.split(/(\s+works|\s+Works|\s+Funciona|\s+funciona|\s+Marche|\s+marche|\s+Funktioniert|\s+funktioniert|\s+Funziona|\s+funziona|\s+funciona|\s+Funciona|\s+工作原理|\s+仕組み|\s+يعمل|\s+يعمل)/i);
                if (parts.length > 1) {
                  return (
                    <>
                      <span className="text-black dark:text-white whitespace-normal">{parts[0]}</span>
                      <span className="text-primary whitespace-normal ml-2">{parts[1]?.trim()}</span>
                      {parts[2] && <span className="text-black dark:text-white whitespace-normal">{parts[2]}</span>}
                    </>
                  );
                }
                return <span className="text-black dark:text-white">{title}</span>;
              })()}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
              {t("howitworkshero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-6 sm:mb-7 lg:mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                <Link href="/#hero">{t("howitworkshero.startscan")}</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                <Link href="/pricing">{t("howitworkshero.viewplans")}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-input bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("howitworkshero.foodsdetected")}</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-primary mt-1">12K+</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-input bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("howitworkshero.accuracy")}</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-primary mt-1">97%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-input bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("howitworkshero.timetoinsight")}</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-primary mt-1">30s</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Nutrition Summary Preview */}
          <div className="w-full max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] self-start lg:ml-auto lg:mt-1 xl:mt-1.5">
            <Card className="shadow-strong bg-white/80 dark:bg-background border">
              <CardHeader className="flex flex-col gap-1.5 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{t("howitworkshero.nutrition.foodTitle")}</p>
                    <p className="text-sm font-semibold text-muted-foreground mt-1">{t("howitworkshero.nutrition.summary")}</p>
                    <p className="text-xs text-muted-foreground/80">{t("howitworkshero.nutrition.projectedWeight")}</p>
                  </div>
                  
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("howitworkshero.nutrition.servings")}</span>
                      <input
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="w-16 rounded-md border px-2 py-1 text-sm bg-background"
                        readOnly
                      />
                    </div>
                  </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("howitworkshero.nutrition.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "pasta", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
                    { key: "shrimp", color: "bg-sky-50 text-sky-700 border-sky-100" },
                    { key: "tagliatelle", color: "bg-pink-50 text-pink-700 border-pink-100" },
                    { key: "tomatoSauce", color: "bg-orange-50 text-orange-700 border-orange-100" },
                    { key: "seafood", color: "bg-teal-50 text-teal-700 border-teal-100" },
                    { key: "italian", color: "bg-blue-50 text-blue-700 border-blue-100" },
                  ].map((tag) => (
                    <span
                      key={tag.key}
                      className={`rounded-full ${tag.color} border px-3 py-1 text-xs font-semibold`}
                    >
                      {t(`howitworkshero.nutrition.tags.${tag.key}`)}
                  </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0 pb-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-sm p-2.5 border border-emerald-100 dark:border-emerald-800">
                  {t("howitworkshero.nutrition.servingCalculation")}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { labelKey: "calories", value: "485", icon: Flame, color: "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border-amber-100 dark:border-amber-800" },
                    { labelKey: "protein", value: "28g", icon: Beef, color: "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-100 dark:border-rose-800" },
                    { labelKey: "carbs", value: "55g", icon: Wheat, color: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 border-yellow-100 dark:border-yellow-800" },
                    { labelKey: "fat", value: "18g", icon: Droplet, color: "bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 border-sky-100 dark:border-sky-800" },
                    { labelKey: "fiber", value: "4g", icon: Apple, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-100 dark:border-emerald-800" },
                    { labelKey: "sugar", value: "8g", icon: Candy, color: "bg-pink-50 dark:bg-pink-950/30 text-pink-800 dark:text-pink-200 border-pink-100 dark:border-pink-800" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const label = item.labelKey === "fat" 
                      ? t("howitworkshero.nutrition.fat")
                      : item.labelKey === "sugar"
                      ? t("howitworkshero.nutrition.sugar")
                      : t(`howitworkshero.${item.labelKey}`);
                    return (
                      <div
                        key={item.labelKey}
                        className={`rounded-lg ${item.color} border p-4 flex flex-col gap-1 shadow-sm`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-semibold">{label}</span>
                        </div>
                        <span className="text-xl font-bold">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button
                    asChild
                    size="sm"
                    className="text-sm bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                  >
                    <Link
                      href="/shared/c83d0752-df32-434a-9b0f-7ff46824076b"
                      className="flex items-center gap-1.5"
                    >
                      Preview Details
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

