'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Code, Copy, Check, Trash2, Plus, BarChart3, Zap, Edit, Save, Bookmark, AlertTriangle, ArrowRight, ShieldCheck, Upload, Search } from "lucide-react";
import { getUrl } from "@/utils/url";
import { useTranslation } from "@/hooks/use-translation";
import { queryWithRetry } from "@/utils/supabaseQuery";

import { DataCache, CACHE_DURATION } from "@/utils/dataCache";

// Helper functions to parse and combine value + unit
const parseValueUnit = (value: string): { value: string; unit: "px" | "%" } => {
  if (!value) return { value: "", unit: "px" };
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return { value: trimmed.slice(0, -1), unit: "%" };
  }
  if (trimmed.endsWith("px")) {
    return { value: trimmed.slice(0, -2), unit: "px" };
  }
  // Default to px if no unit specified
  return { value: trimmed, unit: "px" };
};

const combineValueUnit = (value: string, unit: "px" | "%"): string => {
  if (!value) return "";
  return `${value}${unit}`;
};

type WidgetFormState = {
  name: string;
  description: string;
  primaryColor: string;
  borderRadius: string;
  backgroundColor: string;
  customText: string;
  brandingVisible: boolean;
  iframeWidth: string;
  iframeWidthUnit: "px" | "%";
  iframeHeight: string;
  iframeHeightUnit: "px" | "%";
  resultDisplayMode: "same_page" | "new_tab" | "modal";
  iframePaddingTop: string;
  iframePaddingTopUnit: "px" | "%";
  iframePaddingBottom: string;
  iframePaddingBottomUnit: "px" | "%";
  iframePaddingLeft: string;
  iframePaddingLeftUnit: "px" | "%";
  iframePaddingRight: string;
  iframePaddingRightUnit: "px" | "%";
  iframeMarginTop: string;
  iframeMarginTopUnit: "px" | "%";
  iframeMarginBottom: string;
  iframeMarginBottomUnit: "px" | "%";
  iframeMarginLeft: string;
  iframeMarginLeftUnit: "px" | "%";
  iframeMarginRight: string;
  iframeMarginRightUnit: "px" | "%";
  uploadAreaBackgroundColor: string;
};

const defaultFormState: WidgetFormState = {
  name: "Upload Your Food Photo",
  description: "Drop an image here or click to browse",
  primaryColor: "#10b981",
  borderRadius: "8px",
  backgroundColor: "",
  customText: "",
  brandingVisible: true,
  iframeWidth: "100",
  iframeWidthUnit: "%",
  iframeHeight: "600",
  iframeHeightUnit: "px",
  resultDisplayMode: "same_page",
  iframePaddingTop: "",
  iframePaddingTopUnit: "px",
  iframePaddingBottom: "",
  iframePaddingBottomUnit: "px",
  iframePaddingLeft: "",
  iframePaddingLeftUnit: "px",
  iframePaddingRight: "",
  iframePaddingRightUnit: "px",
  iframeMarginTop: "",
  iframeMarginTopUnit: "px",
  iframeMarginBottom: "",
  iframeMarginBottomUnit: "px",
  iframeMarginLeft: "",
  iframeMarginLeftUnit: "px",
  iframeMarginRight: "",
  iframeMarginRightUnit: "px",
  uploadAreaBackgroundColor: "",
};

const REQUEST_TIMEOUT_MS = 30000; // Increased to 30 seconds

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("Request timed out"));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

type WidgetDashboardClientProps = {
  initialSubscription?: any;
};

// Widget Preview Component
function WidgetPreview({ form }: { form: WidgetFormState }) {
  return (
    <div 
      className="w-full rounded-lg border-2 border-border shadow-sm"
      style={{ 
        borderRadius: form.borderRadius,
        borderColor: form.primaryColor + "30",
        backgroundColor: form.backgroundColor || "transparent"
      }}
    >
      <div className="p-6 sm:p-8">
        {form.customText && (
          <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: form.primaryColor }}>
            {form.customText}
          </h3>
        )}

        <div
          className="border-2 border-dashed rounded-lg p-10 cursor-pointer text-center hover:border-opacity-50 transition-colors flex-1 flex flex-col items-center justify-center min-h-[280px]"
          style={{ 
            borderColor: form.primaryColor + "30",
            borderRadius: form.borderRadius,
            backgroundColor: (form.uploadAreaBackgroundColor && form.uploadAreaBackgroundColor.trim() !== "") 
              ? form.uploadAreaBackgroundColor 
              : "rgba(0, 0, 0, 0.02)"
          }}
        >
          <Upload 
            className="h-14 w-14 mx-auto mb-4" 
            style={{ color: form.primaryColor }} 
          />
          <p className="text-lg font-medium mb-2" style={{ color: form.primaryColor }}>
            {form.name || "Upload Your Food Photo"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {form.description || "Drop an image here or click to browse"}
          </p>
          <Button 
            style={{ 
              backgroundColor: form.primaryColor,
              borderRadius: form.borderRadius
            }}
          >
            Choose File
          </Button>
        </div>

        {form.brandingVisible && (
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://whatthefood.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: form.primaryColor }}
              className="hover:underline"
            >
              WhatTheFood
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function WidgetDashboardClient({ initialSubscription = null }: WidgetDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [platformSubscription, setPlatformSubscription] = useState<any>(initialSubscription);
  const [savedWidgets, setSavedWidgets] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>({ total: 0, today: 0, thisMonth: 0, successful: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [copiedWidgetId, setCopiedWidgetId] = useState<string | null>(null);
  const [currentWidget, setCurrentWidget] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("saved-widgets");

  const [createForm, setCreateForm] = useState<WidgetFormState>(defaultFormState);
  const [editForm, setEditForm] = useState<WidgetFormState>(defaultFormState);
  const [embedSearchQuery, setEmbedSearchQuery] = useState("");
  const [savedWidgetsSearchQuery, setSavedWidgetsSearchQuery] = useState("");
  const [selectedWidgetForEmbed, setSelectedWidgetForEmbed] = useState<string | null>(null);
  const supabaseClient = supabase as any;
  const initialLoadRef = useRef(true);
  const currentWidgetRef = useRef<any>(null);
  const subscriptionProcessedRef = useRef(false);
  const widgetsLoadingRef = useRef(false); // Prevent concurrent widget loads
  const hasLoadedRef = useRef(false); // Track if we've already loaded once
  const subscriptionType = platformSubscription?.subscription_type;

  const loadWidgetForEditing = useCallback(
    async (widget: any) => {
      setCurrentWidget(widget);
      currentWidgetRef.current = widget;
      setIsCreating(false);

      const isFree = subscriptionType === "free";
      const widgetBrandingVisible = widget.branding_visible !== false;

      const widthParsed = parseValueUnit(widget.iframe_width || "100%");
      const heightParsed = parseValueUnit(widget.iframe_height || "600");
      const paddingTopParsed = parseValueUnit(widget.iframe_padding_top || "");
      const paddingBottomParsed = parseValueUnit(widget.iframe_padding_bottom || "");
      const paddingLeftParsed = parseValueUnit(widget.iframe_padding_left || "");
      const paddingRightParsed = parseValueUnit(widget.iframe_padding_right || "");
      const marginTopParsed = parseValueUnit(widget.iframe_margin_top || "");
      const marginBottomParsed = parseValueUnit(widget.iframe_margin_bottom || "");
      const marginLeftParsed = parseValueUnit(widget.iframe_margin_left || "");
      const marginRightParsed = parseValueUnit(widget.iframe_margin_right || "");

      setEditForm({
        name: widget.widget_name || "",
        description: widget.widget_description || "",
        primaryColor: widget.primary_color || "#10b981",
        borderRadius: widget.border_radius || "8px",
        backgroundColor: widget.background_color || "",
        customText: widget.custom_text || "",
        brandingVisible: isFree ? true : widgetBrandingVisible,
        iframeWidth: widthParsed.value,
        iframeWidthUnit: widthParsed.unit,
        iframeHeight: heightParsed.value,
        iframeHeightUnit: heightParsed.unit,
        resultDisplayMode: (widget.result_display_mode as "same_page" | "new_tab" | "modal") || "same_page",
        iframePaddingTop: paddingTopParsed.value,
        iframePaddingTopUnit: paddingTopParsed.unit,
        iframePaddingBottom: paddingBottomParsed.value,
        iframePaddingBottomUnit: paddingBottomParsed.unit,
        iframePaddingLeft: paddingLeftParsed.value,
        iframePaddingLeftUnit: paddingLeftParsed.unit,
        iframePaddingRight: paddingRightParsed.value,
        iframePaddingRightUnit: paddingRightParsed.unit,
        iframeMarginTop: marginTopParsed.value,
        iframeMarginTopUnit: marginTopParsed.unit,
        iframeMarginBottom: marginBottomParsed.value,
        iframeMarginBottomUnit: marginBottomParsed.unit,
        iframeMarginLeft: marginLeftParsed.value,
        iframeMarginLeftUnit: marginLeftParsed.unit,
        iframeMarginRight: marginRightParsed.value,
        iframeMarginRightUnit: marginRightParsed.unit,
        uploadAreaBackgroundColor: widget.upload_area_background_color || "",
      });

    },
    [subscriptionType]
  );

  const resetCreateForm = useCallback(() => {
    setCreateForm(() => ({
      ...defaultFormState,
      brandingVisible: subscriptionType === "free" ? true : defaultFormState.brandingVisible,
    }));
    setIsCreating(true);
  }, [subscriptionType]);

  const handleTabChange = useCallback((nextTab: string) => {
    if (nextTab === "create") {
      resetCreateForm();
      setActiveTab("create");
      return;
    }

    if (nextTab === "saved-widgets") {
      setIsCreating(false);
      setActiveTab("saved-widgets");
      return;
    }

    setActiveTab(nextTab);
  }, [resetCreateForm]);

  const clearEditingContext = useCallback(() => {
    setEditForm(() => ({
      ...defaultFormState,
      brandingVisible: subscriptionType === "free" ? true : defaultFormState.brandingVisible,
    }));
    setCurrentWidget(null);
    currentWidgetRef.current = null;
    setIsCreating(false);
  }, [subscriptionType]);

  useEffect(() => {
    // Prevent multiple loads - only load once on mount or when initialSubscription changes
    if (hasLoadedRef.current && initialSubscription === null) {
      return;
    }
    
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;
    let statsTimeoutId: NodeJS.Timeout;
    let statsObserver: IntersectionObserver | null = null;

    const loadData = async () => {
      try {
        // OPTIMIZATION: Set loading to false immediately if we have initialSubscription
        // Let the page render with what we have, fetch widgets in background
        if (initialSubscription) {
          setLoading(false);
        }

        // Set a timeout to ensure page renders even if queries are slow
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setLoading(false);
          }
        }, 500); // Show page quickly even without data

        // OPTIMIZATION: Use queryWithRetry for automatic session refresh
        let session;
        try {
          session = await queryWithRetry(async () => {
            const { data, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            return data.session;
          });
        } catch (error) {
          console.error('Failed to get session:', error);
          clearTimeout(timeoutId);
          setLoading(false);
          router.push("/auth");
          return;
        }
        
        // Check if cancelled or no session
        if (cancelled || !session?.user) {
          clearTimeout(timeoutId);
          setLoading(false);
          if (!session?.user) {
            router.push("/auth");
          }
          return;
        }

        // Mark as loaded to prevent duplicate fetches
        hasLoadedRef.current = true;

        // Use server-loaded subscription if available, otherwise set defaults
        // Only process subscription once to prevent infinite loops
        let isPremiumUser = false;
        if (!subscriptionProcessedRef.current) {
          if (initialSubscription) {
            setPlatformSubscription(initialSubscription);
            isPremiumUser = initialSubscription.subscription_type === "premium";
            setLoading(false);
          } else {
            // No subscription found, show free user experience
            setPlatformSubscription({ subscription_type: "free", is_active: false });
            setLoading(false);
          }
          subscriptionProcessedRef.current = true;
        } else {
          // Use existing subscription state to determine premium status
          isPremiumUser = platformSubscription?.subscription_type === "premium";
        }

        // No need to restore widgets - we don't change widget_id anymore
        // The limit check happens at widget load time and shows different UI

        // Load widgets for all users (they may have created widgets before)
        // Prevent concurrent widget loads
        if (widgetsLoadingRef.current) {
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        widgetsLoadingRef.current = true;
        
        try {
          // OPTIMIZATION: Skip redundant session check - we already have the session from above
          // Just use the session variable we already fetched
          if (cancelled || !session?.user) {
            widgetsLoadingRef.current = false;
            clearTimeout(timeoutId);
            setLoading(false);
            return;
          }

          // OPTIMIZATION: Check cache first for instant loading
          const widgetCacheKey = `widgets_${session.user.id}`;
          const cachedWidgets = DataCache.get<any[]>(widgetCacheKey);
          
          if (cachedWidgets && !cancelled) {
            console.log("Loading widgets from cache:", cachedWidgets.length);
            setSavedWidgets(cachedWidgets);
            setLoading(false);
          }

          // OPTIMIZATION: Remove artificial 50ms delay - not needed
          // Make the query immediately - Supabase client automatically includes auth headers
          console.log("Attempting to load widgets for user:", session.user.id);
          const { data: widgets, error: widgetsError} = await supabaseClient
            .from("widget_settings")
            .select(
              "id, widget_id, widget_name, widget_description, primary_color, border_radius, background_color, is_default, created_at, custom_text, branding_visible, iframe_width, iframe_height, result_display_mode, iframe_padding_top, iframe_padding_bottom, iframe_padding_left, iframe_padding_right, iframe_margin_top, iframe_margin_bottom, iframe_margin_left, iframe_margin_right, upload_area_background_color"
            )
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50);

          widgetsLoadingRef.current = false;

          if (cancelled) {
            clearTimeout(timeoutId);
            return;
          }

          console.log("Widget query result:", { widgets: widgets?.length, error: widgetsError });

          if (widgetsError) {
            console.error("Supabase error loading widgets:", widgetsError);
            console.error("Error code:", widgetsError.code, "Message:", widgetsError.message);
            // Check for various auth/access control errors
            const isAuthError = 
              widgetsError.message?.includes("access control") || 
              widgetsError.message?.includes("JWT") || 
              widgetsError.message?.includes("Load failed") ||
              widgetsError.code === "PGRST301" ||
              widgetsError.code === "42501" ||
              widgetsError.code === "PGRST116"; // JWT expired
            
            console.log("Is auth error?", isAuthError);
            
            if (isAuthError) {
              console.error("Authentication/authorization error loading widgets:", widgetsError);
              // Try to refresh the session once
              const { data: { session: refreshedSession }, error: refreshError } = await supabaseClient.auth.refreshSession();
              
              if (refreshError || !refreshedSession?.user) {
                console.error("Session refresh failed, redirecting to auth");
                widgetsLoadingRef.current = false;
                router.push("/auth");
                clearTimeout(timeoutId);
                setLoading(false);
                return;
              }
              
              // Wait a moment for the refreshed session to be attached to the client
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Retry once with refreshed session
              const { data: retryWidgets, error: retryError } = await supabaseClient
                .from("widget_settings")
                .select(
                  "id, widget_id, widget_name, widget_description, primary_color, border_radius, background_color, is_default, created_at, custom_text, branding_visible, iframe_width, iframe_height, result_display_mode, iframe_padding_top, iframe_padding_bottom, iframe_padding_left, iframe_padding_right, iframe_margin_top, iframe_margin_bottom, iframe_margin_left, iframe_margin_right, upload_area_background_color"
                )
                .eq("user_id", refreshedSession.user.id)
                .order("created_at", { ascending: false })
                .limit(50);
              
              if (retryError) {
                console.error("Retry after refresh also failed, redirecting to auth");
                widgetsLoadingRef.current = false;
                router.push("/auth");
                clearTimeout(timeoutId);
                setLoading(false);
                return;
              }
              
              // Use retry data
              const widgetList = (retryWidgets || []) as Array<{ is_default?: boolean }>;
              console.log("Loaded widgets after refresh:", widgetList.length);
              setSavedWidgets(widgetList);
              
              // OPTIMIZATION: Cache widgets after successful retry
              DataCache.set(widgetCacheKey, widgetList, CACHE_DURATION.MEDIUM);
              
              if (widgetList.length > 0) {
                const defaultWidget = widgetList.find((w) => w.is_default) || widgetList[0];
                if (!currentWidgetRef.current) {
                  loadWidgetForEditing(defaultWidget).catch((error) => {
                    if (!cancelled) {
                      console.error("Error loading widget for editing:", error);
                    }
                  });
                }
                if (initialLoadRef.current) {
                  setActiveTab("saved-widgets");
                }
              } else {
                clearEditingContext();
                if (initialLoadRef.current) {
                  handleTabChange("create");
                }
              }
              initialLoadRef.current = false;
              widgetsLoadingRef.current = false;
              clearTimeout(timeoutId);
              setLoading(false);
              return;
            }
            
            // For non-auth errors, don't clear existing widgets - they might still be valid
            // Only clear if this is the initial load and we have no widgets
            if (initialLoadRef.current && savedWidgets.length === 0) {
              setSavedWidgets([]);
              handleTabChange("create");
            }
            initialLoadRef.current = false;
            widgetsLoadingRef.current = false;
            clearTimeout(timeoutId);
            setLoading(false);
            
            // Show error toast but don't prevent UI from showing
            toast({
              title: t("widgetdashboard.toast.error"),
              description: widgetsError.message || "Failed to load widgets. Please try refreshing.",
              variant: "destructive",
            });
            return;
          }

          // Always set widgets, even if empty
          const widgetList = (widgets || []) as Array<{ is_default?: boolean }>;
          console.log("Successfully loaded widgets:", widgetList.length, widgetList);
          setSavedWidgets(widgetList);
          
          // OPTIMIZATION: Cache widgets for 5 minutes
          DataCache.set(widgetCacheKey, widgetList, CACHE_DURATION.MEDIUM);
          
          // Don't auto-select - let user choose from dropdown
          // selectedWidgetForEmbed will remain null until user selects
          
          hasLoadedRef.current = true; // Mark as loaded to prevent infinite loops
          
          // Clear loading flag and timeout
          widgetsLoadingRef.current = false;
          clearTimeout(timeoutId);
          setLoading(false);

          if (widgetList.length > 0) {
            const defaultWidget = widgetList.find((w) => w.is_default) || widgetList[0];

            if (!currentWidgetRef.current) {
              // Load widget details in background, don't block UI
              loadWidgetForEditing(defaultWidget).catch((error) => {
                if (!cancelled) {
                  console.error("Error loading widget for editing:", error);
                }
              });
            }

            if (initialLoadRef.current) {
              setActiveTab("saved-widgets");
            }
          } else {
            clearEditingContext();
            if (initialLoadRef.current) {
              handleTabChange("create");
            }
          }
          initialLoadRef.current = false;
        } catch (error: any) {
          widgetsLoadingRef.current = false;
          if (cancelled) {
            clearTimeout(timeoutId);
            return;
          }
          console.error("Exception loading widgets:", error);
          console.error("Error details:", {
            message: error?.message,
            name: error?.name,
            stack: error?.stack
          });
          
          // If it's a network/auth error, try to load widgets anyway with a fallback
          // Don't immediately give up - the error might be transient
          if (error?.message?.includes("access control") || error?.message?.includes("Load failed") || error?.message?.includes("CORS")) {
            console.warn("Network/auth error detected, but continuing to show UI");
            // Don't set empty array immediately - let the user see what they have
            // The error might be transient and widgets might load on next attempt
          }
          
          // Set empty array only if we're sure there's a persistent error
          // For now, keep existing widgets if any, or show empty state
          if (savedWidgets.length === 0) {
            setSavedWidgets([]);
            if (initialLoadRef.current) {
              handleTabChange("create");
            }
          }
          initialLoadRef.current = false;
          clearTimeout(timeoutId);
          setLoading(false);
        }

        // Load API stats only when user scrolls to stats section (lazy load)
        // Use Intersection Observer to load stats only when visible
        const loadStatsWhenVisible = () => {
          if (cancelled) return;
          
          // Set a long delay as fallback (10 seconds)
          statsTimeoutId = setTimeout(() => {
            if (cancelled) return;
            // Verify user is still authenticated before loading stats
            supabaseClient.auth.getSession().then(({ data: { session: currentSession } }) => {
              if (!cancelled && currentSession?.user) {
                loadApiStats(currentSession.user.id);
              }
            });
          }, 10000);

          // Try to use Intersection Observer if available
          if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            const statsElement = document.querySelector('[data-stats-section]');
            if (statsElement && !cancelled) {
              statsObserver = new IntersectionObserver(
                (entries) => {
                  if (cancelled) {
                    if (statsObserver) statsObserver.disconnect();
                    return;
                  }
                  if (entries[0].isIntersecting) {
                    clearTimeout(statsTimeoutId);
                    // Verify user is still authenticated before loading stats
                    supabaseClient.auth.getSession().then(({ data: { session: currentSession } }) => {
                      if (!cancelled && currentSession?.user) {
                        loadApiStats(currentSession.user.id);
                      }
                    });
                    if (statsObserver) {
                      statsObserver.disconnect();
                      statsObserver = null;
                    }
                  }
                },
                { threshold: 0.1 }
              );
              statsObserver.observe(statsElement);
            } else if (!cancelled) {
              // If element not found, just use timeout
              clearTimeout(statsTimeoutId);
              statsTimeoutId = setTimeout(() => {
                if (cancelled) return;
                supabaseClient.auth.getSession().then(({ data: { session: currentSession } }) => {
                  if (!cancelled && currentSession?.user) {
                    loadApiStats(currentSession.user.id);
                  }
                });
              }, 5000);
            }
          }
        };

        const loadApiStats = (userId: string) => {
          if (cancelled) return;
          
          // Double-check user is still authenticated
          supabaseClient.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (cancelled || !currentSession?.user || currentSession.user.id !== userId) {
              console.log("API stats: User not authenticated or cancelled");
              return;
            }
            
            // Load stats for all users (free and premium)
            // Tracking works for all users, so stats should be visible to all
            
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

            console.log("Loading API stats for user:", userId);

            const statsCacheKey = `widget_api_stats_${userId}`;
            
            // OPTIMIZATION: Check cache first
            const cachedStats = DataCache.get<any[]>(statsCacheKey);
            if (cachedStats) {
              console.log("Loading API stats from cache");
              const startOfToday = new Date();
              startOfToday.setHours(0, 0, 0, 0);
              const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
              
              const totalCount = cachedStats.length;
              const todayCount = cachedStats.filter((call: any) => 
                new Date(call.created_at) >= startOfToday
              ).length;
              const monthCount = cachedStats.filter((call: any) => 
                new Date(call.created_at) >= startOfMonth
              ).length;
              const successCount = cachedStats.filter((call: any) => 
                call.status === 200
              ).length;
              
              setApiStats({
                total: totalCount,
                today: todayCount,
                thisMonth: monthCount,
                successful: successCount
              });
            }

            // OPTIMIZED: Fetch minimal data in ONE query and calculate stats client-side
            // This is much faster than 4 separate COUNT queries
            const statsPromise = supabaseClient
              .from("widget_api_calls")
              .select("created_at, status")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1000); // Limit to recent 1000 calls for performance

            // Set timeout for the single query
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), 3000)
            );

            Promise.race([statsPromise, timeoutPromise])
              .then((result: any) => {
                if (cancelled) return;
                
                const calls = result?.data || [];
                
                // OPTIMIZATION: Cache the raw API calls data
                DataCache.set(statsCacheKey, calls, CACHE_DURATION.SHORT);
                
                // Calculate all stats from the single query result
                const totalCount = calls.length;
                const todayCount = calls.filter((call: any) => 
                  new Date(call.created_at) >= startOfToday
                ).length;
                const monthCount = calls.filter((call: any) => 
                  new Date(call.created_at) >= startOfMonth
                ).length;
                const successCount = calls.filter((call: any) => 
                  call.status === 'success'
                ).length;

                console.log("API stats loaded:", { totalCount, todayCount, monthCount, successCount });

                setApiStats({
                  total: totalCount,
                  today: todayCount,
                  thisMonth: monthCount,
                  successful: successCount,
                });
              })
              .catch((error) => {
                if (cancelled) return;
                console.error("Error loading API stats:", error);
                // Keep stats at 0 on error
                setApiStats({
                  total: 0,
                  today: 0,
                  thisMonth: 0,
                  successful: 0,
                });
              });
          }).catch((error) => {
            if (cancelled) return;
            console.error("Error getting session for API stats:", error);
          });
        };

        // Load stats for all users (free and premium can see their API call counts)
        // Also try loading immediately in case visibility observer doesn't trigger
        if (user) {
          console.log("Loading API stats immediately for user:", user.id);
          loadApiStats(user.id);
        }
          loadStatsWhenVisible();
      } catch (error: any) {
        if (cancelled) return;
        console.error("Error loading data:", error);
        clearTimeout(timeoutId);
        setLoading(false);
        // Set default subscription to allow page to render even on error
        setPlatformSubscription({ subscription_type: "free", is_active: false });
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Showing limited view.",
          variant: "destructive",
        });
      }
    };

    void loadData();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (statsTimeoutId) {
        clearTimeout(statsTimeoutId);
      }
      if (statsObserver) {
        statsObserver.disconnect();
        statsObserver = null;
      }
      widgetsLoadingRef.current = false; // Reset loading flag on cleanup
    };
    // Only depend on initialSubscription - other functions are stable or accessed via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSubscription]);

  const handleSaveWidget = async (mode: "create" | "edit", saveAsNew: boolean = false) => {
    if (!user) return;

    const formState = mode === "create" ? createForm : editForm;

    if (!formState.name.trim()) {
      toast({
        title: t("widgetdashboard.toast.error"),
        description: t("widgetdashboard.toast.name"),
        variant: "destructive",
      });
      return;
    }

    // Check if free user is trying to create a new widget when they already have one
    const isFree = subscriptionType === "free";
    const isCreatingNew = mode === "create" || saveAsNew || !currentWidget;
    
    if (isFree && isCreatingNew && savedWidgets.length >= 1) {
      toast({
        title: t("widgetdashboard.toast.error"),
        description: "Free plan users can only create one widget. Please upgrade to create more widgets.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const widgetId = isCreatingNew ? `widget_${user.id}_${Date.now()}` : currentWidget.widget_id;
      const finalBrandingVisible = isFree ? true : formState.brandingVisible;

      const widgetData: any = {
        user_id: user.id,
        widget_id: widgetId,
        widget_name: formState.name,
        widget_description: formState.description || null,
        primary_color: formState.primaryColor,
        border_radius: formState.borderRadius,
        background_color: formState.backgroundColor || null,
        custom_text: formState.customText || null,
        branding_visible: finalBrandingVisible,
        iframe_width: combineValueUnit(formState.iframeWidth, formState.iframeWidthUnit) || "100%",
        iframe_height: combineValueUnit(formState.iframeHeight, formState.iframeHeightUnit) || "600",
        result_display_mode: formState.resultDisplayMode || "same_page",
        iframe_padding_top: formState.iframePaddingTop ? combineValueUnit(formState.iframePaddingTop, formState.iframePaddingTopUnit) : null,
        iframe_padding_bottom: formState.iframePaddingBottom ? combineValueUnit(formState.iframePaddingBottom, formState.iframePaddingBottomUnit) : null,
        iframe_padding_left: formState.iframePaddingLeft ? combineValueUnit(formState.iframePaddingLeft, formState.iframePaddingLeftUnit) : null,
        iframe_padding_right: formState.iframePaddingRight ? combineValueUnit(formState.iframePaddingRight, formState.iframePaddingRightUnit) : null,
        iframe_margin_top: formState.iframeMarginTop ? combineValueUnit(formState.iframeMarginTop, formState.iframeMarginTopUnit) : null,
        iframe_margin_bottom: formState.iframeMarginBottom ? combineValueUnit(formState.iframeMarginBottom, formState.iframeMarginBottomUnit) : null,
        iframe_margin_left: formState.iframeMarginLeft ? combineValueUnit(formState.iframeMarginLeft, formState.iframeMarginLeftUnit) : null,
        iframe_margin_right: formState.iframeMarginRight ? combineValueUnit(formState.iframeMarginRight, formState.iframeMarginRightUnit) : null,
        upload_area_background_color: formState.uploadAreaBackgroundColor || null,
      };

      if (isCreatingNew) {
        // Check if this should be the default widget (first widget for this user)
        const { data: existingWidgets } = await supabaseClient
          .from("widget_settings")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        
        const shouldBeDefault = !existingWidgets || existingWidgets.length === 0;
        widgetData.is_default = shouldBeDefault;
        
        // If setting as default, unset all other default widgets for this user
        if (shouldBeDefault) {
          await supabaseClient
            .from("widget_settings")
            .update({ is_default: false })
            .eq("user_id", user.id)
            .eq("is_default", true);
        }
        
        // Insert without timeout wrapper for faster response
        const insertResponse = await supabaseClient
          .from("widget_settings")
          .insert(widgetData)
          .select()
          .single();

        if (insertResponse.error) {
          throw insertResponse.error;
        }
        
        const newWidget = insertResponse.data;

        setSavedWidgets((prev) => [newWidget, ...prev]);
        
        // Set widget for editing directly (faster)
        setCurrentWidget(newWidget);
        currentWidgetRef.current = newWidget;
        setIsCreating(false);
        const isFree = subscriptionType === "free";
        const widgetBrandingVisible = newWidget.branding_visible !== false;
        const newWidthParsed = parseValueUnit(newWidget.iframe_width || "100%");
        const newHeightParsed = parseValueUnit(newWidget.iframe_height || "600");
        const newPaddingTopParsed = parseValueUnit(newWidget.iframe_padding_top || "");
        const newPaddingBottomParsed = parseValueUnit(newWidget.iframe_padding_bottom || "");
        const newPaddingLeftParsed = parseValueUnit(newWidget.iframe_padding_left || "");
        const newPaddingRightParsed = parseValueUnit(newWidget.iframe_padding_right || "");
        const newMarginTopParsed = parseValueUnit(newWidget.iframe_margin_top || "");
        const newMarginBottomParsed = parseValueUnit(newWidget.iframe_margin_bottom || "");
        const newMarginLeftParsed = parseValueUnit(newWidget.iframe_margin_left || "");
        const newMarginRightParsed = parseValueUnit(newWidget.iframe_margin_right || "");

        setEditForm({
          name: newWidget.widget_name || "",
          description: newWidget.widget_description || "",
          primaryColor: newWidget.primary_color || "#10b981",
          borderRadius: newWidget.border_radius || "8px",
          backgroundColor: newWidget.background_color || "",
          customText: newWidget.custom_text || "",
          brandingVisible: isFree ? true : widgetBrandingVisible,
          iframeWidth: newWidthParsed.value,
          iframeWidthUnit: newWidthParsed.unit,
          iframeHeight: newHeightParsed.value,
          iframeHeightUnit: newHeightParsed.unit,
          resultDisplayMode: (newWidget.result_display_mode as "same_page" | "new_tab" | "modal") || "same_page",
          iframePaddingTop: newPaddingTopParsed.value,
          iframePaddingTopUnit: newPaddingTopParsed.unit,
          iframePaddingBottom: newPaddingBottomParsed.value,
          iframePaddingBottomUnit: newPaddingBottomParsed.unit,
          iframePaddingLeft: newPaddingLeftParsed.value,
          iframePaddingLeftUnit: newPaddingLeftParsed.unit,
          iframePaddingRight: newPaddingRightParsed.value,
          iframePaddingRightUnit: newPaddingRightParsed.unit,
          iframeMarginTop: newMarginTopParsed.value,
          iframeMarginTopUnit: newMarginTopParsed.unit,
          iframeMarginBottom: newMarginBottomParsed.value,
          iframeMarginBottomUnit: newMarginBottomParsed.unit,
          iframeMarginLeft: newMarginLeftParsed.value,
          iframeMarginLeftUnit: newMarginLeftParsed.unit,
          iframeMarginRight: newMarginRightParsed.value,
          iframeMarginRightUnit: newMarginRightParsed.unit,
          uploadAreaBackgroundColor: newWidget.upload_area_background_color || "",
        });
        
        setCreateForm(() => ({
          ...defaultFormState,
          brandingVisible: subscriptionType === "free" ? true : defaultFormState.brandingVisible,
        }));
        setActiveTab("saved-widgets");
        toast({
          title: t("widgetdashboard.toast.success"),
          description: t("widgetdashboard.toast.saved"),
        });
      } else {
        // Update without timeout wrapper for faster response
        const updateResponse = await supabaseClient
          .from("widget_settings")
          .update(widgetData)
          .eq("id", currentWidget.id)
          .select()
          .single();

        if (updateResponse.error) {
          throw updateResponse.error;
        }
        
        const updatedWidget = updateResponse.data;

        setSavedWidgets((prev) => prev.map((w) => (w.id === currentWidget.id ? updatedWidget : w)));
        
        // Update form state directly without reloading (faster)
        setCurrentWidget(updatedWidget);
        currentWidgetRef.current = updatedWidget;
        const isFree = subscriptionType === "free";
        const widgetBrandingVisible = updatedWidget.branding_visible !== false;
        const updatedWidthParsed = parseValueUnit(updatedWidget.iframe_width || "100%");
        const updatedHeightParsed = parseValueUnit(updatedWidget.iframe_height || "600");
        const updatedPaddingTopParsed = parseValueUnit(updatedWidget.iframe_padding_top || "");
        const updatedPaddingBottomParsed = parseValueUnit(updatedWidget.iframe_padding_bottom || "");
        const updatedPaddingLeftParsed = parseValueUnit(updatedWidget.iframe_padding_left || "");
        const updatedPaddingRightParsed = parseValueUnit(updatedWidget.iframe_padding_right || "");
        const updatedMarginTopParsed = parseValueUnit(updatedWidget.iframe_margin_top || "");
        const updatedMarginBottomParsed = parseValueUnit(updatedWidget.iframe_margin_bottom || "");
        const updatedMarginLeftParsed = parseValueUnit(updatedWidget.iframe_margin_left || "");
        const updatedMarginRightParsed = parseValueUnit(updatedWidget.iframe_margin_right || "");

        setEditForm({
          name: updatedWidget.widget_name || "",
          description: updatedWidget.widget_description || "",
          primaryColor: updatedWidget.primary_color || "#10b981",
          borderRadius: updatedWidget.border_radius || "8px",
          backgroundColor: updatedWidget.background_color || "",
          customText: updatedWidget.custom_text || "",
          brandingVisible: isFree ? true : widgetBrandingVisible,
          iframeWidth: updatedWidthParsed.value,
          iframeWidthUnit: updatedWidthParsed.unit,
          iframeHeight: updatedHeightParsed.value,
          iframeHeightUnit: updatedHeightParsed.unit,
          resultDisplayMode: (updatedWidget.result_display_mode as "same_page" | "new_tab" | "modal") || "same_page",
          iframePaddingTop: updatedPaddingTopParsed.value,
          iframePaddingTopUnit: updatedPaddingTopParsed.unit,
          iframePaddingBottom: updatedPaddingBottomParsed.value,
          iframePaddingBottomUnit: updatedPaddingBottomParsed.unit,
          iframePaddingLeft: updatedPaddingLeftParsed.value,
          iframePaddingLeftUnit: updatedPaddingLeftParsed.unit,
          iframePaddingRight: updatedPaddingRightParsed.value,
          iframePaddingRightUnit: updatedPaddingRightParsed.unit,
          iframeMarginTop: updatedMarginTopParsed.value,
          iframeMarginTopUnit: updatedMarginTopParsed.unit,
          iframeMarginBottom: updatedMarginBottomParsed.value,
          iframeMarginBottomUnit: updatedMarginBottomParsed.unit,
          iframeMarginLeft: updatedMarginLeftParsed.value,
          iframeMarginLeftUnit: updatedMarginLeftParsed.unit,
          iframeMarginRight: updatedMarginRightParsed.value,
          iframeMarginRightUnit: updatedMarginRightParsed.unit,
          uploadAreaBackgroundColor: updatedWidget.upload_area_background_color || "",
        });
        
        toast({
          title: t("widgetdashboard.toast.success"),
          description: t("widgetdashboard.toast.updated"),
        });
      }
    } catch (error: any) {
      console.error("Error saving widget:", error);
      toast({
        title: t("widgetdashboard.toast.error"),
        description: error?.message || t("widgetdashboard.toast.save.failed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    // CRITICAL: Always check subscription status from the database to prevent UI manipulation
    // This ensures deletion is blocked even if someone modifies the UI via inspect element
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: t("widgetdashboard.toast.error"),
          description: "You must be logged in to delete widgets.",
          variant: "destructive",
        });
        return;
      }

      // Fetch current subscription from database (not from state) to prevent tampering
      const { data: subscriptionData } = await supabase
        .from("widget_subscriptions")
        .select("subscription_type")
        .eq("user_id", session.user.id)
        .single();

      // If no subscription found, treat as free plan
      const currentSubscriptionType = (subscriptionData as { subscription_type?: string } | null)?.subscription_type || "free";
      const isCurrentlyFree = currentSubscriptionType === "free";

      // Prevent free users from deleting widgets - this check cannot be bypassed via UI manipulation
      if (isCurrentlyFree) {
        toast({
          title: t("widgetdashboard.toast.error"),
          description: "To delete widgets, please upgrade to a premium plan.",
          variant: "destructive",
        });
        router.push("/plans");
        return;
      }
    } catch (error) {
      // If we can't verify subscription, block deletion for safety
      console.error("Error verifying subscription for deletion:", error);
      toast({
        title: t("widgetdashboard.toast.error"),
        description: "Unable to verify subscription. Deletion blocked for security.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(t("widgetdashboard.toast.delete.confirm"))) return;

    try {
      const { error } = await supabaseClient.from("widget_settings").delete().eq("id", widgetId);
      if (error) throw error;

      const nextWidgets = savedWidgets.filter((w) => w.id !== widgetId);
      setSavedWidgets(nextWidgets);

      if (currentWidget?.id === widgetId) {
        if (nextWidgets.length > 0) {
          const remainingWidget = nextWidgets[0];
          loadWidgetForEditing(remainingWidget);
        } else {
          clearEditingContext();
          handleTabChange("create");
        }
      }

      // Show success toast immediately
      toast({
        title: t("widgetdashboard.toast.success"),
        description: t("widgetdashboard.toast.deleted"),
      });

      // Reload API stats after deletion to ensure they persist (API calls are tracked by user_id, not widget_id)
      // This ensures the stats don't appear as zero after widget deletion
      // Do this in background and don't let it affect the success toast
      if (user) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        // OPTIMIZED: Use single query instead of 4 separate queries
        const statsPromise = supabaseClient
          .from("widget_api_calls")
          .select("created_at, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1000);

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 3000)
        );

        Promise.race([statsPromise, timeoutPromise])
          .then((result: any) => {
            const calls = result?.data || [];
            
            // Calculate all stats from the single query result
            const totalCount = calls.length;
            const todayCount = calls.filter((call: any) => 
              new Date(call.created_at) >= startOfToday
            ).length;
            const monthCount = calls.filter((call: any) => 
              new Date(call.created_at) >= startOfMonth
            ).length;
            const successCount = calls.filter((call: any) => 
              call.status === 'success'
            ).length;

            console.log("API stats reloaded after deletion:", { 
              totalCount, 
              todayCount, 
              monthCount, 
              successCount
            });

            setApiStats({
              total: totalCount,
              today: todayCount,
              thisMonth: monthCount,
              successful: successCount,
            });
          })
          .catch((err) => {
            console.error("Error reloading API stats after deletion:", err);
            // Keep current stats on error
          });
      }
    } catch (error: any) {
      console.error("Error deleting widget:", error);
      toast({
        title: t("widgetdashboard.toast.error"),
        description: t("widgetdashboard.toast.delete.failed"),
        variant: "destructive",
      });
    }
  };

  const getEmbedCode = (widget?: any) => {
    const widgetId = widget?.widget_id || currentWidget?.widget_id;
    if (!widgetId) return "";
    
    // Use window.location.origin to get the exact current website URL
    // This ensures the iframe uses the actual production URL, not a preview/staging URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const widgetUrl = baseUrl ? `${baseUrl}/widget/embed?id=${widgetId}` : `/widget/embed?id=${widgetId}`;
    const borderRadiusValue =
      widget?.border_radius ?? (currentWidget ? editForm.borderRadius : createForm.borderRadius);
    
    // Get iframe dimensions from widget or form state
    const form = currentWidget ? editForm : createForm;
    const iframeWidth = widget?.iframe_width ?? combineValueUnit(form.iframeWidth, form.iframeWidthUnit) ?? "100%";
    const iframeHeight = widget?.iframe_height ?? combineValueUnit(form.iframeHeight, form.iframeHeightUnit) ?? "600";
    
    // Get padding and margin values
    const paddingTop = widget?.iframe_padding_top ?? (form.iframePaddingTop ? combineValueUnit(form.iframePaddingTop, form.iframePaddingTopUnit) : "");
    const paddingBottom = widget?.iframe_padding_bottom ?? (form.iframePaddingBottom ? combineValueUnit(form.iframePaddingBottom, form.iframePaddingBottomUnit) : "");
    const paddingLeft = widget?.iframe_padding_left ?? (form.iframePaddingLeft ? combineValueUnit(form.iframePaddingLeft, form.iframePaddingLeftUnit) : "");
    const paddingRight = widget?.iframe_padding_right ?? (form.iframePaddingRight ? combineValueUnit(form.iframePaddingRight, form.iframePaddingRightUnit) : "");
    const marginTop = widget?.iframe_margin_top ?? (form.iframeMarginTop ? combineValueUnit(form.iframeMarginTop, form.iframeMarginTopUnit) : "");
    const marginBottom = widget?.iframe_margin_bottom ?? (form.iframeMarginBottom ? combineValueUnit(form.iframeMarginBottom, form.iframeMarginBottomUnit) : "");
    const marginLeft = widget?.iframe_margin_left ?? (form.iframeMarginLeft ? combineValueUnit(form.iframeMarginLeft, form.iframeMarginLeftUnit) : "");
    const marginRight = widget?.iframe_margin_right ?? (form.iframeMarginRight ? combineValueUnit(form.iframeMarginRight, form.iframeMarginRightUnit) : "");
    
    // Build style string for wrapper div
    const wrapperStyles: string[] = ["width: 100%", `max-width: ${iframeWidth === "100%" ? "500px" : iframeWidth}`, "margin: 0 auto"];
    if (paddingTop) wrapperStyles.push(`padding-top: ${paddingTop}`);
    if (paddingBottom) wrapperStyles.push(`padding-bottom: ${paddingBottom}`);
    if (paddingLeft) wrapperStyles.push(`padding-left: ${paddingLeft}`);
    if (paddingRight) wrapperStyles.push(`padding-right: ${paddingRight}`);
    if (marginTop) wrapperStyles.push(`margin-top: ${marginTop}`);
    if (marginBottom) wrapperStyles.push(`margin-bottom: ${marginBottom}`);
    if (marginLeft) wrapperStyles.push(`margin-left: ${marginLeft}`);
    if (marginRight) wrapperStyles.push(`margin-right: ${marginRight}`);
    
    // Generate responsive iframe code that works on all screen sizes
    return `<div style="${wrapperStyles.join("; ")}">
  <iframe 
    src="${widgetUrl}" 
    width="${iframeWidth}" 
    height="${iframeHeight}" 
    frameborder="0" 
    scrolling="yes"
    style="border-radius: ${borderRadiusValue}; border: none; display: block; min-height: 400px;"
    allow="autoplay; encrypted-media"
    title="Food Scanner Widget"
  ></iframe>
</div>`;
  };

  const copyEmbedCode = (widget?: any) => {
    const code = getEmbedCode(widget);
    if (!code) return;
    navigator.clipboard.writeText(code);
      const widgetId = widget?.id || currentWidget?.id || null;
        setCopiedWidgetId(widgetId);
        setTimeout(() => setCopiedWidgetId(null), 2000);
        toast({
          title: t("widgetdashboard.toast.copied"),
          description: t("widgetdashboard.toast.copied.description"),
        });
  };

  const isFreePlan = subscriptionType === "free";
  const canRemoveBranding = subscriptionType !== "free" && subscriptionType !== undefined;

  useEffect(() => {
    if (isFreePlan && !createForm.brandingVisible) {
      setCreateForm((prev) => ({ ...prev, brandingVisible: true }));
    }
  }, [isFreePlan, createForm.brandingVisible]);

  useEffect(() => {
    if (isFreePlan && !editForm.brandingVisible) {
      setEditForm((prev) => ({ ...prev, brandingVisible: true }));
    }
  }, [isFreePlan, editForm.brandingVisible]);

  const canToggleBranding = canRemoveBranding && !isFreePlan;

  const renderWidgetForm = (mode: "create" | "edit") => {
    const isCreateMode = mode === "create";
    const form = isCreateMode ? createForm : editForm;

    const updateForm = <K extends keyof WidgetFormState>(field: K, value: WidgetFormState[K]) => {
      if (isCreateMode) {
        setCreateForm((prev) => ({ ...prev, [field]: value }));
      } else {
        setEditForm((prev) => ({ ...prev, [field]: value }));
      }
    };

    if (!isCreateMode && !currentWidget) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{t("widgetdashboard.form.select")}</CardTitle>
            <CardDescription>
              {t("widgetdashboard.form.select.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button variant="outline" className="flex-1" onClick={() => handleTabChange("saved-widgets")}>
              {t("widgetdashboard.form.view")}
            </Button>
            <Button 
              className="flex-1" 
              onClick={() => handleTabChange("create")}
              disabled={isFreePlan && savedWidgets.length >= 1}
              title={isFreePlan && savedWidgets.length >= 1 ? "Free plan users can only create one widget. Upgrade to create more." : ""}
            >
              <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.form.create")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{isCreateMode ? t("widgetdashboard.form.create.title") : t("widgetdashboard.form.edit.title")}</CardTitle>
          <CardDescription>{t("widgetdashboard.form.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={`widget-name-${mode}`}>{t("widgetdashboard.form.name")}</Label>
            <Input
              id={`widget-name-${mode}`}
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder={t("widgetdashboard.form.name.placeholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`widget-description-${mode}`}>{t("widgetdashboard.form.description")}</Label>
            <Textarea
              id={`widget-description-${mode}`}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder={t("widgetdashboard.form.description.placeholder")}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`primary-color-${mode}`}>{t("widgetdashboard.form.color")}</Label>
            <div className="flex items-center gap-4">
              <Input
                id={`primary-color-${mode}`}
                type="color"
                value={form.primaryColor}
                onChange={(event) => updateForm("primaryColor", event.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={form.primaryColor}
                onChange={(event) => updateForm("primaryColor", event.target.value)}
                className="flex-1"
                placeholder={t("widgetdashboard.form.color.placeholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`border-radius-${mode}`}>{t("widgetdashboard.form.border")}</Label>
            <Input
              id={`border-radius-${mode}`}
              type="text"
              value={form.borderRadius}
              onChange={(event) => updateForm("borderRadius", event.target.value)}
              placeholder={t("widgetdashboard.form.border.placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`background-color-${mode}`}>Background Color</Label>
            <div className="flex items-center gap-4">
              <Input
                id={`background-color-${mode}`}
                type="color"
                value={form.backgroundColor || "#ffffff"}
                onChange={(event) => updateForm("backgroundColor", event.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={form.backgroundColor}
                onChange={(event) => updateForm("backgroundColor", event.target.value)}
                className="flex-1"
                placeholder="#ffffff or leave empty for transparent"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set the background color of the widget. Leave empty for transparent background.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`iframe-width-${mode}`}>Iframe Width</Label>
              <div className="flex gap-2">
                <Input
                  id={`iframe-width-${mode}`}
                  type="text"
                  value={form.iframeWidth}
                  onChange={(event) => updateForm("iframeWidth", event.target.value)}
                  placeholder="100"
                  className="flex-1"
                />
                <Select
                  value={form.iframeWidthUnit}
                  onValueChange={(value: "px" | "%") => updateForm("iframeWidthUnit", value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="px">px</SelectItem>
                    <SelectItem value="%">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Width of the iframe
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`iframe-height-${mode}`}>Iframe Height</Label>
              <div className="flex gap-2">
                <Input
                  id={`iframe-height-${mode}`}
                  type="text"
                  value={form.iframeHeight}
                  onChange={(event) => updateForm("iframeHeight", event.target.value)}
                  placeholder="600"
                  className="flex-1"
                />
                <Select
                  value={form.iframeHeightUnit}
                  onValueChange={(value: "px" | "%") => updateForm("iframeHeightUnit", value)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="px">px</SelectItem>
                    <SelectItem value="%">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Height of the iframe
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">Iframe Padding</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`iframe-padding-top-${mode}`} className="text-xs">Top</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-padding-top-${mode}`}
                      type="text"
                      value={form.iframePaddingTop}
                      onChange={(event) => updateForm("iframePaddingTop", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframePaddingTopUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframePaddingTopUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`iframe-padding-bottom-${mode}`} className="text-xs">Bottom</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-padding-bottom-${mode}`}
                      type="text"
                      value={form.iframePaddingBottom}
                      onChange={(event) => updateForm("iframePaddingBottom", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframePaddingBottomUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframePaddingBottomUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`iframe-padding-left-${mode}`} className="text-xs">Left</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-padding-left-${mode}`}
                      type="text"
                      value={form.iframePaddingLeft}
                      onChange={(event) => updateForm("iframePaddingLeft", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframePaddingLeftUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframePaddingLeftUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`iframe-padding-right-${mode}`} className="text-xs">Right</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-padding-right-${mode}`}
                      type="text"
                      value={form.iframePaddingRight}
                      onChange={(event) => updateForm("iframePaddingRight", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframePaddingRightUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframePaddingRightUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Iframe Margin</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`iframe-margin-top-${mode}`} className="text-xs">Top</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-margin-top-${mode}`}
                      type="text"
                      value={form.iframeMarginTop}
                      onChange={(event) => updateForm("iframeMarginTop", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframeMarginTopUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframeMarginTopUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`iframe-margin-bottom-${mode}`} className="text-xs">Bottom</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-margin-bottom-${mode}`}
                      type="text"
                      value={form.iframeMarginBottom}
                      onChange={(event) => updateForm("iframeMarginBottom", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframeMarginBottomUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframeMarginBottomUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`iframe-margin-left-${mode}`} className="text-xs">Left</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-margin-left-${mode}`}
                      type="text"
                      value={form.iframeMarginLeft}
                      onChange={(event) => updateForm("iframeMarginLeft", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframeMarginLeftUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframeMarginLeftUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`iframe-margin-right-${mode}`} className="text-xs">Right</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`iframe-margin-right-${mode}`}
                      type="text"
                      value={form.iframeMarginRight}
                      onChange={(event) => updateForm("iframeMarginRight", event.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={form.iframeMarginRightUnit}
                      onValueChange={(value: "px" | "%") => updateForm("iframeMarginRightUnit", value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="px">px</SelectItem>
                        <SelectItem value="%">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`upload-area-bg-${mode}`}>Upload Area Background Color</Label>
            <div className="flex items-center gap-4">
              <Input
                id={`upload-area-bg-${mode}`}
                type="color"
                value={form.uploadAreaBackgroundColor || "#ffffff"}
                onChange={(event) => updateForm("uploadAreaBackgroundColor", event.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={form.uploadAreaBackgroundColor}
                onChange={(event) => updateForm("uploadAreaBackgroundColor", event.target.value)}
                className="flex-1"
                placeholder="#ffffff or leave empty for default"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Background color for the upload area container (where &quot;Upload Your Food Photo&quot; text and button are displayed)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`result-display-mode-${mode}`}>Result Display Mode</Label>
            <Select
              value={form.resultDisplayMode}
              onValueChange={(value: "same_page" | "new_tab" | "modal") => updateForm("resultDisplayMode", value)}
            >
              <SelectTrigger id={`result-display-mode-${mode}`}>
                <SelectValue placeholder="Select display mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same_page">Same Page (Current behavior)</SelectItem>
                <SelectItem value="new_tab">Open in New Tab</SelectItem>
                <SelectItem value="modal">Show in Modal Popup</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how scan results are displayed to users
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`custom-text-${mode}`}>{t("widgetdashboard.form.customtext")}</Label>
            <Input
              id={`custom-text-${mode}`}
              type="text"
              value={form.customText}
              onChange={(event) => updateForm("customText", event.target.value)}
              placeholder={t("widgetdashboard.form.customtext.placeholder")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={`branding-${mode}`}>{t("widgetdashboard.form.branding")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("widgetdashboard.form.branding.description")}
                {isFreePlan && t("widgetdashboard.form.branding.upgrade")}
                {!isFreePlan && !canRemoveBranding && t("widgetdashboard.form.branding.upgrade2")}
              </p>
            </div>
            <Button
              id={`branding-${mode}`}
              variant={form.brandingVisible ? "default" : "outline"}
              onClick={() => {
                if (canToggleBranding) {
                  updateForm("brandingVisible", !form.brandingVisible);
                }
              }}
              disabled={isFreePlan || !canToggleBranding}
            >
              {form.brandingVisible ? t("widgetdashboard.form.branding.visible") : t("widgetdashboard.form.branding.hidden")}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            {mode === "edit" && currentWidget && (
              <Button
                variant="outline"
                onClick={() => handleSaveWidget("edit", true)}
                disabled={saving || !editForm.name.trim() || (isFreePlan && savedWidgets.length >= 1)}
                title={isFreePlan && savedWidgets.length >= 1 ? "Free plan users can only create one widget. Upgrade to create more." : ""}
              >
                <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.form.saveasnew")}
              </Button>
            )}
            <Button
              onClick={() => handleSaveWidget(isCreateMode ? "create" : "edit")}
              disabled={saving || !form.name.trim() || (isCreateMode && isFreePlan && savedWidgets.length >= 1)}
              title={isCreateMode && isFreePlan && savedWidgets.length >= 1 ? "Free plan users can only create one widget. Upgrade to create more." : ""}
            >
              {saving ? (
                isCreateMode ? t("widgetdashboard.form.create.creating") : t("widgetdashboard.form.save.saving")
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> {isCreateMode ? t("widgetdashboard.form.create.button") : t("widgetdashboard.form.save")}
                </>
              )}
            </Button>
          </div>

          {/* Mobile preview - shown on small screens */}
          <div className="lg:hidden border rounded-lg p-4 bg-muted/50">
            <Label className="mb-2 block">{t("widgetdashboard.form.preview")}</Label>
            <div className="w-full max-w-xs mx-auto">
              <WidgetPreview form={form} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Check if user is premium - subscription_type === "premium" is the key indicator
  const isPremium = platformSubscription?.subscription_type === "premium";

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Code className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">{t("widgetdashboard.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t("widgetdashboard.title")}</h1>
          <p className="text-muted-foreground">{t("widgetdashboard.description")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" data-stats-section>
          {[
            { label: t("widgetdashboard.stats.total"), value: apiStats?.total || 0 },
            { label: t("widgetdashboard.stats.today"), value: apiStats?.today || 0 },
            { label: t("widgetdashboard.stats.thismonth"), value: apiStats?.thisMonth || 0 },
            { label: t("widgetdashboard.stats.saved"), value: savedWidgets.length },
          ].map((stat, index) => (
            <Card key={stat.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show premium banner for free users, but always show tabs so they can create their first widget */}
        {!isPremium && savedWidgets.length === 0 && (
          <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <CardContent className="py-6 px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold mb-1">{t("widgetdashboard.premium.title")}</h3>
                  <p className="text-sm text-muted-foreground">
                    Free plan allows 1 widget. Upgrade to create unlimited widgets and access premium features.
                  </p>
                    </div>
                <Button onClick={() => router.push("/plans")} className="text-sm px-6">
                  {t("widgetdashboard.premium.upgrade")} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
            {!isPremium && savedWidgets.length > 0 && (
              <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                <CardContent className="py-6 px-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-lg font-bold mb-1">{t("widgetdashboard.premium.title")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("widgetdashboard.premium.description")}
                      </p>
                    </div>
                    <Button onClick={() => router.push("/plans")} className="text-sm px-6">
                      {t("widgetdashboard.premium.upgrade")} <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
        
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="saved-widgets">
              <Bookmark className="h-4 w-4 mr-2" /> {t("widgetdashboard.tabs.saved")} ({savedWidgets.length})
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.tabs.create")}
            </TabsTrigger>
            <TabsTrigger value="embed">
              <Code className="h-4 w-4 mr-2" /> {t("widgetdashboard.tabs.embed")}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" /> {t("widgetdashboard.tabs.analytics")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved-widgets" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t("widgetdashboard.saved.title")}</CardTitle>
                    <CardDescription>{t("widgetdashboard.saved.description")}</CardDescription>
                  </div>
                  <Button 
                    onClick={() => handleTabChange("create")}
                    disabled={isFreePlan && savedWidgets.length >= 1}
                    title={isFreePlan && savedWidgets.length >= 1 ? "Free plan users can only create one widget. Upgrade to create more." : ""}
                  >
                    <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.saved.create")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {savedWidgets.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">{t("widgetdashboard.saved.none")}</p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={() => handleTabChange("create")}
                        disabled={isFreePlan && savedWidgets.length >= 1}
                        title={isFreePlan && savedWidgets.length >= 1 ? "Free plan users can only create one widget. Upgrade to create more." : ""}
                      >
                        <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.form.create")}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          widgetsLoadingRef.current = false;
                          initialLoadRef.current = true;
                          setLoading(true);
                          // Trigger a reload by calling loadData logic again
                          const loadWidgets = async () => {
                            try {
                              const { data: { session } } = await supabaseClient.auth.getSession();
                              if (session?.user) {
                                const { data: widgets, error } = await supabaseClient
                                  .from("widget_settings")
                                  .select("*")
                                  .eq("user_id", session.user.id)
                                  .order("created_at", { ascending: false })
                                  .limit(50);
                                if (!error && widgets) {
                                  setSavedWidgets(widgets);
                                  console.log("Manually reloaded widgets:", widgets.length);
                                }
                              }
                            } catch (err) {
                              console.error("Manual reload error:", err);
                            } finally {
                              setLoading(false);
                            }
                          };
                          loadWidgets();
                        }}
                      >
                        <Zap className="h-4 w-4 mr-2" /> Refresh
                      </Button>
                    </div>
                  </div>
                ) : savedWidgets.length === 0 && loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading widgets...</p>
                  </div>
                ) : (
                  <>
                    {/* Search Widget Input */}
                    <div className="mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search widgets by name or description..."
                          value={savedWidgetsSearchQuery}
                          onChange={(e) => setSavedWidgetsSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Filtered Widgets */}
                    {(() => {
                      const filteredWidgets = savedWidgets.filter((widget) => {
                        if (!savedWidgetsSearchQuery.trim()) return true;
                        const query = savedWidgetsSearchQuery.toLowerCase();
                        return (
                          widget.widget_name?.toLowerCase().includes(query) ||
                          widget.widget_description?.toLowerCase().includes(query) ||
                          widget.widget_id?.toLowerCase().includes(query)
                        );
                      });

                      if (filteredWidgets.length === 0 && savedWidgetsSearchQuery.trim()) {
                        return (
                          <div className="text-center py-12">
                            <p className="text-muted-foreground">
                              No widgets found matching &quot;{savedWidgetsSearchQuery}&quot;
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredWidgets.map((widget) => (
                      <Card
                        key={widget.id}
                        className={currentWidget?.id === widget.id ? "border-primary" : undefined}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{widget.widget_name}</CardTitle>
                          {widget.widget_description && (
                            <CardDescription>{widget.widget_description}</CardDescription>
                          )}
                          {widget.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{t("widgetdashboard.saved.default")}</span>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: widget.primary_color }} />
                            <span>{widget.primary_color}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                loadWidgetForEditing(widget);
                                if (activeTab !== "saved-widgets") {
                                  handleTabChange("saved-widgets");
                                }
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" /> {t("widgetdashboard.saved.edit")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => copyEmbedCode(widget)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleDeleteWidget(widget.id)}
                                      disabled={isFreePlan}
                                      className={isFreePlan ? "cursor-not-allowed opacity-50" : ""}
                                    >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                                  </span>
                                </TooltipTrigger>
                                {isFreePlan && (
                                  <TooltipContent>
                                    <p>You need to upgrade to a premium plan to delete the widget</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </CardContent>
                      </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>

            {!isCreating && currentWidget && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="space-y-4">
                  {renderWidgetForm("edit")}
                </div>
                <div className="hidden lg:block">
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle>{t("widgetdashboard.form.preview")}</CardTitle>
                      <CardDescription>See how your widget will look in real-time</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                      <div className="w-full max-w-md mx-auto">
                        <WidgetPreview form={editForm} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            {isFreePlan && savedWidgets.length >= 1 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Widget Limit Reached</CardTitle>
                  <CardDescription>
                    Free plan users can only create one widget. Upgrade to create unlimited widgets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You&apos;ve reached the free plan limit of 1 widget. Upgrade to create more widgets and access premium features.
                  </p>
                  <Button onClick={() => router.push("/plans")} size="lg">
                    Upgrade to Premium <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="space-y-4">
                {renderWidgetForm("create")}
              </div>
              <div className="hidden lg:block">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>{t("widgetdashboard.form.preview")}</CardTitle>
                    <CardDescription>See how your widget will look in real-time</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md mx-auto">
                      <WidgetPreview form={createForm} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}
          </TabsContent>

          <TabsContent value="embed" className="space-y-6">
            {savedWidgets.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("widgetdashboard.embed.title")}</CardTitle>
                  <CardDescription>{t("widgetdashboard.embed.description")}</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t("widgetdashboard.embed.none")}</p>
                  <Button onClick={() => handleTabChange("create")}>
                    <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.form.create")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Widget Selector Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Widget</CardTitle>
                    <CardDescription>Choose a widget to view its embed code</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="widget-selector">Widget</Label>
                        <Select
                          value={selectedWidgetForEmbed || ""}
                          onValueChange={(value) => {
                            if (value && value !== "select-widget") {
                              setSelectedWidgetForEmbed(value);
                            }
                          }}
                        >
                          <SelectTrigger id="widget-selector" className="w-full">
                            <SelectValue placeholder="Select saved widget" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="select-widget" disabled>
                              Select saved widget
                            </SelectItem>
                            {savedWidgets.map((widget) => (
                              <SelectItem key={widget.id} value={widget.id}>
                                {widget.widget_name || `Widget ${widget.id}`}
                                {widget.is_default && (
                                  <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Search Widget Input (Optional) */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search widgets by name or description..."
                        value={embedSearchQuery}
                          onChange={(e) => {
                            setEmbedSearchQuery(e.target.value);
                            // Auto-select first matching widget if search is active
                            if (e.target.value.trim()) {
                              const filtered = savedWidgets.filter((widget) => {
                                const query = e.target.value.toLowerCase();
                                return (
                                  widget.widget_name?.toLowerCase().includes(query) ||
                                  widget.widget_description?.toLowerCase().includes(query) ||
                                  widget.widget_id?.toLowerCase().includes(query)
                                );
                              });
                              if (filtered.length > 0) {
                                setSelectedWidgetForEmbed(filtered[0].id);
                              }
                            }
                          }}
                        className="pl-10"
                      />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CTA Card when no widget selected or Embed Code Card for Selected Widget */}
                {(() => {
                  if (!selectedWidgetForEmbed) {
                    return (
                      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                        <CardContent className="py-12 px-6">
                          <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                              <Code className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold">Select a Widget to View Embed Code</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                              Choose a widget from the dropdown above to view and copy its embed code. 
                              You can then integrate it into your website.
                            </p>
                            <div className="pt-4">
                              <p className="text-sm text-muted-foreground mb-2">
                                {savedWidgets.length === 1 
                                  ? "You have 1 saved widget" 
                                  : `You have ${savedWidgets.length} saved widgets`}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  const filteredWidgets = savedWidgets.filter((widget) => {
                    if (!embedSearchQuery.trim()) return true;
                    const query = embedSearchQuery.toLowerCase();
                    return (
                      widget.widget_name?.toLowerCase().includes(query) ||
                      widget.widget_description?.toLowerCase().includes(query) ||
                      widget.widget_id?.toLowerCase().includes(query)
                    );
                  });

                  const widgetToShow = filteredWidgets.find((w) => w.id === selectedWidgetForEmbed);

                  if (!widgetToShow) {
                    return (
                      <Card>
                        <CardContent className="text-center py-8">
                          <p className="text-muted-foreground">
                            No widgets found matching &quot;{embedSearchQuery}&quot;
                          </p>
                        </CardContent>
                      </Card>
                    );
                  }

                  const code = getEmbedCode(widgetToShow);
                  const widgetId = widgetToShow.id;

                    return (
                    <Card key={widgetId} className="border-2">
                        <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {widgetToShow.widget_name}
                              {widgetToShow.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Copy the embed code below to integrate this widget into your website
                          </CardDescription>
                          </div>
                        </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm border">
                            <code className="text-xs">{code}</code>
                            </pre>
                          <Button 
                            size="sm" 
                            className="absolute top-3 right-3" 
                            onClick={() => copyEmbedCode(widgetToShow)}
                          >
                              {copiedWidgetId === widgetId ? (
                                <>
                                <Check className="h-4 w-4 mr-2" /> Copied!
                                </>
                              ) : (
                                <>
                                <Copy className="h-4 w-4 mr-2" /> Copy Code
                                </>
                              )}
                            </Button>
                          </div>
                        
                        <Card className="bg-muted/50">
                          <CardContent className="pt-6">
                            <div className="text-sm space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold mt-0.5">
                                  1
                    </div>
                                <div>
                                  <p className="font-medium mb-1">Copy the embed code</p>
                                  <p className="text-muted-foreground text-xs">
                                    Click the &quot;Copy Code&quot; button above to copy the iframe code to your clipboard
                                  </p>
                  </div>
                </div>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold mt-0.5">
                                  2
                                </div>
                                <div>
                                  <p className="font-medium mb-1">Paste into your website</p>
                                  <p className="text-muted-foreground text-xs">
                                    Paste the code into your HTML where you want the widget to appear
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold mt-0.5">
                                  3
                                </div>
                        <div>
                                  <p className="font-medium mb-1">Test your integration</p>
                                  <p className="text-muted-foreground text-xs">
                                    Visit your website to ensure the widget displays correctly
                                  </p>
                        </div>
                      </div>
                </div>
              </CardContent>
            </Card>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("widgetdashboard.analytics.title")}</CardTitle>
                <CardDescription>{t("widgetdashboard.analytics.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("widgetdashboard.analytics.total")}</p>
                    <p className="text-2xl font-bold">{apiStats?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("widgetdashboard.analytics.today")}</p>
                    <p className="text-2xl font-bold">{apiStats?.today || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("widgetdashboard.analytics.thismonth")}</p>
                    <p className="text-2xl font-bold">{apiStats?.thisMonth || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("widgetdashboard.analytics.successful")}</p>
                    <p className="text-2xl font-bold">{apiStats?.successful || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
      </div>
    </main>
  );
}
