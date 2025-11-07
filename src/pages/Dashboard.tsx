// ============================================
// CLEAN DASHBOARD PAGE
// ============================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Camera, TrendingUp, Clock, Sparkles, Loader2, Stars, ShieldCheck, ArrowRight, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPlatformSubscription } from "@/utils/subscription";
import { analyzeFood, fetchRecentScans, saveScanHistory, scaleNutrients, uploadFoodImage, getImageUrl, type FoodAnalysis } from "@/utils/foodScan";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [servings, setServings] = useState(1);
  const [latestResult, setLatestResult] = useState<FoodAnalysis | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          navigate("/auth");
          return;
        }

        setUser(session.user);

        // Fetch platform subscription
        const sub = await getPlatformSubscription(session.user.id);
        setSubscription(sub);

        // Load recent scans (already has fresh URLs generated)
        const scans = await fetchRecentScans(session.user.id, 6);
        setRecentScans(scans);
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
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <TopBar />
      <Header />
      <main className="flex-1">
        {/* Hero / Welcome */}
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
              {subscription && subscription.subscription_type === 'premium' ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="h-4 w-4 inline mr-1" /> Premium
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigate("/plans")}>
                    Manage Plan
                  </Button>
                </div>
              ) : (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div className="text-sm">Unlock unlimited scans with Premium.</div>
                    <Button size="sm" className="ml-auto" onClick={() => navigate('/plans')}>
                      Upgrade <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 pb-10">
          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
              // Ensure we are on dashboard and scroll to upload section
              const el = document.getElementById('upload-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}>
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

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/my-food-analytics") }>
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

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/scan-histories") }>
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

          {/* Upload & Analyze */}
          <Card id="upload-section" className="mb-8">
            <CardHeader>
              <CardTitle>Upload and Analyze</CardTitle>
              <CardDescription>PNG, JPG, JPEG, HEIC</CardDescription>
            </CardHeader>
            <CardContent>
              {!uploadedFile ? (
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-10 cursor-pointer bg-muted/30 text-center hover:border-primary/50 transition-colors"
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
                  <Button>
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image Preview */}
                  <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-muted/30">
                    <div className="aspect-video relative">
                      {uploadedImageUrl ? (
                        <img 
                          src={uploadedImageUrl} 
                          alt="Uploaded food" 
                          className="w-full h-full object-cover"
                        />
                      ) : uploadedFile ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Camera className="h-12 w-12 text-muted-foreground" />
                        </div>
                      ) : null}
                      {/* Overlay with change button */}
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
                  
                  {/* Analyze Button */}
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
                          const result = await analyzeFood(uploadedImageUrl, servings);
                          const scanId = await saveScanHistory({ userId: user.id, imagePath: uploadedImagePath, imageUrl: uploadedImageUrl, serving: servings, result: result.analysis });
                          navigate(`/food-results?id=${scanId}`);
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
                          <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
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

          {/* (Removed How it works section as requested) */}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
