"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Check } from "lucide-react";

const WhoIsItFor = () => {
  const { t } = useLanguage();

  const targetAudiences = [
    "People tracking macros who are tired of manual food logging",
    "Fitness-focused users who care about long-term health, not quick fixes",
    "Anyone who wants better meals without overthinking recipes",
  ];

  return (
    <section
      id="who-is-it-for"
      className="relative w-full bg-white dark:bg-[#000000] transition-colors duration-300 pt-2 sm:pt-4 pb-8 sm:pb-12"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h3 className="text-xl sm:text-2xl font-semibold mb-6 text-black dark:text-white text-center">
            Who This Is For
          </h3>
          <div className="space-y-4 max-w-2xl w-full">
            {targetAudiences.map((audience, index) => (
              <div key={index} className="flex items-start gap-3 justify-start sm:justify-center">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  {audience}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhoIsItFor;
