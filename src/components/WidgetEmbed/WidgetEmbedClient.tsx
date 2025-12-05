'use client';

import { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUrl } from "@/utils/url";

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
      if (!widgetId) {
        setLoading(false);
        return;
      }

      // Reset tracking refs when widgetId changes
      previewTrackedRef.current = false;
      isTrackingRef.current = false;

      // Check if we've already tracked this widget in this session
      if (hasTrackedPreview(widgetId)) {
        console.log("Preview already tracked for this widget in this session, skipping");
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
        }
        return;
      }

      // Prevent concurrent tracking calls
      if (isTrackingRef.current) {
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
          if (!previewTrackedRef.current && data.user_id && !isTrackingRef.current) {
            previewTrackedRef.current = true;
            isTrackingRef.current = true;
            
            // Mark as tracked immediately to prevent duplicate calls
            markPreviewTracked(widgetId);
            
            try {
              await (supabase as any).from("widget_api_calls").insert({
                widget_id: widgetId,
                user_id: data.user_id,
                site_url: typeof document !== 'undefined' ? (document.referrer || window.location.href) : null,
                call_type: "preview",
                status: "success",
                ip_address: null,
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
              });
              console.log("Preview API call tracked successfully");
            } catch (trackError) {
              console.error("Error tracking preview API call:", trackError);
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
      } finally {
        setLoading(false);
      }
    };

    void loadWidgetSettings();
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
