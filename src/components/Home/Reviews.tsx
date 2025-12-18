"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

declare global {
  interface Window {
    SenjaWidget?: {
      init?: () => void;
    };
  }
}

const SENJA_SCRIPT_ID = "senja-platform-script";

const Reviews = () => {
  const { t } = useLanguage();
  
  useEffect(() => {
    if (typeof window === "undefined") return;

    const triggerInit = () => {
      if (window.SenjaWidget?.init) {
        window.SenjaWidget.init();
      }
    };

    const scriptElement = document.getElementById(SENJA_SCRIPT_ID) as HTMLScriptElement | null;
    if (scriptElement?.dataset.loaded === "true") {
      triggerInit();
    }

    document.addEventListener("senja-widget-loaded", triggerInit);

    return () => {
      document.removeEventListener("senja-widget-loaded", triggerInit);
    };
  }, []);

  return (
    <section className="relative w-full bg-emerald-50 dark:bg-[#1C1C1C] transition-colors duration-300 py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 whitespace-normal md:whitespace-nowrap">
            {(() => {
              const title = t("reviews.title");
              const highlightMatch = title.match(/(10[., ]?000)\s+(Food Lovers)/i);
              if (highlightMatch) {
                const [full] = highlightMatch;
                const parts = title.split(full);
                return (
                  <>
                    {parts[0]}
                    <span className="text-primary whitespace-nowrap">{full}</span>
                    {parts[1]}
                  </>
                );
              }
              // Keep "Food Lovers" on one line
              const foodLoversMatch = title.match(/(Food Lovers)/i);
              if (foodLoversMatch) {
                const parts = title.split(/(Food Lovers)/i);
                return (
                  <>
                    {parts.map((part, index) => {
                      if (part.match(/(Food Lovers)/i)) {
                        return <span key={index} className="whitespace-nowrap">{part}</span>;
                      }
                      return <span key={index}>{part}</span>;
                    })}
                  </>
                );
              }
              return <span>{title}</span>;
            })()}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("reviews.subtitle")}
          </p>
        </div>

        <div 
          className="senja-embed" 
          data-id="d57c0a6b-f3c8-42a8-ac49-ab0ad78ca7a1" 
          data-mode="shadow" 
          data-lazyload="false"
        />

        <Script
          id={SENJA_SCRIPT_ID}
          src="https://widget.senja.io/widget/d57c0a6b-f3c8-42a8-ac49-ab0ad78ca7a1/platform.js"
          strategy="lazyOnload"
          onLoad={() => {
            if (typeof window !== "undefined") {
              const element = document.getElementById(SENJA_SCRIPT_ID);
              if (element) {
                (element as HTMLScriptElement).dataset.loaded = "true";
              }
              window.SenjaWidget?.init?.();
            }
          }}
        />
      </div>
    </section>
  );
};

export default Reviews;