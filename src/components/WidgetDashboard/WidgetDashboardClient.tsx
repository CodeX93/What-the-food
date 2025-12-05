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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Code, Copy, Check, Trash2, Plus, BarChart3, Zap, Edit, Save, Bookmark, AlertTriangle, ArrowRight, ShieldCheck, Upload, Search } from "lucide-react";
import { getUrl } from "@/utils/url";
import { useTranslation } from "@/hooks/use-translation";

type WidgetFormState = {
  name: string;
  description: string;
  primaryColor: string;
  borderRadius: string;
  customText: string;
  brandingVisible: boolean;
};

const defaultFormState: WidgetFormState = {
  name: "Upload Your Food Photo",
  description: "Drop an image here or click to browse",
  primaryColor: "#10b981",
  borderRadius: "8px",
  customText: "",
  brandingVisible: true,
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
      className="w-full bg-card rounded-lg border-2 border-border shadow-sm"
      style={{ 
        borderRadius: form.borderRadius,
        borderColor: form.primaryColor + "30"
      }}
    >
      <div className="p-6 sm:p-8">
        {form.customText && (
          <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: form.primaryColor }}>
            {form.customText}
          </h3>
        )}

        <div
          className="border-2 border-dashed rounded-lg p-10 cursor-pointer bg-muted/30 text-center hover:border-opacity-50 transition-colors flex-1 flex flex-col items-center justify-center min-h-[280px]"
          style={{ 
            borderColor: form.primaryColor + "30",
            borderRadius: form.borderRadius
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

      setEditForm({
        name: widget.widget_name || "",
        description: widget.widget_description || "",
        primaryColor: widget.primary_color || "#10b981",
        borderRadius: widget.border_radius || "8px",
        customText: widget.custom_text || "",
        brandingVisible: isFree ? true : widgetBrandingVisible,
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
        // Set a timeout to ensure page renders even if queries are slow
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setLoading(false);
          }
        }, 3000); // Max 3 seconds wait

        // Fast session check only
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        // Check if cancelled or no session
        if (cancelled || !session?.user || sessionError) {
          clearTimeout(timeoutId);
          if (!session?.user) {
            router.push("/auth");
          }
          return;
        }

        setUser(session.user);

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

        // Load widgets for all users (they may have created widgets before)
        // Prevent concurrent widget loads
        if (widgetsLoadingRef.current) {
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        widgetsLoadingRef.current = true;
        
        try {
          // Verify session is still valid before querying
          const { data: { session: currentSession }, error: sessionCheckError } = await supabaseClient.auth.getSession();
          
          if (cancelled || sessionCheckError || !currentSession?.user || !currentSession?.access_token) {
            widgetsLoadingRef.current = false;
            clearTimeout(timeoutId);
            if (!currentSession?.user) {
              console.error("No session found, redirecting to auth");
              router.push("/auth");
            }
            setLoading(false);
            return;
          }

          // Ensure the client has the session by setting it explicitly
          // This helps with timing issues where the client might not have the session attached yet
          await new Promise(resolve => setTimeout(resolve, 50));

          // Make the query - Supabase client should automatically include auth headers
          console.log("Attempting to load widgets for user:", currentSession.user.id);
          const { data: widgets, error: widgetsError } = await supabaseClient
            .from("widget_settings")
            .select(
              "id, widget_id, widget_name, widget_description, primary_color, border_radius, is_default, created_at, custom_text, branding_visible"
            )
            .eq("user_id", currentSession.user.id)
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
                  "id, widget_id, widget_name, widget_description, primary_color, border_radius, is_default, created_at, custom_text, branding_visible"
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

            // Add timeout to each query (5 seconds max per query - increased from 3)
            const queryWithTimeout = (query: Promise<any>, timeoutMs = 5000) => {
              return Promise.race([
                query,
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
                )
              ]);
            };

            Promise.all([
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
              ).catch((err) => {
                console.error("Error loading total API stats:", err);
                return { count: 0 };
              }),
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .gte("created_at", startOfToday.toISOString())
              ).catch((err) => {
                console.error("Error loading today API stats:", err);
                return { count: 0 };
              }),
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .gte("created_at", startOfMonth.toISOString())
              ).catch((err) => {
                console.error("Error loading month API stats:", err);
                return { count: 0 };
              }),
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .eq("status", "success")
              ).catch((err) => {
                console.error("Error loading successful API stats:", err);
                return { count: 0 };
              }),
            ])
            .then(([totalRes, todayRes, monthRes, successRes]) => {
              if (cancelled) return;
              // Verify user is still authenticated before updating state
              supabaseClient.auth.getSession().then(({ data: { session: verifySession } }) => {
                if (cancelled || !verifySession?.user) {
                  console.log("API stats: Session expired or cancelled during load");
                  return;
                }
                const totalCount = (totalRes?.count as number) || 0;
                const todayCount = (todayRes?.count as number) || 0;
                const monthCount = (monthRes?.count as number) || 0;
                const successCount = (successRes?.count as number) || 0;

                console.log("API stats loaded:", { totalCount, todayCount, monthCount, successCount });

                setApiStats({
                  total: totalCount,
                  today: todayCount,
                  thisMonth: monthCount,
                  successful: successCount,
                });
              });
            })
            .catch((error) => {
              if (cancelled) return;
              console.error("Error loading API stats (general):", error);
              // Keep stats at 0 on error, but log it for debugging
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
        custom_text: formState.customText || null,
        branding_visible: finalBrandingVisible,
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
        setEditForm({
          name: newWidget.widget_name || "",
          description: newWidget.widget_description || "",
          primaryColor: newWidget.primary_color || "#10b981",
          borderRadius: newWidget.border_radius || "8px",
          customText: newWidget.custom_text || "",
          brandingVisible: isFree ? true : widgetBrandingVisible,
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
        setEditForm({
          name: updatedWidget.widget_name || "",
          description: updatedWidget.widget_description || "",
          primaryColor: updatedWidget.primary_color || "#10b981",
          borderRadius: updatedWidget.border_radius || "8px",
          customText: updatedWidget.custom_text || "",
          brandingVisible: isFree ? true : widgetBrandingVisible,
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

        // Use the same query structure and timeout handling as loadApiStats for consistency
        const queryWithTimeout = (query: Promise<any>, timeoutMs = 5000) => {
          return Promise.race([
            query,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
            )
          ]);
        };

        Promise.all([
          queryWithTimeout(
            supabaseClient
              .from("widget_api_calls")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
          ).catch((err) => {
            console.error("Error loading total API stats after deletion:", err);
            return { count: 0, error: err };
          }),
          queryWithTimeout(
            supabaseClient
              .from("widget_api_calls")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .gte("created_at", startOfToday.toISOString())
          ).catch((err) => {
            console.error("Error loading today API stats after deletion:", err);
            return { count: 0, error: err };
          }),
          queryWithTimeout(
            supabaseClient
              .from("widget_api_calls")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .gte("created_at", startOfMonth.toISOString())
          ).catch((err) => {
            console.error("Error loading month API stats after deletion:", err);
            return { count: 0, error: err };
          }),
          queryWithTimeout(
            supabaseClient
              .from("widget_api_calls")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("status", "success")
          ).catch((err) => {
            console.error("Error loading successful API stats after deletion:", err);
            return { count: 0, error: err };
          }),
        ]).then(([totalRes, todayRes, monthRes, successRes]) => {
          // Check for Supabase errors in response
          if (totalRes?.error) {
            console.error("Total API stats query error:", totalRes.error);
          }
          if (todayRes?.error) {
            console.error("Today API stats query error:", todayRes.error);
          }
          if (monthRes?.error) {
            console.error("Month API stats query error:", monthRes.error);
          }
          if (successRes?.error) {
            console.error("Success API stats query error:", successRes.error);
          }

          const totalCount = (totalRes?.count as number) ?? 0;
          const todayCount = (todayRes?.count as number) ?? 0;
          const monthCount = (monthRes?.count as number) ?? 0;
          const successCount = (successRes?.count as number) ?? 0;

          console.log("API stats reloaded after deletion:", { 
            totalCount, 
            todayCount, 
            monthCount, 
            successCount,
            rawResponses: { totalRes, todayRes, monthRes, successRes }
          });

          setApiStats({
            total: totalCount,
            today: todayCount,
            thisMonth: monthCount,
            successful: successCount,
          });
        }).catch((err) => {
          // Silently fail - stats will remain as they were, don't show error
          console.error("Error reloading API stats after deletion:", err);
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
    
    // Generate responsive iframe code that works on all screen sizes
    return `<div style="width: 100%; max-width: 500px; margin: 0 auto;">
  <iframe 
    src="${widgetUrl}" 
    width="100%" 
    height="600" 
    frameborder="0" 
    scrolling="no"
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
                {/* Search Widget Input */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search widgets by name or description..."
                        value={embedSearchQuery}
                        onChange={(e) => setEmbedSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Filtered Widgets */}
                {(() => {
                  const filteredWidgets = savedWidgets.filter((widget) => {
                    if (!embedSearchQuery.trim()) return true;
                    const query = embedSearchQuery.toLowerCase();
                    return (
                      widget.widget_name?.toLowerCase().includes(query) ||
                      widget.widget_description?.toLowerCase().includes(query) ||
                      widget.widget_id?.toLowerCase().includes(query)
                    );
                  });

                  if (filteredWidgets.length === 0 && embedSearchQuery.trim()) {
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

                  return filteredWidgets.map((widget) => {
                    const code = getEmbedCode(widget);
                    const widgetId = widget.id;
                    return (
                      <Card key={widgetId}>
                        <CardHeader>
                          <CardTitle>{widget.widget_name}</CardTitle>
                          <CardDescription>
                            {t("widgetdashboard.embed.step2")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="relative">
                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                              <code>{code}</code>
                            </pre>
                            <Button size="sm" className="absolute top-2 right-2" onClick={() => copyEmbedCode(widget)}>
                              {copiedWidgetId === widgetId ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" /> {t("widgetdashboard.embed.copied")}
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" /> {t("widgetdashboard.embed.copy")}
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p className="mb-2">{t("widgetdashboard.embed.steps")}</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                              <li>{t("widgetdashboard.embed.step1")}</li>
                              <li>{t("widgetdashboard.embed.step2")}</li>
                              <li>{t("widgetdashboard.embed.step3")}</li>
                            </ol>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
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
