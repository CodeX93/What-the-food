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
  BookOpen,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { getPlatformSubscription } from "@/utils/subscription";
import { analyzeFood, fetchRecentScans, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import { useAuth } from "@/contexts/AuthContext";
import { queryWithRetry } from "@/utils/supabaseQuery";
import { DataCache, CACHE_KEYS, CACHE_DURATION } from "@/utils/dataCache";
import { compressImage, fileToBase64 } from "@/utils/imageCompression";
import type { User } from "@supabase/supabase-js";
import type { UserStreak, UserAchievement } from "@/utils/streaks.metadata";


export type DashboardClientProps = {
  initialUser?: User | null;
  initialSubscription?: any;
  initialScans?: any[];
  initialFullName?: string | null;
  initialStreaks?: UserStreak[];
  initialAchievements?: UserAchievement[];
};

export function DashboardClient({
  initialUser = null,
  initialSubscription = null,
  initialScans = [],
  initialFullName = null,
  initialStreaks = [],
  initialAchievements = [],
}: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const { user: authUser, loading: authLoading } = useAuth();
  // Use auth context user, fallback to initialUser
  const user = authUser || initialUser;

  // OPTIMIZATION: Use cached data for instant loading
  const [subscription, setSubscription] = useState<any>(() => {
    if (initialSubscription) return initialSubscription;
    if (user?.id) return DataCache.get(CACHE_KEYS.SUBSCRIPTION(user.id));
    return null;
  });

  // OPTIMIZATION: Start with loading=false if we have initialUser
  // Only show loading if we truly have no user data
  const [loading, setLoading] = useState(!initialUser && authLoading);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [servings, setServings] = useState(1);

  // OPTIMIZATION: Use cached scans for instant loading
  const [recentScans, setRecentScans] = useState<any[]>(() => {
    if (initialScans && initialScans.length > 0) return initialScans;
    if (user?.id) return DataCache.get(CACHE_KEYS.SCANS(user.id)) || [];
    return [];
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [freeScanRemaining, setFreeScanRemaining] = useState<number | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(initialFullName);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [mealsTracked, setMealsTracked] = useState<number>(0);
  const [manualFoods, setManualFoods] = useState<Array<{ id: string; value: string }>>([
    { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`, value: "" },
  ]);
  const [manualLoading, setManualLoading] = useState(false);
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
      // Calculate total weight from items or use totals.weight_g
      const totalWeight = totals.weight_g ||
        (manualData.items?.reduce((sum: number, item: any) => sum + (item.weight_g || 0), 0) || null);

      const manualResult = {
        dish: dishName,
        description: "Manually logged foods",
        tags: ["manual"],
        servingSize: "1 serving",
        servingWeightGrams: totalWeight && totalWeight > 0 ? totalWeight : undefined,
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
      // Update meals tracked
      setMealsTracked(prev => prev + 1);

      // Record scan for streak tracking
      try {
        await fetch("/api/streaks/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "scan" }),
        });
      } catch (error) {
        console.error("Error recording scan streak:", error);
      }
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

  // Cleanup preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset image loading state when preview URL changes
  useEffect(() => {
    if (previewUrl || uploadedImageUrl) {
      setImageLoading(true);
      // Check if image is already loaded (for blob URLs that load instantly)
      const checkImageLoaded = () => {
        const img = document.querySelector('img[alt="Uploaded food"]') as HTMLImageElement;
        if (img && img.complete && img.naturalHeight !== 0) {
          setImageLoading(false);
        }
      };
      // Check immediately and after a short delay
      checkImageLoaded();
      const timer = setTimeout(checkImageLoaded, 100);
      return () => clearTimeout(timer);
    } else {
      setImageLoading(false);
    }
  }, [previewUrl, uploadedImageUrl]);

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

      // Fetch subscription and cache it
      const shouldFetchSubscription = !initialSubscription || !DataCache.has(CACHE_KEYS.SUBSCRIPTION(currentUser.id));
      if (shouldFetchSubscription) {
        promises.push(
          getPlatformSubscription(currentUser.id)
            .then((sub) => {
              setSubscription(sub);
              // Cache for 5 minutes
              DataCache.set(CACHE_KEYS.SUBSCRIPTION(currentUser.id), sub, CACHE_DURATION.MEDIUM);
            })
            .catch((error) => {
              console.error("Failed to load subscription", error);
            })
        );
      }

      // Fetch scans and cache them
      const shouldFetchScans = !initialScans.length || !DataCache.has(CACHE_KEYS.SCANS(currentUser.id));
      if (shouldFetchScans) {
        promises.push(
          fetchRecentScans(currentUser.id, 6)
            .then((scans) => {
              setRecentScans(scans);
              // Cache for 2 minutes (scans change frequently)
              DataCache.set(CACHE_KEYS.SCANS(currentUser.id), scans, CACHE_DURATION.SHORT);
            })
            .catch((error) => {
              console.error("Failed to load recent scans", error);
            })
        );
      }

      // Fetch free scan balance
      promises.push(
        getRemainingFreeScans()
          .then((remaining) => {
            setFreeScanRemaining(remaining);
          })
          .catch((error) => {
            console.error("Failed to load free scan balance", error);
          })
      );

      // Calculate days left and meals tracked for free users
      if (!isPremium && currentUser) {
        promises.push(
          Promise.all([
            // Get profile to calculate days left
            (supabase as any)
              .from("profiles")
              .select("created_at")
              .eq("id", currentUser.id)
              .maybeSingle(),
            // Get food_scans count for meals tracked
            (supabase as any)
              .from("food_scans")
              .select("id", { count: "exact", head: true })
              .eq("user_id", currentUser.id)
          ]).then(([profileResult, scansResult]) => {
            // Calculate days left (3 days from account creation)
            if (profileResult?.data?.created_at) {
              const accountCreatedAt = new Date(profileResult.data.created_at);
              const threeDaysLater = new Date(accountCreatedAt);
              threeDaysLater.setDate(threeDaysLater.getDate() + 3);
              const now = new Date();
              const diffTime = threeDaysLater.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              setDaysLeft(Math.max(0, diffDays));
            }
            // Set meals tracked
            if (scansResult?.count !== undefined) {
              setMealsTracked(scansResult.count);
            }
          }).catch((error) => {
            console.error("Failed to load days left and meals tracked", error);
          })
        );
      }

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
                <Button variant="outline" size="sm" onClick={() => window.location.href = "/plans"}>
                  {t("dashboard.manageplan")}
                </Button>
              </div>
            ) : (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <div>{t("dashboard.unlock")}</div>
                    {(daysLeft !== null || mealsTracked > 0) && (
                      <div className="text-xs text-primary/80 mt-1">
                        {daysLeft !== null && `🕒 ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                        {daysLeft !== null && mealsTracked > 0 && ' | '}
                        {mealsTracked > 0 && `🍽 Meals tracked: ${mealsTracked}/3`}
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => window.location.href = "/plans"}>
                    Unlock insights <ArrowRight className="h-4 w-4 ml-1" />
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
              router.push("/saved-recipes");
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("dashboard.card.recipes.title")}</CardTitle>
                  <CardDescription>{t("dashboard.card.recipes.description")}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer hover:shadow-lg transition-shadow ${!isPremium ? "opacity-80" : ""}`}
            title={!isPremium ? "Upgrade to Premium to unlock deep analytics" : undefined}
            onClick={() => {
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
                  <CardDescription className="whitespace-nowrap">
                    {t("dashboard.card.analytics.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => {
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
            className="cursor-pointer hover:shadow-lg transition-shadow relative"
            onClick={() => {
              router.push("/meal-planner");
            }}
          >
            <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-orange-500 text-white border-0 text-xs sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 z-10">
              Beta
            </Badge>
            <CardHeader className="pr-16 sm:pr-20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <UtensilsCrossed className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg whitespace-nowrap">{t("dashboard.card.mealplanner.title")}</CardTitle>
                  <CardDescription className="whitespace-nowrap">
                    {t("dashboard.card.mealplanner.description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Script src="https://cdn.tinysnippet.net/scripts/v2.0/manager.js" strategy="lazyOnload" />



        <div id="upload-section" className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-2 md:items-stretch">
          {/* Left Section: Upload & Analyze (first), then Log Foods manually (below) */}
          <div className="flex flex-col gap-0">
            {/* Upload and Analyze - First */}
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-0" style={{ minHeight: '80px' }}>
                <CardTitle>{t("dashboard.upload.title")}</CardTitle>
                <CardDescription>{t("dashboard.upload.formats")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col p-4 mb-4 pb-4">
                {!uploadedFile ? (
                  // Check if free registered user has consumed their scans (3 scans OR 3 days, whichever comes first)
                  user && !isPremium && freeScanRemaining === 0 ? (
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 bg-gradient-card flex-1 flex flex-col items-center justify-center">
                      <Lock className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium mb-2 text-center">
                        You&apos;ve tracked 3 meals.
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 text-center">
                        Patterns are starting to form. Unlock analytics to see them.
                      </p>
                      <div className="flex justify-center">
                        <Button
                          size="lg"
                          className="bg-primary hover:bg-primary-hover text-sm sm:text-base"
                          onClick={() => router.push("/plans")}
                        >
                          Unlock analytics
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed border-primary/30 rounded-lg p-10 text-center bg-muted/30 flex-1 flex flex-col items-center justify-center transition-colors ${authLoading || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
                        }`}
                      onClick={() => {
                        if (authLoading || loading) {
                          return;
                        }

                        if (!user) {
                          toast({
                            title: "Authentication Required",
                            description: "Please sign in to upload food images.",
                            variant: "destructive"
                          });
                          router.push("/auth");
                          return;
                        }

                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/png,image/jpeg,image/jpg,image/heic,image/heif";
                        // Don't set capture attribute - let user choose between camera and gallery
                        input.style.display = "none"; // Hide but keep in DOM for mobile compatibility

                        // Add to DOM temporarily for mobile browsers (especially iOS Safari)
                        document.body.appendChild(input);

                        // Define cleanup function first
                        const cleanup = () => {
                          input.removeEventListener('change', handleFileChange);
                          input.value = '';
                          if (input.parentNode) {
                            input.parentNode.removeChild(input);
                          }
                        };

                        const handleFileChange = async (e: Event) => {
                          try {
                            console.log('File change event triggered', e);
                            const target = e.target as HTMLInputElement;
                            const file = target.files?.[0];

                            console.log('Selected file:', file ? { name: file.name, type: file.type, size: file.size } : 'No file');

                            if (!file) {
                              // User cancelled or no file selected
                              console.log('No file selected, cleaning up');
                              cleanup();
                              return;
                            }

                            if (!user) {
                              toast({
                                title: "Authentication Required",
                                description: "Please sign in to upload food images.",
                                variant: "destructive"
                              });
                              cleanup();
                              return;
                            }

                            // Validate file type - be more lenient for mobile cameras
                            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/heic', 'image/heif', 'image/webp'];
                            const validExtensions = /\.(png|jpg|jpeg|heic|heif|webp)$/i;
                            const isValidType = validTypes.includes(file.type) || file.name.match(validExtensions);

                            // On mobile, file.type might be empty, so rely on extension
                            if (!isValidType && file.type && file.type !== '') {
                              console.warn('File type validation failed:', file.type, file.name);
                              toast({
                                title: "Invalid File Type",
                                description: "Please select a valid image file (PNG, JPG, HEIC)",
                                variant: "destructive",
                              });
                              cleanup();
                              return;
                            }

                            console.log('File validated, processing...');

                            // Set file and show preview immediately
                            // We'll store the original file, but we'll compress it before upload
                            setUploadedFile(file);

                            // Show preview immediately from file blob
                            const objectUrl = URL.createObjectURL(file);
                            console.log('Created object URL:', objectUrl);
                            setPreviewUrl(objectUrl);
                            setImageLoading(true); // Start loading state for image rendering

                            // Compress the image immediately
                            try {
                              console.log('Compressing image...');
                              setUploading(true); // Show loading state during compression

                              const compressedFile = await compressImage(file, {
                                maxWidth: 1200,
                                maxHeight: 1200,
                                quality: 0.8
                              });

                              console.log('Compression complete:', {
                                originalSize: file.size,
                                compressedSize: compressedFile.size,
                                ratio: Math.round((compressedFile.size / file.size) * 100) + '%'
                              });

                              // Store compressed file for later use (in analysis/upload)
                              setUploadedFile(compressedFile);

                              // We don't auto-upload anymore - we wait for user to click "Analyze"
                              // But we can generate the base64 preview for the analyze function
                              setUploading(false);
                            } catch (error) {
                              console.error("Compression error:", error);
                              setUploading(false);
                              // Fallback to original file if compression fails
                            }
                          } catch (error: any) {
                            console.error("File processing error:", error);
                            toast({
                              title: "Error Processing File",
                              description: error?.message || "Failed to process the selected image. Please try again.",
                              variant: "destructive",
                            });
                            cleanup();
                          }
                        };

                        // Use both methods for maximum compatibility
                        input.addEventListener('change', handleFileChange);
                        input.onchange = handleFileChange;

                        // Trigger file picker
                        // Use setTimeout to ensure input is in DOM before clicking (mobile fix)
                        setTimeout(() => {
                          try {
                            input.click();
                            console.log('File picker triggered');
                          } catch (err) {
                            console.error('Error triggering file picker:', err);
                            toast({
                              title: "Error",
                              description: "Failed to open file picker. Please try again.",
                              variant: "destructive",
                            });
                            if (input.parentNode) {
                              input.parentNode.removeChild(input);
                            }
                          }
                        }, 10);
                      }}
                    >
                      <Upload className={`h-14 w-14 text-primary mx-auto mb-4 ${authLoading || loading ? "animate-pulse" : ""}`} />
                      <p className="text-lg font-medium mb-2">{t("dashboard.upload.photo")}</p>
                      <p className="text-sm text-muted-foreground mb-4">{t("dashboard.upload.drop")}</p>
                      <Button disabled={authLoading || loading}>{t("dashboard.upload.choose")}</Button>
                    </div>
                  )
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-muted/30">
                      <div className="aspect-video relative">
                        {imageLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          </div>
                        )}
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Uploaded food"
                            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"
                              }`}
                            onLoad={() => setImageLoading(false)}
                            onError={() => setImageLoading(false)}
                            ref={(img) => {
                              // Check if image is already loaded when ref is set
                              if (img && img.complete && img.naturalHeight !== 0) {
                                setImageLoading(false);
                              }
                            }}
                          />
                        ) : uploadedImageUrl ? (
                          <img
                            src={uploadedImageUrl}
                            alt="Uploaded food"
                            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"
                              }`}
                            onLoad={() => setImageLoading(false)}
                            onError={() => setImageLoading(false)}
                            ref={(img) => {
                              // Check if image is already loaded when ref is set
                              if (img && img.complete && img.naturalHeight !== 0) {
                                setImageLoading(false);
                              }
                            }}
                          />
                        ) : uploadedFile ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Camera className="h-12 w-12 text-muted-foreground" />
                          </div>
                        ) : null}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={uploading}
                            onClick={() => {
                              if (!user) {
                                toast({
                                  title: "Authentication Required",
                                  description: "Please sign in to upload food images.",
                                  variant: "destructive"
                                });
                                router.push("/auth");
                                return;
                              }

                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/png,image/jpeg,image/jpg,image/heic,image/heif";
                              // Don't set capture attribute - let user choose between camera and gallery
                              input.style.display = "none"; // Hide but keep in DOM for mobile compatibility

                              // Add to DOM temporarily for mobile browsers (especially iOS Safari)
                              document.body.appendChild(input);

                              // Define cleanup function first
                              const cleanup = () => {
                                input.removeEventListener('change', handleFileChange);
                                input.onchange = null;
                                input.value = '';
                                if (input.parentNode) {
                                  input.parentNode.removeChild(input);
                                }
                              };

                              const handleFileChange = async (e: Event) => {
                                try {
                                  console.log('File change event triggered', e);
                                  const target = e.target as HTMLInputElement;
                                  const file = target.files?.[0];

                                  console.log('Selected file:', file ? { name: file.name, type: file.type, size: file.size } : 'No file');

                                  if (!file) {
                                    // User cancelled or no file selected
                                    console.log('No file selected, cleaning up');
                                    cleanup();
                                    return;
                                  }

                                  if (!user) {
                                    toast({
                                      title: "Authentication Required",
                                      description: "Please sign in to upload food images.",
                                      variant: "destructive"
                                    });
                                    cleanup();
                                    return;
                                  }

                                  // Validate file type - be more lenient for mobile cameras
                                  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/heic', 'image/heif', 'image/webp'];
                                  const validExtensions = /\.(png|jpg|jpeg|heic|heif|webp)$/i;
                                  const isValidType = validTypes.includes(file.type) || file.name.match(validExtensions);

                                  // On mobile, file.type might be empty, so rely on extension
                                  if (!isValidType && file.type && file.type !== '') {
                                    console.warn('File type validation failed:', file.type, file.name);
                                    toast({
                                      title: "Invalid File Type",
                                      description: "Please select a valid image file (PNG, JPG, HEIC)",
                                      variant: "destructive",
                                    });
                                    cleanup();
                                    return;
                                  }

                                  console.log('File validated, processing...');

                                  // Clean up previous preview if exists
                                  if (previewUrl) {
                                    URL.revokeObjectURL(previewUrl);
                                  }

                                  // Set file and show preview immediately
                                  setUploadedFile(file);

                                  // Show preview immediately from file blob
                                  const objectUrl = URL.createObjectURL(file);
                                  console.log('Created object URL:', objectUrl);
                                  setPreviewUrl(objectUrl);
                                  setImageLoading(true); // Start loading state for image rendering

                                  // Compress the image immediately
                                  try {
                                    console.log('Compressing image...');
                                    setUploading(true); // Show loading state during compression

                                    const compressedFile = await compressImage(file, {
                                      maxWidth: 1200,
                                      maxHeight: 1200,
                                      quality: 0.8
                                    });

                                    console.log('Compression complete:', {
                                      originalSize: file.size,
                                      compressedSize: compressedFile.size,
                                      ratio: Math.round((compressedFile.size / file.size) * 100) + '%'
                                    });

                                    // Store compressed file for later use (in analysis/upload)
                                    setUploadedFile(compressedFile);

                                    setUploading(false);
                                  } catch (error) {
                                    console.error("Compression error:", error);
                                    setUploading(false);
                                    // Fallback to original file
                                  }

                                  cleanup();
                                } catch (error: any) {
                                  console.error("File processing error:", error);
                                  toast({
                                    title: "Error Processing File",
                                    description: error?.message || "Failed to process the selected image. Please try again.",
                                    variant: "destructive",
                                  });
                                  cleanup();
                                }
                              };

                              // Use addEventListener only (onchange is redundant and causes double-firing)
                              input.addEventListener('change', handleFileChange, { once: true });

                              // Trigger file picker
                              // Use setTimeout to ensure input is in DOM before clicking (mobile fix)
                              setTimeout(() => {
                                try {
                                  input.click();
                                  console.log('File picker triggered');
                                } catch (err) {
                                  console.error('Error triggering file picker:', err);
                                  toast({
                                    title: "Error",
                                    description: "Failed to open file picker. Please try again.",
                                    variant: "destructive",
                                  });
                                  if (input.parentNode) {
                                    input.parentNode.removeChild(input);
                                  }
                                }
                              }, 10);
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
                        disabled={analyzing || uploading}
                        onClick={() => {
                          if (previewUrl) {
                            URL.revokeObjectURL(previewUrl);
                          }
                          setUploadedFile(null);
                          setUploadedImageUrl(null);
                          setUploadedImagePath(null);
                          setPreviewUrl(null);
                          setImageLoading(false);
                          setAnalyzing(false);
                        }}
                      >
                        Change Photo
                      </Button>
                      <Button
                        disabled={analyzing || uploading || !uploadedFile}
                        onClick={async () => {
                          if (!uploadedFile || !user) return;

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

                            // PARALLEL EXECUTION: Start Analysis and Upload simultaneously
                            console.log("Starting parallel analysis and upload...");

                            // Task 1: Analysis (Base64 -> Edge Function)
                            const analysisPromise = (async () => {
                              try {
                                // Convert compressed file to base64
                                const base64 = await fileToBase64(uploadedFile);
                                console.log("Sending analysis request with base64 payload");
                                return await analyzeFood(base64, servings);
                              } catch (err: any) {
                                throw new Error(`Analysis failed: ${err.message}`);
                              }
                            })();

                            // Task 2: Upload (Compressed File -> Storage)
                            const uploadPromise = (async () => {
                              try {
                                console.log("Starting background upload...");
                                // Force session refresh
                                const { error: refreshError } = await supabase.auth.refreshSession();
                                if (refreshError) console.warn("Session refresh warning:", refreshError);

                                return await uploadFoodImage(uploadedFile, user.id);
                              } catch (err: any) {
                                throw new Error(`Upload failed: ${err.message}`);
                              }
                            })();

                            // Wait for both to complete
                            // Note: We prioritize analysis result, but we need upload path for history
                            const [analysisResult, uploadResult] = await Promise.all([analysisPromise, uploadPromise]);

                            console.log("✅ Parallel tasks complete", {
                              analysis: !!analysisResult,
                              uploadPath: uploadResult.path
                            });

                            const scanId = await saveScanHistory({
                              userId: user.id,
                              imagePath: uploadResult.path,
                              imageUrl: uploadResult.signedUrl || uploadResult.publicUrl,
                              serving: servings,
                              result: {
                                ...analysisResult.analysis,
                                ...(analysisResult.insights ? { insights: analysisResult.insights } : {}),
                              },
                            });

                            // Navigate immediately for instant feedback
                            router.push(`/food-results?id=${scanId}`);

                            // Cleanup and decrement free scans in the background (non-blocking)
                            if (previewUrl) {
                              URL.revokeObjectURL(previewUrl);
                            }
                            setUploadedFile(null);
                            setUploadedImageUrl(null);
                            setUploadedImagePath(null);
                            setPreviewUrl(null);
                            setImageLoading(false);
                            setServings(1);

                            // Decrement free scans in background (don't await - let it happen after navigation)
                            if (!subscription || subscription.subscription_type !== "premium") {
                              decrementFreeScan()
                                .then((newCount) => {
                                  setFreeScanRemaining(newCount);
                                  // Update meals tracked
                                  setMealsTracked(prev => prev + 1);
                                })
                                .catch((error) => {
                                  console.error("Failed to decrement free scans", error);
                                });
                            }
                          } catch (e) {
                            console.error(e);
                            toast({ title: t("dashboard.upload.error"), description: t("dashboard.upload.error.analyze"), variant: "destructive" });
                            setAnalyzing(false);
                          }
                          // Don't reset analyzing here - let it stay until redirect
                        }}
                        className={`flex-1 ${(analyzing || uploading)
                          ? "bg-green-400 hover:bg-green-400 cursor-not-allowed"
                          : ""
                          }`}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing
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

          </div>

          {/* Right Section: Manual Food Logging */}
          <Card className="flex flex-col w-full h-full">
            <CardHeader className="pb-0" style={{ minHeight: '80px' }}>
              <CardTitle>{t("dashboard.manual.title")}</CardTitle>
              <CardDescription>{t("dashboard.manual.description")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col p-4 mb-4 pb-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{t("dashboard.manual.quickadd")}:</span>
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}