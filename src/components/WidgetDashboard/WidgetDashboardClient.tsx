'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Code, Link as LinkIcon, Copy, Check, Trash2, Plus, BarChart3, Zap, Edit, Save, Bookmark, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
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
  name: "",
  description: "",
  primaryColor: "#10b981",
  borderRadius: "8px",
  customText: "",
  brandingVisible: true,
};

const REQUEST_TIMEOUT_MS = 12000;

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

export function WidgetDashboardClient({ initialSubscription = null }: WidgetDashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [platformSubscription, setPlatformSubscription] = useState<any>(initialSubscription);
  const [savedWidgets, setSavedWidgets] = useState<any[]>([]);
  const [widgetSites, setWidgetSites] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>({ total: 0, today: 0, thisMonth: 0, successful: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [copiedWidgetId, setCopiedWidgetId] = useState<string | null>(null);
  const [currentWidget, setCurrentWidget] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("saved-widgets");

  const [createForm, setCreateForm] = useState<WidgetFormState>(defaultFormState);
  const [editForm, setEditForm] = useState<WidgetFormState>(defaultFormState);

  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [siteLimitExceeded, setSiteLimitExceeded] = useState(false);
  const supabaseClient = supabase as any;
  const initialLoadRef = useRef(true);
  const currentWidgetRef = useRef<any>(null);
  const subscriptionProcessedRef = useRef(false);
  const subscriptionType = subscription?.subscription_type;

  const evaluateSiteLimit = useCallback((currentSiteCount: number) => {
    const limitFromSubscription = subscription?.site_limit;

    if (limitFromSubscription === null) {
      setSiteLimitExceeded(false);
      return;
    }

    const fallbackLimit =
      subscription?.subscription_type === "plan2"
        ? 3
        : subscription?.subscription_type === "plan1" || subscription?.subscription_type === "free"
        ? 1
        : subscription?.subscription_type === "plan3"
        ? null
        : 1;

    const effectiveLimit =
      typeof limitFromSubscription === "number" ? limitFromSubscription : fallbackLimit ?? undefined;

    if (effectiveLimit === undefined || effectiveLimit === null) {
      setSiteLimitExceeded(false);
      return;
    }

    setSiteLimitExceeded(currentSiteCount >= effectiveLimit);
  }, [subscription]);

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

      // Use existing user state instead of calling getUser again
      const currentUser = user;
      if (widget.widget_id && currentUser) {
        supabaseClient
          .from("widget_sites")
          .select("id, site_url, site_name, created_at")
          .eq("widget_id", widget.widget_id)
          .order("created_at", { ascending: false })
          .then(({ data: sites }) => {
            const userSites = sites || [];
            setWidgetSites(userSites);
            evaluateSiteLimit(userSites.length);
          })
          .catch((error) => {
            console.error("Error loading widget sites:", error);
            setWidgetSites([]);
            evaluateSiteLimit(0);
          });
      } else {
        setWidgetSites([]);
        evaluateSiteLimit(0);
      }
    },
    [evaluateSiteLimit, subscriptionType, supabaseClient, user]
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
    setWidgetSites([]);
    evaluateSiteLimit(0);
  }, [subscriptionType, evaluateSiteLimit]);

  useEffect(() => {
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
            const subscriptionData = {
              ...initialSubscription,
              site_limit: initialSubscription.subscription_type === "premium" ? null : 1,
            };
            setSubscription(subscriptionData);
            setPlatformSubscription(initialSubscription);
            isPremiumUser = initialSubscription.subscription_type === "premium";
            setLoading(false);
          } else {
            // No subscription found, show free user experience
            setSubscription({ subscription_type: "free", is_active: false, site_limit: 1 });
            setPlatformSubscription({ subscription_type: "free", is_active: false });
            setLoading(false);
          }
          subscriptionProcessedRef.current = true;
        } else {
          // Use existing subscription state to determine premium status
          isPremiumUser = platformSubscription?.subscription_type === "premium" || subscription?.subscription_type === "premium";
        }

        // Only load widgets if user is premium
        if (isPremiumUser) {
          // Load widgets in background (non-blocking)
          supabaseClient
            .from("widget_settings")
            .select(
              "id, widget_id, widget_name, widget_description, primary_color, border_radius, is_default, created_at, custom_text, branding_visible"
            )
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50)
            .then(({ data: widgets, error: widgetsError }) => {
              if (cancelled) return;
              
              // Verify user is still authenticated before processing widgets
              supabaseClient.auth.getSession().then(({ data: { session: verifySession } }) => {
                if (cancelled || !verifySession?.user) return;
                
                if (widgetsError) {
                  // Only log non-network errors
                  const errorMessage = widgetsError.message || String(widgetsError);
                  const isNetworkError = 
                    errorMessage.includes("Load failed") ||
                    errorMessage.includes("Failed to fetch") ||
                    errorMessage.includes("NetworkError") ||
                    errorMessage.includes("TypeError") ||
                    errorMessage.includes("access control");
                  
                  if (!isNetworkError) {
                    console.error("Error loading widgets:", widgetsError);
                  }
                  return;
                }

                if ((widgets as any[]) && (widgets as any[]).length > 0) {
                  const widgetList = widgets as Array<{ is_default?: boolean }>;
                  setSavedWidgets(widgetList);
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
              });
            })
            .catch((error) => {
              if (cancelled) return;
              // Only log non-network errors
              const errorMessage = error?.message || String(error);
              const isNetworkError = 
                errorMessage.includes("Load failed") ||
                errorMessage.includes("Failed to fetch") ||
                errorMessage.includes("NetworkError") ||
                errorMessage.includes("TypeError") ||
                errorMessage.includes("access control");
              
              if (!isNetworkError) {
                console.error("Error loading widgets:", error);
              }
            });
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
              return;
            }
            
            // Check if user is premium before loading stats
            const currentIsPremium = platformSubscription?.subscription_type === "premium" || subscription?.subscription_type === "premium";
            if (!currentIsPremium) {
              return; // Don't load stats for free users
            }
            
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

            // Add timeout to each query (3 seconds max per query)
            const queryWithTimeout = (query: Promise<any>, timeoutMs = 3000) => {
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
              ).catch(() => ({ count: 0 })),
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .gte("created_at", startOfToday.toISOString())
              ).catch(() => ({ count: 0 })),
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .gte("created_at", startOfMonth.toISOString())
              ).catch(() => ({ count: 0 })),
              queryWithTimeout(
                supabaseClient
                  .from("widget_api_calls")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", userId)
                  .eq("status", "success")
              ).catch(() => ({ count: 0 })),
            ])
            .then(([totalRes, todayRes, monthRes, successRes]) => {
              if (cancelled) return;
              // Verify user is still authenticated before updating state
              supabaseClient.auth.getSession().then(({ data: { session: verifySession } }) => {
                if (cancelled || !verifySession?.user) return;
                const totalCount = (totalRes?.count as number) || 0;
                const todayCount = (todayRes?.count as number) || 0;
                const monthCount = (monthRes?.count as number) || 0;
                const successCount = (successRes?.count as number) || 0;

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
              // Only log non-network errors
              const errorMessage = error?.message || String(error);
              const isNetworkError = 
                errorMessage.includes("Load failed") ||
                errorMessage.includes("Failed to fetch") ||
                errorMessage.includes("NetworkError") ||
                errorMessage.includes("TypeError") ||
                errorMessage.includes("access control");
              
              if (!isNetworkError) {
                console.error("Error loading API stats:", error);
              }
              // Keep stats at 0 on error
            });
          });
        };

        // Only start loading stats if user is premium
        if (isPremiumUser) {
          loadStatsWhenVisible();
        }
      } catch (error: any) {
        if (cancelled) return;
        console.error("Error loading data:", error);
        clearTimeout(timeoutId);
        setLoading(false);
        // Set default subscription to allow page to render even on error
        setSubscription({ subscription_type: "free", is_active: false, site_limit: 1 });
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
    };
  }, [router, supabaseClient, toast, loadWidgetForEditing, clearEditingContext, handleTabChange, initialSubscription, platformSubscription?.subscription_type, subscription?.subscription_type]);

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

    setSaving(true);
    try {
      const isCreatingNew = mode === "create" || saveAsNew || !currentWidget;
      const widgetId = isCreatingNew ? `widget_${user.id}_${Date.now()}` : currentWidget.widget_id;
      const isFree = subscriptionType === "free";
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
        widgetData.is_default = savedWidgets.length === 0;
        const insertResponse = await withTimeout<any>(
          supabaseClient.from("widget_settings").insert(widgetData).select().single() as Promise<any>
        );

        if (insertResponse.error) throw insertResponse.error;
        const newWidget = insertResponse.data;

        setSavedWidgets((prev) => [newWidget, ...prev]);
        loadWidgetForEditing(newWidget);
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
        const updateResponse = await withTimeout<any>(
          supabaseClient
            .from("widget_settings")
            .update(widgetData)
            .eq("id", currentWidget.id)
            .select()
            .single() as Promise<any>
        );

        if (updateResponse.error) throw updateResponse.error;
        const updatedWidget = updateResponse.data;

        setSavedWidgets((prev) => prev.map((w) => (w.id === currentWidget.id ? updatedWidget : w)));
        loadWidgetForEditing(updatedWidget);
        toast({
          title: t("widgetdashboard.toast.success"),
          description: t("widgetdashboard.toast.updated"),
        });
      }
    } catch (error: any) {
      console.error("Error saving widget:", error);
      if (error?.message?.includes("timed out")) {
        toast({
          title: t("widgetdashboard.toast.saved.delay"),
          description: t("widgetdashboard.toast.saved.delay.description"),
        });
      } else {
        toast({
          title: t("widgetdashboard.toast.error"),
          description: t("widgetdashboard.toast.save.failed"),
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
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

      toast({
        title: t("widgetdashboard.toast.success"),
        description: t("widgetdashboard.toast.deleted"),
      });
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
    try {
      const widgetUrl = `${getUrl("/widget/embed")}?id=${widgetId}`;
      const borderRadiusValue =
        widget?.border_radius ?? (currentWidget ? editForm.borderRadius : createForm.borderRadius);
      return `<iframe src="${widgetUrl}" width="100%" height="600" frameborder="0" style="border-radius: ${borderRadiusValue};"></iframe>`;
    } catch (error) {
      console.error("Error generating embed code:", error);
      // Fallback to a basic embed code
      const widgetUrl = typeof window !== 'undefined' ? `${window.location.origin}/widget/embed?id=${widgetId}` : `/widget/embed?id=${widgetId}`;
      const borderRadiusValue =
        widget?.border_radius ?? (currentWidget ? editForm.borderRadius : createForm.borderRadius);
      return `<iframe src="${widgetUrl}" width="100%" height="600" frameborder="0" style="border-radius: ${borderRadiusValue};"></iframe>`;
    }
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

  const handleAddSite = async () => {
    if (!newSiteUrl || !currentWidget || !user) return;

    try {
      const { data, error } = await supabaseClient
        .from("widget_sites")
        .insert({
          user_id: user.id,
          site_url: newSiteUrl,
          site_name: newSiteName || newSiteUrl,
          widget_id: currentWidget.widget_id,
        })
        .select()
        .single();

      if (error) throw error;

      const nextSites = [...widgetSites, data];
      setWidgetSites(nextSites);
      setNewSiteUrl("");
      setNewSiteName("");
      evaluateSiteLimit(nextSites.length);
      toast({
        title: t("widgetdashboard.toast.success"),
        description: t("widgetdashboard.toast.site.added"),
      });
    } catch (error: any) {
      console.error("Error adding site:", error);
      evaluateSiteLimit(widgetSites.length);
      toast({
        title: t("widgetdashboard.toast.error"),
        description: error?.message || t("widgetdashboard.toast.site.add.failed"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    try {
      const { error } = await supabaseClient.from("widget_sites").delete().eq("id", siteId);
      if (error) throw error;

      const nextSites = widgetSites.filter((site) => site.id !== siteId);
      setWidgetSites(nextSites);
      evaluateSiteLimit(nextSites.length);
      toast({
        title: t("widgetdashboard.toast.success"),
        description: t("widgetdashboard.toast.site.removed"),
      });
    } catch (error: any) {
      console.error("Error deleting site:", error);
      toast({
        title: t("widgetdashboard.toast.error"),
        description: t("widgetdashboard.toast.site.remove.failed"),
        variant: "destructive",
      });
    }
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
            <Button className="flex-1" onClick={() => handleTabChange("create")}>
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
                disabled={saving || !editForm.name.trim()}
              >
                <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.form.saveasnew")}
              </Button>
            )}
            <Button
              onClick={() => handleSaveWidget(isCreateMode ? "create" : "edit")}
              disabled={saving || !form.name.trim()}
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

          <div className="border rounded-lg p-4 bg-muted/50">
            <Label className="mb-2 block">{t("widgetdashboard.form.preview")}</Label>
            <div className="max-w-xs">
              <Card
                style={{
                  borderColor: form.primaryColor,
                  borderRadius: form.borderRadius,
                }}
              >
                <CardContent className="p-4">
                  {form.customText && (
                    <h3 className="text-lg font-semibold mb-2" style={{ color: form.primaryColor }}>
                      {form.customText}
                    </h3>
                  )}
                  <div className="text-center text-sm text-muted-foreground">{t("widgetdashboard.form.preview.text")}</div>
                  {form.brandingVisible && (
                    <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
                      Powered by <span style={{ color: form.primaryColor }}>WhatTheFood</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Check if user is premium - subscription_type === "premium" is the key indicator
  const isPremium = 
    platformSubscription?.subscription_type === "premium" ||
    subscription?.subscription_type === "premium";

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

        {!isPremium ? (
          <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <CardContent className="py-8 px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{t("widgetdashboard.premium.title")}</h2>
                  <p className="text-muted-foreground text-lg mb-4">
                    {t("widgetdashboard.premium.description")}
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{t("widgetdashboard.premium.feature1")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{t("widgetdashboard.premium.feature2")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{t("widgetdashboard.premium.feature3")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{t("widgetdashboard.premium.feature4")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button size="lg" onClick={() => router.push("/plans")} className="text-base px-8 py-6">
                    {t("widgetdashboard.premium.upgrade")} <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
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
            <TabsTrigger value="sites">
              <LinkIcon className="h-4 w-4 mr-2" /> {t("widgetdashboard.tabs.sites")} ({widgetSites.length})
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
                  <Button onClick={() => handleTabChange("create")}>
                    <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.saved.create")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {savedWidgets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">{t("widgetdashboard.saved.none")}</p>
                    <Button onClick={() => handleTabChange("create")}>
                      <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.form.create")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedWidgets.map((widget) => (
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
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteWidget(widget.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {!isCreating && currentWidget && (
              <div className="space-y-4">
                {renderWidgetForm("edit")}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            {renderWidgetForm("create")}
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
                {savedWidgets.map((widget) => {
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
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("widgetdashboard.sites.title")}</CardTitle>
                <CardDescription>{t("widgetdashboard.sites.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  {siteLimitExceeded && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t("widgetdashboard.sites.limit")}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("widgetdashboard.sites.url.placeholder")}
                      value={newSiteUrl}
                      onChange={(event) => setNewSiteUrl(event.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder={t("widgetdashboard.sites.name.placeholder")}
                      value={newSiteName}
                      onChange={(event) => setNewSiteName(event.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddSite} disabled={!currentWidget || siteLimitExceeded}>
                      <Plus className="h-4 w-4 mr-2" /> {t("widgetdashboard.sites.add")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {widgetSites.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("widgetdashboard.sites.none")}
                    </p>
                  ) : (
                    widgetSites.map((site) => (
                      <div key={site.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{site.site_name || site.site_url}</p>
                          <p className="text-sm text-muted-foreground">{site.site_url}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSite(site.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
        )}
      </div>
    </main>
  );
}
