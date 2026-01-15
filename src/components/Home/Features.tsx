"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";

const Features = () => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const features = [
    {
      headline: "AI Food Detection From Any Meal Photo",
      subheading: "Upload a food photo and let our AI food scanner detect the meal, estimate portions, and break down calories, protein, carbs, and fat in seconds.",
      image: "/preview-images/Dashboard.png", // Results page / macro breakdown image
    },
    {
      headline: "Smart Macro Tracker for Better Eating Habits",
      subheading: "Our AI calorie estimator allows you to track calories and macros automatically across days and meals. Spot trends, understand balance, and build better eating habits and macro tracking without manual logging.",
      image: "/preview-images/My Food Analytics.png", // Analytics page image
    },
    {
      headline: "Diet Keto Meal Plan That Fits Your Diet",
      subheading: "Create meal plans based on your health goals, allergies, and diet preferences, including keto, low-carb, balanced eating, and more.",
      image: "/preview-images/Meal Planner.png", // Personalized meal plan image
    },
    {
      headline: "Cook Like Gordon Ramsay Without The Drama",
      subheading: "Turn any meal into step-by-step instructions with our AI recipe generator and recipe analyzer app. Break down ingredients, cooking steps, and portions without guesswork.",
      image: "/preview-images/Saved Recipes.png", // Recipe section image
    },
  ];

  return (
    <section
      id="features"
      className="relative w-full bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
            {(() => {
              const title = t("features.title");
              // Split on "AI Food Scanner?" to make it green
              const scannerMatch = title.match(/(Smart Macro Tracker \?)/i);
              if (scannerMatch) {
                const parts = title.split(/(Smart Macro Tracker \?)/i);
                return (
                  <>
                    {parts.map((part, index) => {
                      if (part.match(/(Smart Macro Tracker \?)/i)) {
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

        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-12 lg:gap-16 max-w-7xl mx-auto mb-20 lg:mb-24">
          {/* Phone Mockup on Left */}
          {/* Max-width constraint prevents overlap. shrink-0 ensures it doesn't collapse. */}
          <div className="hidden lg:block relative h-auto flex-none w-full max-w-[340px]">
            {/* Phone Frame */}
            <div className="relative h-full w-auto aspect-[9/19.5]">
              <div className="relative h-full bg-black rounded-[2.5rem] p-3 shadow-2xl">
                <div className="bg-white dark:bg-black rounded-[2rem] overflow-hidden h-full w-full">
                  <div className="relative w-full h-full bg-white dark:bg-black overflow-hidden">
                    <Image
                      src={features[activeIndex].image}
                      alt={features[activeIndex].headline}
                      fill
                      className="object-cover"
                      priority={activeIndex === 0}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Dots - Absolute positioned below the phone */}
            <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-2">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${activeIndex === index
                    ? "bg-black dark:bg-white"
                    : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Mobile View Phone */}
          <div className="lg:hidden w-full flex flex-col items-center">
            <div className="relative w-full max-w-[280px]">
              <div className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl">
                <div className="bg-white dark:bg-black rounded-[2rem] overflow-hidden">
                  <div className="relative aspect-[9/19.5] bg-white dark:bg-black overflow-hidden">
                    <Image
                      src={features[activeIndex].image}
                      alt={features[activeIndex].headline}
                      fill
                      className="object-cover"
                      priority={activeIndex === 0}
                    />
                  </div>
                </div>
              </div>
              {/* Mobile Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${activeIndex === index
                      ? "bg-primary w-8"
                      : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Feature Cards on Right */}
          <div className="w-full flex-1 flex flex-col justify-between">
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${activeIndex === index
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-white dark:bg-transparent border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-900 dark:text-white">
                      {feature.headline}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.subheading}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
