"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    SenjaWidget?: {
      init?: () => void;
    };
  }
}

const SENJA_SCRIPT_ID = "senja-platform-script";

const Reviews = () => {
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
    <section className="relative w-full bg-[#FFF9E6] dark:bg-[#1C1C1C] transition-colors duration-300 py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Loved by Thousands</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            See what our users are saying about WhatTheFood
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