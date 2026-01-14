'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  analyzeFood,
  scaleNutrients,
  type FoodAnalysis,
  getPersonalizedInsights,
  getImageUrl,
  recalculateNutritionFromIngredients,
} from "@/utils/foodScan";
import { hasActivePremiumSubscription } from "@/utils/subscription";
import { calculateBMI, getBMICategory } from "@/utils/bmi";
import { tagToSlug } from "@/utils/tagSlug";
import { calculateNutritionScore, getNutritionScoreColor, getNutritionScoreBarColor } from "@/utils/nutritionScore";
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
  Bookmark,
  Info,
  Pencil,
  AlertCircle,
  User,
  Youtube,
  Activity,
  Scale,
  ChevronDown,
  MessageSquare,
  Copy,
  Mail,
  Image as ImageIcon,
  FileText,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  History,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/use-translation";
import { copyToClipboard } from "@/utils/clipboard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { FeedbackDialog } from "@/components/Feedback/FeedbackDialog";
export function FoodResultsClient() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id") ?? null;
  const widgetResultId = searchParams?.get("widgetResultId") ?? null;
  const router = useRouter();
  const { toast } = useToast();
  const { language: userLanguage } = useLanguage();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [servingsInput, setServingsInput] = useState("1");
  const [isVideoAvailable, setIsVideoAvailable] = useState<boolean | null>(null);
  const MIN_SERVINGS = 0.001;
  const applyServings = (next: number) => {
    const clamped = Number(next.toFixed(3));
    setServings(clamped);
    setServingsInput(clamped.toString());
  };
  // Helper to truncate serving guidance to fit on one line
  const truncateServingGuidance = (text: string, maxLength: number = 120) => {
    if (!text) return text;
    if (text.length <= maxLength) return text;
    // Try to truncate at a sentence boundary
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastComma = truncated.lastIndexOf(',');
    const cutPoint = Math.max(lastPeriod, lastComma);
    if (cutPoint > maxLength * 0.7) {
      return truncated.substring(0, cutPoint + 1);
    }
    return truncated.trim() + '...';
  };
  const persistInsights = async (newInsights: string) => {
    setInsightsText(newInsights);
    if (!analysis) {
      return;
    }
    const updatedAnalysis = { ...analysis, insights: newInsights };
    setAnalysis(updatedAnalysis);
    if (!id) return;
    try {
      await (supabase as any)
        .from("food_scans")
        .update({ result_json: updatedAnalysis })
        .eq("id", id);
    } catch (error) {
      console.error("Failed to save insights", error);
    }
  };
  const saveRecipe = async () => {
    if (!analysis || !id || !hasPremiumAccess) {
      toast({
        title: t("foodresults.recipe.save.error.premium.title"),
        description: t("foodresults.recipe.save.error.premium.description"),
        variant: "destructive",
      });
      return;
    }
    if (analysis.foodDetected === false) {
      toast({
        title: t("common.error"),
        description: "No food detected in this image. Please scan a food photo to save a recipe.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingRecipe(true);

      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Please sign in to save recipes");
      }

      // Check if recipe already saved
      const { data: existing } = await (supabase as any)
        .from("saved_recipes")
        .select("id")
        .eq("food_scan_id", id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: t("foodresults.recipe.save.already.title"),
          description: t("foodresults.recipe.save.already.description"),
        });
        setIsRecipeSaved(true);
        return;
      }

      // Prepare recipe text from instructions
      const recipeText = analysis.instructions?.join("\n\n") || "";

      if (!recipeText) {
        throw new Error("No recipe instructions available");
      }

      // Get nutrition summary (scaled for current servings)
      const scaled = scaleNutrients(analysis.nutrients, servings) as any;
      const nutrients = analysis.nutrients as any;
      const nutritionSummary = {
        calories: scaled?.calories ?? analysis.nutrients?.calories ?? null,
        protein_g: scaled?.protein_g ?? analysis.nutrients?.protein_g ?? null,
        carbohydrates_g: scaled?.carbohydrates_g ?? analysis.nutrients?.carbohydrates_g ?? null,
        fat_g: scaled?.fat_g ?? analysis.nutrients?.fat_g ?? null,
        fiber_g: scaled?.fiber_g ?? analysis.nutrients?.fiber_g ?? null,
        sugar_g: scaled?.sugar_g ?? analysis.nutrients?.sugar_g ?? null,
        sodium_mg: scaled?.sodium_mg ?? nutrients?.sodium_mg ?? null,
        serving: servings,
      };

      // Save recipe
      const { error: saveError } = await (supabase as any)
        .from("saved_recipes")
        .insert({
          user_id: session.user.id,
          food_name: analysis.dish || "Unknown Recipe",
          recipe_text: recipeText,
          image_url: imageUrl || null,
          image_path: imagePath || null,
          food_scan_id: id,
          nutrition_summary: nutritionSummary,
        });

      if (saveError) {
        throw saveError;
      }

      setIsRecipeSaved(true);
      toast({
        title: t("foodresults.recipe.save.success.title"),
        description: t("foodresults.recipe.save.success.description"),
      });
    } catch (error: any) {
      console.error("Failed to save recipe:", error);
      toast({
        title: t("foodresults.error"),
        description: error.message || t("foodresults.recipe.save.error.general"),
        variant: "destructive",
      });
    } finally {
      setSavingRecipe(false);
    }
  };
  const [savedServings, setSavedServings] = useState(1);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePath, setImagePath] = useState<string>("");
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [originalAnalysis, setOriginalAnalysis] = useState<FoodAnalysis | null>(null);
  // These will be populated from profile automatically
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [profileGender, setProfileGender] = useState<string | null>(null);
  const [profileGoal, setProfileGoal] = useState<string | null>(null);
  const [profileActivityLevel, setProfileActivityLevel] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsText, setInsightsText] = useState<string>("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [savingServings, setSavingServings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [hasScans, setHasScans] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [ingredientEditorOpen, setIngredientEditorOpen] = useState(false);
  const [ingredientInput, setIngredientInput] = useState("");
  const [dislikeDialogOpen, setDislikeDialogOpen] = useState(false);
  const [correctDishName, setCorrectDishName] = useState("");
  const [isGeneratingCorrection, setIsGeneratingCorrection] = useState(false);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [updatingIngredients, setUpdatingIngredients] = useState(false);
  const [analysisRefreshing, setAnalysisRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [isRecipeSaved, setIsRecipeSaved] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const imageCardRef = useRef<HTMLDivElement | null>(null);
  const nutritionCardRef = useRef<HTMLDivElement | null>(null);

  const syncCardHeights = useCallback(() => {
    if (typeof window === "undefined") return;
    const imageEl = imageCardRef.current;
    const nutritionEl = nutritionCardRef.current;
    if (!imageEl || !nutritionEl) return;

    // Only sync on large screens (lg breakpoint and above)
    const isLargeScreen = window.innerWidth >= 1024;
    if (!isLargeScreen) {
      // Reset minHeight on smaller screens
      imageEl.style.minHeight = '';
      imageEl.style.maxHeight = '';
      return;
    }

    const nutritionHeight = nutritionEl.offsetHeight;
    if (nutritionHeight > 0) {
      // Set both min and max height to exactly match nutrition summary
      imageEl.style.minHeight = `${nutritionHeight}px`;
      imageEl.style.maxHeight = `${nutritionHeight}px`;
      imageEl.style.height = `${nutritionHeight}px`;
    }
  }, []);
  const fetchImageAsDataUrl = async (url: string) => {
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("Failed to inline image for PDF, falling back to original URL.", error);
      return null;
    }
  };
  const buildPdfHtml = (imageSrc?: string | null) => {
    if (!analysis) return "";
    const nonFood = analysis.foodDetected === false;
    const nutrientStats = [
      { label: "Calories", value: scaled?.calories ?? analysis.nutrients?.calories, suffix: " kcal", className: "stat-card calories" },
      { label: "Protein", value: scaled?.protein_g ?? analysis.nutrients?.protein_g, suffix: " g", className: "stat-card protein" },
      { label: "Carbs", value: scaled?.carbohydrates_g ?? analysis.nutrients?.carbohydrates_g, suffix: " g", className: "stat-card carbs" },
      { label: "Fat", value: scaled?.fat_g ?? analysis.nutrients?.fat_g, suffix: " g", className: "stat-card fat" },
      { label: "Fiber", value: scaled?.fiber_g ?? analysis.nutrients?.fiber_g, suffix: " g", className: "stat-card fiber" },
      { label: "Sugar", value: scaled?.sugar_g ?? analysis.nutrients?.sugar_g, suffix: " g", className: "stat-card sugar" },
    ];
    const nutrientHtml = nutrientStats
      .map(
        (stat) => `
        <div class="${stat.className || "stat-card"}">
          <div class="stat-label">${stat.label}</div>
          <div class="stat-value">${nonFood ? "N/A" : `${formatNumber(stat.value)}${stat.suffix}`}</div>
        </div>
      `
      )
      .join("");
    const tagPalette = ["mint", "sky", "rose", "amber", "teal", "indigo"];
    const tagsHtml =
      (analysis.tags && analysis.tags.length > 0
        ? analysis.tags
            .map((tag, index) => `<span class="tag ${tagPalette[index % tagPalette.length]}">${escapeHtml(tag)}</span>`)
            .join("")
        : `<span class="tag muted">No tags</span>`);
    const ingredientsHtml =
      analysis.ingredients && analysis.ingredients.length > 0
        ? analysis.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
        : `<li class="muted">Ingredients not detected.</li>`;
    const instructionsList = analysis.instructions ?? [];
    const instructionsHtml =
      instructionsList.length > 0
        ? instructionsList
            .map((step, index) => {
              const parsed = parseInstruction(step);
              return `
                <li class="instruction">
                  <span class="step-index">${index + 1}</span>
                  <div>
                    ${parsed.title ? `<p class="instruction-title">${parsed.title}</p>` : ""}
                    <p class="instruction-text">${parsed.description}</p>
                  </div>
                </li>
              `;
            })
            .join("")
        : `<li class="muted">How to prepare instructions were not generated for this scan.</li>`;
    const additionalInfoHtml = analysis.additionalInfo
      ? formatTextBlock(analysis.additionalInfo)
      : "Additional information was not generated for this scan.";
    const servingGuidance = analysis.servingGuidance
      ? formatTextBlock(analysis.servingGuidance)
      : "Use the serving slider to adjust nutrition values for your portion.";
    const insightsHtml = (() => {
      if (parsedInsights) {
        const substitutions =
          parsedInsights.substitutions && parsedInsights.substitutions.length > 0
            ? `<div class="substitution-grid">
                ${parsedInsights.substitutions
                  .map(
                    (item) => `
                      <div class="sub-card">
                        ${item.title ? `<p class="sub-title">${escapeHtml(item.title)}</p>` : ""}
                        <p class="sub-text">${formatTextBlock(item.description)}</p>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : "";
        return `
          ${parsedInsights.demographics ? `<div class="badge-row">${escapeHtml(parsedInsights.demographics)}</div>` : ""}
          ${parsedInsights.healthContext ? `<p class="insight-text">${formatTextBlock(parsedInsights.healthContext)}</p>` : ""}
          ${substitutions}
        `;
      }
      if (insightsText) {
        return `<p class="insight-text">${formatTextBlock(insightsText)}</p>`;
      }
      return `<p class="muted">Personalized insights were not generated for this scan.</p>`;
    })();
    const profileHeaderHtml =
      profileAvatarUrl && profile?.full_name
        ? `
      <div class="profile-header">
        <div class="profile-avatar">
          <img src="${profileAvatarUrl}" alt="${escapeHtml(profile.full_name)}" />
        </div>
        <div class="profile-meta">
          <div class="profile-name">${escapeHtml(profile.full_name)}</div>
        </div>
      </div>`
        : "";
    const pdfStyles = `
      :root {
        --mint: #10b981;
        --mint-soft: #ecfdf5;
        --sky: #38bdf8;
        --sky-soft: #ecfeff;
        --rose: #fb7185;
        --rose-soft: #fff5f7;
        --amber: #fbbf24;
        --amber-soft: #fffaf0;
        --teal: #14b8a6;
        --teal-soft: #e6fffa;
        --indigo: #6366f1;
        --indigo-soft: #eef2ff;
        --slate-900: #0f172a;
        --slate-700: #334155;
        --slate-500: #64748b;
        --border: #e4e7ec;
      }
      * { box-sizing: border-box; }
      body {
        font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
        padding: 24px;
        margin: 0;
        color: var(--slate-900);
        line-height: 1.5;
      }
      .report {
        max-width: 1024px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 24px 32px;
        border: 1px solid var(--border);
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.08);
        position: relative;
        overflow: hidden;
      }
      .header-card {
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }
      .profile-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .profile-avatar {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        overflow: hidden;
        border: 2px solid #22c55e33;
        box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        flex-shrink: 0;
        background: #e5e7eb;
      }
      .profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .profile-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .profile-name {
        font-size: 13px;
        font-weight: 600;
        color: #111827;
      }
      .hero-img {
        width: 280px;
        height: 280px;
        border-radius: 24px;
        object-fit: cover;
        border: 1px solid #e2e8f0;
        background: #f1f5f9;
      }
      .summary {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .title {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        color: var(--slate-900);
      }
      .subtitle {
        font-size: 14px;
        color: var(--slate-500);
        margin: 0;
        line-height: 1.6;
      }
      .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-bottom: 6px;
      }
      .pill {
        padding: 6px 18px;
        border-radius: 999px;
        border: 1px solid rgba(15,23,42,0.12);
        background: #f8fafc;
        font-size: 13px;
        font-weight: 600;
        color: var(--slate-900);
        text-align: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 140px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
      }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
      }
      .tag {
        min-width: 100px;
        min-height: 32px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-size: 13px;
        font-weight: 600;
        text-transform: capitalize;
        text-align: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--slate-900);
      }
      .tag.mint { background: var(--mint-soft); border-color: #6ee7b7; color: #047857; }
      .tag.sky { background: var(--sky-soft); border-color: #7dd3fc; color: #0369a1; }
      .tag.rose { background: var(--rose-soft); border-color: #fda4af; color: #be123c; }
      .tag.amber { background: var(--amber-soft); border-color: #fcd34d; color: #92400e; }
      .tag.teal { background: var(--teal-soft); border-color: #5eead4; color: #0f766e; }
      .tag.indigo { background: var(--indigo-soft); border-color: #c7d2fe; color: #3730a3; }
      .tag.muted {
        background: #e2e8f0;
        color: #64748b;
        border-color: #cbd5f5;
      }
      .callout {
        border-radius: 20px;
        border: 1px solid #bbf7d0;
        background: linear-gradient(135deg, #ecfdf3 0%, #d1fae5 100%);
        padding: 16px 20px;
        color: #166534;
        font-size: 12px;
        line-height: 1.5;
        margin-top: 8px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
      }
      .section-title {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 700;
        color: #0f172a;
      }
      .nutrients-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 8px;
      }
      .stat-card {
        border-radius: 20px;
        border: 2px solid transparent;
        padding: 16px 18px;
        color: var(--slate-900);
        background: #ffffff;
      }
      .stat-card.calories { border-color: #fdba74; }
      .stat-card.protein { border-color: #f472b6; }
      .stat-card.carbs { border-color: #facc15; }
      .stat-card.fat { border-color: #93c5fd; }
      .stat-card.fiber { border-color: #84cc16; }
      .stat-card.sugar { border-color: #fda4af; }
      .stat-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #475467;
        margin-bottom: 6px;
      }
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
      }
      .two-column {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      .list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0;
        padding: 0;
      }
      .list li {
        font-size: 13px;
        color: #1f2937;
        border-bottom: none;
        padding-bottom: 0;
      }
      .list li:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .instruction {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .step-index {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #eef2ff;
        color: #4338ca;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 12px;
      }
      .instruction-title {
        margin: 0 0 4px;
        font-weight: 600;
        color: #111827;
        font-size: 14px;
      }
      .instruction-text {
        margin: 0;
        color: #374151;
        line-height: 1.5;
        font-size: 13px;
      }
      .insight-text {
        font-size: 13px;
        line-height: 1.6;
        color: #111827;
      }
      .badge-row {
        display: inline-flex;
        padding: 6px 16px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 12px;
        border: 1px solid #7dd3fc;
      }
      .substitution-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
      .sub-card {
        border-radius: 16px;
        border: 1px solid #e4e7ec;
        padding: 12px 14px;
        background: #fff;
      }
      .sub-title {
        margin: 0 0 4px;
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
      }
      .sub-text {
        margin: 0;
        font-size: 12px;
        color: #475467;
        line-height: 1.5;
      }
      .muted {
        color: #94a3b8;
        font-size: 13px;
      }
    `;
    const imageHtml = imageSrc
      ? `<img src="${imageSrc}" class="hero-img" />`
      : `<div class="hero-img" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;font-weight:600;">No image</div>`;
    const servingLabel = servingApproximation
      ? `Approx. ${servingApproximation.grams}g`
      : analysis.servingSize || "1 serving";
    
    // Use nutrition score from state (Gemini or fallback), or calculate if not available
    const pdfNutritionScore = nutritionScore !== null
      ? nutritionScore
      : scaled
      ? calculateNutritionScore(scaled)
      : analysis.nutrients
      ? calculateNutritionScore(analysis.nutrients)
      : null;
    const nutritionScoreLabel = pdfNutritionScore !== null
      ? `Nutrition Score: ${pdfNutritionScore}/100`
      : "Nutrition Score: —";
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(
            analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
              ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
              : analysis.dish || "Food Analysis"
          )}</title>
          <style>${pdfStyles}</style>
        </head>
        <body>
          <div class="report">
            <div class="card header-card">
              ${imageHtml}
              <div class="summary">
                ${profileHeaderHtml}
                <h1 class="title">${escapeHtml(
                  analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
                    ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
                    : analysis.dish || "Food Analysis"
                )}</h1>
                <p class="subtitle">${escapeHtml(
                  analysis.description ||
                    "AI-generated nutrition summary with personalized context."
                )}</p>
                <div class="meta-row">
                  <span class="pill">Servings: ${formatNumber(servings, 2)}</span>
                  <span class="pill">Serving Size: ${escapeHtml(servingLabel)}</span>
                  <span class="pill">${nutritionScoreLabel}</span>
                </div>
                <div class="tags">${tagsHtml}</div>
                <div class="callout">
                  ${servingGuidance}
                </div>
              </div>
            </div>
            <div class="card">
              <p class="section-title">Nutrition Overview</p>
              <div class="nutrients-grid">
                ${nutrientHtml}
              </div>
            </div>
            <div class="card">
              <p class="section-title">Additional Information</p>
              <p class="insight-text">${additionalInfoHtml}</p>
            </div>
            <div class="card">
              <div class="two-column">
                <div>
                  <p class="section-title">Ingredients</p>
                  <ul class="list">${ingredientsHtml}</ul>
                </div>
                <div>
                  <p class="section-title">How to Prepare</p>
                  <ol class="list">
                    ${instructionsHtml}
                  </ol>
                </div>
              </div>
            </div>
            <div class="card">
              <p class="section-title">Personalized Health Context</p>
              ${insightsHtml}
            </div>
          </div>
        </body>
      </html>
    `;
  };
  const escapeHtml = (value?: string | null) => {
    if (!value) return "";
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
  const formatTextBlock = (value?: string | null) => {
    if (!value) return "";
    return escapeHtml(value).replace(/\n/g, "<br />");
  };
  const formatNumber = (value?: number | null, decimals: number = 1) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    const fixed = value % 1 === 0 ? value.toString() : value.toFixed(decimals);
    return fixed.replace(/\.0+$/, "");
  };
  const parseInstruction = (step: string) => {
    const boldMatch = step.match(/^\*\*(.+?)\*\*[:\s]*(.+)$/);
    if (boldMatch) {
      return {
        title: escapeHtml(boldMatch[1]),
        description: formatTextBlock(boldMatch[2]),
      };
    }
    return {
      title: "",
      description: formatTextBlock(step),
    };
  };
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
    // Check if ingredients match the original - if so, restore original analysis
    if (originalAnalysis && originalAnalysis.ingredients) {
      const originalIngredients = originalAnalysis.ingredients
        .map((line) => line.trim())
        .filter(Boolean)
        .sort()
        .join("\n");
      const currentIngredients = cleaned
        .sort()
        .join("\n");
     
      if (originalIngredients === currentIngredients) {
        // Ingredients match original - restore original analysis
        setAnalysis(JSON.parse(JSON.stringify(originalAnalysis)));
        applyServings(servings);
        setIngredientInput((originalAnalysis.ingredients ?? []).join("\n"));
        setIngredientEditorOpen(false);
        setInsightsText(originalAnalysis.insights || "");
        setUpgradeRequired(false);
       
        if (id) {
          try {
            await (supabase as any)
              .from("food_scans")
              .update({ result_json: originalAnalysis })
              .eq("id", id);
          } catch (err) {
            console.error("Failed to persist restored analysis", err);
          }
        }
       
        toast({
          title: "Ingredients restored",
          description: "Original nutrition values have been restored.",
        });
        return;
      }
    }
    setUpdatingIngredients(true);
    setAnalysisRefreshing(true);
    try {
      // Use dedicated recalculation function for ingredient edits
      // This is more accurate and faster than full image re-analysis
      const updatedAnalysis = await recalculateNutritionFromIngredients(
        analysis,
        cleaned,
        servings
      );
      // Log the updated analysis for debugging
      console.log("Updated analysis after ingredient change:", {
        nutrients: updatedAnalysis.nutrients,
        servingWeightGrams: updatedAnalysis.servingWeightGrams,
        ingredients: updatedAnalysis.ingredients,
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
  const getShareUrl = () => {
    return typeof window !== 'undefined' 
      ? `${window.location.origin}/shared/${id}`
      : `/shared/${id}`;
  };

  const getShareText = () => {
    const dishDisplay = analysis?.isManualEntry || analysis?.dish?.startsWith("Manual") || analysis?.dish?.startsWith("Manual Input")
      ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
      : analysis?.dish || "Food scan";
    return `Check out this food analysis: ${dishDisplay}`;
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    const copied = await copyToClipboard(shareUrl);
    if (copied) {
      toast({
        title: t("foodresults.share.copied"),
        description: t("foodresults.share.copied.description"),
      });
    } else {
      toast({
        title: "Copy this link",
        description: shareUrl,
        duration: 10000,
      });
    }
  };

  const handleShareWhatsApp = () => {
    const shareUrl = getShareUrl();
    const shareText = getShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const handleShareFacebook = () => {
    const shareUrl = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleShareTwitter = () => {
    const shareUrl = getShareUrl();
    const shareText = getShareText();
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const shareUrl = getShareUrl();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleShareEmail = () => {
    const shareUrl = getShareUrl();
    const shareText = getShareText();
    const dishDisplay = analysis?.isManualEntry || analysis?.dish?.startsWith("Manual") || analysis?.dish?.startsWith("Manual Input")
      ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
      : analysis?.dish || "Food Analysis Results";
    const subject = encodeURIComponent(dishDisplay);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleLike = async () => {
    setUserReaction("like");
    // Store like feedback in database
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && id) {
        await (supabase as any).from("feedback").insert({
          user_id: session.user.id,
          feedback_type: "review",
          message: `Like: Food scan ${id} - Dish: ${analysis?.dish || "Unknown"}`,
        });
      }
    } catch (error) {
      console.error("Error saving like feedback:", error);
    }
  };

  const handleDislike = () => {
    setUserReaction("dislike");
    setDislikeDialogOpen(true);
  };

  const handleSubmitCorrection = async () => {
    if (!correctDishName.trim()) {
      toast({
        title: "Dish name required",
        description: "Please enter the correct dish name.",
        variant: "destructive",
      });
      return;
    }

    if (!analysis || !id) {
      toast({
        title: "Error",
        description: "Analysis data not available.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCorrection(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const originalDishName = analysis.dish || "Unknown";

      // Generate new analysis based on corrected dish name (let AI generate ingredients from dish name)
      // Add timeout to prevent hanging
      const analyzePromise = analyzeFood(null, servings, undefined, {
        manualEntry: {
          dish: correctDishName.trim(),
          ingredients: [], // Empty array - let AI generate ingredients based on dish name
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout - analysis generation took too long. Please try again.")), 45000); // 45 second timeout
      });

      const { analysis: correctedAnalysis } = await Promise.race([analyzePromise, timeoutPromise]);

      // Update the analysis state
      setAnalysis(correctedAnalysis);
      setOriginalAnalysis(correctedAnalysis);

      // Update the food_scans record with corrected analysis
      await (supabase as any)
        .from("food_scans")
        .update({ result_json: correctedAnalysis })
        .eq("id", id);

      // Store feedback in database
      if (session?.user) {
        await (supabase as any).from("feedback").insert({
          user_id: session.user.id,
          feedback_type: "review",
          message: `Dish correction for scan ${id}: Original: "${originalDishName}" → Corrected: "${correctDishName.trim()}"`,
        });
      }

      toast({
        title: "Analysis updated",
        description: "New analysis has been generated based on the corrected dish name.",
      });

      setDislikeDialogOpen(false);
      setCorrectDishName("");
    } catch (error: any) {
      console.error("Error generating correction:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate corrected analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCorrection(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!analysis || !reportRef.current) {
      toast({
        title: "Nothing to export",
        description: "Run a scan first so we can capture the results.",
        variant: "destructive",
      });
      return;
    }

    try {
      const imageDataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null;
      const pdfHtml = buildPdfHtml(imageDataUrl || imageUrl || undefined);
      const workingIframe = document.createElement("iframe");
      workingIframe.style.position = "fixed";
      workingIframe.style.top = "0";
      workingIframe.style.left = "-9999px";
      workingIframe.style.width = "1100px";
      workingIframe.style.height = "10px";
      workingIframe.style.opacity = "0";
      workingIframe.style.pointerEvents = "none";
      document.body.appendChild(workingIframe);
      const iframeLoadPromise = new Promise<void>((resolve) => {
        workingIframe.onload = () => resolve();
      });
      workingIframe.srcdoc = pdfHtml;
      await iframeLoadPromise;
      const iframeDoc = workingIframe.contentDocument!;
      const captureTarget = iframeDoc.body;
      if (iframeDoc.fonts && iframeDoc.fonts.ready) {
        try {
          await iframeDoc.fonts.ready;
        } catch {
          // ignore font errors
        }
      }
      const images = Array.from(captureTarget.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if ((img as HTMLImageElement).complete) return Promise.resolve(null);
          return new Promise((resolve) => {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 3000);
          });
        })
      );
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(null));
        });
      });
      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: false,
        removeContainer: false,
        imageTimeout: 15000,
        width: captureTarget.scrollWidth || captureTarget.offsetWidth,
        height: captureTarget.scrollHeight || captureTarget.offsetHeight,
        windowWidth: captureTarget.scrollWidth || captureTarget.offsetWidth,
        windowHeight: captureTarget.scrollHeight || captureTarget.offsetHeight,
      });
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const dishForFilename = analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
            ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
            : analysis.dish || "food-result";
          const safeTitle = dishForFilename.replace(/[^\w\d_-]+/g, "-");
          link.download = `${safeTitle}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast({
            title: "Image downloaded",
            description: "Food analysis image has been downloaded.",
          });
        }
      }, 'image/png');
      if (workingIframe && document.body.contains(workingIframe)) {
        document.body.removeChild(workingIframe);
      }
    } catch (error) {
      console.error("Image export failed:", error);
      toast({
        title: "Export failed",
        description: "We couldn't capture the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    // Use getUrl utility to get the correct app URL
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/shared/${id}`
      : `/shared/${id}`;
    
    const dishDisplay = analysis?.isManualEntry || analysis?.dish?.startsWith("Manual") || analysis?.dish?.startsWith("Manual Input")
      ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
      : analysis?.dish || "Food scan";
    const shareData = {
      title: dishDisplay || "Food Analysis Results",
      text: `Check out this food analysis: ${dishDisplay}`,
      url: shareUrl,
    };

    try {
      // Try Web Share API first (mobile-friendly, requires HTTPS)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: t("foodresults.share.success"),
          description: t("foodresults.share.success.description"),
        });
        return;
      }
      
      // Fallback: Copy to clipboard (works on both HTTP and HTTPS)
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        toast({
          title: t("foodresults.share.copied"),
          description: t("foodresults.share.copied.description"),
        });
      } else {
        // Show URL in toast for manual copying
        toast({
          title: "Copy this link",
          description: shareUrl,
          duration: 10000,
        });
      }
    } catch (error: any) {
      // User cancelled share
      if (error.name === "AbortError") {
        return;
      }
      
      console.error("Share failed:", error);
      
      // Try clipboard as fallback
      try {
        const copied = await copyToClipboard(shareUrl);
        if (copied) {
          toast({
            title: "Link copied!",
            description: "Food analysis link has been copied to your clipboard.",
          });
        } else {
          // Show URL for manual copying
          toast({
            title: "Copy this link",
            description: shareUrl,
            duration: 10000,
          });
        }
      } catch (clipboardError) {
        // Final fallback: show URL in toast
        toast({
          title: "Copy this link",
          description: shareUrl,
          duration: 10000,
        });
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
    let iframe: HTMLIFrameElement | null = null;
    try {
      const imageDataUrl = imageUrl ? await fetchImageAsDataUrl(imageUrl) : null;
      const pdfHtml = buildPdfHtml(imageDataUrl || imageUrl || undefined);
      const workingIframe = document.createElement("iframe");
      iframe = workingIframe;
      workingIframe.style.position = "fixed";
      workingIframe.style.top = "0";
      workingIframe.style.left = "-9999px";
      workingIframe.style.width = "1100px";
      workingIframe.style.height = "10px";
      workingIframe.style.opacity = "0";
      workingIframe.style.pointerEvents = "none";
      document.body.appendChild(workingIframe);
      const iframeLoadPromise = new Promise<void>((resolve) => {
        workingIframe.onload = () => resolve();
      });
      workingIframe.srcdoc = pdfHtml;
      await iframeLoadPromise;
      const iframeDoc = workingIframe.contentDocument!;
      const captureTarget = iframeDoc.body;
      if (iframeDoc.fonts && iframeDoc.fonts.ready) {
        try {
          await iframeDoc.fonts.ready;
        } catch {
          // ignore font errors
        }
      }
      const images = Array.from(captureTarget.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if ((img as HTMLImageElement).complete) return Promise.resolve(null);
          return new Promise((resolve) => {
            img.onload = () => resolve(null);
            img.onerror = () => resolve(null);
            setTimeout(() => resolve(null), 3000);
          });
        })
      );
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(null));
        });
      });
      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: false,
        removeContainer: false,
        imageTimeout: 15000,
        width: captureTarget.scrollWidth || captureTarget.offsetWidth,
        height: captureTarget.scrollHeight || captureTarget.offsetHeight,
        windowWidth: captureTarget.scrollWidth || captureTarget.offsetWidth,
        windowHeight: captureTarget.scrollHeight || captureTarget.offsetHeight,
      });
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdfWidth = canvas.width;
      const pdfHeight = canvas.height;
      const pdf = new jsPDF({
        unit: "px",
        format: [pdfWidth, pdfHeight],
        compress: true,
      });
     
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      const dishForFilename = analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
        ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
        : analysis.dish || "food-result";
      const safeTitle = dishForFilename.replace(/[^\w\d_-]+/g, "-");
      pdf.save(`${safeTitle}.pdf`);
      toast({
        title: t("foodresults.pdf.ready"),
        description: t("foodresults.pdf.ready.description"),
      });
      if (workingIframe && document.body.contains(workingIframe)) {
        document.body.removeChild(workingIframe);
      }
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export failed",
        description: "We couldn't capture the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setExportingPdf(false);
    }
  };
  useEffect(() => {
    const load = async () => {
      try {
        // Handle widget result from sessionStorage
        if (widgetResultId) {
          try {
            const storedData = sessionStorage.getItem(widgetResultId);
            if (!storedData) {
              console.error("Widget result data not found in sessionStorage");
              router.push("/");
              return;
            }
            
            const parsedData = JSON.parse(storedData);
            const { analysis: widgetAnalysis, image: widgetImage, servings: widgetServings, subscriptionType: widgetSubscriptionType } = parsedData;
            
            if (!widgetAnalysis) {
              console.error("Invalid widget result data");
              router.push("/dashboard");
              return;
            }
            
            // Set the analysis and image
            setAnalysis(widgetAnalysis as FoodAnalysis);
            setOriginalAnalysis(JSON.parse(JSON.stringify(widgetAnalysis)));
            if (widgetImage) {
              setImageUrl(widgetImage);
            }
            if (widgetServings) {
              applyServings(widgetServings);
              setSavedServings(widgetServings);
            }
            if (widgetAnalysis.insights) {
              setInsightsText(widgetAnalysis.insights);
            }
            
            // Check authentication and premium status
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
                
                // Fetch profile
                const { data: profileData } = await (supabase as any)
                  .from("profiles")
                  .select("full_name, gender, age, weight_kg, height_cm, goal, activity_level, avatar_url")
                  .eq("id", user.id)
                  .maybeSingle();
                
                if (profileData) {
                  setProfile(profileData);
                  setProfileAvatarUrl(profileData.avatar_url || null);
                  setProfileAge(profileData.age || null);
                  setProfileGender(profileData.gender || null);
                  setProfileGoal(profileData.goal || null);
                  setProfileActivityLevel(profileData.activity_level || null);
                  const isComplete =
                    profileData.full_name &&
                    profileData.gender &&
                    profileData.age !== null &&
                    profileData.weight_kg !== null &&
                    profileData.height_cm !== null &&
                    profileData.goal &&
                    profileData.activity_level;
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
              setProfileComplete(true);
              // Widget results from non-authenticated users should show guest banner
              setIsGuestUser(true);
            }
            
            setLoading(false);
            return;
          } catch (error) {
            console.error("Error loading widget result from sessionStorage:", error);
            router.push("/dashboard");
            return;
          }
        }
        
        // Original logic for database-based results
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
           
            // Fetch profile to check completion and avatar
            const { data: profileData } = await (supabase as any)
              .from("profiles")
              .select("full_name, gender, age, weight_kg, height_cm, goal, activity_level, avatar_url")
              .eq("id", user.id)
              .maybeSingle();
           
            if (profileData) {
              setProfile(profileData);
              setProfileAvatarUrl(profileData.avatar_url || null);
              // Set profile values for insights
              setProfileAge(profileData.age || null);
              setProfileGender(profileData.gender || null);
              setProfileGoal(profileData.goal || null);
              setProfileActivityLevel(profileData.activity_level || null);
              // Check if profile is complete
              const isComplete =
                profileData.full_name &&
                profileData.gender &&
                profileData.age !== null &&
                profileData.weight_kg !== null &&
                profileData.height_cm !== null &&
                profileData.goal &&
                profileData.activity_level;
              setProfileComplete(isComplete);
            } else {
              setProfileComplete(false);
            }

            // Note: We'll check if user has scans after loading the scan record
            // to see if the current scan belongs to them
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
          .select("image_url, image_path, serving, result_json, language, user_id")
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
          language?: string;
          user_id?: string;
        };
        // Check if this is a guest user scan (user_id starts with 'temp_')
        const isGuestScan = scanRecord.user_id?.startsWith('temp_') || false;
        setIsGuestUser(isGuestScan && !user); // Only show if not authenticated
        
        // For authenticated users viewing a scan result page (not a guest scan),
        // they've started tracking meals. If they're viewing ANY scan result page while authenticated,
        // it means they've scanned at least one food item.
        // We'll check if it's their scan, but even if it's not, if they're authenticated and viewing
        // a non-guest scan, they likely have scans. However, to be safe, we check if it's their scan.
        if (user && !isGuestScan) {
          // Check if this scan belongs to the current user
          if (scanRecord.user_id && String(scanRecord.user_id) === String(user.id)) {
            console.log('[DEBUG] Setting hasScans to true - user viewing their own scan', { 
              scanUserId: scanRecord.user_id, 
              currentUserId: user.id 
            });
            setHasScans(true);
          } else {
            // Even if it's not their scan, if they're authenticated and viewing a scan result,
            // they've likely scanned something. But to be safe, let's check if they have any scans.
            // For now, if they're authenticated and viewing a non-guest scan, assume they have scans
            // (they're on a scan result page, so they've interacted with the scanning feature)
            console.log('[DEBUG] User authenticated viewing scan result - checking for scans', {
              scanUserId: scanRecord.user_id,
              currentUserId: user.id
            });
            // Set hasScans to true if user is authenticated and viewing a scan (not guest)
            // This means they've at least accessed the scanning feature
            setHasScans(true);
          }
        } else {
          console.log('[DEBUG] Not setting hasScans', { 
            hasUser: !!user, 
            isGuestScan, 
            hasUserId: !!scanRecord.user_id 
          });
        }
        applyServings(scanRecord.serving || 1);
        setSavedServings(scanRecord.serving || 1);
        let loadedAnalysis = (scanRecord.result_json as FoodAnalysis) || null;
       
        // Check if translation is needed
        const currentLanguage = scanRecord.language || 'en';
        let targetLanguage = userLanguage || 'en';
       
        // Get user's default language from profile if authenticated
        if (user) {
          const { data: profileData } = await (supabase as any)
            .from("profiles")
            .select("default_language")
            .eq("id", user.id)
            .maybeSingle();
          targetLanguage = profileData?.default_language || userLanguage || 'en';
        }
        // Translate if needed
        if (loadedAnalysis && currentLanguage !== targetLanguage && user) {
          try {
            const { data: translateData, error: translateError } = await supabase.functions.invoke("translate-content", {
              body: {
                content: loadedAnalysis,
                sourceLanguage: currentLanguage,
                targetLanguage: targetLanguage,
                contentType: 'food_scan',
              },
            });
            if (!translateError && translateData?.ok && translateData.translatedContent) {
              loadedAnalysis = translateData.translatedContent as FoodAnalysis;
             
              // Update database with translated content
              await (supabase as any)
                .from("food_scans")
                .update({
                  result_json: loadedAnalysis,
                  language: targetLanguage,
                })
                .eq("id", id);
            }
          } catch (translateError) {
            console.error("Translation error:", translateError);
            // Continue with original analysis on error
          }
        }
        setAnalysis(loadedAnalysis);
        // Store the original analysis to restore if user reverts changes
        if (loadedAnalysis) {
          setOriginalAnalysis(JSON.parse(JSON.stringify(loadedAnalysis)));
        }
        if (loadedAnalysis?.insights) {
          setInsightsText(loadedAnalysis.insights);
        }
       
        // Check if this is a manual entry
        const isManualEntry = loadedAnalysis?.isManualEntry || loadedAnalysis?.dish?.startsWith("Manual") || loadedAnalysis?.dish?.startsWith("Manual Input");
        const isManualEntryPath = scanRecord.image_path?.toLowerCase().startsWith("manual-entry");
       
        setImagePath(scanRecord.image_path || "");
       
        // Only try to get image URL if it's not a manual entry
        if (!isManualEntry && !isManualEntryPath && scanRecord.image_path) {
          try {
            const freshUrl = await getImageUrl(scanRecord.image_path, 60 * 60);
            setImageUrl(freshUrl || scanRecord.image_url || "");
          } catch (error) {
            console.warn("Failed to load image URL, using fallback:", error);
            setImageUrl(scanRecord.image_url || "");
          }
        } else {
          // For manual entries, don't set image URL
          setImageUrl("");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, widgetResultId, router, userLanguage]);
  useEffect(() => {
    if (analysis) {
      setIngredientInput((analysis.ingredients ?? []).join("\n"));
    }
  }, [analysis]);

  // Debug: Track hasScans changes and announcement bar conditions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasPremiumAccess && isAuthenticated) {
      console.log('[DEBUG Announcement Bars]', {
        hasPremiumAccess,
        isAuthenticated,
        hasScans,
        profileComplete,
        shouldShowBars: !hasPremiumAccess && isAuthenticated
      });
    }
  }, [hasScans, isAuthenticated, hasPremiumAccess, profileComplete]);

  // Check if recipe is already saved
  useEffect(() => {
    const checkIfSaved = async () => {
      if (!id || !isAuthenticated || !hasPremiumAccess) {
        setIsRecipeSaved(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data } = await (supabase as any)
          .from("saved_recipes")
          .select("id")
          .eq("food_scan_id", id)
          .eq("user_id", session.user.id)
          .maybeSingle();

        setIsRecipeSaved(!!data);
      } catch (error) {
        console.error("Failed to check if recipe is saved:", error);
        setIsRecipeSaved(false);
      }
    };

    void checkIfSaved();
  }, [id, isAuthenticated, hasPremiumAccess]);

  // Suppress TinyAdz errors to prevent breaking the page
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes("widgets.map") || e.message?.includes("TinyAdz") || e.filename?.includes("apitiny.net")) {
        e.preventDefault();
        return true;
      }
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || e.reason?.toString() || "";
      if (msg.includes("widgets.map") || msg.includes("TinyAdz")) {
        e.preventDefault();
      }
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Check if YouTube video is available
  useEffect(() => {
    const checkVideoAvailability = async () => {
      if (!analysis?.youtubeVideoUrl) {
        setIsVideoAvailable(false);
        return;
      }
      try {
        // Extract video ID from URL
        let videoId = "";
        const url = analysis.youtubeVideoUrl;
        if (url.includes("youtube.com/watch?v=")) {
          videoId = url.split("watch?v=")[1]?.split("&")[0] || "";
        } else if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
        } else if (url.includes("youtube.com/embed/")) {
          videoId = url.split("embed/")[1]?.split("?")[0] || "";
        }
        if (!videoId) {
          setIsVideoAvailable(false);
          return;
        }
        // Check video availability using YouTube oEmbed API
        // Use AbortController for timeout and better error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
       
        try {
          const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const response = await fetch(oEmbedUrl, {
            signal: controller.signal,
            mode: 'cors',
          });
         
          clearTimeout(timeoutId);
         
          if (response.ok) {
            setIsVideoAvailable(true);
          } else {
            setIsVideoAvailable(false);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          // Silently handle fetch errors (network issues, CORS, timeouts, etc.)
          if (fetchError.name !== 'AbortError') {
            // Only log non-timeout errors
            console.warn("Video availability check failed:", fetchError.message);
          }
          setIsVideoAvailable(false);
        }
      } catch (error) {
        // Silently handle parsing errors
        setIsVideoAvailable(false);
      }
    };
    checkVideoAvailability();
  }, [analysis?.youtubeVideoUrl]);
  // DISABLED: Auto-generate insights - too slow, users can generate manually
  // Insights will only be generated when user clicks "Generate Insights" button
  const scaled = useMemo(
    () => (analysis ? scaleNutrients(analysis.nutrients, servings) : null),
    [analysis, servings]
  );
  
  // Calculate nutrition score using Gemini API (with formula fallback)
  const [nutritionScore, setNutritionScore] = useState<number | null>(null);
  const [nutritionScoreLoading, setNutritionScoreLoading] = useState(false);

  useEffect(() => {
    if (!scaled) {
      setNutritionScore(null);
      return;
    }

    // Calculate fallback score immediately
    const fallbackScore = calculateNutritionScore(scaled);
    setNutritionScore(fallbackScore);

    // Try to get Gemini score
    const fetchGeminiScore = async () => {
      setNutritionScoreLoading(true);
      try {
        const response = await fetch("/api/nutrition-score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nutrients: scaled,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.score !== null && data.score !== undefined) {
            setNutritionScore(data.score);
          }
        }
      } catch (error) {
        console.error("Failed to fetch Gemini nutrition score:", error);
        // Keep fallback score
      } finally {
        setNutritionScoreLoading(false);
      }
    };

    // Small delay to avoid blocking UI
    const timeoutId = setTimeout(fetchGeminiScore, 100);
    return () => clearTimeout(timeoutId);
  }, [scaled]);
  
  const isNonFood = analysis?.foodDetected === false;
  const parsedInsights = useMemo(() => {
    if (!insightsText) return null;
    
    // Try to parse as JSON first (new format)
    try {
      // Remove markdown code blocks if present
      let jsonStr = insightsText.replace(/^```(?:json)?|```$/gi, "").trim();
      // If it's wrapped in quotes, unescape it
      if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
        jsonStr = JSON.parse(jsonStr);
      }
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      
      if (parsed && (parsed.keyRecommendations || parsed.actionItems)) {
        return {
          demographics: parsed.demographics || "",
          keyRecommendations: Array.isArray(parsed.keyRecommendations) ? parsed.keyRecommendations : [],
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          // Legacy fields for backward compatibility
          healthContext: "",
          substitutions: [] as Array<{ title: string; description: string }>,
        };
      }
    } catch (e) {
      // Not JSON, fall through to legacy parsing
      console.log("Insights not in JSON format, trying legacy parsing");
    }
    
    // Legacy format parsing (for backward compatibility)
    const sections = {
      healthContext: "",
      substitutions: [] as Array<{ title: string; description: string }>,
      demographics: "",
      keyRecommendations: [] as string[],
      actionItems: [] as string[],
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
  useEffect(() => {
    // Sync heights once analysis is loaded
    if (!loading && analysis) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        syncCardHeights();
      }, 100);
    }
  }, [loading, analysis, syncCardHeights]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        syncCardHeights();
      }, 150);
    };
    
    window.addEventListener("resize", handleResize);
    
    // Also observe changes to the nutrition card content
    const nutritionEl = nutritionCardRef.current;
    let observer: MutationObserver | null = null;
    if (nutritionEl && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        syncCardHeights();
      });
      observer.observe(nutritionEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [syncCardHeights]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary/20 border-t-primary" />
            <Salad className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">Loading your food analysis...</p>
        </div>
      </div>
    );
  }
  if (!analysis) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
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
      <div className="container mx-auto px-4 py-6 md:py-8 relative w-full overflow-x-hidden" ref={reportRef}>
        {/* Guest User Warning Banner */}
        {isGuestUser && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold">
              ⚠️ This meal is not tracked!
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200 mt-2">
              <p className="mb-3">
                You won&apos;t be able to track its impact on your macros or eating habits.
              </p>
              <Button
                onClick={() => router.push("/auth")}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                Track Meal&apos;s Macros
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button variant="ghost" onClick={() => router.back()} className="px-2 flex-shrink-0">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Salad className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
                  <span className="break-words sm:truncate">
                    {analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
                      ? `${t("foodresults.manual.input")}: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
                      : analysis.dish || t("foodresults.title")}
                  </span>
                  <div className="flex items-center gap-1 pdf-hide">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={handleLike}
                            disabled={userReaction === "like"}
                          >
                            <ThumbsUp className={`h-4 w-4 sm:h-5 sm:w-5 ${userReaction === "like" ? "text-green-600 fill-green-600" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Like this analysis</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={handleDislike}
                            disabled={userReaction === "dislike"}
                          >
                            <ThumbsDown className={`h-4 w-4 sm:h-5 sm:w-5 ${userReaction === "dislike" ? "text-red-600 fill-red-600" : ""}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dislike - suggest correction</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 pdf-hide flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs sm:text-sm">
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t("foodresults.share")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWhatsApp}>
                    <Share2 className="mr-2 h-4 w-4 text-green-600" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareFacebook}>
                    <Share2 className="mr-2 h-4 w-4 text-blue-600" />
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareTwitter}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Twitter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareLinkedIn}>
                    <Share2 className="mr-2 h-4 w-4 text-blue-700" />
                    LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadImage}>
                    <ImageIcon className="mr-2 h-4 w-4 text-blue-500" />
                    Download as image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} disabled={!hasPremiumAccess}>
                    <FileText className="mr-2 h-4 w-4 text-red-600" />
                    Download as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={exportingPdf || !hasPremiumAccess}
                        variant={!hasPremiumAccess ? "outline" : "default"}
                        className="text-xs sm:text-sm"
                      >
                        {exportingPdf ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 animate-spin" /> : <FileDown className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />}
                        <span className="hidden sm:inline">{exportingPdf ? t("foodresults.pdf.preparing") : t("foodresults.pdf")}</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!hasPremiumAccess && (
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p>{t("foodresults.pdf.upgrade")}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setFeedbackDialogOpen(true)} 
                className="text-xs sm:text-sm"
              >
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("feedback.button")}</span>
              </Button>
            </div>
          </div>
        </div>
        {isAuthenticated && !profileComplete && (
          <Alert className="mb-4 sm:mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <User className="h-4 w-4 text-primary flex-shrink-0" />
            <AlertTitle className="font-semibold text-sm sm:text-base">{t("foodresults.complete.profile.title")}</AlertTitle>
            <AlertDescription className="mt-1 text-xs sm:text-sm">
              {t("foodresults.complete.profile.description")}
              <Button
                variant="link"
                className="p-0 h-auto ml-1 text-primary font-semibold underline text-xs sm:text-sm"
                onClick={() => router.push("/profile")}
              >
                {t("foodresults.complete.profile.button")}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {/* Bar 2: Track Meals - Always show for authenticated free users viewing scan results */}
        {isAuthenticated && !hasPremiumAccess && (
          <Alert className="mb-4 sm:mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
              You&apos;ve started tracking your meals
            </AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              <p className="mb-2">
                Access your dashboard to see patterns, insights, and how this meal affects your goals over time.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                onClick={() => router.push("/dashboard")}
              >
                Unlock insights
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {isNonFood && (
          <Alert className="mb-4 sm:mb-6 border-2 border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
            <AlertTitle className="font-semibold text-sm sm:text-base">No food detected</AlertTitle>
            <AlertDescription className="mt-1 text-xs sm:text-sm">
              {analysis?.message ||
                "We couldn't find any edible food in this image. Upload a clear photo of a meal, snack, or ingredient for nutrition and recipe results."}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          {!(analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")) && (
            <div className="lg:col-span-4">
              <Card
                ref={imageCardRef}
                className="overflow-hidden lg:sticky lg:top-4 flex flex-col"
              >
                {imageUrl ? (
                  <div className="food-results-image-container relative overflow-hidden flex-1 min-h-0" style={{ paddingBottom: 'calc(96% + 2px)' }}>
                    <img 
                      src={imageUrl} 
                      alt={analysis.dish || "Food"} 
                      className="absolute inset-0 w-full h-full object-cover lg:relative lg:h-full" 
                      onLoad={() => {
                        // Sync heights after image loads
                        setTimeout(() => syncCardHeights(), 100);
                      }}
                    />
                  </div>
                ) : (
                  <div className="food-results-image-container relative flex items-center justify-center text-muted-foreground bg-muted flex-1 min-h-0" style={{ paddingBottom: 'calc(90% + 12px)' }}>
                    <Salad className="absolute inset-0 m-auto h-16 w-16 opacity-30 lg:relative" />
                  </div>
                )}
                <CardContent className="p-3 sm:p-4 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="whitespace-nowrap">Nutrition Score</span>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              role="button"
                              aria-label="Nutrition Score info"
                              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                            >
                              <Info className="h-3 w-3" strokeWidth={2} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-xs text-xs leading-relaxed">
                            A score (0-100) evaluating nutritional quality based on macro balance (ideal 40% carbs, 30% protein, 30% fat), fiber content, sugar levels, and calorie density. Higher scores indicate a more balanced and nutritious meal.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className={`font-semibold whitespace-nowrap ml-2 ${
                      nutritionScore !== null
                        ? nutritionScore >= 70
                          ? "text-green-600"
                          : nutritionScore >= 50
                          ? "text-yellow-600"
                          : nutritionScore >= 30
                          ? "text-orange-600"
                          : "text-red-600"
                        : "text-muted-foreground"
                    }`}>
                      {nutritionScore !== null ? `${nutritionScore}/100` : "—"}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        nutritionScore !== null
                          ? getNutritionScoreBarColor(nutritionScore)
                          : "bg-muted"
                      }`}
                      style={{ width: `${nutritionScore !== null ? nutritionScore : 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="mt-4 space-y-4">
                <div ta-ad-container=""></div>
                <div ta-ad-container=""></div>
              </div>
            </div>
          )}
          

          <div className={`${analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input") ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 sm:space-y-6 lg:space-y-7`}>
            <Card
              ref={nutritionCardRef}
              className="pb-[40px]"
            >
              <CardHeader className="pb-3 pt-4 sm:pt-5">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl overflow-hidden">
                      <span className="block sm:inline">{t("foodresults.nutrition.summary")}</span>
                      {servingApproximation && (
                        <span className="text-sm sm:text-base font-normal text-muted-foreground whitespace-nowrap sm:mx-2 ml-0 sm:ml-3 block sm:inline">
                          (~ {servingApproximation.grams}g)
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{t("foodresults.servings")}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 w-20 sm:w-28 text-center font-medium bg-background flex-shrink-0 text-sm sm:text-base"
                        value={servingsInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                         
                          if (raw === "") {
                            setServingsInput("");
                            return;
                          }
                          const sanitized = raw.replace(/[^0-9.]/g, "");
                          const dots = (sanitized.match(/\./g) ?? []).length;
                          if (dots > 1) {
                            return;
                          }
                          setServingsInput(sanitized);
                          const parsed = parseFloat(sanitized);
                          const hasCompleteNumber = sanitized !== "" && !sanitized.endsWith(".");
                         
                          if (
                            hasCompleteNumber &&
                            !Number.isNaN(parsed) &&
                            parsed >= MIN_SERVINGS
                          ) {
                            applyServings(parsed);
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(servingsInput);
                          if (!Number.isNaN(parsed) && parsed >= MIN_SERVINGS) {
                            applyServings(parsed);
                            setServingsInput(parsed.toString());
                          } else {
                            applyServings(MIN_SERVINGS);
                            setServingsInput(MIN_SERVINGS.toString());
                          }
                        }}
                      />
                      {isAuthenticated && servings !== savedServings && (
                        <Button
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={async () => {
                            if (!id) return;
                            try {
                              setSavingServings(true);
                              
                              // Check authentication first
                              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                              if (sessionError || !session) {
                                throw new Error("Please sign in to save changes");
                              }
                              
                              // Retry logic for network errors
                              let lastError: any = null;
                              for (let attempt = 0; attempt < 3; attempt++) {
                                try {
                                  const { data, error } = await (supabase as any)
                                    .from("food_scans")
                                    .update({ serving: Number(servings) })
                                    .eq("id", id)
                                    .select()
                                    .single();
                                  
                                  if (error) {
                                    lastError = error;
                                    // If it's a network error, retry
                                    if (error.message?.includes("Load failed") || error.message?.includes("fetch")) {
                                      if (attempt < 2) {
                                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                                        continue;
                                      }
                                    }
                                    throw error;
                                  }
                                  
                                  // Success
                                  setSavedServings(servings);
                                  toast({
                                    title: t("foodresults.servings.saved.title"),
                                    description: t("foodresults.servings.saved.description"),
                                  });
                                  return;
                                } catch (err: any) {
                                  lastError = err;
                                  // If it's not a network error, don't retry
                                  if (!err?.message?.includes("Load failed") && !err?.message?.includes("fetch")) {
                                    throw err;
                                  }
                                  // If last attempt, throw
                                  if (attempt === 2) {
                                    throw err;
                                  }
                                }
                              }
                              
                              // If we get here, all retries failed
                              throw lastError || new Error("Failed to save after multiple attempts");
                            } catch (error: any) {
                              console.error("Failed to update serving in database:", error);
                              
                              // Provide user-friendly error messages
                              let errorMessage = t("foodresults.error.servings");
                              if (error?.message?.includes("Load failed") || error?.message?.includes("fetch")) {
                                errorMessage = "Network error. Please check your connection and try again.";
                              } else if (error?.message) {
                                errorMessage = error.message;
                              }
                              
                              toast({
                                title: t("foodresults.error"),
                                description: `${t("foodresults.error.save")} ${errorMessage}`,
                                variant: "destructive",
                              });
                            } finally {
                              setSavingServings(false);
                            }
                          }}
                          disabled={savingServings}
                        >
                          {savingServings ? <Loader2 className="h-4 w-4 animate-spin" /> : t("foodresults.save")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {analysis.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2 sm:pl-3 pt-1 break-words">
                      {analysis.description}
                    </p>
                  )}
                  {analysis.tags && analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {analysis.tags.map((tag, index) => {
                        const palette = [
                          "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.4)] hover:bg-emerald-500 hover:text-white hover:border-emerald-600 transition-colors",
                          "bg-sky-50 text-sky-700 border border-sky-200 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.3)] hover:bg-sky-500 hover:text-white hover:border-sky-600 transition-colors",
                          "bg-rose-50 text-rose-700 border border-rose-200 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)] hover:bg-rose-500 hover:text-white hover:border-rose-600 transition-colors",
                          "bg-amber-50 text-amber-700 border border-amber-200 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4)] hover:bg-amber-500 hover:text-white hover:border-amber-600 transition-colors",
                        ];
                        const colors = palette[index % palette.length];
                        const tagSlug = tagToSlug(tag);
                        return (
                          <Link
                            key={`${tag}-${index}`}
                            href={`/${tagSlug}`}
                            className={`inline-flex items-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold capitalize tracking-tight break-words cursor-pointer ${colors}`}
                          >
                            {tag}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-3 sm:pt-4">
                {analysis.servingGuidance && (
                  <div className="mb-4 sm:mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary" title={analysis.servingGuidance}>
                    <div className="break-words">{analysis.servingGuidance}</div>
                  </div>
                )}
                {!analysis.servingGuidance && servingApproximation && (
                  <div className="mb-4 sm:mb-5 rounded-lg border border-muted/50 bg-muted/40 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">
                    <div className="break-words">
                      <span className="font-medium text-foreground">{servingApproximation.label}</span> ≈ {servingApproximation.grams}g. Divide dish weight by {servingApproximation.grams}g for servings.
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {[
                    { icon: Flame, label: "Calories", value: isNonFood ? "N/A" : (scaled?.calories ?? "-"), suffix: "", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
                    { icon: Beef, label: "Protein", value: isNonFood ? "N/A" : (scaled?.protein_g ?? "-"), suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
                    { icon: Wheat, label: "Carbs", value: isNonFood ? "N/A" : (scaled?.carbohydrates_g ?? "-"), suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
                    { icon: Droplet, label: "Fat", value: isNonFood ? "N/A" : (scaled?.fat_g ?? "-"), suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
                    { icon: Apple, label: "Fiber", value: isNonFood ? "N/A" : (scaled?.fiber_g ?? "-"), suffix: "g", style: "bg-emerald-100/90 border-emerald-200 text-emerald-900" },
                    { icon: Candy, label: "Sugar", value: isNonFood ? "N/A" : (scaled?.sugar_g ?? "-"), suffix: "g", style: "bg-pink-100/90 border-pink-200 text-pink-900" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-xl px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 flex items-center gap-2 sm:gap-3 shadow-sm min-w-0 ${item.style}`}
                    >
                      <div className="p-1.5 sm:p-2 flex-shrink-0">
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground mb-0.5 break-words">{item.label}</div>
                        <div className="text-base sm:text-lg md:text-xl font-semibold break-words">
                          {item.value}
                          {item.value !== "-" ? item.suffix : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              {analysisRefreshing && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </Card>
          </div>
        </div>
        {analysis.additionalInfo && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900  mb-4 sm:mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <AlertTitle className="text-sm sm:text-base">Additional Information</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm leading-relaxed mt-1">
                  {analysis.additionalInfo}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
        {/* Dashboard Preview Section - Show for Free users and Guest users only */}
        {(isGuestUser || !isAuthenticated || (isAuthenticated && !hasPremiumAccess)) && (
          <div className="mb-6 sm:mb-8">
            {/* Title and CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                See how this meal affects your daily/weekly totals on your dashboard.
              </h3>
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white"
                size="sm"
              >
                Access your dashboard to unlock insights
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            {/* Preview Cards */}
            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1 - Macro Analytics */}
              <Card className="overflow-hidden">
                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 overflow-hidden">
                  {/* Blurred chart preview */}
                  <div className="absolute inset-0 p-3 blur-sm">
                    <div className="h-full bg-white/50 rounded flex flex-col justify-end gap-1">
                      <div className="flex items-end gap-1 h-full">
                        <div className="flex-1 bg-primary/40 rounded-t" style={{ height: '60%' }}></div>
                        <div className="flex-1 bg-primary/50 rounded-t" style={{ height: '80%' }}></div>
                        <div className="flex-1 bg-primary/40 rounded-t" style={{ height: '45%' }}></div>
                        <div className="flex-1 bg-primary/60 rounded-t" style={{ height: '90%' }}></div>
                        <div className="flex-1 bg-primary/50 rounded-t" style={{ height: '70%' }}></div>
                        <div className="flex-1 bg-primary/40 rounded-t" style={{ height: '55%' }}></div>
                        <div className="flex-1 bg-primary/60 rounded-t" style={{ height: '85%' }}></div>
                      </div>
                      <div className="text-[8px] text-primary/60 text-center">Mon Tue Wed Thu Fri Sat Sun</div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-primary flex-shrink-0" />
                    <CardTitle className="text-sm sm:text-base font-semibold">Macro Analytics</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    See how meals affect your daily and weekly balance.
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Card 2 - Food History */}
              <Card className="overflow-hidden">
                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 overflow-hidden">
                  {/* Blurred list preview */}
                  <div className="absolute inset-0 p-3 blur-sm">
                    <div className="h-full bg-white/50 rounded p-2 space-y-1.5">
                      <div className="h-2 bg-primary/30 rounded w-full"></div>
                      <div className="h-2 bg-primary/40 rounded w-4/5"></div>
                      <div className="h-2 bg-primary/30 rounded w-full"></div>
                      <div className="h-2 bg-primary/40 rounded w-3/4"></div>
                      <div className="h-2 bg-primary/30 rounded w-5/6"></div>
                      <div className="h-2 bg-primary/40 rounded w-4/5"></div>
                      <div className="h-2 bg-primary/30 rounded w-full"></div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-5 w-5 text-primary flex-shrink-0" />
                    <CardTitle className="text-sm sm:text-base font-semibold">Food History</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Review what you actually ate — not what you guessed.
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Card 3 - Meal Planner */}
              <Card className="overflow-hidden">
                <div className="relative h-32 sm:h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 overflow-hidden">
                  {/* Blurred calendar preview */}
                  <div className="absolute inset-0 p-3 blur-sm">
                    <div className="h-full bg-white/50 rounded p-2">
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div key={i} className="h-3 bg-primary/20 rounded text-[6px] text-center"></div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 14 }).map((_, i) => (
                          <div key={i} className={`h-3 rounded ${i % 7 === 0 || i % 7 === 6 ? 'bg-primary/10' : i === 5 ? 'bg-primary/40' : 'bg-primary/20'}`}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                    <CardTitle className="text-sm sm:text-base font-semibold">Meal Planner</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Plan meals based on real eating habits.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className={`relative ${analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input") ? "lg:col-span-3" : ""}`}>
            <Badge 
              className="absolute top-2 right-2 bg-orange-500 text-white border-0 text-[10px] px-1.5 py-0.5 z-10 cursor-pointer hover:bg-orange-600 transition-colors"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "The ingredient editor feature is currently under development and will be available soon. Thank you for your patience!",
                });
              }}
            >
              Coming Soon
            </Badge>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Apple className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <CardTitle className="text-base sm:text-lg">Ingredients</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled
                  className="text-xs sm:text-sm px-2 sm:px-3 opacity-50 cursor-not-allowed"
                >
                  <Pencil className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
              <CardDescription className="text-xs sm:text-sm">Detected/estimated ingredients</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 sm:space-y-2.5">
                {analysis.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
                    <span className="text-xs sm:text-sm leading-relaxed break-words">{ing}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {!(analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <CardTitle className="text-base sm:text-lg">How to Prepare</CardTitle>
                  </div>
                  {hasPremiumAccess && isAuthenticated && analysis.instructions && analysis.instructions.length > 0 && (
                    <Button
                      size="sm"
                      variant={isRecipeSaved ? "secondary" : "default"}
                      className="text-xs sm:text-sm"
                      onClick={saveRecipe}
                      disabled={savingRecipe || isRecipeSaved}
                    >
                      {savingRecipe ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">{t("foodresults.recipe.save.saving")}</span>
                        </>
                      ) : isRecipeSaved ? (
                        <>
                          <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 fill-current" />
                          <span className="hidden sm:inline">{t("foodresults.recipe.save.saved")}</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{t("foodresults.recipe.save.button")}</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs sm:text-sm">Step-by-step instructions</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 sm:space-y-4">
                  {analysis.instructions?.map((step, i) => {
                    // Parse step to extract bold title and description
                    // Handle both markdown **bold** and plain text formats
                    const boldMatch = step.match(/^\*\*(.+?)\*\*[:\s]*(.+)$/);
                    const hasBoldTitle = boldMatch !== null;
                    const title = hasBoldTitle ? boldMatch[1] : null;
                    const description = hasBoldTitle ? boldMatch[2] : step;
                   
                    return (
                      <li key={i} className="flex gap-2 sm:gap-3">
                        <span className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs sm:text-sm font-medium mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {title && (
                            <p className="text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-1.5 break-words">
                              {title}
                            </p>
                        )}
                        <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 break-words">
                          {description}
                        </p>
                      </div>
                    </li>
                  );
                })}
                </ol>
                {isVideoAvailable === true && analysis.youtubeVideoUrl && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">Watch Video Tutorial</p>
                      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          src={(() => {
                            const url = analysis.youtubeVideoUrl;
                            // Extract video ID from various YouTube URL formats
                            let videoId = "";
                            if (url.includes("youtube.com/watch?v=")) {
                              videoId = url.split("watch?v=")[1]?.split("&")[0] || "";
                            } else if (url.includes("youtu.be/")) {
                              videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
                            } else if (url.includes("youtube.com/embed/")) {
                              videoId = url.split("embed/")[1]?.split("?")[0] || "";
                            }
                            return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
                          })()}
                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Cooking tutorial"
                        />
                      </div>
                      <a
                        href={analysis.youtubeVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Youtube className="h-4 w-4" /> Watch on YouTube
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <Card className="border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-1 sm:gap-2 whitespace-nowrap">Personalized Health Context</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Guidance based on what you actually eat.</CardDescription>
                  </div>
                </div>
                {(upgradeRequired || !hasPremiumAccess) && (
                  <span className="text-xs bg-primary/10 text-primary px-2 sm:px-3 py-1 rounded-full flex items-center gap-1 border border-primary/20 flex-shrink-0 self-start sm:self-center">
                    <Sparkles className="h-3 w-3" /> <span className="hidden sm:inline">Premium</span>
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {checkingPremium ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !hasPremiumAccess ? (
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 sm:p-8 md:p-10">
                  <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden>
                    <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/30 blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 h-40 w-40 bg-emerald-400/20 blur-3xl" />
                  </div>
                  <div className="relative flex flex-col items-center gap-6 sm:gap-8">
                    {/* Crown Icon */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-primary/15 border border-primary/30 shadow-inner">
                      <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    </div>
                    
                    {/* Heading and Description */}
                    <div className="space-y-3 text-center max-w-2xl">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                        Numbers don&apos;t change habits. Context does.
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-4">
                        Right now, you can see what&apos;s in this meal, but not what it means for your goals over time. Personalized Health Context connects your meals, patterns, and targets to help you understand what to adjust and why. No generic advice. No guessing.
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 w-full">
                      {!isAuthenticated && (
                        <Button 
                          variant="outline" 
                          onClick={() => router.push("/auth")} 
                          size="default"
                          className="min-w-[120px]"
                        >
                          Sign In
                        </Button>
                      )}
                      <Button 
                        className="bg-primary hover:bg-primary/90 text-white min-w-[160px]" 
                        size="default"
                        onClick={() => window.location.href = "/plans"}
                      >
                        <Sparkles className="h-4 w-4 mr-2" /> 
                        Unlock Personalized Guidance
                      </Button>
                    </div>
                    
                    {/* Feature Cards */}
                    <div className="mt-2 sm:mt-4 grid grid-cols-1 gap-4 sm:gap-5 w-full max-w-5xl">
                      <div className="rounded-xl border border-primary/10 bg-background/80 backdrop-blur-sm p-4 sm:p-5 flex items-start gap-4 hover:border-primary/20 transition-colors">
                        <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold mb-2 text-foreground">
                            Stop guessing what to fix
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            See which habits are actually holding you back; Protein, timing, portions, or consistency.
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/10 bg-background/80 backdrop-blur-sm p-4 sm:p-5 flex items-start gap-4 hover:border-primary/20 transition-colors">
                        <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                          <Lightbulb className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold mb-2 text-foreground">
                            Make small changes that matter
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Get clear, practical adjustments you can apply to your next meal, not abstract rules.
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-primary/10 bg-background/80 backdrop-blur-sm p-4 sm:p-5 flex items-start gap-4 hover:border-primary/20 transition-colors">
                        <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold mb-2 text-foreground">
                            Know if you&apos;re on track
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Understand whether your eating supports your goal, before weeks go by with no progress.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Announcement Bars for Free Registered Users */}
                  {!hasPremiumAccess && isAuthenticated && (
                    <div className="space-y-4 mb-6">
                      {/* Debug info - remove in production */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded border-2 border-yellow-500">
                          Debug: hasScans={String(hasScans)}, profileComplete={String(profileComplete)}, hasPremiumAccess={String(hasPremiumAccess)}, isAuthenticated={String(isAuthenticated)}
                        </div>
                      )}
                      {/* Bar 1: Complete Profile */}
                      {!profileComplete && (
                        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                          <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
                            Complete Your Profile 3
                          </AlertTitle>
                          <AlertDescription className="text-green-800 dark:text-green-200">
                            <p className="mb-2">
                              Get more personalized nutrition insights and recommendations tailored to your age, gender, weight, and height.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                              onClick={() => router.push("/profile")}
                            >
                              Complete Profile
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                  {insightsLoading && !insightsText && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                      <div className="flex items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        <span className="text-sm text-muted-foreground">{t("foodresults.insights.generating")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 text-center max-w-md">
                        {t("foodresults.insights.timeout")}
                      </p>
                    </div>
                  )}
                  {hasPremiumAccess && !insightsLoading && !insightsText && (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-4">
                        {profileComplete
                          ? t("foodresults.insights.complete")
                          : t("foodresults.insights.incomplete")}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={insightsLoading}
                          onClick={async () => {
                            console.log("Generate Insights clicked", { id, profileAge, profileGender, profileComplete, hasPremiumAccess });
                            if (!id) {
                              toast({
                                title: "Error",
                                description: "Scan ID is missing.",
                                variant: "destructive",
                              });
                              return;
                            }
                            // Allow generation even with partial profile data
                            if (!profileAge || !profileGender) {
                              toast({
                                title: t("foodresults.insights.incomplete.title"),
                                description: t("foodresults.insights.incomplete.description"),
                                variant: "default",
                              });
                            }
                            try {
                              setInsightsLoading(true);
                              setUpgradeRequired(false);
                              console.log("Starting insights generation...");
                             
                              // Add timeout wrapper (40 seconds max for insights)
                              const timeoutPromise = new Promise((_, reject) => {
                                setTimeout(() => reject(new Error("Insights generation timed out after 40 seconds. Please try again.")), 40000);
                              });
                             
                              const insightsPromise = getPersonalizedInsights({
                                scanId: id,
                                age: profileAge || undefined,
                                gender: profileGender || undefined,
                                activity: profileActivityLevel || undefined,
                                goal: profileGoal || undefined,
                                optimize: false,
                                weight_kg: profile?.weight_kg || undefined,
                                height_cm: profile?.height_cm || undefined,
                              });
                             
                              console.log("Waiting for insights...");
                              const res = await Promise.race([insightsPromise, timeoutPromise]) as Awaited<ReturnType<typeof getPersonalizedInsights>>;
                              console.log("Insights received:", res);
                             
                              if (res.upgrade) {
                                setUpgradeRequired(true);
                                setInsightsText("");
                                return;
                              }
                              if (res.insights) {
                                await persistInsights(res.insights);
                                console.log("Insights set successfully");
                              } else {
                                throw new Error("No insights returned from server");
                              }
                            } catch (error: any) {
                              console.error("Failed to generate insights:", error);
                              toast({
                                title: "Insights Generation Failed",
                                description: error?.message || "Unable to generate personalized insights. Please try again.",
                                variant: "destructive",
                              });
                              setInsightsText(""); // Clear any partial state
                            } finally {
                              setInsightsLoading(false);
                              console.log("Insights loading finished");
                            }
                          }}
                        >
                          {insightsLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            </>
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Generate Insights
                        </Button>
                        <Button variant="outline" onClick={() => router.push("/meal-planner")}>Generate Meal Plan</Button>
                     
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
                          <Button size="sm" onClick={() => window.location.href = "/plans"}>
                            <Sparkles className="h-4 w-4 mr-2" /> Upgrade Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {parsedInsights && (
                    <div
                      className="space-y-6"
                      data-collapse-gap-in-pdf={insightsText ? "true" : undefined}
                    >
                      {/* Profile Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {parsedInsights.demographics && (
                          <Badge variant="outline" className="text-xs px-3 bg-background/80 border-primary/30">
                            {parsedInsights.demographics}
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 flex-nowrap">
                          {profile?.weight_kg && profile?.height_cm && (() => {
                            const bmi = calculateBMI(profile.weight_kg, profile.height_cm);
                            const bmiCategory = getBMICategory(bmi);
                            if (bmi) {
                              return (
                                <Badge
                                  variant="outline"
                                  className={`text-xs px-3 py-1.5 border-2 ${
                                    bmiCategory.color === "green" ? "bg-green-50 border-green-500 text-green-700" :
                                    bmiCategory.color === "blue" ? "bg-blue-50 border-blue-500 text-blue-700" :
                                    bmiCategory.color === "orange" ? "bg-orange-50 border-orange-500 text-orange-700" :
                                    "bg-red-50 border-red-500 text-red-700"
                                  }`}
                                >
                                  <Scale className="h-3 w-3 mr-1.5" />
                                  BMI: {bmi.toFixed(1)} ({bmiCategory.category})
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          {profile?.activity_level && (
                            <Badge variant="outline" className="text-xs px-3 py-1 bg-primary/10 border-primary/30 text-primary">
                              <Activity className="h-3 w-3 mr-1.5" />
                              {profile.activity_level.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          )}
                        </div>
                        {profile?.goal && (
                          <Badge variant="outline" className="text-xs px-3 bg-primary/10 border-primary/30 text-primary">
                            <Target className="h-3 w-3 mr-1.5" />
                            {profile.goal.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        )}
                      </div>
                      
                      {/* New Format: Key Recommendations and Action Items */}
                      {(parsedInsights.keyRecommendations?.length > 0 || parsedInsights.actionItems?.length > 0) ? (
                        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                          {/* Key Recommendations */}
                          {parsedInsights.keyRecommendations?.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-base font-semibold">Key Recommendations</h3>
                              </div>
                              <div className="space-y-3">
                                {parsedInsights.keyRecommendations.map((rec, idx) => (
                                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                      <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-foreground flex-1">{rec}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Action Items */}
                          {parsedInsights.actionItems?.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Zap className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-base font-semibold">Action Items</h3>
                              </div>
                              <div className="space-y-3">
                                {parsedInsights.actionItems.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                      <Zap className="h-3 w-3 text-primary" />
                                    </div>
                                    <p className="text-sm leading-relaxed text-foreground flex-1">{item}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : parsedInsights.healthContext ? (
                        /* Legacy format fallback */
                        <div className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-base font-semibold">Key Recommendations</h3>
                              </div>
                              <div className="space-y-3">
                                {(() => {
                                  const text = parsedInsights.healthContext;
                                  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
                                  const keyPoints = sentences.slice(0, 4).map(s => s.trim());
                                  return keyPoints.map((point, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                        <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                                      </div>
                                      <p className="text-sm leading-relaxed text-foreground flex-1">{point}.</p>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                            {parsedInsights.substitutions.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <Lightbulb className="h-5 w-5 text-primary" />
                                  </div>
                                  <h3 className="text-base font-semibold">Smart Substitution Suggestions</h3>
                                </div>
                                <div className="space-y-3">
                                  {parsedInsights.substitutions.map((sub, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                        <CheckCircle2 className="h-3 w-3 text-primary" />
                                      </div>
                                      <div className="flex-1">
                                        {sub.title && <h5 className="font-semibold mb-1 text-sm">{sub.title}</h5>}
                                        <p className="text-sm text-foreground leading-relaxed">{sub.description}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : insightsText ? (
                        <div className="rounded-lg border p-4 bg-muted/30">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{insightsText}</div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </main>
      <Dialog open={ingredientEditorOpen} onOpenChange={setIngredientEditorOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit detected ingredients</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Adjust the ingredient list and quantities. We&apos;ll recalculate the nutrition based on your edits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={Math.max(6, ingredientInput.split("\n").length + 1)}
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              placeholder={"250g cooked chickpeas\n30g tahini\n15ml olive oil\nPaprika, to taste"}
              className="text-sm sm:text-base"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter one ingredient per line. Use metric units (grams, kg, ml, liters) for quantities. Imperial units (cups, tbsp, oz) will be automatically converted to metric.
            </p>
          </div>
          <DialogFooter className="pt-2 flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIngredientEditorOpen(false)} disabled={updatingIngredients} className="w-full sm:w-auto text-sm">
              Cancel
            </Button>
            <Button onClick={handleIngredientUpdate} disabled={updatingIngredients} className="w-full sm:w-auto text-sm">
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
      <FeedbackDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} />
      <Dialog open={dislikeDialogOpen} onOpenChange={setDislikeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct Dish Name</DialogTitle>
            <DialogDescription>
              Please enter the correct name for this dish. We&apos;ll generate a new analysis based on your correction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="correctDishName" className="text-sm font-medium">
                Correct Dish Name
              </label>
              <Input
                id="correctDishName"
                value={correctDishName}
                onChange={(e) => setCorrectDishName(e.target.value)}
                placeholder="e.g., Grilled Chicken Breast"
                disabled={isGeneratingCorrection}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitCorrection();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDislikeDialogOpen(false);
                setCorrectDishName("");
              }}
              disabled={isGeneratingCorrection}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitCorrection}
              disabled={!correctDishName.trim() || isGeneratingCorrection}
            >
              {isGeneratingCorrection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Submit Correction"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Only load TinyAds script for non-premium users (free users and non-authenticated users) */}
      {!checkingPremium && !hasPremiumAccess && (
      <Script
        src="https://cdn.apitiny.net/scripts/v2.0/main.js"
        data-site-id="68ec4452809989948ad4d6cc"
        data-test-mode="false"
        strategy="afterInteractive"
      />
      )}
    </>
  );
}