'use client';

import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUrl } from "@/utils/url";

// Helper function to check if tracking should be disabled globally
// This is a fail-safe to prevent any unwanted tracking
const isTrackingDisabled = (): boolean => {
  if (typeof window === 'undefined') return true; // Server-side, disable tracking
  try {
    const hostname = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local') ||
      pathname.includes('/dashboard') ||
      pathname.includes('/widget/dashboard')
    );
  } catch (e) {
    // On error, disable tracking to be safe
    return true;
  }
};

// Helper function to check if preview was already tracked in this session
const hasTrackedPreview = (widgetId: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const key = `widget_preview_tracked_${widgetId}`;
    const tracked = sessionStorage.getItem(key);
    if (tracked) {
      const timestamp = parseInt(tracked, 10);
      const now = Date.now();
      // If tracked within last 10 minutes, consider it already tracked
      return (now - timestamp) < 10 * 60 * 1000;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Helper function to mark preview as tracked
const markPreviewTracked = (widgetId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = `widget_preview_tracked_${widgetId}`;
    sessionStorage.setItem(key, Date.now().toString());
  } catch (e) {
    // Ignore sessionStorage errors (e.g., in private browsing)
  }
};

export function WidgetEmbedClient() {
  const searchParams = useSearchParams();
  const widgetId = searchParams?.get("id") ?? null;
  const [widgetSettings, setWidgetSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const previewTrackedRef = useRef(false);
  const isTrackingRef = useRef(false);
  const isLoadingRef = useRef<string | null>(null);

  // Log component mount for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("🔵 WidgetEmbedClient MOUNTED", {
        widgetId,
        currentUrl: window.location.href,
        currentPath: window.location.pathname,
        referrer: document.referrer,
        hostname: window.location.hostname
      });
    }
  }, [widgetId]);

  const trackApiCall = useCallback(
    async (callType: string, status: string = "success") => {
      if (!widgetId || !widgetSettings?.user_id) return;

      try {
        await (supabase as any).from("widget_api_calls").insert({
          widget_id: widgetId,
          user_id: widgetSettings.user_id,
          site_url: typeof document !== 'undefined' ? (document.referrer || window.location.href) : null,
          call_type: callType,
          status,
          ip_address: null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        });
      } catch (error) {
        console.error("Error tracking API call:", error);
      }
    },
    [widgetId, widgetSettings]
  );

  useEffect(() => {
    const loadWidgetSettings = async () => {
      console.log("🔵 WidgetEmbedClient useEffect triggered", { widgetId });
      
      if (!widgetId) {
        console.log("❌ No widgetId - exiting");
        setLoading(false);
        return;
      }

      // GLOBAL TRACKING DISABLE CHECK - If tracking is disabled globally, skip everything
      if (isTrackingDisabled()) {
        console.log("🚫 GLOBAL TRACKING DISABLED - Skipping all tracking logic");
        previewTrackedRef.current = true;
        // Still load widget settings but skip all tracking
        try {
          const { data, error } = await (supabase as any)
            .from("widget_settings")
            .select("*")
            .eq("widget_id", widgetId)
            .single();
          if (!error && data) {
            setWidgetSettings(data);
          }
        } catch (err) {
          console.error("Exception loading widget:", err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check if we're in an iframe with same-origin parent (internal preview)
      if (typeof window !== 'undefined') {
        try {
          const isInIframe = window.self !== window.top;
          if (isInIframe) {
            try {
              const parentOrigin = window.location.ancestorOrigins?.[0] || 
                                 (document.referrer ? new URL(document.referrer).origin : null);
              const currentOrigin = window.location.origin;
              
              if (parentOrigin === currentOrigin) {
                console.log("🚫 IFRAME WITH SAME-ORIGIN PARENT - Skipping tracking (internal preview)", {
                  parentOrigin,
                  currentOrigin
                });
                previewTrackedRef.current = true;
                // Still load widget settings but skip all tracking
                try {
                  const { data, error } = await (supabase as any)
                    .from("widget_settings")
                    .select("*")
                    .eq("widget_id", widgetId)
                    .single();
                  if (!error && data) {
                    setWidgetSettings(data);
                  }
                } catch (err) {
                  console.error("Exception loading widget:", err);
                } finally {
                  setLoading(false);
                }
                return;
              }
            } catch (e) {
              // Can't access parent origin (cross-origin iframe) - this is fine, it's external
              console.log("ℹ️ In iframe but can't access parent origin (cross-origin) - may be external embed");
            }
          }
        } catch (e) {
          // Ignore iframe check errors
        }
      }

      // ULTRA-AGGRESSIVE: Check if we're in dashboard context BEFORE anything else
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname || '';
        const currentUrl = window.location.href || '';
        const referrer = document.referrer || '';
        const hostname = window.location.hostname || '';
        
        console.log("🔍 Checking context:", { currentPath, currentUrl, referrer, hostname });
        
        // If ANY of these are true, completely skip ALL tracking logic
        if (
          currentPath.includes('/dashboard') ||
          currentPath.includes('/widget/dashboard') ||
          referrer.includes('/dashboard') ||
          referrer.includes('/widget/dashboard') ||
          currentUrl.includes('/dashboard') ||
          currentUrl.includes('/widget/dashboard') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.')
        ) {
          console.log("🚫 DASHBOARD/LOCALHOST CONTEXT DETECTED - Completely disabling tracking", {
            currentPath,
            referrer,
            currentUrl,
            hostname
          });
          previewTrackedRef.current = true; // Mark as tracked to prevent any attempts
          // Still load widget settings but skip all tracking
          try {
            const { data, error } = await (supabase as any)
              .from("widget_settings")
              .select("*")
              .eq("widget_id", widgetId)
              .single();
            if (!error && data) {
              setWidgetSettings(data);
            }
          } catch (err) {
            console.error("Exception loading widget:", err);
          } finally {
            setLoading(false);
          }
          return;
        }
      }

      // Prevent multiple initializations for the same widgetId (React Strict Mode in development)
      if (isLoadingRef.current === widgetId) {
        console.log("Widget already loading for this widgetId, skipping duplicate load", { widgetId });
        return;
      }
      isLoadingRef.current = widgetId;

      // Reset tracking refs when widgetId changes
      previewTrackedRef.current = false;
      isTrackingRef.current = false;

      // Check if this is localhost/development or internal access - skip tracking entirely
      // BUT: Allow external embeds (different origin referrer) to proceed
      const isLocalhostOrInternal = (() => {
        if (typeof window === 'undefined') return true;
        try {
          const currentHost = window.location.hostname || '';
          const currentPath = window.location.pathname || '';
          const currentUrl = window.location.href || '';
          const referrer = document.referrer || '';
          const currentOrigin = window.location.origin || '';
          
          // CRITICAL: If current URL path contains "dashboard", NEVER track
          // This prevents tracking when widget embed is accessed from dashboard context
          if (currentPath.includes('/dashboard') || currentPath.includes('/widget/dashboard')) {
            console.log("Dashboard path detected in URL - skipping tracking", { currentPath, currentUrl });
            return true;
          }
          
          // Check if current host is localhost - always skip
          const isLocalhost = currentHost === 'localhost' || 
                             currentHost === '127.0.0.1' || 
                             currentHost === '0.0.0.0' ||
                             currentHost.startsWith('192.168.') ||
                             currentHost.startsWith('10.') ||
                             currentHost.endsWith('.local');
          
          if (isLocalhost) {
            console.log("Localhost detected in early check - skipping tracking");
            return true;
          }
          
          // If no referrer, it's direct access (not an embed) - skip
          if (!referrer || referrer === '') {
            console.log("No referrer (direct access) - skipping tracking");
            return true;
          }
          
          // Check if referrer is same origin (same domain) - skip tracking
          // This covers: widget embedded on your own website (same domain)
          // Example: widget at what-the-food-hqjp.vercel.app/widget/embed 
          //          embedded on what-the-food-hqjp.vercel.app/some-page → same origin → skip
          //
          // When external site embeds iframe:
          // - iframe src: https://what-the-food-hqjp.vercel.app/widget/embed?id=...
          // - iframe's window.location.origin: https://what-the-food-hqjp.vercel.app
          // - iframe's document.referrer: https://example.com/page (external site)
          // - referrer origin: https://example.com (different!) → will track ✅
          try {
            const referrerOrigin = new URL(referrer).origin;
            if (referrerOrigin === currentOrigin) {
              console.log("Same origin referrer (your own website) - skipping tracking", {
                referrerOrigin,
                currentOrigin,
                referrer
              });
              return true;
            }
            // If referrer is from different origin → it's an external embed on someone else's website → ALLOW tracking
            console.log("Different origin referrer detected - will track (external embed)", {
              referrerOrigin,
              currentOrigin,
              referrer,
              note: "External site embedding your widget - this will be tracked"
            });
          } catch (e) {
            // Invalid referrer URL - skip to be safe
            console.log("Invalid referrer URL - skipping tracking", e);
            return true;
          }
          
          // Check if referrer contains dashboard or widget paths (internal pages) - skip
          // This is a safety check for internal navigation on your own site
          if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard') || referrer.includes('/widget/embed')) {
            console.log("Referrer contains dashboard/widget paths - skipping tracking", { referrer });
            return true;
          }
          
          // Additional safety: Check current path
          const currentPath = window.location.pathname || '';
          if (currentPath.includes('/dashboard')) {
            console.log("Current path contains dashboard - skipping tracking");
            return true;
          }
          
          // Final verification: referrer origin must be valid and different
          // If we can't verify it's external, don't track
          try {
            const referrerOrigin = new URL(referrer).origin;
            if (!referrerOrigin || referrerOrigin === currentOrigin) {
              console.log("Cannot verify external referrer - skipping tracking for safety", {
                referrerOrigin,
                currentOrigin
              });
              return true;
            }
          } catch (e) {
            console.log("Cannot parse referrer for final check - skipping tracking for safety");
            return true;
          }
          
          // External embed from different origin → allow tracking
          // This means someone embedded your widget on their website (different domain)
          console.log("✅ Verified external embed - will allow tracking", {
            referrerOrigin: new URL(referrer).origin,
            currentOrigin
          });
          return false;
        } catch (e) {
          console.log("Error in early check - skipping tracking for safety", e);
          return true; // On error, assume internal
        }
      })();

      // Check if we've already tracked this widget in this session
      if (hasTrackedPreview(widgetId) || isLocalhostOrInternal) {
        // IMMEDIATELY mark as tracked to prevent any tracking attempts
        previewTrackedRef.current = true;
        
        if (isLocalhostOrInternal) {
          console.log("Localhost/internal access detected - skipping API call tracking entirely");
        } else {
          console.log("Preview already tracked for this widget in this session, skipping");
        }
        // Still load settings but don't track
        try {
          const { data, error } = await (supabase as any)
            .from("widget_settings")
            .select("*")
            .eq("widget_id", widgetId)
            .single();

          if (!error && data) {
            setWidgetSettings(data);
          }
        } catch (err) {
          console.error("Exception loading widget:", err);
        } finally {
          setLoading(false);
          isLoadingRef.current = null; // Reset when done
        }
        return;
      }

      // Prevent concurrent tracking calls
      if (isTrackingRef.current) {
        isLoadingRef.current = null; // Reset if cancelled
        return;
      }

      try {
        console.log("Loading widget settings for widget_id:", widgetId);
        const { data, error } = await (supabase as any)
          .from("widget_settings")
          .select("*")
          .eq("widget_id", widgetId)
          .single();

        if (error) {
          console.error("Error loading widget settings:", error);
          console.error("Error code:", error.code, "Error message:", error.message);
          // PGRST116 is "not found" - widget doesn't exist
          // PGRST301 is "JWT expired" or auth error
          if (error.code === "PGRST116") {
            console.error("Widget not found in database. Widget ID:", widgetId);
          } else if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            console.error("Authentication error - widget may require public access");
          }
          setLoading(false);
          return;
        }

        if (data) {
          console.log("Widget settings loaded successfully:", data);
          setWidgetSettings(data);
          
          // Track preview only once per widget per session
          // ONLY track if we're 100% certain it's an external embed
          // The early check already filtered out internal access, so if we reach here and have a valid referrer from different origin, track it
          if (!previewTrackedRef.current && data.user_id && !isTrackingRef.current) {
            // Double-check: Only track if we have a valid referrer from a DIFFERENT origin
            // This is a safety check - the early check should have caught internal access
            const shouldTrack = (() => {
              if (typeof window === 'undefined') return false;
              try {
                const referrer = document.referrer || '';
                const currentOrigin = window.location.origin || '';
                
                // Must have a referrer
                if (!referrer || referrer === '') {
                  console.log("No referrer - not tracking (safety check)");
                  return false;
                }
                
                // Must be able to parse referrer
                let referrerOrigin = '';
                try {
                  referrerOrigin = new URL(referrer).origin;
                } catch (e) {
                  console.log("Invalid referrer URL - not tracking (safety check)");
                  return false;
                }
                
                // Referrer must be from DIFFERENT origin (external site)
                if (referrerOrigin === currentOrigin) {
                  console.log("Same origin referrer - not tracking (safety check)", {
                    referrerOrigin,
                    currentOrigin
                  });
                  return false;
                }
                
                // Final check: referrer should NOT contain dashboard/widget paths
                if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard') || referrer.includes('/widget/embed')) {
                  console.log("Referrer contains internal paths - not tracking (safety check)");
                  return false;
                }
                
                // All checks passed - this is definitely an external embed
                console.log("All safety checks passed - will track external embed", {
                  referrerOrigin,
                  currentOrigin,
                  referrer
                });
                return true;
              } catch (e) {
                console.log("Error in safety check - not tracking", e);
                return false;
              }
            })();

            if (!shouldTrack) {
              console.log("Safety check failed - skipping API call tracking");
              previewTrackedRef.current = true;
              return;
            }

            // FINAL VERIFICATION: Triple-check that this is definitely an external embed
            // DEFAULT: DON'T TRACK unless we can PROVE it's external
            // Only track if ALL of these are true:
            // 1. We have a valid referrer
            // 2. Referrer is from a DIFFERENT origin (not same domain)
            // 3. Current path is NOT dashboard
            // 4. Not localhost
            // 5. Referrer doesn't contain internal paths
            // 6. Referrer hostname is different from current hostname
            const finalVerification = (() => {
              if (typeof window === 'undefined') {
                console.log("❌ Final check: Server-side - NOT tracking");
                return false;
              }
              try {
                const referrer = document.referrer || '';
                const currentPath = window.location.pathname || '';
                const currentHost = window.location.hostname || '';
                const currentOrigin = window.location.origin || '';
                
                console.log("🔍 Final verification check:", {
                  referrer,
                  currentPath,
                  currentHost,
                  currentOrigin
                });
                
                // Must have referrer
                if (!referrer || referrer === '') {
                  console.log("❌ Final check: No referrer - NOT tracking");
                  return false;
                }
                
                // Must not be localhost
                if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.endsWith('.local')) {
                  console.log("❌ Final check: Localhost - NOT tracking", { currentHost });
                  return false;
                }
                
                // Must not be dashboard path
                if (currentPath.includes('/dashboard') || currentPath.includes('/widget/dashboard')) {
                  console.log("❌ Final check: Dashboard path - NOT tracking", { currentPath });
                  return false;
                }
                
                // Must have valid referrer from different origin
                try {
                  const referrerUrl = new URL(referrer);
                  const referrerOrigin = referrerUrl.origin;
                  const referrerHost = referrerUrl.hostname;
                  
                  // Check if referrer is localhost
                  if (referrerHost === 'localhost' || referrerHost === '127.0.0.1' || referrerHost.startsWith('192.168.') || referrerHost.startsWith('10.')) {
                    console.log("❌ Final check: Referrer is localhost - NOT tracking", { referrerHost });
                    return false;
                  }
                  
                  // Must be different origin
                  if (referrerOrigin === currentOrigin) {
                    console.log("❌ Final check: Same origin - NOT tracking", {
                      referrerOrigin,
                      currentOrigin
                    });
                    return false;
                  }
                  
                  // Must be different hostname (even if different port, same hostname = same site)
                  if (referrerHost === currentHost) {
                    console.log("❌ Final check: Same hostname - NOT tracking", {
                      referrerHost,
                      currentHost
                    });
                    return false;
                  }
                  
                  // Referrer must not contain internal paths
                  if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard') || referrer.includes('/widget/embed')) {
                    console.log("❌ Final check: Referrer contains internal paths - NOT tracking", { referrer });
                    return false;
                  }
                  
                  // All checks passed - this is definitely an external embed
                  console.log("✅ Final check: ALL conditions met - WILL TRACK", {
                    referrerOrigin,
                    referrerHost,
                    currentOrigin,
                    currentHost,
                    referrer
                  });
                  return true;
                } catch (e) {
                  console.log("❌ Final check: Cannot parse referrer - NOT tracking", e);
                  return false;
                }
              } catch (e) {
                console.log("❌ Final check: Error in verification - NOT tracking", e);
                return false;
              }
            })();

            if (!finalVerification) {
              console.log("❌ Final verification failed - skipping API call tracking");
              previewTrackedRef.current = true;
              return;
            }

            // ONE MORE CHECK: Make absolutely sure we're not in any internal context
            const absoluteFinalCheck = (() => {
              if (typeof window === 'undefined') return false;
              const path = window.location.pathname || '';
              const url = window.location.href || '';
              const ref = document.referrer || '';
              const host = window.location.hostname || '';
              
              // If ANY mention of dashboard, localhost, or same domain - DON'T TRACK
              const hasDashboard = path.includes('dashboard') || url.includes('dashboard') || ref.includes('dashboard');
              const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.');
              const isSameDomain = ref && new URL(ref).origin === window.location.origin;
              
              if (hasDashboard || isLocal || isSameDomain) {
                console.log("❌ ABSOLUTE FINAL CHECK FAILED - Not tracking", { hasDashboard, isLocal, isSameDomain, path, ref, host });
                return false;
              }
              
              return true;
            })();

            if (!absoluteFinalCheck) {
              console.log("❌ Absolute final check failed - skipping API call tracking");
              previewTrackedRef.current = true;
              return;
            }

            previewTrackedRef.current = true;
            isTrackingRef.current = true;
            
            // Mark as tracked immediately to prevent duplicate calls
            markPreviewTracked(widgetId);
            
            try {
              console.log("🚀 TRACKING API CALL - External embed confirmed after ALL checks", {
                widgetId,
                referrer: document.referrer,
                currentOrigin: window.location.origin,
                currentPath: window.location.pathname,
                hostname: window.location.hostname
              });
              await (supabase as any).from("widget_api_calls").insert({
                widget_id: widgetId,
                user_id: data.user_id,
                site_url: typeof document !== 'undefined' ? (document.referrer || window.location.href) : null,
                call_type: "preview",
                status: "success",
                ip_address: null,
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
              });
              console.log("✅ Preview API call tracked successfully");
            } catch (trackError) {
              console.error("❌ Error tracking preview API call:", trackError);
              // Remove from sessionStorage if tracking failed so it can retry
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.removeItem(`widget_preview_tracked_${widgetId}`);
                } catch (e) {
                  // Ignore
                }
              }
            } finally {
              isTrackingRef.current = false;
            }
          }
        } else {
          console.error("No data returned for widget_id:", widgetId);
        }
      } catch (err) {
        console.error("Exception loading widget:", err);
        isTrackingRef.current = false;
        isLoadingRef.current = null; // Reset on error
      } finally {
        setLoading(false);
        isLoadingRef.current = null; // Reset when done
      }
    };

    void loadWidgetSettings();
    
    // Cleanup: reset loading ref when widgetId changes or component unmounts
    return () => {
      if (isLoadingRef.current === widgetId) {
        isLoadingRef.current = null;
      }
    };
  }, [widgetId]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imagePreview || !widgetId) return;

    setScanning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setResult({
        dish_name: "Sample Dish",
        calories: 350,
        protein: 25,
        carbs: 45,
        fat: 10,
      });
      await trackApiCall("scan", "success");
    } catch (error) {
      console.error("Error scanning:", error);
      await trackApiCall("scan", "error");
    } finally {
      setScanning(false);
    }
  };

  const styles = {
    primaryColor: widgetSettings?.primary_color || "#10b981",
    borderRadius: widgetSettings?.border_radius || "8px",
    customText: widgetSettings?.custom_text || null,
    brandingVisible: widgetSettings?.branding_visible !== false,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!widgetId || !widgetSettings) {
    return <div className="p-4 text-center text-muted-foreground">Widget not found or invalid widget ID</div>;
  }

  const baseUrl = getUrl("");
  const widgetEmbedUrl = `${baseUrl}/widget/embed?id=${widgetId}`;

  return (
    <div className="w-full min-h-screen p-4 sm:p-6" style={{ backgroundColor: "transparent" }}>
      <div 
        className="max-w-md mx-auto bg-card rounded-lg border-2 border-border shadow-sm"
        style={{ 
          borderRadius: styles.borderRadius,
          borderColor: styles.primaryColor + "30"
        }}
      >
        <div className="p-6 sm:p-8">
          {styles.customText && (
            <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: styles.primaryColor }}>
              {styles.customText}
            </h3>
          )}

          {!result ? (
            <div className="space-y-4">
              {!imagePreview ? (
                <div
                  className="border-2 border-dashed rounded-lg p-10 cursor-pointer bg-muted/30 text-center hover:border-opacity-50 transition-colors flex-1 flex flex-col items-center justify-center min-h-[280px]"
                  style={{ 
                    borderColor: styles.primaryColor + "30",
                    borderRadius: styles.borderRadius
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                >
          <Upload 
            className="h-14 w-14 mx-auto mb-4" 
            style={{ color: styles.primaryColor }} 
          />
          <p className="text-lg font-medium mb-2" style={{ color: styles.primaryColor }}>
            {widgetSettings?.widget_name || "Upload Your Food Photo"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {widgetSettings?.widget_description || "Drop an image here or click to browse"}
          </p>
                  <Button 
                    style={{ 
                      backgroundColor: styles.primaryColor,
                      borderRadius: styles.borderRadius
                    }}
                  >
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-border bg-muted/30">
                    <div className="aspect-video relative">
                      <img 
                        src={imagePreview} 
                        alt="Uploaded food" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImagePreview(null);
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      onClick={handleScan}
                      disabled={scanning}
                      className="flex-1"
                      style={{ 
                        backgroundColor: styles.primaryColor,
                        borderRadius: styles.borderRadius
                      }}
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        "Analyze Food"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-xl font-bold mb-2">{result.dish_name}</h4>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                      {result.calories}
                    </div>
                    <div className="text-xs text-muted-foreground">Calories</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                      {result.protein}g
                    </div>
                    <div className="text-xs text-muted-foreground">Protein</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: styles.primaryColor }}>
                      {result.carbs}g
                    </div>
                    <div className="text-xs text-muted-foreground">Carbs</div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setResult(null);
                  setImagePreview(null);
                }}
                variant="outline"
                className="w-full"
                style={{ borderRadius: styles.borderRadius }}
              >
                Scan Another
              </Button>
            </div>
          )}

          {styles.brandingVisible && (
            <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
              Powered by{" "}
              <a
                href="https://whatthefood.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: styles.primaryColor }}
                className="hover:underline"
              >
                WhatTheFood
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
