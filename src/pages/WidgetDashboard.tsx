import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings,
  Code,
  Link as LinkIcon,
  Copy,
  Check,
  Palette,
  Eye,
  Trash2,
  Plus,
  BarChart3,
  Zap,
  Edit,
  Save,
  Bookmark,
  AlertTriangle,
} from "lucide-react";
import { getUrl } from "@/utils/url";

const WidgetDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [savedWidgets, setSavedWidgets] = useState<any[]>([]);
  const [widgetSites, setWidgetSites] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>({ total: 0, today: 0, thisMonth: 0, successful: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Current widget being edited/viewed
  const [currentWidget, setCurrentWidget] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("saved-widgets");

  // Widget customization state
  const [widgetName, setWidgetName] = useState("");
  const [widgetDescription, setWidgetDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [borderRadius, setBorderRadius] = useState("8px");
  const [customText, setCustomText] = useState("");
  const [brandingVisible, setBrandingVisible] = useState(true);
  
  // Track original branding state (to prevent changing from hidden to visible)
  const [originalBrandingVisible, setOriginalBrandingVisible] = useState(true);

  // Site management state
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [siteLimitExceeded, setSiteLimitExceeded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }

        setUser(session.user);

        // Load subscription and widgets in parallel - critical data first
        const [subRes, widgetsRes] = await Promise.all([
          supabase
            .from("widget_subscriptions")
            .select("id, subscription_type, site_limit, is_active")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("widget_settings")
            .select("id, widget_id, widget_name, widget_description, primary_color, border_radius, is_default, created_at")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50), // Limit to prevent loading too many widgets
        ]);

        const sub = subRes.data;
        const widgets = widgetsRes.data;

        // Check if subscription exists
        if (!sub) {
          navigate("/widget/plans");
          return;
        }

        setSubscription(sub);

        // Set loading to false early so UI can render
        setLoading(false);

        // Load widgets and setup default widget (non-blocking)
        if (widgets && widgets.length > 0) {
          setSavedWidgets(widgets);
          // Load first widget as default (don't await - load sites in background)
          const defaultWidget = widgets.find((w) => w.is_default) || widgets[0];
          loadWidgetForEditing(defaultWidget);
        } else {
          // No widgets exist, start with a new widget
          setIsCreating(true);
        }

        // Load API stats in background (non-blocking) - don't wait for this
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        // Load stats in parallel but don't block UI
        Promise.all([
          supabase
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id),
          supabase
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .gte("created_at", startOfToday.toISOString()),
          supabase
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .gte("created_at", startOfMonth.toISOString()),
          supabase
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("status", "success"),
        ]).then(([totalRes, todayRes, monthRes, successRes]) => {
          setApiStats({
            total: (totalRes.count as number) || 0,
            today: (todayRes.count as number) || 0,
            thisMonth: (monthRes.count as number) || 0,
            successful: (successRes.count as number) || 0,
          });
          setStatsLoading(false);
        }).catch((error) => {
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

    loadData();
  }, [navigate, toast]);

  const loadWidgetForEditing = async (widget: any) => {
    // Set widget data immediately (don't wait for sites)
    setCurrentWidget(widget);
    setIsCreating(false);
    setWidgetName(widget.widget_name || "");
    setWidgetDescription(widget.widget_description || "");
    setPrimaryColor(widget.primary_color || "#10b981");
    setBorderRadius(widget.border_radius || "8px");
    setCustomText(widget.custom_text || "");
    
    // If user is on free plan, force branding to visible
    const isFree = subscription?.subscription_type === "free";
    const widgetBrandingVisible = widget.branding_visible !== false;
    setBrandingVisible(isFree ? true : widgetBrandingVisible);
    setOriginalBrandingVisible(widget.branding_visible !== false);
    
    // Switch to settings tab when editing
    setActiveTab("settings");
    
    // Load sites for this specific widget in background (non-blocking)
    // Only load if we're on the sites tab or if needed
    const currentUser = user || (await supabase.auth.getSession()).data.session?.user;
    if (widget.widget_id && currentUser) {
      // Load sites asynchronously - don't block UI
      supabase
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
  };

  const resetForm = () => {
    setCurrentWidget(null);
    setIsCreating(true);
    setWidgetName("");
    setWidgetDescription("");
    setPrimaryColor("#10b981");
    setBorderRadius("8px");
    setCustomText("");
    setBrandingVisible(true);
    setOriginalBrandingVisible(true);
    evaluateSiteLimit(0);
    // Switch to settings tab when creating
    setActiveTab("settings");
  };

  const handleSaveWidget = async (saveAsNew: boolean = false) => {
    if (!user) return;

    if (!widgetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a widget name.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const widgetId = saveAsNew || !currentWidget
        ? `widget_${user.id}_${Date.now()}`
        : currentWidget.widget_id;

      // If user is on free plan, force branding to visible
      const isFree = subscription?.subscription_type === "free";
      const finalBrandingVisible = isFree ? true : brandingVisible;

      const widgetData: any = {
        user_id: user.id,
        widget_id: widgetId,
        widget_name: widgetName,
        widget_description: widgetDescription || null,
        primary_color: primaryColor,
        border_radius: borderRadius,
        custom_text: customText || null,
        branding_visible: finalBrandingVisible,
      };

      if (saveAsNew || !currentWidget) {
        // Create new widget
        // If this is the first widget, make it default
        if (savedWidgets.length === 0) {
          widgetData.is_default = true;
        } else {
          widgetData.is_default = false;
        }

        const { data: newWidget, error } = await supabase
          .from("widget_settings")
          .insert(widgetData)
          .select()
          .single();

        if (error) throw error;

        setSavedWidgets([newWidget, ...savedWidgets]);
        loadWidgetForEditing(newWidget);
        toast({
          title: "Success!",
          description: "Widget saved successfully.",
        });
      } else {
        // Update existing widget
        const { data: updatedWidget, error } = await supabase
          .from("widget_settings")
          .update(widgetData)
          .eq("id", currentWidget.id)
          .select()
          .single();

        if (error) throw error;

        setSavedWidgets(
          savedWidgets.map((w) => (w.id === currentWidget.id ? updatedWidget : w))
        );
        loadWidgetForEditing(updatedWidget);
        toast({
          title: "Success!",
          description: "Widget updated successfully.",
        });
      }
    } catch (error: any) {
      console.error("Error saving widget:", error);
      toast({
        title: "Error",
        description: "Failed to save widget.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm("Are you sure you want to delete this widget?")) return;

    try {
      const { error } = await supabase
        .from("widget_settings")
        .delete()
        .eq("id", widgetId);

      if (error) throw error;

      setSavedWidgets(savedWidgets.filter((w) => w.id !== widgetId));
      
      if (currentWidget?.id === widgetId) {
        // If deleted widget was the current one, load another or reset
        if (savedWidgets.length > 1) {
          const remainingWidget = savedWidgets.find((w) => w.id !== widgetId);
          if (remainingWidget) {
            loadWidgetForEditing(remainingWidget);
          } else {
            resetForm();
          }
        } else {
          resetForm();
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
    const borderRadiusValue = widget?.border_radius || borderRadius;
    return `<iframe src="${widgetUrl}" width="100%" height="600" frameborder="0" style="border-radius: ${borderRadiusValue};"></iframe>`;
  };

  const copyEmbedCode = (widget?: any) => {
    navigator.clipboard.writeText(getEmbedCode(widget));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard.",
    });
  };

  const handleAddSite = async () => {
    if (!newSiteUrl || !currentWidget) return;

    try {
      const { data, error } = await supabase
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

      setWidgetSites([...widgetSites, data]);
      setNewSiteUrl("");
      setNewSiteName("");
      evaluateSiteLimit(widgetSites.length + 1);
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

  const evaluateSiteLimit = (currentSiteCount: number) => {
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
  };

  useEffect(() => {
    evaluateSiteLimit(widgetSites.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription, widgetSites.length]);

  const handleDeleteSite = async (siteId: string) => {
    try {
      const { error } = await supabase.from("widget_sites").delete().eq("id", siteId);

      if (error) throw error;

      setWidgetSites(widgetSites.filter((s) => s.id !== siteId));
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

  // All hooks must be called before any conditional returns
  const isFreePlan = subscription?.subscription_type === "free";
  const canRemoveBranding =
    subscription?.subscription_type !== "free" &&
    subscription?.subscription_type !== undefined;

  // Branding logic:
  // - If user is on free plan: branding must always be visible (forced), toggle disabled
  // - If user has premium plan:
  //   - During creation: branding can always be toggled freely
  //   - During editing: branding can be toggled freely (show or hide)
  // If on free plan, force branding to visible
  useEffect(() => {
    if (isFreePlan && !brandingVisible) {
      setBrandingVisible(true);
    }
  }, [isFreePlan, brandingVisible]);
  
  // Can toggle branding if user has premium plan (and not on free plan)
  const canToggleBranding = canRemoveBranding && !isFreePlan;

  // Show minimal loading state - render UI as soon as subscription and widgets are loaded
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <TopBar />
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Widget Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your widget customization, sites, and track usage
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <span className="inline-block h-7 w-12 bg-muted animate-pulse rounded"></span>
                  ) : (
                    apiStats?.total || 0
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <span className="inline-block h-7 w-12 bg-muted animate-pulse rounded"></span>
                  ) : (
                    apiStats?.today || 0
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <span className="inline-block h-7 w-12 bg-muted animate-pulse rounded"></span>
                  ) : (
                    apiStats?.thisMonth || 0
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Saved Widgets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{savedWidgets.length}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="saved-widgets">
                <Bookmark className="h-4 w-4 mr-2" />
                Saved Widgets ({savedWidgets.length})
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                {isCreating ? "Create Widget" : "Edit Widget"}
              </TabsTrigger>
              <TabsTrigger value="embed">
                <Code className="h-4 w-4 mr-2" />
                Embed Code
              </TabsTrigger>
              <TabsTrigger value="sites">
                <LinkIcon className="h-4 w-4 mr-2" />
                Sites ({widgetSites.length})
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved-widgets" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Saved Widgets</CardTitle>
                      <CardDescription>
                        Manage all your saved widget configurations
                      </CardDescription>
                    </div>
                    <Button onClick={resetForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Widget
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {savedWidgets.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">
                        No saved widgets yet. Create your first widget!
                      </p>
                      <Button onClick={resetForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Widget
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savedWidgets.map((widget) => (
                        <Card
                          key={widget.id}
                          className={`${
                            currentWidget?.id === widget.id ? "border-primary" : ""
                          }`}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg">{widget.widget_name}</CardTitle>
                            {widget.widget_description && (
                              <CardDescription>{widget.widget_description}</CardDescription>
                            )}
                            {widget.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: widget.primary_color }}
                              />
                              <span>{widget.primary_color}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => loadWidgetForEditing(widget)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyEmbedCode(widget)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteWidget(widget.id)}
                              >
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
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isCreating ? "Create New Widget" : "Edit Widget"}
                  </CardTitle>
                  <CardDescription>
                    Customize the appearance of your widget to match your brand
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="widget-name">Widget Name *</Label>
                    <Input
                      id="widget-name"
                      value={widgetName}
                      onChange={(e) => setWidgetName(e.target.value)}
                      placeholder="My Custom Widget"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widget-description">Description (Optional)</Label>
                    <Textarea
                      id="widget-description"
                      value={widgetDescription}
                      onChange={(e) => setWidgetDescription(e.target.value)}
                      placeholder="Describe your widget..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1"
                        placeholder="#10b981"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="border-radius">Border Radius</Label>
                    <Input
                      id="border-radius"
                      type="text"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(e.target.value)}
                      placeholder="8px"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-text">Custom Text (Optional)</Label>
                    <Input
                      id="custom-text"
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Enter custom heading text"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="branding">Show Branding</Label>
                      <p className="text-sm text-muted-foreground">
                        Display "Powered by WhatTheFood" footer
                        {isFreePlan && " (Upgrade to hide branding)"}
                        {!isFreePlan && !canRemoveBranding && " (Upgrade to remove)"}
                      </p>
                    </div>
                    <Button
                      variant={brandingVisible ? "default" : "outline"}
                      onClick={() => {
                        // If user has premium plan, allow free toggling (both during creation and editing)
                        if (canToggleBranding) {
                          setBrandingVisible(!brandingVisible);
                        }
                      }}
                      disabled={
                        // Disable if user is on free plan (branding must always be visible)
                        isFreePlan || !canToggleBranding
                      }
                    >
                      {brandingVisible ? "Visible" : "Hidden"}
                    </Button>
                  </div>

                  <div className="flex justify-end gap-2">
                    {!isCreating && (
                      <Button
                        variant="outline"
                        onClick={() => handleSaveWidget(true)}
                        disabled={saving || !widgetName.trim()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Save as New
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSaveWidget(false)}
                      disabled={saving || !widgetName.trim()}
                    >
                      {saving ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isCreating ? "Create Widget" : "Save Changes"}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Preview */}
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <Label className="mb-2 block">Preview</Label>
                    <div className="max-w-xs">
                      <Card
                        style={{
                          borderColor: primaryColor,
                          borderRadius: borderRadius,
                        }}
                      >
                        <CardContent className="p-4">
                          {customText && (
                            <h3 className="text-lg font-semibold mb-2" style={{ color: primaryColor }}>
                              {customText}
                            </h3>
                          )}
                          <div className="text-center text-sm text-muted-foreground">
                            Widget Preview
                          </div>
                          {brandingVisible && (
                            <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
                              Powered by{" "}
                              <span style={{ color: primaryColor }}>WhatTheFood</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Embed Code</CardTitle>
                  <CardDescription>
                    Copy this code and paste it into your website HTML
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentWidget ? (
                    <>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{getEmbedCode()}</code>
                        </pre>
                        <Button
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyEmbedCode()}
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">To use the widget:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Copy the embed code above</li>
                          <li>Paste it into your website HTML where you want the widget to appear</li>
                          <li>The widget will automatically load and display your customized settings</li>
                        </ol>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Please create or select a widget to view embed code.
                      </p>
                      <Button onClick={resetForm} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Widget
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sites" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Sites</CardTitle>
                  <CardDescription>
                    Add and manage websites where your widget is embedded
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    {siteLimitExceeded && (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          Site limit reached for your current plan. Upgrade to add more sites.
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2">
                    <Input
                      placeholder="Site URL (e.g., https://example.com)"
                      value={newSiteUrl}
                      onChange={(e) => setNewSiteUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Site Name (optional)"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="flex-1"
                    />
                      <Button onClick={handleAddSite} disabled={!currentWidget || siteLimitExceeded}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Site
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
                        <div
                          key={site.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{site.site_name || site.site_url}</p>
                            <p className="text-sm text-muted-foreground">{site.site_url}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSite(site.id)}
                          >
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
                  <CardDescription>
                    Track your widget's API usage and performance
                  </CardDescription>
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
      <Footer />
    </div>
  );
};

export default WidgetDashboard;
