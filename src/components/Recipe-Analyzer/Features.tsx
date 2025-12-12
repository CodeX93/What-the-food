"use client";

import { Camera, BarChart3, History, FileText, Sliders, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      icon: History,
      title: t("features.history.title"),
      description: t("features.history.description"),
    },
    {
      icon: FileText,
      title: t("features.pdf.title"),
      description: t("features.pdf.description"),
    },
    {
      icon: Sliders,
      title: t("features.serving.title"),
      description: t("features.serving.description"),
    },
    {
      icon: Sparkles,
      title: t("features.adfree.title"),
      description: t("features.adfree.description"),
    },
  ];
  return (
    <section
      id="features"
      className="relative w-full bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{t("features.title")}</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="h-full">
                <CardHeader className="p-4 sm:p-6">
                  <IconComponent className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-2" />
                  <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;