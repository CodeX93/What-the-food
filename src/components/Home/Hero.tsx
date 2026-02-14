"use client";

import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertCircle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeFood, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import { decrementFreeScan, hasFreeScanAvailable, getFreeScanStatus } from "@/utils/freeScanLimit";
import { hasActivePremiumSubscription } from "@/utils/subscription";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImage, fileToBase64 } from "@/utils/imageCompression";

export default function Hero() {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // OPTIMIZATION: Initialize with cached data AFTER hydration to avoid mismatch
  const [remainingScans, setRemainingScans] = useState<number | null>(null);
  const [scanStatusType, setScanStatusType] = useState<"registered" | "unregistered" | null>(null);
  // OPTIMIZATION: Start with false to avoid "Checking benefits..." blocking state
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [freePeriodEndDate, setFreePeriodEndDate] = useState<Date | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
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

  // Fetch user count on mount
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const response = await fetch("/api/user-count");
        if (response.ok) {
          const data = await response.json();
          console.log("User count fetched:", data.count);
          setUserCount(data.count || 0);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch user count:", response.status, errorData);
          // Fallback to showing translation if API fails
        }
      } catch (error) {
        console.error("Failed to fetch user count:", error);
        // Fallback to showing translation if fetch fails
      }
    };
    fetchUserCount();
  }, []);

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
              const status = await getFreeScanStatus(); // Always fetches from database
              console.log('[DEBUG] Free scan status:', status);
              setRemainingScans(status.remaining);
              setScanStatusType(status.type);

              // Fetch profile to get account creation date for registered users
              if (status.type === "registered") {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("created_at")
                  .eq("id", authUser.id)
                  .maybeSingle();

                if (profile?.created_at) {
                  // Calculate 3 days from account creation
                  const accountCreatedAt = new Date(profile.created_at);
                  const threeDaysLater = new Date(accountCreatedAt);
                  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
                  setFreePeriodEndDate(threeDaysLater);
                }
              }
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
            const status = await getFreeScanStatus(); // Always fetches from database
            setRemainingScans(status.remaining);
            setScanStatusType(status.type);

            // Fetch profile to get account creation date for registered users
            if (status.type === "registered") {
              const { data: profile } = await supabase
                .from("profiles")
                .select("created_at")
                .eq("id", authUser.id)
                .maybeSingle();

              if (profile?.created_at) {
                // Calculate 3 days from account creation
                const accountCreatedAt = new Date(profile.created_at);
                const threeDaysLater = new Date(accountCreatedAt);
                threeDaysLater.setDate(threeDaysLater.getDate() + 3);
                setFreePeriodEndDate(threeDaysLater);
              }
            }
          } catch (err) {
            setRemainingScans(3);
            setScanStatusType('registered');
          }
        }
      } else {
        setIsPremium(false);

        // Still check scan status for non-logged-in users (non-blocking)
        // Always fetch fresh data from database
        try {
          const status = await getFreeScanStatus(); // Always fetches from database
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

  // Reset image loading state when preview URL changes
  useEffect(() => {
    if (previewUrl) {
      setImageLoading(true);
      // Check if image is already loaded (for blob URLs that load instantly)
      const checkImageLoaded = () => {
        const img = document.querySelector('img[alt="Food preview"]') as HTMLImageElement;
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
  }, [previewUrl]);



  const onChooseFile = () => {
    // Open file picker immediately (must be synchronous for browser security)
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/heic,image/heif";
    // Don't set capture attribute - let user choose between camera and gallery
    input.style.display = "none"; // Hide but keep in DOM for mobile compatibility

    // Add to DOM temporarily for mobile browsers (especially iOS Safari)
    document.body.appendChild(input);

    // Use both onchange property and addEventListener for maximum compatibility
    const handleFileChange = async (e: Event) => {
      setUploading(true);
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

        // Set selected file and show preview immediately
        // We'll store the original file temporarily, but compress it asap
        setSelectedFile(file);

        // Show preview immediately from file blob
        const objectUrl = URL.createObjectURL(file);
        console.log('Created object URL:', objectUrl);
        setPreviewUrl(objectUrl);
        setImageLoading(true); // Start loading state for image rendering

        // Compress the image immediately
        let compressedFile = file;
        try {
          console.log('Compressing image...');
          // setUploading(true); // Loading state started at function entry

          compressedFile = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8
          });

          console.log('Compression complete:', {
            originalSize: file.size,
            compressedSize: compressedFile.size,
            ratio: Math.round((compressedFile.size / file.size) * 100) + '%'
          });

          // Update selected file to the compressed version
          setSelectedFile(compressedFile);
        } catch (error) {
          console.error("Compression error:", error);
          // Fallback to original file
        }

        // If user is authenticated, we used to upload immediately.
        // Now, to prevent the "stuck" state, we DEFER upload until the Analyze button is clicked.
        // This makes the UI feel instant.

        // We still check free scans for non-auth users to prevent "teasing"
        if (!user?.id) {
          console.log('Checking free scans for non-authenticated user...');
          try {
            const available = await hasFreeScanAvailable();
            if (!available) {
              toast({
                title: t("common.dailylimitreached"),
                description: "Please sign up to continue using the service.",
                variant: "destructive",
              });
              setSelectedFile(null);
              setPreviewUrl((prevUrl) => {
                if (prevUrl) {
                  URL.revokeObjectURL(prevUrl);
                }
                return null;
              });
              router.push("/auth");
              cleanup();
              setUploading(false);
              return;
            }
          } catch (err) {
            console.error("Error checking free scans", err);
            // Fail safe: allow them to try, handle error in analyze
          }
        }

        console.log('Ready to analyze');
        setUploading(false);

        cleanup();
      } catch (error: any) {
        console.error("File processing error:", error);
        toast({
          title: "Error Processing File",
          description: error?.message || "Failed to process the selected image. Please try again.",
          variant: "destructive",
        });
        cleanup();
      } finally {
        setUploading(false);
        cleanup();
      }

      function cleanup() {
        input.removeEventListener('change', handleFileChange);
        input.value = '';
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
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
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);

      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // If image was already uploaded (authenticated user), use the uploaded URL
      let imageUrl = uploadedImageUrl;
      let imagePath = uploadedImagePath;

      // PARALLEL EXECUTION STRATEGY
      // We start both Analysis (via Base64) and Upload (for history) simultaneously.

      const currentUserId = userId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 1. Prepare Upload Promise
      // If we already have the URL/Path (from previous attempt?), use it. Otherwise upload.
      const uploadPromise = (async () => {
        if (uploadedImageUrl && uploadedImagePath) {
          return { path: uploadedImagePath, url: uploadedImageUrl };
        }
        console.log("Starting background upload...");
        const uploadResult = await uploadFoodImage(selectedFile, currentUserId);
        return {
          path: uploadResult.path,
          url: uploadResult.signedUrl || uploadResult.publicUrl
        };
      })();

      // 2. Prepare Analysis Promise (Base64 -> Edge Function)
      const analysisPromise = (async () => {
        // Converting to base64 is fast for compressed images
        const base64 = await fileToBase64(selectedFile);
        console.log("Sending analysis request with base64 payload");
        return await analyzeFood(base64, 1);
      })();

      // Wait for both results
      const [uploadResult, analysis] = await Promise.all([uploadPromise, analysisPromise]);

      imagePath = uploadResult.path; // Re-assign to the outer scope variable
      imageUrl = uploadResult.url; // Re-assign to the outer scope variable

      // Logic for non-authenticated users
      if (!userId) {
        // Decrement free scan count
        const newCount = await decrementFreeScan();
        setRemainingScans(newCount);
        setScanStatusType("unregistered");

        // Save history with temp user
        const scanId = await saveScanHistory({
          userId: currentUserId,
          imagePath: imagePath,
          imageUrl: imageUrl,
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

        // Logic for authenticated users

        // Save history and open results page
        const scanId = await saveScanHistory({
          userId,
          imagePath: imagePath,
          imageUrl: imageUrl,
          serving: 1,
          result: {
            ...analysis.analysis,
            ...(analysis.insights ? { insights: analysis.insights } : {}),
          },
        });

        if (!isPremium) {
          // ... decrement logic ...
          try {
            // We don't await this to keep UI snappy
            decrementFreeScan().then(newCount => {
              setRemainingScans(newCount);
              setScanStatusType("registered");
            }).catch(e => console.error("Failed to decrement", e));
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
      setAnalyzing(false);
    } finally {
      // Don't reset analyzing here - let it stay until redirect
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadedImageUrl(null);
      setUploadedImagePath(null);
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
                  if (title.includes("A Macro Tracker Built")) {
                    return (
                      <>
                        <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                          A Macro Tracker Built
                        </span>
                        <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                          <span className="text-primary whitespace-normal lg:whitespace-nowrap">For Daily Eating Habits</span>
                        </span>
                      </>
                    );
                  }
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

          {/* App Store and Play Store Banners */}
          <div className="flex flex-row gap-1 sm:gap-2 justify-center items-center w-full">
            <div
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "The app will be available on the App Store soon!",
                });
              }}
              className="inline-block hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="/appstore-badge.svg"
                alt="Download on the App Store"
                className="h-[42px] w-auto sm:h-[51px] lg:h-[60px] object-contain"
              />
            </div>
            <div
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "The app will be available on Google Play soon!",
                });
              }}
              className="inline-block hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="/playstore-badge.svg"
                alt="Get it on Google Play"
                className="h-[42px] w-auto sm:h-[51px] lg:h-[60px] object-contain"
              />
            </div>
          </div>

          {/* Social proof row for mobile - moved up */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
            <p className="text-sm text-muted-foreground text-center whitespace-nowrap">
              {userCount !== null
                ? `Loved by ${userCount.toLocaleString()} Food Detectives`
                : ("")
              }
            </p>
          </div>

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
                    <div className="relative rounded-lg overflow-hidden bg-muted/30">
                      {imageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                      )}
                      <img
                        src={previewUrl}
                        alt="Food preview"
                        className={`w-full h-64 sm:h-72 md:h-80 object-cover rounded-lg transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"
                          }`}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                        ref={(img) => {
                          // Check if image is already loaded when ref is set (for blob URLs)
                          if (img && img.complete && img.naturalHeight !== 0) {
                            setImageLoading(false);
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                      <Button
                        size="lg"
                        className={`text-sm sm:text-base w-full ${analyzing
                          ? "bg-green-400 hover:bg-green-400 cursor-not-allowed"
                          : "bg-primary hover:bg-primary-hover"
                          }`}
                        onClick={handleAnalyze}
                        disabled={analyzing || uploading}
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing
                          </>
                        ) : (
                          "Analyze Food"
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="text-sm sm:text-base w-full"
                        onClick={() => {
                          if (previewUrl) {
                            URL.revokeObjectURL(previewUrl);
                          }
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setUploadedImageUrl(null);
                          setUploadedImagePath(null);
                          setImageLoading(false);
                          setAnalyzing(false);
                        }}
                        disabled={analyzing || uploading}
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

        {/* Desktop Layout - Two Column */}
        <div className="hidden lg:flex items-center w-full">
          <div className="w-full flex flex-row items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
            {/* Left Section - Value Proposition (aligned with logo) */}
            <div ref={leftSectionRef} className="w-full text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start flex flex-col lg:mt-1.5 xl:mt-2">
              <div className="w-full">
                <h2
                  className={`w-full text-3xl sm:text-4xl md:text-5xl ${language === "en" ? "lg:text-[3.1rem] xl:text-[3.35rem]" : "lg:text-[3.5rem]"} font-bold mb-4 sm:mb-6 leading-tight tracking-tight break-words`}
                  style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
                >
                  {(() => {
                    const title = t("hero.title");
                    if (title.includes("A Macro Tracker Built")) {
                      return (
                        <>
                          <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                            A Macro Tracker Built
                          </span>
                          <span className="text-black dark:text-white whitespace-normal lg:whitespace-nowrap block">
                            <span className="text-primary whitespace-normal lg:whitespace-nowrap">For Daily Eating Habits</span>
                          </span>
                        </>
                      );
                    }
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
                </h2>
                <p
                  className="w-full text-base sm:text-xl md:text-lg text-muted-foreground mb-6 sm:mb-7 leading-relaxed block"
                  style={{ width: "100%", maxWidth: "100%", lineHeight: "1.6", fontSize: "120%", wordWrap: "break-word", overflowWrap: "break-word", boxSizing: "border-box" }}
                  dangerouslySetInnerHTML={{ __html: t("hero.description") }}
                >
                </p>
              </div>
              {/* App Store and Play Store Banners */}
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 justify-start items-center sm:items-start">
                <div
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "The app will be available on the App Store soon!",
                    });
                  }}
                  className="inline-block hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <img
                    src="/appstore-badge.svg"
                    alt="Download on the App Store"
                    className="h-[42px] w-auto sm:h-[51px] lg:h-[60px] object-contain"
                  />
                </div>
                <div
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "The app will be available on Google Play soon!",
                    });
                  }}
                  className="inline-block hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <img
                    src="/playstore-badge.svg"
                    alt="Get it on Google Play"
                    className="h-[42px] w-auto sm:h-[51px] lg:h-[60px] object-contain"
                  />
                </div>
              </div>







              {/* Social proof row for desktop - below free scans text */}
              <div data-social-proof className="flex items-center gap-3 mt-6">
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
                <p className="text-sm text-muted-foreground">
                  {userCount !== null
                    ? `Loved by ${userCount.toLocaleString()} Food Detectives`
                    : ("")
                  }
                </p>
              </div>
            </div>

            {/* Right Section - Upload Placeholder (aligned with profile) */}
            {/* Right Section - Upload Placeholder (aligned with profile) */}
            <div className="w-full max-w-[34rem] lg:max-w-[35rem] xl:max-w-[40rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2 flex flex-col">
              <Card className="dark:border-white" ref={uploadContainerRef}>
                <CardContent className="p-4 sm:p-6 md:p-8">
                  {!previewUrl ? (
                    // Check if guest user has consumed their free scan
                    !user && scanStatusType === "unregistered" && remainingScans === 0 ? (
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 bg-gradient-card">
                        <AlertCircle className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                        <p className="text-base sm:text-lg font-medium mb-2 text-center">
                          ⚠️ You already decoded a meal!
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 text-center">
                          Want to know what this meal actually means for your body, and what to change next?
                        </p>
                        <div className="flex justify-center">
                          <Button
                            size="lg"
                            className="bg-primary hover:bg-primary-hover text-sm sm:text-base"
                            onClick={() => router.push("/auth")}
                          >
                            Continue with free account
                          </Button>
                        </div>
                      </div>
                    ) : // Check if free registered user has consumed their scans (3 scans OR 3 days, whichever comes first)
                      user && !isPremium && scanStatusType === "registered" && remainingScans === 0 ? (
                        <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 bg-gradient-card">
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
                      )
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden bg-muted/30">
                        {imageLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          </div>
                        )}
                        <img
                          src={previewUrl}
                          alt="Food preview"
                          className={`w-full h-64 sm:h-72 md:h-80 object-cover rounded-lg transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"
                            }`}
                          onLoad={() => setImageLoading(false)}
                          onError={() => setImageLoading(false)}
                          ref={(img) => {
                            // Check if image is already loaded when ref is set (for blob URLs)
                            if (img && img.complete && img.naturalHeight !== 0) {
                              setImageLoading(false);
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                        <Button
                          size="lg"
                          className={`text-sm sm:text-base w-full ${analyzing
                            ? "bg-green-400 hover:bg-green-400 cursor-not-allowed"
                            : "bg-primary hover:bg-primary-hover"
                            }`}
                          onClick={handleAnalyze}
                          disabled={analyzing || uploading}
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing
                            </>
                          ) : (
                            t("hero.analyzefood")
                          )}
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="text-sm sm:text-base w-full"
                          onClick={() => {
                            if (previewUrl) {
                              URL.revokeObjectURL(previewUrl);
                            }
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            setUploadedImageUrl(null);
                            setUploadedImagePath(null);
                            setImageLoading(false);
                            setAnalyzing(false);
                          }}
                          disabled={analyzing || uploading}
                        >
                          {t("hero.changephoto")}
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