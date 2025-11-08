'use client';

import Script from "next/script";
import { useEffect } from "react";

const SENJA_SCRIPT_ID = "senja-platform-script";

export function WallOfLoveClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const triggerInit = () => {
      const widget = window.SenjaWidget;
      if (widget?.init) {
        widget.init();
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
    <>
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
            const element = document.getElementById(SENJA_SCRIPT_ID) as HTMLScriptElement | null;
            if (element) {
              element.dataset.loaded = "true";
            }
            window.SenjaWidget?.init?.();
          }
        }}
      />
    </>
  );
}

declare global {
  interface Window {
    SenjaWidget?: {
      init?: () => void;
    };
  }
}
