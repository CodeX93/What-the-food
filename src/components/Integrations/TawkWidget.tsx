import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasActivePremiumSubscription } from "@/utils/subscription";

const TAWK_SCRIPT_ID = "tawk-chat-widget";
const TAWK_SRC = "https://embed.tawk.to/68fd5017511129194ce14d9a/1j8eo1nmv";

const MESSAGE_REGEX = /\d+\s*(message|new)/i;

const removeExistingWidget = () => {
  const script = document.getElementById(TAWK_SCRIPT_ID);
  if (script) {
    script.remove();
  }

  const container = document.getElementById("tawkchat-container");
  if (container) {
    container.remove();
  }

  const wrappers = document.querySelectorAll("[id^='tawkchat-']");
  wrappers.forEach((node) => node.parentElement?.removeChild(node));

  // Remove positioning CSS
  const positioningStyle = document.getElementById("tawk-positioning-style");
  if (positioningStyle) {
    positioningStyle.remove();
  }

  if ((window as any).Tawk_API) {
    delete (window as any).Tawk_API;
  }
  if ((window as any).Tawk_LoadStart) {
    delete (window as any).Tawk_LoadStart;
  }
};

const installTitleGuard = () => {
  const titleElement = document.querySelector("title");
  if (!titleElement) return () => {};

  let originalTitle = titleElement.textContent || document.title;
  const originalDescriptor = Object.getOwnPropertyDescriptor(document, "title");

  const descriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      return titleElement.textContent || "";
    },
    set(val: string) {
      if (!val.includes("message") && !MESSAGE_REGEX.test(val)) {
        titleElement.textContent = val;
        originalTitle = val;
      }
    },
  };

  Object.defineProperty(document, "title", descriptor);

  const observer = new MutationObserver(() => {
    const newTitle = titleElement.textContent || "";
    if (newTitle.includes("message") || MESSAGE_REGEX.test(newTitle)) {
      titleElement.textContent = originalTitle;
    } else {
      originalTitle = newTitle;
    }
  });

  observer.observe(titleElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    observer.disconnect();
    if (originalDescriptor) {
      Object.defineProperty(document, "title", originalDescriptor);
    } else {
      delete (document as any).title;
    }
  };
};

const setupTawkPositioning = () => {
  // Use Tawk.to's official API to position widget on left bottom
  (window as any).Tawk_API = (window as any).Tawk_API || {};
  (window as any).Tawk_API.customStyle = {
    visibility: {
      desktop: {
        position: 'bl', // 'bl' = bottom-left
        xOffset: 20,     // 20px from left edge
        yOffset: 20     // 20px from bottom edge
      },
      mobile: {
        position: 'bl', // bottom-left for mobile too
        xOffset: 10,
        yOffset: 10
      }
    }
  };
};

const injectTawkPositioningCSS = () => {
  // Check if style already exists
  if (document.getElementById("tawk-positioning-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "tawk-positioning-style";
  style.textContent = `
    /* Position Tawk.to widget on left bottom - comprehensive override */
    #tawkchat-container,
    iframe[id^="tawkchat"],
    div[id^="tawkchat"],
    [id*="tawkchat"],
    .tawk-chat-container {
      left: 20px !important;
      right: auto !important;
      position: fixed !important;
      bottom: 20px !important;
    }
    
    /* Target all possible Tawk.to elements */
    body > div[id^="tawk"],
    body > iframe[id^="tawk"] {
      left: 20px !important;
      right: auto !important;
      position: fixed !important;
      bottom: 20px !important;
    }
  `;
  document.head.appendChild(style);
};

const loadWidget = () => {
  if (document.getElementById(TAWK_SCRIPT_ID)) {
    return;
  }

  // Set up positioning API before loading widget
  setupTawkPositioning();
  
  // Also inject CSS as backup
  injectTawkPositioningCSS();

  (window as any).Tawk_LoadStart = new Date();

  const script = document.createElement("script");
  script.id = TAWK_SCRIPT_ID;
  script.async = true;
  script.src = TAWK_SRC;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  document.body.appendChild(script);
};

const TawkWidget = () => {
  const cleanupTitleGuardRef = useRef<() => void>(() => {});
  const loadingRef = useRef(false);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applyPositioning = () => {
      // Re-apply API positioning
      setupTawkPositioning();
      
      // Find all possible Tawk.to elements
      const tawkContainer = document.getElementById("tawkchat-container");
      const tawkIframe = document.querySelector("iframe[id^='tawkchat']");
      const allTawkElements = document.querySelectorAll("[id*='tawk'], [id*='Tawk'], iframe[src*='tawk.to'], [class*='tawk']");
      
      if (tawkContainer || tawkIframe || allTawkElements.length > 0) {
        injectTawkPositioningCSS();
        
        // Force apply positioning to all found elements
        if (tawkContainer) {
          (tawkContainer as HTMLElement).style.cssText = "left: 20px !important; right: auto !important; bottom: 20px !important; position: fixed !important;";
        }
        
        if (tawkIframe) {
          (tawkIframe as HTMLElement).style.cssText = "left: 20px !important; right: auto !important; bottom: 20px !important; position: fixed !important;";
        }
        
        // Apply to all Tawk elements
        allTawkElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style) {
            htmlEl.style.setProperty('left', '20px', 'important');
            htmlEl.style.setProperty('right', 'auto', 'important');
            htmlEl.style.setProperty('bottom', '20px', 'important');
            htmlEl.style.setProperty('position', 'fixed', 'important');
          }
        });
      }
    };

    const checkAndToggleWidget = async () => {
      if (!isMounted || loadingRef.current) return;
      loadingRef.current = true;

      try {
        const isPremium = await hasActivePremiumSubscription();
        if (isPremium) {
          if (!document.getElementById(TAWK_SCRIPT_ID)) {
            cleanupTitleGuardRef.current = installTitleGuard();
            loadWidget();
            
            // Set up MutationObserver to watch for widget appearance
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
            
            observerRef.current = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) { // Element node
                    const element = node as HTMLElement;
                    if (element.id?.includes('tawk') || 
                        element.querySelector?.('[id*="tawk"]') ||
                        element.querySelector?.('iframe[src*="tawk.to"]')) {
                      applyPositioning();
                    }
                  }
                });
              });
            });
            
            observerRef.current.observe(document.body, {
              childList: true,
              subtree: true
            });
            
            // Also listen for Tawk.onLoad event
            (window as any).Tawk_API = (window as any).Tawk_API || {};
            (window as any).Tawk_API.onLoad = function() {
              applyPositioning();
            };
            
            // Try to apply positioning with multiple retries
            setTimeout(applyPositioning, 100);
            setTimeout(applyPositioning, 500);
            setTimeout(applyPositioning, 1000);
            setTimeout(applyPositioning, 2000);
            setTimeout(applyPositioning, 3000);
            setTimeout(applyPositioning, 5000);
          } else {
            // Widget already loaded, apply positioning
            applyPositioning();
          }
        } else {
          cleanupTitleGuardRef.current();
          cleanupTitleGuardRef.current = () => {};
          if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
          }
          removeExistingWidget();
        }
      } finally {
        loadingRef.current = false;
      }
    };

    checkAndToggleWidget();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAndToggleWidget();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      cleanupTitleGuardRef.current();
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      removeExistingWidget();
    };
  }, []);

  return null;
};

export default TawkWidget;

