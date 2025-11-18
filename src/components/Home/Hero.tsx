"use client";

import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, ShieldCheck, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFood, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import { decrementFreeScan, hasFreeScanAvailable, getFreeScanStatus } from "@/utils/freeScanLimit";
import { hasActivePremiumSubscription } from "@/utils/subscription";
import { useToast } from "@/hooks/use-toast";

export default function Hero() {
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [scanStatusType, setScanStatusType] = useState<"registered" | "unregistered" | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication and premium status
    const checkAuthAndScans = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        try {
          setIsPremium(null);
          const premium = await hasActivePremiumSubscription(authUser.id);
          setIsPremium(premium);
        } catch (error) {
          console.error("Failed to determine premium status", error);
          setIsPremium(false);
        }
      } else {
        setIsPremium(false);
      }

      try {
        const status = await getFreeScanStatus(true);
        setRemainingScans(status.remaining);
        setScanStatusType(status.type);
      } catch (error) {
        console.error("Failed to load free scan status", error);
        setRemainingScans(null);
        setScanStatusType(null);
      }
    };
    
    checkAuthAndScans();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkAuthAndScans();
    });
    
    return () => {
      subscription.unsubscribe();
      // Clean up preview URL on unmount
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  const onChooseFile = async () => {
    // Check if user needs to register (no auth and no free scans)
    const available = await hasFreeScanAvailable();
    if (!user && !available) {
      router.push("/auth");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      
      // Set selected file and create preview
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    };
    input.click();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      // If not authenticated, check free scan limit
      if (!userId) {
        if (!(await hasFreeScanAvailable())) {
          router.push("/auth");
          return;
        }
        
        // For non-authenticated users, create a temporary user ID for storage
        const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Upload to Storage with temp ID
        const { path, publicUrl, signedUrl } = await uploadFoodImage(selectedFile, tempUserId);
        
        // Analyze via Edge Function (default serving 1)
        const analysis = await analyzeFood(signedUrl || publicUrl, 1);
        
        // Decrement free scan count
        const newCount = await decrementFreeScan();
        setRemainingScans(newCount);
        setScanStatusType("unregistered");
        
        // Save history with temp user (won't be retrievable later, just for current session)
        const scanId = await saveScanHistory({ 
          userId: tempUserId, 
          imagePath: path, 
          imageUrl: signedUrl || publicUrl, 
          serving: 1, 
          result: analysis.analysis 
        });
        
        toast({
          title: "Scan complete!",
          description: `${newCount} free scan${newCount !== 1 ? "s" : ""} remaining. Sign up to save your history!`,
        });
        
        router.push(`/food-results?id=${scanId}`);
      } else {
        if (!isPremium) {
          const available = await hasFreeScanAvailable();
          if (!available) {
            toast({
              title: "Daily limit reached",
              description: "You have used all 3 free scans for today. Upgrade to Premium for unlimited scans.",
            });
            return;
          }
        }

        // Authenticated user flow
        // Upload to Storage
        const { path, publicUrl, signedUrl } = await uploadFoodImage(selectedFile, userId);
        
        // Analyze via Edge Function (default serving 1)
        const analysis = await analyzeFood(signedUrl || publicUrl, 1);
        
        // Save history and open results page
        const scanId = await saveScanHistory({ 
          userId, 
          imagePath: path, 
          imageUrl: signedUrl || publicUrl, 
          serving: 1, 
          result: analysis.analysis 
        });
        
        if (!isPremium) {
          try {
            const newCount = await decrementFreeScan();
            setRemainingScans(newCount);
            setScanStatusType("registered");
          } catch (error) {
            console.error("Failed to decrement daily free scan", error);
          }
        }

        router.push(`/food-results?id=${scanId}`);
      }
    } catch (e: any) {
      console.error("Hero upload error", e);
      toast({
        title: "Error",
        description: e?.message || "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };
  return (
    <section
      id="hero"
      className="relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#000000] transition-colors duration-300 min-h-screen"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />

      <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px]">
        {/* Mobile Layout - Vertical Stack */}
        <div className="flex flex-col lg:hidden w-full gap-6">
          {/* H1 and Description */}
          <div className="w-full text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
              Know What&apos;s Really in Your Food
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed">
              Upload a photo of any meal and get instant AI-powered nutritional analysis. 
              Track calories, macros, and make healthier choices effortlessly.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
            <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto" asChild>
              <Link href="/auth">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto" asChild>
              <Link href="/how-it-works">Learn More</Link>
            </Button>
          </div>

          {/* Free scans text */}
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            {user ? (
              isPremium === null ? (
                "Checking benefits..."
              ) : isPremium ? (
                "Unlimited scans per day"
              ) : remainingScans === null ? (
                "Checking your remaining scans..."
              ) : remainingScans > 0 ? (
                `${remainingScans} free scan${remainingScans === 1 ? "" : "s"} remaining today`
              ) : (
                "You have used all free scans for today. Upgrade for unlimited access."
              )
            ) : remainingScans === null ? (
              "Checking free scans..."
            ) : (
              `${remainingScans} free scan${remainingScans === 1 ? "" : "s"} remaining • No signup required`
            )}
          </p>

          {/* Upload Card */}
          <div className="w-full">
            <Card className="shadow-strong">
              <CardContent className="p-4 sm:p-6 md:p-8">
                {!previewUrl ? (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 cursor-pointer bg-gradient-card hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                    <p className="text-base sm:text-lg font-medium mb-2 text-center">Upload Your Food Photo</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 text-center">
                      Drop an image here or click to browse
                    </p>
                    <div className="flex justify-center">
                      <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" onClick={onChooseFile} disabled={uploading}>
                        Choose File
                      </Button>
                    </div>
                  </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden">
                        <img 
                          src={previewUrl} 
                          alt="Food preview" 
                          className="w-full h-64 sm:h-72 md:h-80 object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
                        <Button 
                          size="lg" 
                          className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto" 
                          onClick={handleAnalyze} 
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                              Analyzing...
                            </>
                          ) : (
                            "Analyze Food"
                          )}
                        </Button>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="text-sm sm:text-base w-full sm:w-auto" 
                          onClick={() => {
                            if (previewUrl) {
                              URL.revokeObjectURL(previewUrl);
                            }
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          disabled={uploading}
                        >
                          Change Photo
                        </Button>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Feature boxes - after upload card on mobile */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mt-6 w-full">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">AI Accuracy</p>
                <p className="text-xs text-muted-foreground">Understands 10k+ foods</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Timer className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Instant Results</p>
                <p className="text-xs text-muted-foreground">Nutrition in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Health Focused</p>
                <p className="text-xs text-muted-foreground">Macros & micronutrients</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Two Column */}
        <div className="hidden lg:flex items-center w-full">
          <div className="w-full flex flex-row items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            {/* Left Section - Value Proposition (aligned with logo) */}
            <div className="w-full text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight">
                Know What&apos;s Really in Your Food
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
                Upload a photo of any meal and get instant AI-powered nutritional analysis. 
                Track calories, macros, and make healthier choices effortlessly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-start">
                <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                  <Link href="/auth">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                  <Link href="/how-it-works">Learn More</Link>
                </Button>
              </div>

              {/* Feature boxes for desktop - below CTAs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-7 lg:mt-8">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">AI Accuracy</p>
                    <p className="text-xs text-muted-foreground">Understands 10k+ foods</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <Timer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Instant Results</p>
                    <p className="text-xs text-muted-foreground">Nutrition in seconds</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Health Focused</p>
                    <p className="text-xs text-muted-foreground">Macros & micronutrients</p>
                  </div>
                </div>
              </div>

              {/* Free scans text for desktop - after feature boxes */}
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
                {user ? (
                  isPremium === null ? (
                    "Checking benefits..."
                  ) : isPremium ? (
                    "Unlimited scans per day"
                  ) : remainingScans === null ? (
                    "Checking your remaining scans..."
                  ) : remainingScans > 0 ? (
                    `${remainingScans} free scan${remainingScans === 1 ? "" : "s"} remaining today`
                  ) : (
                    "You have used all free scans for today. Upgrade for unlimited access."
                  )
                ) : remainingScans === null ? (
                  "Checking free scans..."
                ) : (
                  `${remainingScans} free scan${remainingScans === 1 ? "" : "s"} remaining • No signup required`
                )}
              </p>
            </div>

            {/* Right Section - Upload Placeholder (aligned with profile) */}
            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2">
              <Card className="shadow-strong">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  {!previewUrl ? (
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 cursor-pointer bg-gradient-card hover:border-primary/50 transition-colors">
                      <Upload className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium mb-2 text-center">Upload Your Food Photo</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 text-center">
                        Drop an image here or click to browse
                      </p>
                      <div className="flex justify-center">
                        <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" onClick={onChooseFile} disabled={uploading}>
                          Choose File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden">
                        <img 
                          src={previewUrl} 
                          alt="Food preview" 
                          className="w-full h-64 sm:h-72 md:h-80 object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
                        <Button 
                          size="lg" 
                          className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto" 
                          onClick={handleAnalyze} 
                          disabled={uploading}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                              Analyzing...
                            </>
                          ) : (
                            "Analyze Food"
                          )}
                        </Button>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="text-sm sm:text-base w-full sm:w-auto" 
                          onClick={() => {
                            if (previewUrl) {
                              URL.revokeObjectURL(previewUrl);
                            }
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                          disabled={uploading}
                        >
                          Change Photo
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}