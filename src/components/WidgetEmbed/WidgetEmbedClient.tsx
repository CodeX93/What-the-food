'use client';

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function WidgetEmbedClient() {
  const searchParams = useSearchParams();
  const widgetId = searchParams?.get("id") ?? null;
  const [widgetSettings, setWidgetSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const trackApiCall = useCallback(
    async (callType: string, status: string = "success") => {
      if (!widgetId || !widgetSettings?.user_id) return;

      try {
        await (supabase as any).from("widget_api_calls").insert({
          widget_id: widgetId,
          user_id: widgetSettings.user_id,
          site_url: document.referrer || window.location.href,
          call_type: callType,
          status,
          ip_address: null,
          user_agent: navigator.userAgent,
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

      try {
        const { data, error } = await (supabase as any)
          .from("widget_settings")
          .select("*")
          .eq("widget_id", widgetId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading widget settings:", error);
        } else if (data) {
          setWidgetSettings(data);
          await trackApiCall("preview");
        }
      } catch (err) {
        console.error("Error loading widget:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadWidgetSettings();
  }, [widgetId, trackApiCall]);

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

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: "transparent" }}>
      <Card
        className="max-w-md mx-auto"
        style={{ borderColor: styles.primaryColor, borderRadius: styles.borderRadius }}
      >
        <CardContent className="p-6">
          {styles.customText && (
            <h3 className="text-lg font-semibold mb-4" style={{ color: styles.primaryColor }}>
              {styles.customText}
            </h3>
          )}

          {!result ? (
            <div className="space-y-4">
              <div className="relative">
                <label
                  htmlFor="widget-upload"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  style={{ borderColor: styles.primaryColor, borderRadius: styles.borderRadius }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                      style={{ borderRadius: styles.borderRadius }}
                    />
                  ) : (
                    <>
                      <Camera className="h-12 w-12 mb-2" style={{ color: styles.primaryColor }} />
                      <p className="text-sm text-muted-foreground">Click to upload food image</p>
                    </>
                  )}
                </label>
                <input
                  id="widget-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {imagePreview && (
                <Button
                  onClick={handleScan}
                  disabled={scanning}
                  className="w-full"
                  style={{ backgroundColor: styles.primaryColor, borderRadius: styles.borderRadius }}
                >
                  {scanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" /> Scan Food
                    </>
                  )}
                </Button>
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
            <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
              Powered by{" "}
              <a
                href="https://whatthefood.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: styles.primaryColor }}
              >
                WhatTheFood
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
