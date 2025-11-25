'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getPlatformSubscription } from "@/utils/subscription";
import { analyzeFood, fetchRecentScans, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
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
  const [user, setUser] = useState<User | null>(initialUser);
  const [subscription, setSubscription] = useState<any>(initialSubscription);
  const [loading, setLoading] = useState(!initialUser);
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
        title: "Add at least one item",
        description: 'Include a short description like "2 eggs" or "1 banana".',
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
        title: "Added to Analytics",
        description: "Manual foods have been logged successfully.",
      });

      // Reload recent scans
      const scans = await fetchRecentScans(session.user.id, 6);
      setRecentScans(scans);
    } catch (error: any) {
      console.error("Manual entry error:", error);
      toast({
        title: "Failed to log foods",
        description: error?.message || "Unable to estimate these foods.",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!initialUser) {
          setLoading(true);
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.push("/auth");
          return;
        }

        setUser(session.user);

        // Fetch user profile to get full_name (if not already provided from server)
        if (!initialFullName) {
          try {
            const { data: profileData, error: profileError } = await (supabase as any)
              .from("profiles")
              .select("full_name")
              .eq("id", session.user.id)
              .maybeSingle();

            if (profileError) {
              console.error("Profile fetch error:", profileError);
            } else if (profileData) {
              const fullName = profileData.full_name?.trim();
              if (fullName && fullName.length > 0) {
                setUserFullName(fullName);
              }
            }
          } catch (error) {
            console.error("Failed to load user profile", error);
          }
        }

        const sub =
          initialSubscription ??
          (await getPlatformSubscription(session.user.id));
        setSubscription(sub);

        const scans =
          initialScans.length > 0
            ? initialScans
            : await fetchRecentScans(session.user.id, 6);
        setRecentScans(scans);

        try {
          const remaining = await getRemainingFreeScans(true);
          setFreeScanRemaining(remaining);
        } catch (error) {
          console.error("Failed to load free scan balance", error);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [initialScans, initialSubscription, initialUser, initialFullName, router, toast]);

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
                  `Welcome back,  ${userFullName.split(" ").slice(0, 2).join(" ")}`
                ) : (
                  `Welcome back, ${user?.email ? `, ${user.email.split("@")[0]}` : ""}`
                )}
              </h1>
              <p className="text-muted-foreground mt-1">Scan meals, get instant nutrition, and track progress.</p>
            </div>
            {subscription && subscription.subscription_type === "premium" ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-4 w-4 inline mr-1" /> Premium
                </span>
                <Button variant="outline" size="sm" onClick={() => router.push("/plans")}>
                  Manage Plan
                </Button>
              </div>
            ) : (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-3 px-4 flex items-center gap-4">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <div>Unlock unlimited scans with Premium.</div>
                    {freeScanRemaining !== null && (
                      <div className="text-xs text-primary/80 mt-1">
                        {freeScanRemaining} free scan{freeScanRemaining === 1 ? "" : "s"} remaining today.
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => router.push("/plans")}>
                    Upgrade <ArrowRight className="h-4 w-4 ml-1" />
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
                  <CardTitle className="text-lg">New Scan</CardTitle>
                  <CardDescription>Upload Food Photo</CardDescription>
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
                  title: "Premium feature",
                  description: "Upgrade to a premium plan to view your complete food analytics.",
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
                  <CardTitle className="text-lg">Analytics</CardTitle>
                  <CardDescription>
                    {isPremium ? "View your stats" : "Premium · Hover for details"}
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
                  title: "Premium feature",
                  description: "Upgrade to a premium plan to view your complete scan history.",
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
                  <CardTitle className="text-lg">History</CardTitle>
                  <CardDescription>
                    {isPremium ? "Past scans" : "Premium · Hover for details"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className={`cursor-pointer hover:shadow-lg transition-shadow ${!isPremium ? "opacity-80" : ""}`}
            title={!isPremium ? "Upgrade to generate personalized meal plans" : undefined}
            onClick={() => {
              if (!isPremium) {
                toast({
                  title: "Premium feature",
                  description: "Upgrade to a premium plan to access the AI meal planner.",
                  variant: "warning",
                });
                return;
              }
              router.push("/meal-planner");
            }}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <UtensilsCrossed className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Meal Planner</CardTitle>
                  <CardDescription>
                    {isPremium ? "Personalized meal plan" : "Premium · Hover for details"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Script src="https://cdn.tinysnippet.net/scripts/v2.0/manager.js" strategy="lazyOnload" />

        <div id="upload-section" className="grid md:grid-cols-2 gap-6 mb-2 md:items-stretch">
          {/* Left Section: Upload & Analyze (first), then Log Foods manually (below) */}
          <div className="flex flex-col gap-0 h-full ">
            {/* Upload and Analyze - First */}
            <Card className="flex flex-col" style={{ flex: '1.18 2 0' }}>
              <CardHeader className="pb-0" style={{ minHeight: '80px' }}>
                <CardTitle>Upload and Analyze</CardTitle>
                <CardDescription>PNG, JPG, JPEG, HEIC</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 mb-4 pb-4">
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
                    <p className="text-lg font-medium mb-2">Upload Your Food Photo</p>
                    <p className="text-sm text-muted-foreground mb-4">Drop an image here or click to browse</p>
                    <Button>Choose File</Button>
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
                          setUploadedFile(null);
                          setUploadedImageUrl(null);
                          setUploadedImagePath(null);
                        }}
                      >
                        Remove
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
                                  title: "Daily limit reached",
                                  description: "You have used all 3 free scans for today. Upgrade to Premium for unlimited scans.",
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
                            toast({ title: "Error", description: "Failed to analyze image.", variant: "destructive" });
                          } finally {
                            setAnalyzing(false);
                          }
                        }}
                        className="flex-1"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          "Analyze Food"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Log Foods manually - Below Upload & Analyze (Premium only) */}
            {subscription && subscription.subscription_type === "premium" && (
              <Card className="flex flex-col flex-1 mt-8">
                <CardHeader className="pb-0" style={{ minHeight: '80px' }}>
                  <CardTitle>Log foods manually</CardTitle>
                  <CardDescription>Add quick bites without scanning. We&apos;ll estimate macros and include them in your analytics.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-5 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Describe each item with quantity (e.g., &quot;2 eggs&quot;, &quot;1 banana&quot;, &quot;protein shake with almond milk&quot;).
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
                        <Plus className="h-4 w-4 mr-2" /> Add another food
                      </Button>
                      <Button onClick={handleManualEntry} disabled={manualLoading} className="w-full sm:w-auto">
                        {manualLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Logging…
                          </>
                        ) : (
                          "Add to analytics"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Section: Sponsored Section with TinyAds (for both free and premium) */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-1 px-8" style={{ minHeight: '80px' }}>
              <CardTitle>Our Sponsors</CardTitle>
              <CardDescription>Reach health-conscious users interested in nutrition tracking, food, and cooking.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="flex flex-col space-y-1.5 pt-0">
                <div className="w-full" style={{ minHeight: '480px' }}>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    className="ta-widget w-full h-full"
                    data-min-height="480"
                    id="widget68ee566289b6c5ef70269ca8"
                    src="https://app.tinyadz.com/widgets/68ee566289b6c5ef70269ca8?previewMode=false&showInPopup=false&theme=light"
                    style={{ border: 'none', display: 'block', width: '100%', height: '100%', margin: 0, padding: 0 }}
                    title="Advertisements"
                    scrolling="auto"
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
