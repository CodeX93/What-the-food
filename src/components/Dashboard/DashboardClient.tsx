'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformSubscription } from "@/utils/subscription";
import { analyzeFood, fetchRecentScans, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import type { User } from "@supabase/supabase-js";

export type DashboardClientProps = {
  initialUser?: User | null;
  initialSubscription?: any;
  initialScans?: any[];
};

export function DashboardClient({
  initialUser = null,
  initialSubscription = null,
  initialScans = [],
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
  }, [initialScans, initialSubscription, initialUser, router, toast]);

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
                Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/my-food-analytics")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Analytics</CardTitle>
                  <CardDescription>View your stats</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/scan-histories")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">History</CardTitle>
                  <CardDescription>Past scans</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Card id="upload-section" className="mb-8">
          <CardHeader>
            <CardTitle>Upload and Analyze</CardTitle>
            <CardDescription>PNG, JPG, JPEG, HEIC</CardDescription>
          </CardHeader>
          <CardContent>
            {!uploadedFile ? (
              <div
                className="border-2 border-dashed border-primary/30 rounded-lg p-10 cursor-pointer bg-muted/30 text-center hover:border-primary/50 transition-colors"
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
              <div className="space-y-4">
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
                          result: result.analysis,
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
      </div>
    </main>
  );
}
