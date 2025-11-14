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
import { Code, Link as LinkIcon, Copy, Check, Trash2, Plus, BarChart3, Zap, Edit, Save, Bookmark, AlertTriangle } from "lucide-react";
import { getUrl } from "@/utils/url";

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

export function WidgetDashboardClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [savedWidgets, setSavedWidgets] = useState<any[]>([]);
  const [widgetSites, setWidgetSites] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>({ total: 0, today: 0, thisMonth: 0, successful: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
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

      const {
        data: { user: authenticatedUser },
      } = await supabaseClient.auth.getUser();
      const currentUser = user || authenticatedUser;
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
    const loadData = async () => {
      try {
        const {
          data: { user: authenticatedUser },
        } = await supabaseClient.auth.getUser();
        if (!authenticatedUser) {
          router.push("/auth");
          return;
        }

        setUser(authenticatedUser);

        const [subRes, widgetsRes] = await Promise.all([
          supabaseClient
            .from("widget_subscriptions")
            .select("id, subscription_type, site_limit, is_active")
            .eq("user_id", authenticatedUser.id)
            .maybeSingle(),
          supabaseClient
            .from("widget_settings")
            .select(
              "id, widget_id, widget_name, widget_description, primary_color, border_radius, is_default, created_at, custom_text, branding_visible"
            )
            .eq("user_id", authenticatedUser.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        if (subRes.error) {
          throw subRes.error;
        }

        if (widgetsRes.error) {
          throw widgetsRes.error;
        }

        const sub = subRes.data;
        const widgets = widgetsRes.data;

        if (!sub) {
          router.push("/widget/plans");
          return;
        }

        setSubscription(sub);
        setLoading(false);

        if ((widgets as any[]) && (widgets as any[]).length > 0) {
          const widgetList = widgets as Array<{ is_default?: boolean }>;
          setSavedWidgets(widgetList);
          const defaultWidget = widgetList.find((w) => w.is_default) || widgetList[0];

          if (!currentWidgetRef.current) {
            await loadWidgetForEditing(defaultWidget);
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

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        Promise.all([
          supabaseClient
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authenticatedUser.id),
          supabaseClient
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authenticatedUser.id)
            .gte("created_at", startOfToday.toISOString()),
          supabaseClient
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authenticatedUser.id)
            .gte("created_at", startOfMonth.toISOString()),
          supabaseClient
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", authenticatedUser.id)
            .eq("status", "success"),
        ])
          .then(([totalRes, todayRes, monthRes, successRes]) => {
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
            setStatsLoading(false);
          })
          .catch((error) => {
            console.error("Error loading API stats:", error);
            setStatsLoading(false);
          });
      } catch (error: any) {
        console.error("Error loading data:", error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load dashboard data.",
          variant: "destructive",
        });
      }
    };

    void loadData();
  }, [router, supabaseClient, toast, loadWidgetForEditing, clearEditingContext, handleTabChange]);

  const handleSaveWidget = async (mode: "create" | "edit", saveAsNew: boolean = false) => {
    if (!user) return;

    const formState = mode === "create" ? createForm : editForm;

    if (!formState.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a widget name.",
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
          title: "Success!",
          description: "Widget saved successfully.",
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
          title: "Success!",
          description: "Widget updated successfully.",
        });
      }
    } catch (error: any) {
      console.error("Error saving widget:", error);
      if (error?.message?.includes("timed out")) {
        toast({
          title: "Saved after delay",
          description: "The widget was created, but Supabase responded slowly. Refresh if it doesn’t appear.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save widget.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm("Are you sure you want to delete this widget?")) return;

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
        title: "Success!",
        description: "Widget deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting widget:", error);
      toast({
        title: "Error",
        description: "Failed to delete widget.",
        variant: "destructive",
      });
    }
  };

  const getEmbedCode = (widget?: any) => {
    const widgetId = widget?.widget_id || currentWidget?.widget_id;
    if (!widgetId) return "";
    const widgetUrl = `${getUrl("/widget/embed")}?id=${widgetId}`;
    const borderRadiusValue =
      widget?.border_radius ?? (currentWidget ? editForm.borderRadius : createForm.borderRadius);
    return `<iframe src="${widgetUrl}" width="100%" height="600" frameborder="0" style="border-radius: ${borderRadiusValue};"></iframe>`;
  };

  const copyEmbedCode = (widget?: any) => {
    const code = getEmbedCode(widget);
    if (!code) return;
    navigator.clipboard.writeText(code);
    const widgetId = widget?.id || currentWidget?.id || null;
    setCopiedWidgetId(widgetId);
    setTimeout(() => setCopiedWidgetId(null), 2000);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard.",
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
        title: "Success!",
        description: "Site added successfully.",
      });
    } catch (error: any) {
      console.error("Error adding site:", error);
      evaluateSiteLimit(widgetSites.length);
      toast({
        title: "Error",
        description: error?.message || "Failed to add site.",
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
        title: "Success!",
        description: "Site removed successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting site:", error);
      toast({
        title: "Error",
        description: "Failed to remove site.",
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
            <CardTitle>Select a widget to edit</CardTitle>
            <CardDescription>
              Choose a widget from the saved list or create a new widget to start editing its appearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button variant="outline" className="flex-1" onClick={() => handleTabChange("saved-widgets")}>
              View Saved Widgets
            </Button>
            <Button className="flex-1" onClick={() => handleTabChange("create")}>
              <Plus className="h-4 w-4 mr-2" /> Create Widget
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{isCreateMode ? "Create New Widget" : "Edit Widget"}</CardTitle>
          <CardDescription>Customize the appearance of your widget to match your brand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor={`widget-name-${mode}`}>Widget Name *</Label>
            <Input
              id={`widget-name-${mode}`}
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="My Custom Widget"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`widget-description-${mode}`}>Description (Optional)</Label>
            <Textarea
              id={`widget-description-${mode}`}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              placeholder="Describe your widget..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`primary-color-${mode}`}>Primary Color</Label>
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
                placeholder="#10b981"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`border-radius-${mode}`}>Border Radius</Label>
            <Input
              id={`border-radius-${mode}`}
              type="text"
              value={form.borderRadius}
              onChange={(event) => updateForm("borderRadius", event.target.value)}
              placeholder="8px"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`custom-text-${mode}`}>Custom Text (Optional)</Label>
            <Input
              id={`custom-text-${mode}`}
              type="text"
              value={form.customText}
              onChange={(event) => updateForm("customText", event.target.value)}
              placeholder="Enter custom heading text"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={`branding-${mode}`}>Show Branding</Label>
              <p className="text-sm text-muted-foreground">
                Display &quot;Powered by WhatTheFood&quot; footer
                {isFreePlan && " (Upgrade to hide branding)"}
                {!isFreePlan && !canRemoveBranding && " (Upgrade to remove)"}
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
              {form.brandingVisible ? "Visible" : "Hidden"}
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            {mode === "edit" && currentWidget && (
              <Button
                variant="outline"
                onClick={() => handleSaveWidget("edit", true)}
                disabled={saving || !editForm.name.trim()}
              >
                <Plus className="h-4 w-4 mr-2" /> Save as New
              </Button>
            )}
            <Button
              onClick={() => handleSaveWidget(isCreateMode ? "create" : "edit")}
              disabled={saving || !form.name.trim()}
            >
              {saving ? (
                isCreateMode ? "Creating..." : "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> {isCreateMode ? "Create Widget" : "Save Changes"}
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg p-4 bg-muted/50">
            <Label className="mb-2 block">Preview</Label>
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
                  <div className="text-center text-sm text-muted-foreground">Widget Preview</div>
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
          <p className="text-muted-foreground animate-pulse">Loading widget dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Widget Dashboard</h1>
          <p className="text-muted-foreground">Manage your widget customization, sites, and track usage</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total API Calls", value: apiStats?.total || 0 },
            { label: "Today", value: apiStats?.today || 0 },
            { label: "This Month", value: apiStats?.thisMonth || 0 },
            { label: "Saved Widgets", value: savedWidgets.length },
          ].map((stat, index) => (
            <Card key={stat.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {index < 3 && statsLoading ? (
                    <span className="inline-block h-7 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="saved-widgets">
              <Bookmark className="h-4 w-4 mr-2" /> Saved Widgets ({savedWidgets.length})
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="h-4 w-4 mr-2" /> Create Widget
            </TabsTrigger>
            <TabsTrigger value="embed">
              <Code className="h-4 w-4 mr-2" /> Embed Code
            </TabsTrigger>
            <TabsTrigger value="sites">
              <LinkIcon className="h-4 w-4 mr-2" /> Sites ({widgetSites.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved-widgets" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Saved Widgets</CardTitle>
                    <CardDescription>Manage all your saved widget configurations</CardDescription>
                  </div>
                  <Button onClick={() => handleTabChange("create")}>
                    <Plus className="h-4 w-4 mr-2" /> Create New Widget
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {savedWidgets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No saved widgets yet. Create your first widget!</p>
                    <Button onClick={() => handleTabChange("create")}>
                      <Plus className="h-4 w-4 mr-2" /> Create Widget
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
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Default</span>
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
                              <Edit className="h-4 w-4 mr-2" /> Edit
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
                  <CardTitle>Embed Code</CardTitle>
                  <CardDescription>Copy the embed code for each widget once you have created one.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No widgets available. Create a widget to get an embed URL.</p>
                  <Button onClick={() => handleTabChange("create")}>
                    <Plus className="h-4 w-4 mr-2" /> Create Widget
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
                          Copy this embed code and paste it into your site to render the widget configuration above.
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
                                <Check className="h-4 w-4 mr-2" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" /> Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-2">Steps to embed:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Copy the code snippet above.</li>
                            <li>Paste it into your website HTML where you want the widget to appear.</li>
                            <li>The widget will load with your saved styling automatically.</li>
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
                <CardTitle>Manage Sites</CardTitle>
                <CardDescription>Add and manage websites where your widget is embedded</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3">
                  {siteLimitExceeded && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Site limit reached for your current plan. Upgrade to add more sites.</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Site URL (e.g., https://example.com)"
                      value={newSiteUrl}
                      onChange={(event) => setNewSiteUrl(event.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Site Name (optional)"
                      value={newSiteName}
                      onChange={(event) => setNewSiteName(event.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddSite} disabled={!currentWidget || siteLimitExceeded}>
                      <Plus className="h-4 w-4 mr-2" /> Add Site
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {widgetSites.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sites added yet. Add your first site above.
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
                <CardTitle>API Usage Analytics</CardTitle>
                <CardDescription>Track your widget&apos;s API usage and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">{apiStats?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">{apiStats?.today || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">{apiStats?.thisMonth || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Successful</p>
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
