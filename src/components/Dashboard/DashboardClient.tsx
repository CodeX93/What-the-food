'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getRemainingFreeScans, hasFreeScanAvailable, decrementFreeScan } from "@/utils/freeScanLimit";
import {
  Camera,
  TrendingUp,
  Clock,
  Sparkles,
  Loader2,
  Stars,
  ShieldCheck,
  ArrowRight,
  Upload,
  UtensilsCrossed,
  Plus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { getPlatformSubscription } from "@/utils/subscription";
import { analyzeFood, fetchRecentScans, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import { useAuth } from "@/contexts/AuthContext";
import { queryWithRetry } from "@/utils/supabaseQuery";
import type { User } from "@supabase/supabase-js";

export type DashboardClientProps = {
  initialUser?: User | null;
  initialSubscription?: any;
  initialScans?: any[];
  initialFullName?: string | null;
};

export function DashboardClient({
  initialUser = null,
  initialSubscription = null,
  initialScans = [],
  initialFullName = null,
}: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const { user: authUser, loading: authLoading, refreshSession } = useAuth();
  // Use auth context user, fallback to initialUser
  const user = authUser || initialUser;
  const [subscription, setSubscription] = useState<any>(initialSubscription);
  // OPTIMIZATION: Start with loading=false if we have initialUser
  // Only show loading if we truly have no user data
  const [loading, setLoading] = useState(!initialUser && authLoading);
  const [analyzing, setAnalyzing] = useState(false);
  const [servings, setServings] = useState(1);
  const [recentScans, setRecentScans] = useState<any[]>(initialScans);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [freeScanRemaining, setFreeScanRemaining] = useState<number | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(initialFullName);
  const [manualFoods, setManualFoods] = useState<Array<{ id: string; value: string }>>([
    { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" },
  ]);
  const [manualLoading, setManualLoading] = useState(false);
  // Default iframe height; tinyAds will dynamically resize this up/down based on content
  const [iframeHeight, setIframeHeight] = useState(900);
  const isPremium = subscription?.subscription_type === "premium";

  const manualPlaceholders = ["2 boiled eggs", "Greek yogurt (1 cup)", "1 banana", "Protein shake with almond milk"];
  const quickAddOptions = ["Handful of almonds", "Oatmeal packet", "Apple", "Dark chocolate square"];

  const addManualFoodField = () => {
    setManualFoods((prev) => [...prev, { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${prev.length}`, value: "" }]);
  };

  const updateManualFood = (id: string, value: string) => {
    setManualFoods((prev) => prev.map((food) => (food.id === id ? { ...food, value } : food)));
  };

  const removeManualFood = (id: string) => {
    setManualFoods((prev) => (prev.length > 1 ? prev.filter((food) => food.id !== id) : prev));
  };

  const quickAddFood = (text: string) => {
    setManualFoods((prev) => {
      const copy = [...prev];
      const emptyIndex = copy.findIndex((food) => !food.value.trim());
      if (emptyIndex !== -1) {
        copy[emptyIndex] = { ...copy[emptyIndex], value: text };
      } else {
        copy.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${copy.length}`, value: text });
      }
      return copy;
    });
  };

  const handleManualEntry = async () => {
    const foods = manualFoods.map((item) => item.value.trim()).filter(Boolean);

    if (!foods.length) {
      toast({
        title: t("dashboard.manual.error.title"),
        description: t("dashboard.manual.error.description"),
        variant: "destructive",
      });
      return;
    }

    try {
      setManualLoading(true);
      const { data: manualData, error } = await supabase.functions.invoke("manual-food", {
        body: { foods },
      });
      if (error) throw error;
      if (!manualData?.ok) {
        throw new Error(manualData?.error || "Unable to estimate nutrition for these foods");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const totals = manualData.totals || {};
      const dishName = `Manual Input: ${foods.join(", ")}`.slice(0, 200);
      const manualResult = {
        dish: dishName,
        description: "Manually logged foods",
        tags: ["manual"],
        servingSize: "1 serving",
        servingWeightGrams: undefined,
        servingGuidance: "Manually added to analytics",
        nutrients: {
          calories: totals.calories ?? null,
          protein_g: totals.protein_g ?? null,
          carbohydrates_g: totals.carbohydrates_g ?? null,
          fat_g: totals.fat_g ?? null,
        },
        ingredients: manualData.items?.map((item: any) => `${item.name}`) ?? foods,
        instructions: [],
        additionalInfo: "Logged manually by the user for quick tracking.",
        youtubeVideoUrl: "",
        manualItems: manualData.items || [],
        isManualEntry: true,
      };

      const scanId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { error: insertError } = await (supabase as any).from("food_scans").insert({
        id: scanId,
        user_id: session.user.id,
        image_path: `manual-entry-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)}`,
        image_url: null,
        serving: 1,
        result_json: manualResult,
        language: 'en', // All new scans are generated in English
      });
      if (insertError) throw insertError;

      // Generate additionalInfo and insights using Gemini
      try {
        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke("analyze-food", {
          body: {
            manualEntry: {
              dish: dishName.replace(/^Manual Input:\s*/, ""),
              ingredients: manualData.items?.map((item: any) => `${item.name}`) ?? foods,
            },
          },
        });
        
        if (!analyzeError && analyzeData?.ok && analyzeData?.analysis) {
          // Update the scan with generated additionalInfo and insights
          const updatedResult = {
            ...manualResult,
            additionalInfo: analyzeData.analysis.additionalInfo || manualResult.additionalInfo,
            insights: analyzeData.insights || undefined,
          };
          
          await (supabase as any)
            .from("food_scans")
            .update({ result_json: updatedResult })
            .eq("id", scanId);
        }
      } catch (genError) {
        // Don't fail the whole operation if generation fails
        console.error("Failed to generate additionalInfo/insights:", genError);
      }

      setManualFoods([{ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" }]);

      toast({
        title: t("dashboard.manual.success.title"),
        description: t("dashboard.manual.success.description"),
      });

      // Reload recent scans
      const scans = await fetchRecentScans(session.user.id, 6);
      setRecentScans(scans);
    } catch (error: any) {
      console.error("Manual entry error:", error);
      toast({
        title: t("dashboard.manual.error.log"),
        description: error?.message || t("dashboard.manual.error.estimate"),
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  // Track if we've loaded data to prevent duplicate fetches
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate loads
    if (hasLoadedRef.current) return;

    // Use user from auth context, fallback to initialUser
    const currentUser = authUser || initialUser;

    // OPTIMIZATION: Start rendering immediately with initial data
    // Don't wait for auth if we have initialUser
    if (!currentUser) {
      // Only redirect if auth has finished loading and there's still no user
      if (!authLoading) {
        router.push("/auth");
      }
      return;
    }

    // Mark as loaded immediately to prevent duplicate fetches
    hasLoadedRef.current = true;

    // OPTIMIZATION: Set loading=false immediately if we have initial data
    // Let the page render with what we have, fetch missing data in background
    if (initialSubscription && initialScans.length > 0 && initialFullName) {
      setLoading(false);
    }

    // Fetch all data in parallel in the background (non-blocking)
    const fetchMissingData = async () => {
      const promises: Promise<any>[] = [];

      // Fetch user profile to get full_name (if not already provided from server)
      if (!initialFullName && currentUser) {
        promises.push(
          (supabase as any)
            .from("profiles")
            .select("full_name")
            .eq("id", currentUser.id)
            .maybeSingle()
            .then(({ data: profileData, error: profileError }: any) => {
              if (!profileError && profileData) {
                const fullName = profileData.full_name?.trim();
                if (fullName && fullName.length > 0) {
                  setUserFullName(fullName);
                }
              }
            })
            .catch((error: any) => {
              console.error("Failed to load user profile", error);
            })
        );
      }

      // Fetch subscription if not provided
      if (!initialSubscription) {
        promises.push(
          getPlatformSubscription(currentUser.id)
            .then((sub) => {
              setSubscription(sub);
            })
            .catch((error) => {
              console.error("Failed to load subscription", error);
            })
        );
      }

      // Fetch scans if not provided
      if (initialScans.length === 0) {
        promises.push(
          fetchRecentScans(currentUser.id, 6)
            .then((scans) => {
              setRecentScans(scans);
            })
            .catch((error) => {
              console.error("Failed to load recent scans", error);
            })
        );
      }

      // Fetch free scan balance
      promises.push(
        getRemainingFreeScans(true)
          .then((remaining) => {
            setFreeScanRemaining(remaining);
          })
          .catch((error) => {
            console.error("Failed to load free scan balance", error);
          })
      );

      // Wait for all promises to complete, then set loading to false
      try {
        await Promise.all(promises);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: t("dashboard.error.title"),
          description: t("dashboard.error.description"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Start fetching in background - don't await
    fetchMissingData();

  }, [authUser, authLoading, initialUser]); // CRITICAL: Minimal dependencies

  // Handle iframe resizing for tinyAds widget - dynamic height based on content
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set an initial height large enough for multiple cards; real height is driven dynamically when possible
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const updateIframeHeight = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // Extra small screens - add a bit more room (approx. one extra row)
        setIframeHeight(1150);
      } else if (width < 768) {
        // Small screens (mobile)
        setIframeHeight(1050);
      } else {
        // Desktop
        setIframeHeight(900);
      }
    };
    
    updateIframeHeight();
    window.addEventListener("resize", updateIframeHeight);
    
    return () => {
      window.removeEventListener("resize", updateIframeHeight);
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Listen for messages from tinyAds iframe (if they support it)
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from tinyAds domain (with or without trailing slash)
      const allowedOrigins = ['https://app.tinyadz.com', 'https://app.tinyadz.com/', 'https://tinyadz.com', 'https://tinyadz.com/'];
      if (!allowedOrigins.includes(event.origin)) return;
      
      if (event.data && typeof event.data === 'object') {
        // Handle resize messages from tinyAds
        if (event.data.type === 'resize' && event.data.height) {
          const newHeight = Math.max(event.data.height, 400);
          iframe.style.height = `${newHeight}px`;
          setIframeHeight(newHeight);
        }
        // Handle height updates in various formats
        if (event.data.height && typeof event.data.height === 'number') {
          const newHeight = Math.max(event.data.height, 400);
          iframe.style.height = `${newHeight}px`;
          setIframeHeight(newHeight);
        }
        // Handle iframe-resize events
        if (event.data.type === 'iframe-resize' && event.data.height) {
          const newHeight = Math.max(event.data.height, 400);
          iframe.style.height = `${newHeight}px`;
          setIframeHeight(newHeight);
        }
        // Handle any message with a height property
        // TinyAds may send different shapes of messages; normalize to a safe height
        if (event.data.height) {
          const requestedHeight = Number(event.data.height) || 400;
          const newHeight = Math.max(requestedHeight, 400);
          iframe.style.height = `${newHeight}px`;
          setIframeHeight(newHeight);
        }
      }
      
      // Also check for string messages
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.height || data.type === "resize") {
            const requestedHeight = Number(data.height) || 400;
            const newHeight = Math.max(requestedHeight, 400);
            iframe.style.height = `${newHeight}px`;
            setIframeHeight(newHeight);
          }
        } catch (e) {
          // Not JSON, ignore
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
    }

    // Function to check and update iframe height
    const checkHeight = () => {
      try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDocument) {
          const requestedHeight = Math.max(
            iframeDocument.body?.scrollHeight || 0,
            iframeDocument.body?.offsetHeight || 0,
            iframeDocument.documentElement?.scrollHeight || 0,
            iframeDocument.documentElement?.offsetHeight || 0,
            iframeDocument.documentElement?.clientHeight || 0
          );
          if (requestedHeight > 0) {
            // Ensure at least a minimal height so the widget isn't cut off
            const height = Math.max(requestedHeight, 400);
            const currentHeight = parseInt(iframe.style.height || '0');
            // Update if height changed significantly (more than 10px difference)
            if (Math.abs(height - currentHeight) > 10) {
              iframe.style.height = `${height}px`;
              setIframeHeight(height);
            }
          }
        }
      } catch (e) {
        // Cross-origin restrictions - this is expected, use postMessage instead
        // Try to request height from iframe via postMessage
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
        }
      }
    };

    // Handle window resize and zoom changes
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      // Re-check height when viewport changes (zoom, resize, etc.)
      setTimeout(() => {
        checkHeight();
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
        }
      }, 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    // Check height after iframe loads
    const handleLoad = () => {
      // Request height from tinyAds via postMessage
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
      }
      
      // Wait for content to render, then set initial height based on content
      setTimeout(() => {
        checkHeight();
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
        }
      }, 500);
      setTimeout(() => {
        checkHeight();
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
        }
      }, 1500);
      setTimeout(() => {
        checkHeight();
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
        }
      }, 3000);
    };

    iframe.addEventListener('load', handleLoad);

    // Periodic checks to catch dynamic content changes when new cards are added
    const interval = setInterval(() => {
      checkHeight();
      // Also request height via postMessage periodically with multiple message formats
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'requestHeight' }, 'https://app.tinyadz.com');
        iframe.contentWindow.postMessage({ action: 'getHeight', source: 'parent' }, 'https://app.tinyadz.com');
        // Try to trigger a resize event
        iframe.contentWindow.postMessage({ type: 'resize', action: 'update' }, 'https://app.tinyadz.com');
      }
    }, 2000);

    // Also use ResizeObserver if available (for the container)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkHeight();
      });
      resizeObserver.observe(iframe);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('resize', handleResize);
      }
      clearInterval(interval);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      iframe.removeEventListener('load', handleLoad);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1">
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent)]">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full blur-3xl opacity-20 bg-primary" />
        </div>
        <div className="container mx-auto px-4 pt-10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
                <Stars className="h-7 w-7 text-primary" />
                {userFullName ? (
                  `${t("dashboard.welcome")},  ${userFullName.split(" ").slice(0, 2).join(" ")}`
                ) : (
                  `${t("dashboard.welcome")}${user?.email ? `, ${user.email.split("@")[0]}` : ""}`
                )}
              </h1>
              <p className="text-muted-foreground mt-1">{t("dashboard.welcome.description")}</p>
            </div>
            {subscription && subscription.subscription_type === "premium" ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-4 w-4 inline mr-1" /> {t("dashboard.premium")}
                </span>
                <Button variant="outline" size="sm" onClick={() => router.push("/plans")}>
                  {t("dashboard.manageplan")}
                </Button>
              </div>
            ) : (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <div>{t("dashboard.unlock")}</div>
                    {freeScanRemaining !== null && (
                      <div className="text-xs text-primary/80 mt-1">
                        {t("dashboard.freescans.remaining")
                          .replace("{count}", freeScanRemaining.toString())
                          .replace(/{plural}/g, freeScanRemaining === 1 ? "" : "s")}
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => router.push("/plans")}>
                    {t("dashboard.upgrade")} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
              const el = document.getElementById("upload-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("dashboard.card.scan.title")}</CardTitle>
                  <CardDescription>{t("dashboard.card.scan.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer hover:shadow-lg transition-shadow ${!isPremium ? "opacity-80" : ""}`}
            title={!isPremium ? "Upgrade to Premium to unlock deep analytics" : undefined}
            onClick={() => {
              if (!isPremium) {
                toast({
                  title: t("dashboard.premium.feature"),
                  description: t("dashboard.premium.analytics"),
                  variant: "warning",
                });
                return;
              }
              router.push("/my-food-analytics");
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("dashboard.card.analytics.title")}</CardTitle>
                  <CardDescription>
                    {isPremium ? t("dashboard.card.analytics.description") : t("dashboard.card.analytics.premium")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer hover:shadow-lg transition-shadow ${
              !isPremium ? "opacity-80" : ""
            }`}
            title={!isPremium ? "Upgrade to Premium to unlock your full scan history" : undefined}
            onClick={() => {
              if (!isPremium) {
                toast({
                  title: t("dashboard.premium.feature"),
                  description: t("dashboard.premium.history"),
                  variant: "warning",
                });
                return;
              }
              router.push("/scan-histories");
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("dashboard.card.history.title")}</CardTitle>
                  <CardDescription>
                    {isPremium ? t("dashboard.card.history.description") : t("dashboard.card.history.premium")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer hover:shadow-lg transition-shadow relative ${!isPremium ? "opacity-80" : ""}`}
            title={!isPremium ? "Upgrade to generate personalized meal plans" : undefined}
            onClick={() => {
              if (!isPremium) {
                toast({
                  title: t("dashboard.premium.feature"),
                  description: t("dashboard.premium.mealplanner"),
                  variant: "warning",
                });
                return;
              }
              // Feature coming soon - show toast instead of navigating
              toast({
                title: "Coming Soon",
                description: "The Meal Planner feature is currently under development and will be available soon. Thank you for your patience!",
                variant: "orange",
              });
            }}
          >
            <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-orange-500 text-white border-0 text-xs sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 z-10">
              Coming Soon
            </Badge>
            <CardHeader className="pr-16 sm:pr-20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <UtensilsCrossed className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg whitespace-nowrap">{t("dashboard.card.mealplanner.title")}</CardTitle>
                  <CardDescription className="whitespace-nowrap">
                    {isPremium ? t("dashboard.card.mealplanner.description") : t("dashboard.card.mealplanner.premium")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Script src="https://cdn.tinysnippet.net/scripts/v2.0/manager.js" strategy="lazyOnload" />

        <div id="upload-section" className="grid md:grid-cols-2 gap-6 mb-2 md:items-start">
          {/* Left Section: Upload & Analyze (first), then Log Foods manually (below) */}
          <div className="flex flex-col gap-0">
            {/* Upload and Analyze - First */}
            <Card className="flex flex-col">
              <CardHeader className="pb-0" style={{ minHeight: '80px' }}>
                <CardTitle>{t("dashboard.upload.title")}</CardTitle>
                <CardDescription>{t("dashboard.upload.formats")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col p-4 mb-4 pb-4">
                {!uploadedFile ? (
                  <div
                    className="border-2 border-dashed border-primary/30 rounded-lg p-10 cursor-pointer bg-muted/30 text-center hover:border-primary/50 transition-colors flex-1 flex flex-col items-center justify-center"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
                      input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file || !user) return;
                        try {
                          const { path, publicUrl, signedUrl } = await uploadFoodImage(file, user.id);
                          setUploadedFile(file);
                          setUploadedImageUrl(signedUrl || publicUrl);
                          setUploadedImagePath(path);
                        } catch (e) {
                          console.error(e);
                          toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-14 w-14 text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">{t("dashboard.upload.photo")}</p>
                    <p className="text-sm text-muted-foreground mb-4">{t("dashboard.upload.drop")}</p>
                    <Button>{t("dashboard.upload.choose")}</Button>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-muted/30">
                      <div className="aspect-video relative">
                        {uploadedImageUrl ? (
                          <img src={uploadedImageUrl} alt="Uploaded food" className="w-full h-full object-cover" />
                        ) : uploadedFile ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Camera className="h-12 w-12 text-muted-foreground" />
                          </div>
                        ) : null}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
                              input.onchange = async () => {
                                const file = input.files?.[0];
                                if (!file || !user) return;
                                try {
                                  const { path, publicUrl, signedUrl } = await uploadFoodImage(file, user.id);
                                  setUploadedFile(file);
                                  setUploadedImageUrl(signedUrl || publicUrl);
                                  setUploadedImagePath(path);
                                } catch (e) {
                                  console.error(e);
                                  toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
                                }
                              };
                              input.click();
                            }}
                          >
                            {t("dashboard.upload.change")}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadedFile(null);
                          setUploadedImageUrl(null);
                          setUploadedImagePath(null);
                        }}
                      >
                        {t("dashboard.upload.remove")}
                      </Button>
                      <Button
                        disabled={analyzing}
                        onClick={async () => {
                          if (!uploadedImageUrl || !user || !uploadedImagePath) return;
                          try {
                            setAnalyzing(true);
                            if (!subscription || subscription.subscription_type !== "premium") {
                              const available = await hasFreeScanAvailable();
                              if (!available) {
                                toast({
                                  title: t("dashboard.upload.limit.title"),
                                  description: t("dashboard.upload.limit.description"),
                                });
                                setAnalyzing(false);
                                return;
                              }
                            }
                            const result = await analyzeFood(uploadedImageUrl, servings);
                            const scanId = await saveScanHistory({
                              userId: user.id,
                              imagePath: uploadedImagePath,
                              imageUrl: uploadedImageUrl,
                              serving: servings,
                              result: {
                                ...result.analysis,
                                ...(result.insights ? { insights: result.insights } : {}),
                              },
                            });
                            if (!subscription || subscription.subscription_type !== "premium") {
                              try {
                                const newCount = await decrementFreeScan();
                                setFreeScanRemaining(newCount);
                              } catch (error) {
                                console.error("Failed to decrement free scans", error);
                              }
                            }
                            router.push(`/food-results?id=${scanId}`);
                            setUploadedFile(null);
                            setUploadedImageUrl(null);
                            setUploadedImagePath(null);
                            setServings(1);
                          } catch (e) {
                            console.error(e);
                            toast({ title: t("dashboard.upload.error"), description: t("dashboard.upload.error.analyze"), variant: "destructive" });
                          } finally {
                            setAnalyzing(false);
                          }
                        }}
                        className="flex-1"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("dashboard.upload.analyzing")}
                          </>
                        ) : (
                          t("dashboard.upload.analyze")
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Log Foods manually - Below Upload & Analyze (Premium only) */}
            {subscription && subscription.subscription_type === "premium" && (
              <Card className="flex flex-col mt-8">
                <CardHeader className="pb-0" style={{ minHeight: '80px' }}>
                  <CardTitle>{t("dashboard.manual.title")}</CardTitle>
                  <CardDescription>{t("dashboard.manual.description")}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-5 flex flex-col">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.manual.instruction")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickAddOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => quickAddFood(item)}
                          className="px-3 py-1 rounded-full border text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {manualFoods.map((food, index) => (
                      <div className="flex gap-2" key={food.id}>
                        <Input
                          value={food.value}
                          onChange={(event) => updateManualFood(food.id, event.target.value)}
                          placeholder={manualPlaceholders[index % manualPlaceholders.length]}
                        />
                        {manualFoods.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => removeManualFood(food.id)}
                            aria-label="Remove food"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={addManualFoodField} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" /> {t("dashboard.manual.add")}
                      </Button>
                      <Button onClick={handleManualEntry} disabled={manualLoading} className="w-full sm:w-auto">
                        {manualLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("dashboard.manual.logging")}
                          </>
                        ) : (
                          t("dashboard.manual.addtoanalytics")
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Section: Sponsored Section with TinyAds (for both free and premium) */}
          <Card className="flex flex-col">
            <CardHeader className="pb-1 px-8" style={{ minHeight: '80px' }}>
              <CardTitle>{t("dashboard.sponsors.title")}</CardTitle>
              <CardDescription>{t("dashboard.sponsors.description")}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col">
              <div className="flex flex-col w-full">
                <div
                  className="w-full"
                  id="sponsor-iframe-container"
                  style={{ height: `${iframeHeight}px`, minHeight: `${iframeHeight}px` }}
                >
                  <iframe
                    ref={iframeRef}
                    width="100%"
                    frameBorder="0"
                    className="ta-widget w-full"
                    id="widget68ee566289b6c5ef70269ca8"
                    src="https://app.tinyadz.com/widgets/68ee566289b6c5ef70269ca8?previewMode=false&showInPopup=false&theme=light&layout=grid&maxItems=8"
                    style={{ 
                      border: "none",
                      display: "block",
                      width: "100%",
                      height: `${iframeHeight}px`, 
                      minHeight: `${iframeHeight}px`,
                      margin: 0, 
                      padding: 0,
                      overflow: "visible",
                    }}
                    title="Advertisements"
                    scrolling="yes"
                    allow="autoplay; encrypted-media"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}