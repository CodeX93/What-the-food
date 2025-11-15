'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeFood,
  scaleNutrients,
  type FoodAnalysis,
  getPersonalizedInsights,
  getImageUrl,
} from "@/utils/foodScan";
import { hasActivePremiumSubscription } from "@/utils/subscription";
import {
  Loader2,
  Salad,
  Share2,
  ArrowLeft,
  FileDown,
  Shield,
  Wand2,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  Flame,
  Beef,
  Apple,
  Droplet,
  Wheat,
  Candy,
  Zap,
  Target,
  Heart,
  Sparkles,
  Crown,
  Info,
  Pencil,
  AlertCircle,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function FoodResultsClient() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? null;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [servingsInput, setServingsInput] = useState("1");
  const MIN_SERVINGS = 0.001;

  const applyServings = (next: number) => {
    const clamped = Number(next.toFixed(3));
    setServings(clamped);
    setServingsInput(clamped.toString());
  };

  const [savedServings, setSavedServings] = useState(1);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePath, setImagePath] = useState<string>("");
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  // These will be populated from profile automatically
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [profileGender, setProfileGender] = useState<string | null>(null);
  const [activity] = useState<string>("moderate"); // Default value
  const [goal] = useState<string>("maintenance"); // Default value
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsText, setInsightsText] = useState<string>("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [savingServings, setSavingServings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [ingredientEditorOpen, setIngredientEditorOpen] = useState(false);
  const [ingredientInput, setIngredientInput] = useState("");
  const [updatingIngredients, setUpdatingIngredients] = useState(false);
  const [analysisRefreshing, setAnalysisRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const servingApproximation = useMemo(() => {
    // First, check if servingWeightGrams is available from Gemini
    if (analysis?.servingWeightGrams && analysis.servingWeightGrams > 0) {
      return {
        grams: analysis.servingWeightGrams,
        label: analysis.servingSize || "1 serving"
      };
    }
    
    // Fallback to approximation if servingWeightGrams is not available
    if (!analysis?.servingSize) return null;
    const size = analysis.servingSize.toLowerCase();
    const approximations = [
      { keywords: ["cup"], label: "1 cup", grams: 250 },
      { keywords: ["slice"], label: "1 slice", grams: 60 },
      { keywords: ["portion", "serving"], label: "1 portion", grams: 200 },
      { keywords: ["piece"], label: "1 piece", grams: 50 },
    ];

    for (const approx of approximations) {
      if (approx.keywords.some((keyword) => size.includes(keyword))) {
        return approx;
      }
    }
    return null;
  }, [analysis?.servingSize, analysis?.servingWeightGrams]);

  const handleOpenIngredientEditor = () => {
    if (analysis) {
      setIngredientInput((analysis.ingredients ?? []).join("\n"));
    }
    setIngredientEditorOpen(true);
  };

  const handleIngredientUpdate = async () => {
    if (!analysis) {
      toast({
        title: "No analysis available",
        description: "Please run a scan before editing ingredients.",
        variant: "destructive",
      });
      return;
    }

    const cleaned = ingredientInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!cleaned.length) {
      toast({
        title: "Add at least one ingredient",
        description: "Each ingredient should be on its own line.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingIngredients(true);
    setAnalysisRefreshing(true);
    try {
      let sourceUrl = imageUrl;
      if (imagePath) {
        const fresh = await getImageUrl(imagePath, 60 * 5);
        if (fresh) {
          sourceUrl = fresh;
          setImageUrl(fresh);
        }
      }

      if (!sourceUrl) {
        throw new Error("Image reference expired. Please re-upload the meal photo.");
      }

      const { analysis: updatedAnalysis } = await analyzeFood(sourceUrl, servings, undefined, {
        overrideIngredients: cleaned,
      });

      setAnalysis(updatedAnalysis);
      applyServings(servings);
      setIngredientInput((updatedAnalysis.ingredients ?? []).join("\n"));
      setIngredientEditorOpen(false);
      setInsightsText("");
      setUpgradeRequired(false);

      if (id) {
        try {
          await (supabase as any)
            .from("food_scans")
            .update({ result_json: updatedAnalysis })
            .eq("id", id);
        } catch (err) {
          console.error("Failed to persist updated analysis", err);
        }
      }

      toast({
        title: "Ingredients updated",
        description: "Nutrition values were recalculated using your adjustments.",
      });
    } catch (error: any) {
      console.error("Ingredient update failed:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Could not refresh the analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingIngredients(false);
      setAnalysisRefreshing(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/food-results?id=${id}`;
      const shareData = {
        title: analysis?.dish || "Food Analysis Results",
        text: `Check out this food analysis: ${analysis?.dish || "Food scan"}`,
        url: shareUrl,
      };

      // Try Web Share API first (mobile-friendly)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Food analysis results shared successfully.",
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Food analysis link has been copied to your clipboard.",
        });
      }
    } catch (error: any) {
      // User cancelled share or clipboard failed
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        // Fallback to copying URL
        try {
          const shareUrl = `${window.location.origin}/food-results?id=${id}`;
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied!",
            description: "Food analysis link has been copied to your clipboard.",
          });
        } catch (clipboardError) {
          toast({
            title: "Share failed",
            description: "Unable to share. Please copy the URL manually.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleExportPdf = async () => {
    if (!hasPremiumAccess) {
      toast({
        title: "Premium Feature",
        description: "You need to upgrade your plan to download the results in PDF.",
      });
      return;
    }

    if (!analysis || !reportRef.current) {
      toast({
        title: "Nothing to export",
        description: "Run a scan first so we can capture the results.",
        variant: "destructive",
      });
      return;
    }

    setExportingPdf(true);
    const node = reportRef.current;
    node.classList.add("pdf-capturing");
    const waitForReflow = () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => resolve(null));
      });

    try {
      const backgroundColor = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
      await waitForReflow();
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = canvas.width;
      const pdfHeight = canvas.height;
      const pdf = new jsPDF("p", "px", [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const safeTitle = (analysis.dish || "food-result").replace(/[^\w\d_-]+/g, "-");
      pdf.save(`${safeTitle}.pdf`);
      toast({
        title: "PDF ready",
        description: "We saved the exact screen layout to your downloads.",
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export failed",
        description: "We couldn't capture the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      node.classList.remove("pdf-capturing");
      setExportingPdf(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) {
          router.push("/dashboard");
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        setIsAuthenticated(!!user);
        if (user) {
          try {
            setCheckingPremium(true);
            const premium = await hasActivePremiumSubscription(user.id);
            setHasPremiumAccess(premium);
            
            // Fetch profile to check completion
            const { data: profileData } = await (supabase as any)
              .from("profiles")
              .select("full_name, gender, age, weight_kg, height_cm")
              .eq("id", user.id)
              .maybeSingle();
            
            if (profileData) {
              setProfile(profileData);
              // Set profile values for insights
              setProfileAge(profileData.age || null);
              setProfileGender(profileData.gender || null);
              // Check if profile is complete
              const isComplete = 
                profileData.full_name &&
                profileData.gender &&
                profileData.age !== null &&
                profileData.weight_kg !== null &&
                profileData.height_cm !== null;
              setProfileComplete(isComplete);
            } else {
              setProfileComplete(false);
            }
          } catch (error) {
            console.error("Failed to determine premium status or fetch profile", error);
            setHasPremiumAccess(false);
            setProfileComplete(false);
          } finally {
            setCheckingPremium(false);
          }
        } else {
          setHasPremiumAccess(false);
          setCheckingPremium(false);
          setProfileComplete(true); // Don't show notice for non-authenticated users
        }

        const { data, error } = await supabase
          .from("food_scans")
          .select("image_url, image_path, serving, result_json")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          router.push("/dashboard");
          return;
        }

        const scanRecord = data as {
          serving?: number | null;
          result_json?: unknown;
          image_path?: string | null;
          image_url?: string | null;
        };

        applyServings(scanRecord.serving || 1);
        setSavedServings(scanRecord.serving || 1);
        setAnalysis((scanRecord.result_json as FoodAnalysis) || null);
        setImagePath(scanRecord.image_path || "");
        const freshUrl = scanRecord.image_path ? await getImageUrl(scanRecord.image_path, 60 * 60) : null;
        setImageUrl(freshUrl || scanRecord.image_url || "");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, router]);

  useEffect(() => {
    if (analysis) {
      setIngredientInput((analysis.ingredients ?? []).join("\n"));
    }
  }, [analysis]);

  // Auto-generate insights when analysis loads and user has complete profile and premium access
  useEffect(() => {
    const autoGenerateInsights = async () => {
      if (
        !id ||
        !analysis ||
        loading ||
        insightsLoading ||
        insightsText ||
        !isAuthenticated ||
        !hasPremiumAccess ||
        checkingPremium ||
        !profileComplete ||
        !profileAge ||
        !profileGender
      ) {
        return;
      }

      try {
        setInsightsLoading(true);
        setUpgradeRequired(false);
        const res = await getPersonalizedInsights({
          scanId: id,
          age: profileAge,
          gender: profileGender,
          activity,
          goal,
          optimize: false,
          weight_kg: profile?.weight_kg,
          height_cm: profile?.height_cm,
        });
        if (res.upgrade) {
          setUpgradeRequired(true);
          return;
        }
        setInsightsText(res.insights || "");
      } catch (error) {
        console.error("Failed to auto-generate insights:", error);
        // Silently fail - user can still generate manually if needed
      } finally {
        setInsightsLoading(false);
      }
    };

    autoGenerateInsights();
  }, [id, analysis, loading, isAuthenticated, hasPremiumAccess, checkingPremium, profileComplete, profileAge, profileGender, profile, activity, goal, insightsLoading, insightsText]);

  const scaled = useMemo(
    () => (analysis ? scaleNutrients(analysis.nutrients, servings) : null),
    [analysis, servings]
  );

  const parsedInsights = useMemo(() => {
    if (!insightsText) return null;

    const sections = {
      healthContext: "",
      substitutions: [] as Array<{ title: string; description: string }>,
      demographics: "",
    };

    const contextWithDemoMatch = insightsText.match(
      /Personalized Health Context\s*\(([^)]+)\)[:\s]*(.*?)(?=Smart Substitution Suggestions|$)/is
    );
    if (contextWithDemoMatch) {
      sections.demographics = contextWithDemoMatch[1].trim();
      let contextText = contextWithDemoMatch[2].trim();
      contextText = contextText.replace(/^[^:]*:\s*[^,]+(?:,\s*[^:]+:\s*[^,]+)*\)?\s*:/i, "").trim();
      sections.healthContext = contextText;
    } else {
      const contextMatch = insightsText.match(
        /Personalized Health Context[^:]*:\s*(.*?)(?=Smart Substitution Suggestions|$)/is
      );
      if (contextMatch) {
        let contextText = contextMatch[1].trim();
        const demoPattern = /Age:\s*[^,]+(?:,\s*[^:]+:\s*[^,]+)*/i;
        const demoMatch = contextText.match(demoPattern);
        if (demoMatch) {
          sections.demographics = demoMatch[0].trim();
          contextText = contextText
            .replace(new RegExp(demoMatch[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[):]?\\s*", "i"), "")
            .trim();
        }
        sections.healthContext = contextText;
      }
    }

    sections.healthContext = sections.healthContext
      .replace(/^\d+\)\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/\s+\d+\)\s*$/, "")
      .replace(/\s+\d+\.\s*$/, "")
      .replace(/^\s*[^a-zA-Z]*\s*/, "")
      .trim();

    if (sections.demographics) {
      sections.demographics = sections.demographics.replace(/\)\s*$/, "").trim();
    }

    const subsMatch = insightsText.match(/Smart Substitution Suggestions:?\s*(.*?)$/is);
    if (subsMatch) {
      const subsText = subsMatch[1].trim();
      let items: string[] = [];
      const splitPattern = /(?=[*-]\s*\*\*)/;
      const splitItems = subsText.split(splitPattern).filter((item) => item.trim());

      if (splitItems.length > 1) {
        items = splitItems;
      } else {
        items = subsText.split(/(?=\d+\.\s*(?:\*\*|))/).filter((item) => item.trim());
        if (items.length <= 1) {
          items = subsText.split(/(?=[*-]\s*\*\*)/).filter((item) => item.trim());
        }
      }

      sections.substitutions = items
        .map((item) => {
          const markdownMatch = item.match(/[*-]\s*\*\*([^*]+)\*\*[:\s]*(.*?)(?=\s*[*-]\s*\*\*|$)/s);
          if (markdownMatch) {
            return {
              title: markdownMatch[1].trim(),
              description: markdownMatch[2].trim().replace(/\.\s*$/, ""),
            };
          }

          const numberedBoldMatch = item.match(/\d+\.\s*\*\*([^*]+)\*\*[:\s]*(.*?)(?=\s*\d+\.\s*\*\*|$)/s);
          if (numberedBoldMatch) {
            return {
              title: numberedBoldMatch[1].trim(),
              description: numberedBoldMatch[2].trim().replace(/\.\s*$/, ""),
            };
          }

          const numberedPlainMatch = item.match(/\d+\.\s*([^:]+):\s*(.*?)(?=\s*\d+\.|$)/s);
          if (numberedPlainMatch) {
            return {
              title: numberedPlainMatch[1].trim(),
              description: numberedPlainMatch[2].trim().replace(/\.\s*$/, ""),
            };
          }

          const plainBulletMatch = item.match(/[*-]\s*([^:]+):\s*(.*?)(?=\s*[*-]|$)/s);
          if (plainBulletMatch) {
            return {
              title: plainBulletMatch[1].trim(),
              description: plainBulletMatch[2].trim().replace(/\.\s*$/, ""),
            };
          }

          const cleaned = item.replace(/^[*-]\s*|\d+\.\s*/, "").replace(/\*\*/g, "").trim();
          return { title: "", description: cleaned };
        })
        .filter((item) => item.description && item.description.length > 0);
    }

    return sections;
  }, [insightsText]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
            <Salad className="h-8 w-8 text-primary absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading your food analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to muted/20">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Salad className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No result found.</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1">
      <div className="container mx-auto px-4 py-6 md:py-8 relative w-full" ref={reportRef}>
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()} className="px-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2">
                  <Salad className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  {analysis.dish || "Food Result"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={exportingPdf || !hasPremiumAccess}
                        variant={!hasPremiumAccess ? "outline" : "default"}
                      >
                        {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                        {exportingPdf ? "Preparing…" : "PDF"}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!hasPremiumAccess && (
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>You need to upgrade your plan to download the results in PDF</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {isAuthenticated && !profileComplete && (
          <Alert className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <User className="h-4 w-4 text-primary" />
            <AlertTitle className="font-semibold">Complete Your Profile</AlertTitle>
            <AlertDescription className="mt-1">
              Complete your profile to get more personalized nutrition insights and recommendations tailored to your age, gender, weight, and height.
              <Button
                variant="link"
                className="p-0 h-auto ml-1 text-primary font-semibold underline"
                onClick={() => router.push("/profile")}
              >
                Complete Profile →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <Card className="overflow-hidden sticky top-6">
              {imageUrl ? (
                <div className="aspect-square relative overflow-hidden">
                  <img src={imageUrl} alt={analysis.dish || "Food"} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center text-muted-foreground bg-muted">
                  <Salad className="h-16 w-16 opacity-30" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Confidence</span>
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            aria-label="Confidence info"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                          >
                            <Info className="h-3 w-3" strokeWidth={2} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start" className="max-w-xs text-xs leading-relaxed">
                          AI confidence can fluctuate with image quality, lighting, angle, and other visual factors.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="font-semibold">{Math.round((analysis.confidence || 0) * 100)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.round((analysis.confidence || 0) * 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                      Nutrition Summary
                      {servingApproximation && (
                        <span className="text-base font-normal text-muted-foreground whitespace-nowrap">
                          (~ {servingApproximation.grams}g)
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Servings</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="border rounded-lg px-3 py-2 w-28 text-center font-medium bg-background flex-shrink-0"
                        value={servingsInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setServingsInput(raw);

                          const sanitized = raw.replace(/[^0-9.]/g, "");
                          const dots = (sanitized.match(/\./g) ?? []).length;
                          if (dots > 1) {
                            return;
                          }

                          const parsed = parseFloat(sanitized);
                          if (!Number.isNaN(parsed) && parsed >= MIN_SERVINGS) {
                            applyServings(parsed);
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(servingsInput);
                          if (!Number.isNaN(parsed) && parsed >= MIN_SERVINGS) {
                            applyServings(parsed);
                          } else {
                            applyServings(MIN_SERVINGS);
                          }
                        }}
                      />
                      {isAuthenticated && servings !== savedServings && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!id) return;
                            try {
                              setSavingServings(true);
                              const { error } = await (supabase as any)
                                .from("food_scans")
                                .update({ serving: Number(servings) })
                                .eq("id", id);

                              if (error) {
                                console.error("Failed to update serving in database:", error);
                                toast({
                                  title: "Error",
                                  description: `Failed to save: ${error.message}`,
                                  variant: "destructive",
                                });
                                return;
                              }

                              setSavedServings(servings);
                              toast({
                                title: "Servings saved",
                                description: "Your serving size has been updated successfully.",
                              });
                            } catch (error: any) {
                              console.error("Failed to update serving in database:", error);
                              toast({
                                title: "Error",
                                description: error?.message || "Failed to save serving size. Please try again.",
                                variant: "destructive",
                              });
                            } finally {
                              setSavingServings(false);
                            }
                          }}
                          disabled={savingServings}
                        >
                          {savingServings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {analysis.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
                      {analysis.description}
                    </p>
                  )}
                  {analysis.tags && analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {analysis.tags.map((tag, index) => {
                        const palette = [
                          "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4)]",
                          "bg-sky-50 text-sky-700 border border-sky-200 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.3)]",
                          "bg-rose-50 text-rose-700 border border-rose-200 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)]",
                          "bg-amber-50 text-amber-700 border border-amber-200 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4)]",
                        ];
                        const colors = palette[index % palette.length];
                        return (
                          <span
                            key={`${tag}-${index}`}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize tracking-tight ${colors}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {analysis.servingGuidance && (
                  <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                    {analysis.servingGuidance}
                  </div>
                )}
                {!analysis.servingGuidance && servingApproximation && (
                  <div className="mb-4 rounded-lg border border-muted/50 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{servingApproximation.label}</span> ≈ {servingApproximation.grams} grams. To adjust servings, divide your dish weight (in grams) by {servingApproximation.grams}. For example, 650 g ÷ {servingApproximation.grams} ≈ {(650 / servingApproximation.grams).toFixed(1)} servings.
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: Flame, label: "Calories", value: scaled?.calories ?? "-", suffix: "", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
                    { icon: Beef, label: "Protein", value: scaled?.protein_g ?? "-", suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
                    { icon: Wheat, label: "Carbs", value: scaled?.carbohydrates_g ?? "-", suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
                    { icon: Droplet, label: "Fat", value: scaled?.fat_g ?? "-", suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
                    { icon: Apple, label: "Fiber", value: scaled?.fiber_g ?? "-", suffix: "g", style: "bg-emerald-100/90 border-emerald-200 text-emerald-900" },
                    { icon: Candy, label: "Sugar", value: scaled?.sugar_g ?? "-", suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm ${item.style}`}
                    >
                      <div className="p-2 rounded-lg bg-background/40">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{item.label}</div>
                        <div className="text-xl font-semibold">
                          {item.value}
                          {item.value !== "-" ? item.suffix : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              {analysisRefreshing && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Apple className="h-5 w-5 text-primary" />
                      <CardTitle>Ingredients</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenIngredientEditor}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  <CardDescription>Detected/estimated ingredients</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.ingredients?.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-md center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle>How to Prepare</CardTitle>
                  </div>
                  <CardDescription>Step-by-step instructions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {analysis.instructions?.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>

            {analysis.additionalInfo && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <AlertTitle>Additional Information</AlertTitle>
                    <AlertDescription className="text-sm leading-relaxed">
                      {analysis.additionalInfo}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}

            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">Personalized Health Context</CardTitle>
                      <CardDescription>Demographic-aware insights tailored to your goals</CardDescription>
                    </div>
                  </div>
                  {(upgradeRequired || !hasPremiumAccess) && (
                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1 border border-primary/20">
                      <Sparkles className="h-3 w-3" /> Premium
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {checkingPremium ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !hasPremiumAccess ? (
                  <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center">
                    <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden>
                      <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/30 blur-3xl" />
                      <div className="absolute -bottom-12 -left-12 h-40 w-40 bg-emerald-400/20 blur-3xl" />
                    </div>
                    <div className="relative flex flex-col items-center gap-4">
                      <div className="p-4 rounded-2xl bg-primary/15 border border-primary/30 shadow-inner">
                        <Crown className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold tracking-tight">Get Premium to unlock this section</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Personalized Health Context provides AI-powered wellness guidance tailored to your unique goals. Upgrade to reveal insights crafted specifically for you.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3">
                        {!isAuthenticated && (
                          <Button variant="outline" onClick={() => router.push("/auth")}>
                            Sign In
                          </Button>
                        )}
                        <Button className="bg-primary hover:bg-primary-hover" onClick={() => router.push("/plans")}>
                          <Sparkles className="h-4 w-4 mr-2" /> Explore Premium
                        </Button>
                      </div>
                      <div className="mt-6 grid sm:grid-cols-3 gap-4 text-left w-full max-w-3xl">
                        <div className="rounded-xl border border-primary/10 bg-background/60 p-4">
                          <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                            <Heart className="h-4 w-4 text-primary" /> Tailored Guidance
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Receive context-aware advice that adapts to your age, activity level, and health goals.
                          </p>
                        </div>
                        <div className="rounded-xl border border-primary/10 bg-background/60 p-4">
                          <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-primary" /> Smart Substitutions
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Unlock creative ingredient swaps to make every meal healthier without compromising taste.
                          </p>
                        </div>
                        <div className="rounded-xl border border-primary/10 bg-background/60 p-4">
                          <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" /> Premium Dashboard
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Track your progress with advanced analytics and save personalized recommendations.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {!profileComplete && (
                      <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Complete Your Profile</AlertTitle>
                        <AlertDescription>
                          Complete your profile to get personalized insights automatically. 
                          <Button
                            variant="link"
                            className="p-0 h-auto ml-1 text-amber-900 font-semibold underline"
                            onClick={() => router.push("/profile")}
                          >
                            Complete Profile →
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    {insightsLoading && !insightsText && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">Generating personalized insights...</span>
                      </div>
                    )}
                    {profileComplete && !insightsLoading && !insightsText && (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-4">
                          Insights will be generated automatically using your profile data.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            variant="outline"
                            disabled={insightsLoading}
                            onClick={async () => {
                              if (!id || !profileAge || !profileGender) return;
                              try {
                                setInsightsLoading(true);
                                setUpgradeRequired(false);
                                const res = await getPersonalizedInsights({
                                  scanId: id,
                                  age: profileAge,
                                  gender: profileGender,
                                  activity,
                                  goal,
                                  optimize: false,
                                  weight_kg: profile?.weight_kg,
                                  height_cm: profile?.height_cm,
                                });
                                if (res.upgrade) {
                                  setUpgradeRequired(true);
                                  setInsightsText("");
                                  return;
                                }
                                setInsightsText(res.insights || "");
                              } finally {
                                setInsightsLoading(false);
                              }
                            }}
                          >
                            {insightsLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Heart className="h-4 w-4 mr-2" />
                            )}
                            Generate Insights
                          </Button>
                          <Button
                            variant="outline"
                            disabled={insightsLoading}
                            onClick={async () => {
                              if (!id || !profileAge || !profileGender) return;
                              try {
                                setInsightsLoading(true);
                                setUpgradeRequired(false);
                                const res = await getPersonalizedInsights({
                                  scanId: id,
                                  age: profileAge,
                                  gender: profileGender,
                                  activity,
                                  goal,
                                  optimize: true,
                                  weight_kg: profile?.weight_kg,
                                  height_cm: profile?.height_cm,
                                });
                                if (res.upgrade) {
                                  setUpgradeRequired(true);
                                  setInsightsText("");
                                  return;
                                }
                                setInsightsText(res.insights || "");
                              } finally {
                                setInsightsLoading(false);
                              }
                            }}
                          >
                            {insightsLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            Optimize
                          </Button>
                        </div>
                      </div>
                    )}

                    {upgradeRequired && (
                      <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">Premium Feature</p>
                            <p className="text-sm text-muted-foreground mb-3">
                              Upgrade to Premium to unlock personalized insights and smart substitutions tailored to your goals.
                            </p>
                            <Button size="sm" onClick={() => router.push("/plans")}>
                              <Sparkles className="h-4 w-4 mr-2" /> Upgrade Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {parsedInsights && (
                      <div
                        className="mt-6 space-y-6"
                        data-collapse-gap-in-pdf={insightsText ? "true" : undefined}
                      >
                        {parsedInsights.healthContext && (
                          <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-primary/20 flex-shrink-0">
                                <TrendingUp className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                                  <h4 className="font-bold text-lg">Personalized Health Context</h4>
                                  {parsedInsights.demographics && (
                                    <span className="text-xs font-medium text-muted-foreground bg-background px-3 py-1 rounded-full border border-primary/20">
                                      {parsedInsights.demographics}
                                    </span>
                                  )}
                                </div>
                                <div className="prose prose-sm max-w-none">
                                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                                    {parsedInsights.healthContext}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {parsedInsights.substitutions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Lightbulb className="h-5 w-5 text-primary" />
                              </div>
                              <h4 className="font-bold text-lg">Smart Substitution Suggestions</h4>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              {parsedInsights.substitutions.map((sub, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 p-4 rounded-lg border-2 bg-gradient-to-br from-muted/50 to-muted/30 hover:border-primary/30 transition-colors"
                                >
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    {sub.title && <h5 className="font-semibold mb-2 text-base">{sub.title}</h5>}
                                    <p className="text-sm text-muted-foreground leading-relaxed">{sub.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!parsedInsights.healthContext &&
                          !parsedInsights.substitutions.length &&
                          insightsText && (
                            <div className="rounded-lg border p-4 bg-muted/30">
                              <div className="whitespace-pre-wrap text-sm leading-relaxed">{insightsText}</div>
                            </div>
                          )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </main>
      <Dialog open={ingredientEditorOpen} onOpenChange={setIngredientEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit detected ingredients</DialogTitle>
            <DialogDescription>
              Adjust the ingredient list and quantities. We&apos;ll recalculate the nutrition based on your edits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={Math.max(6, ingredientInput.split("\n").length + 1)}
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              placeholder={"250g cooked chickpeas\n30g tahini\n15ml olive oil\nPaprika, to taste"}
            />
            <p className="text-xs text-muted-foreground">
              Enter one ingredient per line. Use metric units (grams, kg, ml, liters) for quantities. Imperial units (cups, tbsp, oz) will be automatically converted to metric.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIngredientEditorOpen(false)} disabled={updatingIngredients}>
              Cancel
            </Button>
            <Button onClick={handleIngredientUpdate} disabled={updatingIngredients}>
              {updatingIngredients ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...
                </>
              ) : (
                "Update ingredients"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
