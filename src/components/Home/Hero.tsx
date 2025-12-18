"use client";

import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, ShieldCheck, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeFood, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import { decrementFreeScan, hasFreeScanAvailable, getFreeScanStatus, getCachedScanStatusSync } from "@/utils/freeScanLimit";
import { hasActivePremiumSubscription } from "@/utils/subscription";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Hero() {
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // OPTIMIZATION: Initialize with cached data AFTER hydration to avoid mismatch
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [scanStatusType, setScanStatusType] = useState<"registered" | "unregistered" | null>(null);
  // OPTIMIZATION: Start with false to avoid "Checking benefits..." blocking state
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [socialProofMargin, setSocialProofMargin] = useState<number>(0);
  const uploadContainerRef = useRef<HTMLDivElement>(null);
  const leftSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const handleGetStarted = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  };

  const { user: authUser } = useAuth();
  const hasCheckedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Use user from auth context
    setUser(authUser);

    // Only check if user ID actually changed
    const currentUserId = authUser?.id || null;
    if (lastUserIdRef.current === currentUserId && hasCheckedRef.current) {
      return;
    }
    
    lastUserIdRef.current = currentUserId;
    hasCheckedRef.current = true;

    // OPTIMIZATION: Run checks in background - non-blocking for instant page load
    const checkPremiumAndScans = async () => {
      if (authUser) {
        // OPTIMIZATION: Check premium status FIRST
        try {
          const isPremiumUser = await hasActivePremiumSubscription(authUser.id);
          setIsPremium(isPremiumUser);

          // Only check scans if NOT premium
          if (!isPremiumUser) {
            try {
              const status = await getFreeScanStatus(true); // Force refresh
              setRemainingScans(status.remaining);
              setScanStatusType(status.type);
            } catch (error) {
              console.error("Failed to load free scan status", error);
              setRemainingScans(3);
              setScanStatusType('registered');
            }
          }
        } catch (error) {
          console.error("Failed to determine premium status", error);
          setIsPremium(false);

          // Fallback: check scans
          try {
            const status = await getFreeScanStatus(true); // Force refresh
            setRemainingScans(status.remaining);
            setScanStatusType(status.type);
          } catch (err) {
          setRemainingScans(3);
            setScanStatusType('registered');
          }
        }
      } else {
        setIsPremium(false);
        
        // Still check scan status for non-logged-in users (non-blocking)
        // OPTIMIZATION: Always fetch fresh data on page load
        try {
          const status = await getFreeScanStatus(true); // Force refresh
          setRemainingScans(status.remaining);
          setScanStatusType(status.type);
        } catch (error) {
          console.error("Failed to load free scan status", error);
          // Default to 3 scans for new users
          setRemainingScans(3);
          setScanStatusType('unregistered');
        }
      }
    };
    
    // Fire and forget - don't block UI
    checkPremiumAndScans();
  }, [authUser]);

  // Separate effect for preview cleanup
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Align social proof with bottom of upload container
  useEffect(() => {
    const alignSocialProof = () => {
      if (uploadContainerRef.current && leftSectionRef.current) {
        const socialProofElement = leftSectionRef.current.querySelector('[data-social-proof]') as HTMLElement;
        
        if (socialProofElement) {
          // Get the Card's bottom position
          const cardRect = uploadContainerRef.current.getBoundingClientRect();
          const cardBottom = cardRect.bottom;
          
          // Get the left section's top position
          const leftSectionRect = leftSectionRef.current.getBoundingClientRect();
          const leftSectionTop = leftSectionRect.top;
          
          // Calculate the Card's height from the left section's top
          const cardHeightFromLeftTop = cardBottom - leftSectionTop;
          
          // Get all content above social proof (including margins)
          let contentAboveHeight = 0;
          const children = Array.from(leftSectionRef.current.children);
          const socialProofIndex = children.indexOf(socialProofElement);
          
          for (let i = 0; i < socialProofIndex; i++) {
            const child = children[i] as HTMLElement;
            const childRect = child.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(child);
            const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
            contentAboveHeight += childRect.height + marginBottom;
          }
          
          // Get social proof height
          const socialProofHeight = socialProofElement.getBoundingClientRect().height;
          
          // Calculate margin needed: card bottom should align with social proof bottom
          // cardHeightFromLeftTop = contentAboveHeight + margin + socialProofHeight
          const marginNeeded = cardHeightFromLeftTop - contentAboveHeight - socialProofHeight;
          
          if (marginNeeded > 0) {
            setSocialProofMargin(marginNeeded);
          } else {
            setSocialProofMargin(0);
          }
        }
      }
    };

    // Use setTimeout to ensure DOM is fully rendered
    const timeoutId = setTimeout(alignSocialProof, 100);
    window.addEventListener('resize', alignSocialProof);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', alignSocialProof);
    };
  }, [previewUrl, user, isPremium, remainingScans]);


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
          result: {
            ...analysis.analysis,
            ...(analysis.insights ? { insights: analysis.insights } : {}),
          },
        });
        
        toast({
          title: t("common.scancomplete"),
          description: `${newCount} ${t("hero.freescansleft")}`,
        });
        
        router.push(`/food-results?id=${scanId}`);
      } else {
        if (!isPremium) {
          const available = await hasFreeScanAvailable();
          if (!available) {
          toast({
            title: t("common.dailylimitreached"),
            description: t("hero.upgradeunlimited"),
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
          result: {
            ...analysis.analysis,
            ...(analysis.insights ? { insights: analysis.insights } : {}),
          },
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
        title: t("common.error"),
        description: e?.message || t("common.failedanalyze"),
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
            <div className="inline-block max-w-[32rem] sm:max-w-[36rem] mx-auto">
              <h1
                className="w-full text-3xl sm:text-4xl font-bold mb-4 leading-tight tracking-tight break-words"
                style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
              >
                {(() => {
                  const title = t("hero.title");
                  if (title.includes("Free AI Food Scanner")) {
                    return (
                      <>
                        <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                          Free AI Food Scanner
                        </span>
                        <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                          and <span className="text-primary whitespace-normal lg:whitespace-nowrap">Calorie Estimator</span>
                        </span>
                      </>
                    );
                  }
                  if (title.includes("Free Calorie Estimator")) {
                    const shazamMatch = title.match(/\(It's Shazam For Food\)/);
                    return (
                      <>
                        <span className="text-black dark:text-white whitespace-normal">Free </span>
                        <span className="text-primary whitespace-normal">Calorie Estimator</span>
                        {shazamMatch && (
                          <>
                            <br />
                            <span className="text-black dark:text-white whitespace-normal text-2xl sm:text-3xl">{shazamMatch[0]}</span>
                          </>
                        )}
                      </>
                    );
                  }
                  // Fallback for other languages
                  const parts = title.split(/Food Meals|food meals|Comidas|comidas|Repas|repas|Mahlzeiten|mahlzeiten|Pasti|pasti|Refeições|refeições|餐食|食事|وجبات/i);
                  const match = title.match(/Food Meals|food meals|Comidas|comidas|Repas|repas|Mahlzeiten|mahlzeiten|Pasti|pasti|Refeições|refeições|餐食|食事|وجبات/i);
                  return (
                    <>
                      <span className="text-black dark:text-white whitespace-normal">{parts[0]}</span>
                      {match && <span className="text-primary whitespace-normal">{match[0]}</span>}
                      {parts[1] && <span className="text-black dark:text-white whitespace-normal">{parts[1]}</span>}
                    </>
                  );
                })()}
          </h1>
              <p
                className="w-full text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed block text-center sm:text-left"
                style={{ width: "100%", maxWidth: "100%", fontSize: "125%", wordWrap: "break-word", overflowWrap: "break-word", boxSizing: "border-box" }}
                dangerouslySetInnerHTML={{ __html: t("hero.description") }}
              >
            </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
            {!user ? (
              <>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto"
                  onClick={handleGetStarted}
                >
                  {t("common.getstartedforfree")}
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto" asChild>
                  <Link href="/how-it-works">{t("common.howitworks")}</Link>
                </Button>
              </>
            ) : isPremium ? (
              <>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto"
                  asChild
                >
                  <Link href="/my-food-analytics">{t("common.macroanalytics")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto" asChild>
                  <Link href="/scan-histories">{t("common.scanhistory")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-hover text-sm sm:text-base w-full sm:w-auto"
                  asChild
                >
                  <Link href="/pricing">{t("common.gopremium")}</Link>
                </Button>
                <Button size="lg" variant="outline" className="text-sm sm:text-base w-full sm:w-auto" asChild>
                  <Link href="/pricing">{t("common.unlockfeatures")}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Free scans text */}
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            {user ? (
              isPremium ? (
                t("hero.unlimitedscans")
              ) : remainingScans === null ? (
                t("hero.checkingscans")
              ) : remainingScans > 0 ? (
                `${remainingScans} ${t("hero.scansremaining")}`
              ) : (
                t("hero.allscansused")
              )
            ) : remainingScans === null ? (
              t("hero.checkingfree")
            ) : (
              `${remainingScans} ${t("hero.nosignup")}`
            )}
          </p>

          {/* Upload Card */}
          <div className="w-full">
            <Card className="dark:border-white">
              <CardContent className="p-4 sm:p-6 md:p-8">
                {!previewUrl ? (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 cursor-pointer bg-gradient-card hover:border-primary/50 transition-colors">
                    <Upload className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                    <p className="text-base sm:text-lg font-medium mb-2 text-center">{t("hero.uploadfoodphoto")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 text-center">
                  {t("hero.dropimage")}
                </p>
                    <div className="flex justify-center">
                      <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" onClick={onChooseFile} disabled={uploading}>
                  {t("hero.choosefile")}
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

          {/* Social proof row for mobile - below upload card */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-[15px]">
            <div className="flex -space-x-2">
              <img 
                src="https://cdn.senja.io/public/media/2Gy86pCPjyR9b6zUwJjDPws2.jpeg?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
              <img 
                src="https://cdn.senja.io/public/media/dN36G7tuWI2QNvUY3GvxqhHS.jpeg?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
              <img 
                src="https://cdn.senja.io/public/media/MuiigrWvcefNTcmrlhlLhbcD.jpeg?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
              <img 
                src="https://cdn.senja.io/public/media/s5QLCiQI0A7sPgfkroHekVgI.jpeg?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
              <img 
                src="https://cdn.senja.io/public/media/MieZXnLYNCXCycU6M5JBD9zL.jpeg?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
              <img 
                src="https://cdn.senja.io/public/media/dYNtwNMbfIVzHIYhO017e8VW.jpeg?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
              <img 
                src="https://cdn.senja.io/public/media/cxWlU3GytKVXfnpUIu2bLRnV.png?width=63&height=63&format=webp" 
                alt="User" 
                className="h-10 w-10 rounded-full border-2 border-background object-cover"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center whitespace-nowrap">{t("hero.lovedby")}</p>
          </div>

          {/* Feature boxes - after upload card on mobile */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 mt-6 w-full">
            <div className="flex items-center gap-3 rounded-xl border border-input dark:border-white bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("hero.aiaccuracy")}</p>
                <p className="text-xs text-muted-foreground">{t("hero.understands10k")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-input dark:border-white bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <Timer className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("hero.instantresults")}</p>
                <p className="text-xs text-muted-foreground">{t("hero.nutritionseconds")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-input dark:border-white bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("hero.healthfocused")}</p>
                <p className="text-xs text-muted-foreground">{t("hero.macrosmicronutrients")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Two Column */}
        <div className="hidden lg:flex items-center w-full">
          <div className="w-full flex flex-row items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            {/* Left Section - Value Proposition (aligned with logo) */}
            <div ref={leftSectionRef} className="w-full text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start flex flex-col lg:mt-1.5 xl:mt-2">
              <div className="w-full">
                <h1
                  className={`w-full text-3xl sm:text-4xl md:text-5xl ${language === "en" ? "lg:text-[3.1rem] xl:text-[3.35rem]" : "lg:text-[3.5rem]"} font-bold mb-4 sm:mb-6 leading-tight tracking-tight break-words`}
                  style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
                >
                  {(() => {
                    const title = t("hero.title");
                  if (title.includes("Free AI Food Scanner")) {
                    return (
                      <>
                        <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                          Free AI Food Scanner
                        </span>
                        <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                          and <span className="text-primary whitespace-normal lg:whitespace-nowrap">Calorie Estimator</span>
                        </span>
                      </>
                    );
                  }
                    if (title.includes("Free Calorie Estimator")) {
                      const shazamMatch = title.match(/\(It's Shazam For Food\)/);
                      return (
                        <>
                          <span className="text-black dark:text-white whitespace-normal">Free </span>
                          <span className="text-primary whitespace-normal">Calorie Estimator</span>
                          {shazamMatch && (
                            <>
                              <br />
                              <span className="text-black dark:text-white whitespace-normal text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem]">{shazamMatch[0]}</span>
                            </>
                          )}
                        </>
                      );
                    }
                    // Fallback for other languages
                    const parts = title.split(/Food Meals|food meals|Comidas|comidas|Repas|repas|Mahlzeiten|mahlzeiten|Pasti|pasti|Refeições|refeições|餐食|食事|وجبات/i);
                    const match = title.match(/Food Meals|food meals|Comidas|comidas|Repas|repas|Mahlzeiten|mahlzeiten|Pasti|pasti|Refeições|refeições|餐食|食事|وجبات/i);
                    return (
                      <>
                        <span className="text-black dark:text-white whitespace-normal">{parts[0]}</span>
                        {match && <span className="text-primary whitespace-normal">{match[0]}</span>}
                        {parts[1] && <span className="text-black dark:text-white whitespace-normal">{parts[1]}</span>}
                      </>
                    );
                  })()}
              </h1>
                <p
                  className="w-full text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed block"
                  style={{ width: "100%", maxWidth: "100%", lineHeight: "1.6", fontSize: "125%", wordWrap: "break-word", overflowWrap: "break-word", boxSizing: "border-box" }}
                  dangerouslySetInnerHTML={{ __html: t("hero.description") }}
                >
              </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-start">
                {!user ? (
                  <>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary-hover text-sm sm:text-base"
                      onClick={handleGetStarted}
                    >
                      {t("common.getstartedforfree")}
                    </Button>
                    <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                      <Link href="/how-it-works">{t("common.howitworks")}</Link>
                    </Button>
                  </>
                ) : isPremium ? (
                  <>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary-hover text-sm sm:text-base"
                      asChild
                    >
                      <Link href="/my-food-analytics">{t("common.macroanalytics")}</Link>
                    </Button>
                    <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                      <Link href="/scan-histories">{t("common.scanhistory")}</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary-hover text-sm sm:text-base"
                      asChild
                    >
                      <Link href="/pricing">{t("common.gopremium")}</Link>
                    </Button>
                    <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                      <Link href="/pricing">{t("common.unlockfeatures")}</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Free scans text for desktop - after CTAs */}
              <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6 mb-8">
                {user ? (
                  isPremium ? (
                    t("hero.unlimitedscans")
                  ) : remainingScans === null ? (
                    t("hero.checkingscans")
                  ) : remainingScans > 0 ? (
                    `${remainingScans} ${t("hero.scansremaining")}`
                  ) : (
                    t("hero.allscansused")
                  )
                ) : remainingScans === null ? (
                  t("hero.checkingfree")
                ) : (
                  `${remainingScans} ${t("hero.nosignup")}`
                )}
              </p>
              







              {/* Social proof row for desktop - below free scans text */}
              <div data-social-proof className="flex items-center gap-3" style={{ marginTop: `${socialProofMargin}px` }}>
                <div className="flex -space-x-2">
                  <img 
                    src="https://cdn.senja.io/public/media/2Gy86pCPjyR9b6zUwJjDPws2.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/dN36G7tuWI2QNvUY3GvxqhHS.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/MuiigrWvcefNTcmrlhlLhbcD.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/s5QLCiQI0A7sPgfkroHekVgI.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/MieZXnLYNCXCycU6M5JBD9zL.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/dYNtwNMbfIVzHIYhO017e8VW.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/cxWlU3GytKVXfnpUIu2bLRnV.png?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  <img 
                    src="https://cdn.senja.io/public/media/LhMjqn20ib2xiNbIRDKUTWiu.jpeg?width=63&height=63&format=webp" 
                    alt="User" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">{t("hero.lovedby")}</p>
              </div>
            </div>

            {/* Right Section - Upload Placeholder (aligned with profile) */}
            <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2 flex flex-col">
              <Card className="dark:border-white" ref={uploadContainerRef}>
                <CardContent className="p-4 sm:p-6 md:p-8">
                  {!previewUrl ? (
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 cursor-pointer bg-gradient-card hover:border-primary/50 transition-colors">
                      <Upload className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-medium mb-2 text-center">{t("hero.uploadfoodphoto")}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 text-center">
                        {t("hero.dropimage")}
                      </p>
                      <div className="flex justify-center">
                        <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" onClick={onChooseFile} disabled={uploading}>
                          {t("hero.choosefile")}
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
                              {t("hero.analyzing")}
                            </>
                          ) : (
                            t("hero.analyzefood")
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
                          {t("hero.changephoto")}
                        </Button>
                      </div>
                    </div>
                  )}
            </CardContent>
          </Card>
              
              {/* Feature boxes for desktop - below upload container */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                <div className="flex items-center gap-3 rounded-xl border border-input dark:border-white bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("hero.aiaccuracy")}</p>
                    <p className="text-xs text-muted-foreground">{t("hero.understands10k")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-input dark:border-white bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <Timer className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("hero.instantresults")}</p>
                    <p className="text-xs text-muted-foreground">{t("hero.nutritionseconds")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-input dark:border-white bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("hero.healthfocused")}</p>
                    <p className="text-xs text-muted-foreground">{t("hero.macrosmicronutrients")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}