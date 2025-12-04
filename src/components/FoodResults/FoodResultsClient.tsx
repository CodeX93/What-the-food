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
  recalculateNutritionFromIngredients,
} from "@/utils/foodScan";
import { hasActivePremiumSubscription } from "@/utils/subscription";
import { calculateBMI, getBMICategory } from "@/utils/bmi";
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
  Youtube,
  Activity,
  Scale,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/use-translation";
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
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [ingredientEditorOpen, setIngredientEditorOpen] = useState(false);
  const [ingredientInput, setIngredientInput] = useState("");
  const [updatingIngredients, setUpdatingIngredients] = useState(false);
  const [analysisRefreshing, setAnalysisRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);
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
          <div class="stat-value">${formatNumber(stat.value)}${stat.suffix}</div>
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
    const confidence = typeof analysis.confidence === "number"
      ? `${Math.round((analysis.confidence || 0) * 100)}%`
      : "—";
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
                  <span class="pill">Confidence: ${confidence}</span>
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
  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/shared/${id}`;
      const dishDisplay = analysis?.isManualEntry || analysis?.dish?.startsWith("Manual") || analysis?.dish?.startsWith("Manual Input")
        ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
        : analysis?.dish || "Food scan";
      const shareData = {
        title: dishDisplay || "Food Analysis Results",
        text: `Check out this food analysis: ${dishDisplay}`,
        url: shareUrl,
      };
      // Try Web Share API first (mobile-friendly)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: t("foodresults.share.success"),
          description: t("foodresults.share.success.description"),
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: t("foodresults.share.copied"),
          description: t("foodresults.share.copied.description"),
        });
      }
    } catch (error: any) {
      // User cancelled share or clipboard failed
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        // Fallback to copying URL
        try {
          const shareUrl = `${window.location.origin}/shared/${id}`;
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied!",
            description: "Food analysis link has been copied to your clipboard.",
          });
        } catch (clipboardError) {
          toast({
            title: t("foodresults.share.error"),
            description: t("foodresults.share.error.description"),
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
          .select("image_url, image_path, serving, result_json, language")
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
        };
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
  }, [id, router, userLanguage]);
  useEffect(() => {
    if (analysis) {
      setIngredientInput((analysis.ingredients ?? []).join("\n"));
    }
  }, [analysis]);
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 relative w-full" ref={reportRef}>
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button variant="ghost" onClick={() => router.back()} className="px-2 flex-shrink-0">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold flex items-center gap-1 sm:gap-2 truncate">
                  <Salad className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
                  <span className="truncate">
                    {analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
                      ? `${t("foodresults.manual.input")}: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
                      : analysis.dish || t("foodresults.title")}
                  </span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 pdf-hide flex-shrink-0">
              <Button size="sm" variant="outline" onClick={handleShare} className="text-xs sm:text-sm">
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t("foodresults.share")}</span>
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
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          {!(analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")) && (
            <div className="lg:col-span-4">
              <Card className="overflow-hidden lg:sticky lg:top-6">
                {imageUrl ? (
                  <div className="relative overflow-hidden" style={{ paddingBottom: 'calc(100% + 24px)' }}>
                    <img src={imageUrl} alt={analysis.dish || "Food"} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center text-muted-foreground bg-muted" style={{ paddingBottom: 'calc(100% + 24px)' }}>
                    <Salad className="absolute inset-0 m-auto h-16 w-16 opacity-30" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span>{t("foodresults.confidence")}</span>
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
                            {t("foodresults.confidence.tooltip")}
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
          )}
          <div className={`${analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input") ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 sm:space-y-6 lg:space-y-7`}>
            <Card className="pb-[40px]">
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
                          className="text-xs sm:text-sm px-2 sm:px-3"
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
                                title: t("foodresults.error"),
                                description: `${t("foodresults.error.save")} ${error.message}`,
                                variant: "destructive",
                              });
                                return;
                              }
                              setSavedServings(servings);
                              toast({
                                title: t("foodresults.servings.saved.title"),
                                description: t("foodresults.servings.saved.description"),
                              });
                            } catch (error: any) {
                              console.error("Failed to update serving in database:", error);
                              toast({
                                title: t("foodresults.error"),
                                description: error?.message || t("foodresults.error.servings"),
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
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2 sm:pl-3 pt-1">
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
              <CardContent className="pt-3 sm:pt-4">
                {analysis.servingGuidance && (
                  <div className="mb-4 sm:mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-primary">
                    {analysis.servingGuidance}
                  </div>
                )}
                {!analysis.servingGuidance && servingApproximation && (
                  <div className="mb-4 sm:mb-5 rounded-lg border border-muted/50 bg-muted/40 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{servingApproximation.label}</span> ≈ {servingApproximation.grams} grams. To adjust servings, divide your dish weight (in grams) by {servingApproximation.grams}. For example, 650 g ÷ {servingApproximation.grams} ≈ {(650 / servingApproximation.grams).toFixed(1)} servings.
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {[
                    { icon: Flame, label: "Calories", value: scaled?.calories ?? "-", suffix: "", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
                    { icon: Beef, label: "Protein", value: scaled?.protein_g ?? "-", suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
                    { icon: Wheat, label: "Carbs", value: scaled?.carbohydrates_g ?? "-", suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
                    { icon: Droplet, label: "Fat", value: scaled?.fat_g ?? "-", suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
                    { icon: Apple, label: "Fiber", value: scaled?.fiber_g ?? "-", suffix: "g", style: "bg-emerald-100/90 border-emerald-200 text-emerald-900" },
                    { icon: Candy, label: "Sugar", value: scaled?.sugar_g ?? "-", suffix: "g", style: "bg-pink-100/90 border-pink-200 text-pink-900" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-xl px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 md:py-3.5 flex items-center gap-2 sm:gap-3 shadow-sm ${item.style}`}
                    >
                      <div className="p-1.5 sm:p-2 flex-shrink-0">
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground mb-0.5">{item.label}</div>
                        <div className="text-base sm:text-lg md:text-xl font-semibold">
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
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              <Card className={analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input") ? "md:col-span-2" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Apple className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <CardTitle className="text-base sm:text-lg">Ingredients</CardTitle>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenIngredientEditor} className="text-xs sm:text-sm px-2 sm:px-3">
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
                        <span className="text-xs sm:text-sm leading-relaxed">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              {!(analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")) && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <CardTitle className="text-base sm:text-lg">How to Prepare</CardTitle>
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
                                <p className="text-xs sm:text-sm font-semibold text-foreground mb-1 sm:mb-1.5">
                                  {title}
                                </p>
                            )}
                            <p className="text-xs sm:text-sm leading-relaxed text-foreground/90">
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
            </div>
            {analysis.additionalInfo && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
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
            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-1 sm:gap-2">Personalized Health Context</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Demographic-aware insights tailored to your goals</CardDescription>
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
                  <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 sm:p-6 md:p-8 text-center">
                    <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden>
                      <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/30 blur-3xl" />
                      <div className="absolute -bottom-12 -left-12 h-40 w-40 bg-emerald-400/20 blur-3xl" />
                    </div>
                    <div className="relative flex flex-col items-center gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/15 border border-primary/30 shadow-inner">
                        <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">Get Premium to unlock this section</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto px-2">
                          Personalized Health Context provides AI-powered wellness guidance tailored to your unique goals. Upgrade to reveal insights crafted specifically for you.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full">
                        {!isAuthenticated && (
                          <Button variant="outline" onClick={() => router.push("/auth")} size="sm" className="text-xs sm:text-sm">
                            Sign In
                          </Button>
                        )}
                        <Button className="bg-primary hover:bg-primary-hover text-xs sm:text-sm" size="sm" onClick={() => router.push("/plans")}>
                          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> <span className="hidden sm:inline">Explore Premium</span><span className="sm:hidden">Premium</span>
                        </Button>
                      </div>
                      <div className="mt-4 sm:mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-left w-full max-w-3xl">
                        <div className="rounded-lg sm:rounded-xl border border-primary/10 bg-background/60 p-3 sm:p-4">
                          <h4 className="text-xs sm:text-sm font-semibold mb-1 flex items-center gap-1.5 sm:gap-2">
                            <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" /> <span>Tailored Guidance</span>
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Receive context-aware advice that adapts to your age, activity level, and health goals.
                          </p>
                        </div>
                        <div className="rounded-lg sm:rounded-xl border border-primary/10 bg-background/60 p-3 sm:p-4">
                          <h4 className="text-xs sm:text-sm font-semibold mb-1 flex items-center gap-1.5 sm:gap-2">
                            <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" /> <span>Smart Substitutions</span>
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Unlock creative ingredient swaps to make every meal healthier without compromising taste.
                          </p>
                        </div>
                        <div className="rounded-lg sm:rounded-xl border border-primary/10 bg-background/60 p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
                          <h4 className="text-xs sm:text-sm font-semibold mb-1 flex items-center gap-1.5 sm:gap-2">
                            <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" /> <span>Premium Dashboard</span>
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
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
                        <AlertTitle>{t("foodresults.complete.profile.title")}</AlertTitle>
                        <AlertDescription>
                          {t("foodresults.complete.profile.insights")}
                          <Button
                            variant="link"
                            className="p-0 h-auto ml-1 text-amber-900 font-semibold underline"
                            onClick={() => router.push("/profile")}
                          >
                            {t("foodresults.complete.profile.button")}
                          </Button>
                        </AlertDescription>
                      </Alert>
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
                               
                                // Add timeout wrapper (20 seconds max)
                                const timeoutPromise = new Promise((_, reject) => {
                                  setTimeout(() => reject(new Error("Insights generation timed out after 20 seconds. Please try again.")), 20000);
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
                            <Button size="sm" onClick={() => router.push("/plans")}>
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
                        {parsedInsights.healthContext && (
                          <div className="space-y-6">
                            {/* Profile Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              {parsedInsights.demographics && (
                                <Badge variant="outline" className="text-xs px-3 bg-background/80 border-primary/30">
                                  {parsedInsights.demographics}
                                </Badge>
                              )}
                              {profile?.goal && (
                                <Badge variant="outline" className="text-xs px-3 bg-primary/10 border-primary/30 text-primary">
                                  <Target className="h-3 w-3 mr-1.5" />
                                  {profile.goal.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              )}
                              {profile?.activity_level && (
                                <Badge variant="outline" className="text-xs px-3 py-1 bg-primary/10 border-primary/30 text-primary">
                                  <Activity className="h-3 w-3 mr-1.5" />
                                  {profile.activity_level.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              )}
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
                            </div>
                            {/* Enhanced Insights Display */}
                            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                              {/* Key Recommendations & Tips Card */}
                              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/20">
                                      <CheckCircle2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-base">Key Recommendations & Tips</CardTitle>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {(() => {
                                      // Parse the health context to extract key points
                                      const text = parsedInsights.healthContext;
                                      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
                                      const keyPoints = sentences.slice(0, 4).map(s => s.trim());
                                     
                                      return keyPoints.map((point, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-primary/10">
                                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                                          </div>
                                          <p className="text-sm leading-relaxed text-foreground flex-1">{point}.</p>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </CardContent>
                              </Card>
                              {/* Smart Substitution Suggestions Card */}
                              {parsedInsights.substitutions.length > 0 && (
                                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 rounded-lg bg-primary/20">
                                        <Lightbulb className="h-5 w-5 text-primary" />
                                      </div>
                                      <CardTitle className="text-base">Smart Substitution Suggestions</CardTitle>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-3">
                                      {parsedInsights.substitutions.map((sub, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-primary/10"
                                        >
                                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                          </div>
                                          <div className="flex-1">
                                            {sub.title && <h5 className="font-semibold mb-1 text-sm">{sub.title}</h5>}
                                            <p className="text-sm text-foreground leading-relaxed">{sub.description}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
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
    </>
  );
}