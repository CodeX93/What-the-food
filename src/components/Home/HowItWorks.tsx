"use client";

import { Upload, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const HowItWorks = () => {
  const { t } = useLanguage();
  
  const steps = [
    {
      icon: Upload,
      title: t("howitworks.step1.title"),
      description: t("howitworks.step1.description"),
      number: "01",
    },
    {
      icon: Sparkles,
      title: t("howitworks.step2.title"),
      description: t("howitworks.step2.description"),
      number: "02",
    },
    {
      icon: TrendingUp,
      title: t("howitworks.step3.title"),
      description: t("howitworks.step3.description"),
      number: "03",
    },
  ];
  return (
    <section
      id="how-it-works"
      className="relative w-full bg-white dark:bg-[#000000] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl md:max-w-5xl mx-auto mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 md:whitespace-nowrap">
            {(() => {
              const title = t("howitworks.title");
              // Split on "Calorie Cal" to make it green
              const calorieCalMatch = title.match(/(Calorie Cal)/i);
              if (calorieCalMatch) {
                const parts = title.split(/(Calorie Cal)/i);
                return (
                  <>
                    {parts.map((part, index) => {
                      if (part.match(/(Calorie Cal)/i)) {
                        return <span key={index} className="text-primary whitespace-normal md:whitespace-nowrap">{part}</span>;
                      }
                      return <span key={index} className="text-black dark:text-white whitespace-normal md:whitespace-nowrap">{part}</span>;
                    })}
                  </>
                );
              }
              // Fallback: Split on "works" or "Works" (case insensitive)
              const parts = title.split(/(\s+works|\s+Works)/i);
              if (parts.length > 1) {
                return (
                  <>
                    <span className="text-black dark:text-white whitespace-normal md:whitespace-nowrap">{parts[0]}</span>
                    <span className="text-primary whitespace-normal md:whitespace-nowrap"> {parts[1]?.trim()}</span>
                    {parts[2] && <span className="text-black dark:text-white whitespace-normal md:whitespace-nowrap">{parts[2]}</span>}
                  </>
                );
              }
              return <span className="text-black dark:text-white">{title}</span>;
            })()}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            {t("howitworks.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 w-full">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="relative z-10 flex flex-col">
                <Card className="relative overflow-hidden border-2 border-input bg-card/50 backdrop-blur-sm h-full flex flex-col">
                  {/* Step Number as watermark */}
                  <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-0 pointer-events-none select-none">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary dark:text-white">
                      {index + 1}
                    </span>
                  </div>
                  
                  <CardHeader className="pt-10 sm:pt-12 md:pt-14 pb-0">
                    <div className="bg-gradient-hero w-14 h-14 sm:w-16 sm:h-16 md:w-[4.5rem] md:h-[4.5rem] lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto shadow-lg">
                      <IconComponent className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-10 lg:w-10 text-white" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl md:text-2xl lg:text-3xl text-center font-bold mb-0 min-h-[4rem] sm:min-h-[4.5rem] md:min-h-[5rem] flex items-start justify-center">
                      {step.title}
                    </CardTitle>
              </CardHeader>
                  <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 md:pb-10 pt-0 -mt-2 sm:-mt-3">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center leading-relaxed">
                      {step.description}
                    </p>
              </CardContent>
            </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;