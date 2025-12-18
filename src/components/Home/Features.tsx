"use client";

import { Camera, BarChart3, History, FileText, Sliders, Sparkles, Target, Calculator, ChefHat, Gift } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();
  
  const features = [
    {
      icon: Camera,
      title: t("features.ai.title"),
      description: t("features.ai.description"),
    },
    {
      icon: BarChart3,
      title: t("features.nutrition.title"),
      description: t("features.nutrition.description"),
    },
    {
      icon: Target,
      title: t("features.macro.title"),
      description: t("features.macro.description"),
    },
    {
      icon: Calculator,
      title: t("features.recipeCounter.title"),
      description: t("features.recipeCounter.description"),
    },
    {
      icon: ChefHat,
      title: t("features.recipeGenerator.title"),
      description: t("features.recipeGenerator.description"),
    },
    {
      icon: History,
      title: t("features.history.title"),
      description: t("features.history.description"),
    },
    {
      icon: Gift,
      title: t("features.freemium.title"),
      description: t("features.freemium.description"),
    },
    {
      icon: Sliders,
      title: t("features.serving.title"),
      description: t("features.serving.description"),
    },
    {
      icon: FileText,
      title: t("features.pdf.title"),
      description: t("features.pdf.description"),
    },
  ];
  return (
    <section
      id="features"
      className="relative w-full bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
            {(() => {
              const title = t("features.title");
              // Split on "AI Food Scanner?" to make it green
              const scannerMatch = title.match(/(AI Food Scanner\?)/i);
              if (scannerMatch) {
                const parts = title.split(/(AI Food Scanner\?)/i);
                return (
                  <>
                    {parts.map((part, index) => {
                      if (part.match(/(AI Food Scanner\?)/i)) {
                        return <span key={index} className="text-primary whitespace-normal">{part}</span>;
                      }
                      return <span key={index} className="text-black dark:text-white whitespace-normal">{part}</span>;
                    })}
                  </>
                );
              }
              return <span className="text-black dark:text-white">{title}</span>;
            })()}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;