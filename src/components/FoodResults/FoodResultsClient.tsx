'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FoodResultsClient() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? null;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [savedServings, setSavedServings] = useState(1);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePath, setImagePath] = useState<string>("");
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<string>("");
  const [activity, setActivity] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsText, setInsightsText] = useState<string>("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [savingServings, setSavingServings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  const servingApproximation = useMemo(() => {
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
  }, [analysis?.servingSize]);

  const handleExportPdf = async () => {
    if (!analysis) return;
    const title = analysis.dish || "Food Result";
    const scaledNutrients = scaleNutrients(analysis.nutrients, servings);

    let imageDataUrl = "";

    if (imagePath) {
      try {
        const { data: blobData, error: downloadError } = await supabase.storage
          .from("FoodScans")
          .download(imagePath);

        if (!downloadError && blobData) {
          imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result && typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Failed to convert image"));
              }
            };
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.readAsDataURL(blobData);
          });
        } else {
          const { data: signed } = await supabase.storage
            .from("FoodScans")
            .createSignedUrl(imagePath, 60 * 5);

          if (signed?.signedUrl) {
            const response = await fetch(signed.signedUrl);
            if (response.ok) {
              const blob = await response.blob();
              imageDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (reader.result && typeof reader.result === "string") {
                    resolve(reader.result);
                  } else {
                    reject(new Error("Failed to convert image"));
                  }
                };
                reader.onerror = () => reject(new Error("FileReader error"));
                reader.readAsDataURL(blob);
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to convert image:", e);
        imageDataUrl = "";
      }
    } else if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result && typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Failed to convert image"));
              }
            };
            reader.onerror = () => reject(new Error("FileReader error"));
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.error("Failed to convert image from URL:", e);
        imageDataUrl = "";
      }
    }

    let insightsHtml = "";
    if (parsedInsights) {
      if (parsedInsights.healthContext) {
        insightsHtml += `
          <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0; background: linear-gradient(to bottom right, #f3f4f6, #e5e7eb);">
            <div style="display: flex; align-items: flex-start; gap: 16px;">
              <div style="padding: 8px; border-radius: 8px; background: rgba(59, 130, 246, 0.2);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <h4 style="font-size: 18px; font-weight: 700; margin: 0;">Personalized Health Context</h4>
                  ${parsedInsights.demographics ? `<span style="font-size: 11px; color: #6b7280; background: white; padding: 4px 12px; border-radius: 999px; border: 1px solid #e5e7eb;">${parsedInsights.demographics}</span>` : ""}
                </div>
                <p style="font-size: 14px; line-height: 1.6; color: #1f2937; margin: 0; white-space: pre-wrap;">${parsedInsights.healthContext
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</p>
              </div>
            </div>
          </div>`;
      }

      if (parsedInsights.substitutions.length > 0) {
        insightsHtml += `
          <div style="margin: 20px 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
              <div style="padding: 8px; border-radius: 8px; background: rgba(59, 130, 246, 0.1);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
              </div>
              <h4 style="font-size: 18px; font-weight: 700; margin: 0;">Smart Substitution Suggestions</h4>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              ${parsedInsights.substitutions
                .map(
                  (sub) => `
                <div style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: 8px; border: 2px solid #e5e7eb; background: linear-gradient(to bottom right, #f9fafb, #f3f4f6);">
                  <div style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div style="flex: 1;">
                    ${sub.title ? `<h5 style="font-size: 14px; font-weight: 600; margin: 0 0 8px;">${sub.title
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")}</h5>` : ""}
                    <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0;">${sub.description
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")}</p>
                  </div>
                </div>`
                )
                .join("")}
            </div>
          </div>`;
      }
    }

    const printable = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - WhatTheFood</title>
  <style>
    @media print { @page { margin: 20mm; } body { margin: 0; } }
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, sans-serif; margin: 0; padding: 24px; color: #0a0a0a; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
    h1 { font-size: 28px; margin: 0; display: flex; align-items: center; gap: 8px; font-weight: 700; }
    .subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
    .confidence-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 12px; font-weight: 600; }
    .main-content { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; margin-bottom: 24px; }
    .image-section { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .image-section img { width: 100%; height: auto; display: block; }
    .image-footer { padding: 12px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    .image-footer div { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: #3b82f6; }
    .nutrition-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .nutrition-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .serving-info { font-size: 12px; color: #6b7280; background: #f9fafb; padding: 6px 12px; border-radius: 6px; }
    .nutrition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .nutrient-card { padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .nutrient-value { font-size: 24px; font-weight: 700; }
    .two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .info-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
    .ingredient-list, .instruction-list { list-style: none; padding: 0; margin: 0; }
    .ingredient-list li, .instruction-list li { display: flex; gap: 12px; margin-bottom: 12px; font-size: 14px; }
    .step-number { width: 24px; height: 24px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🍽️ ${title}</h1>
      <div class="subtitle">${analysis.servingSize || "Per serving"}</div>
    </div>
    <div class="confidence-badge">Confidence: ${Math.round((analysis.confidence || 0) * 100)}%</div>
  </div>
  <div class="main-content">
    <div class="image-section">
      ${
        imageDataUrl
          ? `<img src="${imageDataUrl}" alt="${title}" />`
          : "<div style='height: 300px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #9ca3af;'>Image not available</div>"
      }
      <div class="image-footer">
        <div>
          <span style="color: #6b7280;">Confidence</span>
          <span style="font-weight: 600; margin-left: 8px;">${Math.round((analysis.confidence || 0) * 100)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.round((analysis.confidence || 0) * 100)}%"></div>
        </div>
      </div>
    </div>
    <div>
      <div class="nutrition-card">
        <div class="nutrition-header">
          <div>
            <h2>Nutrition Summary</h2>
            <div>${analysis.servingSize || "Per serving"}</div>
          </div>
          <div class="serving-info">Servings: ${servings}</div>
        </div>
        <div class="nutrition-grid">
          <div class="nutrient-card">🔥 Calories: ${scaledNutrients.calories ?? "-"}</div>
          <div class="nutrient-card">🥩 Protein: ${scaledNutrients.protein_g ?? "-"}g</div>
          <div class="nutrient-card">🌾 Carbs: ${scaledNutrients.carbohydrates_g ?? "-"}g</div>
          <div class="nutrient-card">💧 Fat: ${scaledNutrients.fat_g ?? "-"}g</div>
          <div class="nutrient-card">🍎 Fiber: ${scaledNutrients.fiber_g ?? "-"}g</div>
          <div class="nutrient-card">🍬 Sugar: ${scaledNutrients.sugar_g ?? "-"}g</div>
        </div>
      </div>
      <div class="two-col">
        <div class="info-card">
          <h3>🍎 Ingredients</h3>
          <ul class="ingredient-list">
            ${(analysis.ingredients || [])
              .map(
                (ing) => `
              <li>
                <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                ${ing.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
              </li>`
              )
              .join("")}
          </ul>
        </div>
        <div class="info-card">
          <h3>⚡ How to Prepare</h3>
          <ol class="instruction-list">
            ${(analysis.instructions || [])
              .map(
                (step, i) => `
              <li>
                <span class="step-number">${i + 1}</span>
                <span>${step.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
              </li>`
              )
              .join("")}
          </ol>
        </div>
      </div>
    </div>
  </div>
  ${insightsHtml}
  <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    Generated by WhatTheFood • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      alert("Please allow popups to export PDF");
      return;
    }

    win.document.open();
    win.document.write(printable);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        try {
          win.print();
        } catch (e) {
          console.error("Print error:", e);
          win.focus();
        }
      }, 500);
    };

    setTimeout(() => {
      try {
        win.print();
      } catch (e) {
        console.error("Print error:", e);
        win.focus();
      }
    }, 1000);
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
          } catch (error) {
            console.error("Failed to determine premium status", error);
            setHasPremiumAccess(false);
          } finally {
            setCheckingPremium(false);
          }
        } else {
          setHasPremiumAccess(false);
          setCheckingPremium(false);
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

        setServings(scanRecord.serving || 1);
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
    <main className="flex-1">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
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
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  {analysis.servingSize || "Per serving"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button size="sm" onClick={handleExportPdf}>
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </Button>
            </div>
          </div>
        </div>

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
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Nutrition Summary</CardTitle>
                    <CardDescription>{analysis.servingSize || "Per serving"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Servings</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.001"
                      className="border rounded-lg px-3 py-2 w-28 text-center font-medium bg-background"
                      value={servings}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          return;
                        }
                        const parsed = parseFloat(value);
                        if (!Number.isNaN(parsed) && parsed > 0) {
                          const clamped = Number(parsed.toFixed(3));
                          setServings(clamped);
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
              </CardHeader>
              <CardContent>
                {servingApproximation && (
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
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Apple className="h-5 w-5 text-primary" />
                    <CardTitle>Ingredients</CardTitle>
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
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Age</label>
                        <input
                          type="number"
                          placeholder="e.g., 25"
                          min={1}
                          className="border rounded-lg px-3 py-2 w-full text-sm"
                          value={age as number | ""}
                          onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : "")}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
                        <select
                          className="border rounded-lg px-3 py-2 w-full text-sm"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Activity</label>
                        <select
                          className="border rounded-lg px-3 py-2 w-full text-sm"
                          value={activity}
                          onChange={(e) => setActivity(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="sedentary">Sedentary</option>
                          <option value="light">Light</option>
                          <option value="moderate">Moderate</option>
                          <option value="active">Active</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal</label>
                        <select
                          className="border rounded-lg px-3 py-2 w-full text-sm"
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="weight_loss">Weight loss</option>
                          <option value="muscle_gain">Muscle gain</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        disabled={insightsLoading || !age || !gender || !activity || !goal}
                        onClick={async () => {
                          if (!id) return;
                          try {
                            setInsightsLoading(true);
                            setUpgradeRequired(false);
                            const res = await getPersonalizedInsights({
                              scanId: id,
                              age: age as number,
                              gender,
                              activity,
                              goal,
                              optimize: false,
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
                        disabled={insightsLoading || !age || !gender || !activity || !goal}
                        onClick={async () => {
                          if (!id) return;
                          try {
                            setInsightsLoading(true);
                            setUpgradeRequired(false);
                            const res = await getPersonalizedInsights({
                              scanId: id,
                              age: age as number,
                              gender,
                              activity,
                              goal,
                              optimize: true,
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
                        <Wand2 className="h-4 w-4 mr-2" /> Make It Healthier
                      </Button>
                    </div>

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
                      <div className="mt-6 space-y-6">
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
  );
}
