import { ReactNode, useEffect, useState } from "react";
import { MealPlan } from "./MealPlannerClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
  Flame,
  Dumbbell,
  ListChecks,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Share2,
  FileDown,
  Printer,
  Loader2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";

type MealPlanResultsProps = {
  plan: MealPlan;
  isEditingMeals: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdits: () => void | Promise<void>;
  saving?: boolean;
  onMealNameChange: (dayIndex: number, mealIndex: number, value: string) => void;
  onIngredientChange: (
    dayIndex: number,
    mealIndex: number,
    ingredientIndex: number,
    field: "name" | "quantity" | "calories",
    value: string,
  ) => void;
  onRemoveIngredient: (dayIndex: number, mealIndex: number, ingredientIndex: number) => void;
  onAddIngredient: (dayIndex: number, mealIndex: number) => void;
  onMoveDayUp?: (dayIndex: number) => void;
  onMoveDayDown?: (dayIndex: number) => void;
  onSwapDays?: (fromIndex: number, toIndex: number) => void;
  onSwapMeals?: (fromDayIndex: number, fromMealIndex: number, toDayIndex: number, toMealIndex: number) => void;
  userFirstName?: string | null;
  mealPlanId?: string;
  showShareButtons?: boolean;
  profileAvatarUrl?: string | null;
};

const mealTypeStyles: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    chip: string;
    accent: string;
  }
> = {
  breakfast: {
    bg: "bg-amber-50 dark:bg-amber-900/25",
    border: "border-amber-200 dark:border-amber-500/40",
    text: "text-amber-900 dark:text-amber-50",
    chip: "bg-amber-200/70 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
    accent: "text-amber-600 dark:text-amber-300",
  },
  lunch: {
    bg: "bg-sky-50 dark:bg-sky-900/25",
    border: "border-sky-200 dark:border-sky-500/40",
    text: "text-sky-900 dark:text-sky-50",
    chip: "bg-sky-200/70 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100",
    accent: "text-sky-600 dark:text-sky-300",
  },
  dinner: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-500/40",
    text: "text-emerald-900 dark:text-emerald-50",
    chip: "bg-emerald-200/70 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100",
    accent: "text-emerald-600 dark:text-emerald-300",
  },
  snack: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-900/25",
    border: "border-fuchsia-200 dark:border-fuchsia-500/40",
    text: "text-fuchsia-900 dark:text-fuchsia-50",
    chip: "bg-fuchsia-200/70 text-fuchsia-900 dark:bg-fuchsia-400/20 dark:text-fuchsia-100",
    accent: "text-fuchsia-600 dark:text-fuchsia-300",
  },
};

const defaultMealStyle = {
  bg: "bg-slate-50 dark:bg-slate-900/30",
  border: "border-slate-200 dark:border-slate-700",
  text: "text-slate-900 dark:text-slate-50",
  chip: "bg-slate-200/70 text-slate-900 dark:bg-slate-700/60 dark:text-slate-100",
  accent: "text-slate-600 dark:text-slate-300",
};

const safeArray = <T,>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);
const safeText = (value: string | undefined | null, fallback = "Not specified") =>
  value && value.trim().length > 0 ? value : fallback;
const safeNumber = (value: number | undefined | null, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function MealPlanResults({
  plan,
  isEditingMeals,
  onStartEditing,
  onCancelEditing,
  onSaveEdits,
  saving = false,
  onMealNameChange,
  onIngredientChange,
  onRemoveIngredient,
  onAddIngredient,
  onMoveDayUp,
  onMoveDayDown,
  onSwapDays,
  onSwapMeals,
  userFirstName,
  mealPlanId,
  showShareButtons = false,
  profileAvatarUrl,
}: MealPlanResultsProps) {
  const t = useTranslation();
  const { toast } = useToast();
  const planRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
  const [draggedMealIndex, setDraggedMealIndex] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null);
  const [dragOverMealIndex, setDragOverMealIndex] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
  const dailyCalorieTarget = safeNumber(plan?.dailyCalorieTarget);
  const macroDistribution = plan?.macroDistribution || {
    protein_g: 0,
    carbohydrates_g: 0,
    fat_g: 0,
    fiber_g: 0,
    rationale: "",
  };

  const exercisePlan = plan?.exercisePlan;
  const weeklyMealPlan = safeArray(plan?.weeklyMealPlan);
  const actionItems = safeArray(plan?.actionItems);
  const tips = safeArray(plan?.tips);
  const totalDays = weeklyMealPlan.length || 1;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    setSelectedWeek((prev) => Math.min(prev, totalWeeks));
  }, [totalWeeks]);

  const weekStartIndex = (selectedWeek - 1) * 7;
  const visibleDays = weeklyMealPlan.slice(weekStartIndex, weekStartIndex + 7);

  const getMealStyle = (type?: string) =>
    type ? mealTypeStyles[type.toLowerCase()] || defaultMealStyle : defaultMealStyle;

  const handleShare = async () => {
    if (!mealPlanId) return;
    
    // Use mealPlanId directly as share_id (faster, no DB query needed)
    const shareUrl = `${window.location.origin}/shared-meal-plan/${mealPlanId}`;
    const shareData = {
      title: plan?.overview || "Meal Plan",
      text: `Check out this meal plan: ${plan?.overview || "Personalized meal plan"}`,
      url: shareUrl,
    };

    try {
      // Try Web Share API first (mobile-friendly)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Meal plan shared successfully.",
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Meal plan link has been copied to your clipboard.",
        });
      }
    } catch (error: any) {
      // User cancelled share or clipboard failed
      if (error.name !== "AbortError") {
        try {
          // Final fallback: try clipboard again
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied!",
            description: "Meal plan link has been copied to your clipboard.",
          });
        } catch (clipboardError) {
          toast({
            title: "Share failed",
            description: `Unable to share. Please copy this URL manually: ${shareUrl}`,
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleExportPdf = async () => {
    if (!planRef.current) return;

    setExportingPdf(true);

    try {
      // Clone the content so we can hide controls in the clone without affecting the UI
      const source = planRef.current;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.top = "0";
      clone.style.left = "-9999px";
      clone.style.width = `${source.offsetWidth}px`;
      clone.style.pointerEvents = "none";
      document.body.appendChild(clone);

      // Hide pdf-only elements in the clone
      const buttons = clone.querySelectorAll(".pdf-hide");
      buttons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      // Capture the cloned content
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = canvas.width;
      const pdfHeight = canvas.height;

      // Use A4 format if content is too large
      const maxWidth = 210 * 3.78; // A4 width in pixels at 72 DPI scaled
      const maxHeight = 297 * 3.78; // A4 height in pixels at 72 DPI scaled

      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;

      if (pdfWidth > maxWidth || pdfHeight > maxHeight) {
        const scale = Math.min(maxWidth / pdfWidth, maxHeight / pdfHeight);
        finalWidth = pdfWidth * scale;
        finalHeight = pdfHeight * scale;
      }

      const pdf = new jsPDF({
        unit: "px",
        format: [finalWidth, finalHeight],
        compress: true,
      });

      pdf.addImage(imgData, "PNG", 0, 0, finalWidth, finalHeight, undefined, "FAST");

      const safeTitle = (plan?.overview || "meal-plan").replace(/[^\w\d_-]+/g, "-").substring(0, 50);
      pdf.save(`${safeTitle}.pdf`);

      toast({
        title: "PDF ready",
        description: "Meal plan PDF has been saved to your downloads.",
      });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export failed",
        description: "Could not export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Day drag handlers
  const handleDayDragStart = (e: React.DragEvent, dayIndex: number) => {
    if (!isEditingMeals) return;
    setDraggedDayIndex(dayIndex);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `day-${dayIndex}`);
  };

  const handleDayDragOver = (e: React.DragEvent, dayIndex: number) => {
    if (!isEditingMeals || draggedDayIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDayIndex(dayIndex);
  };

  const handleDayDragLeave = () => {
    setDragOverDayIndex(null);
  };

  const handleDayDrop = (e: React.DragEvent, targetDayIndex: number) => {
    if (!isEditingMeals || draggedDayIndex === null || draggedDayIndex === targetDayIndex) {
      setDraggedDayIndex(null);
      setDragOverDayIndex(null);
      return;
    }
    e.preventDefault();
    if (onSwapDays) {
      onSwapDays(draggedDayIndex, targetDayIndex);
    }
    setDraggedDayIndex(null);
    setDragOverDayIndex(null);
  };

  const handleDayDragEnd = () => {
    setDraggedDayIndex(null);
    setDragOverDayIndex(null);
  };

  // Meal drag handlers
  const handleMealDragStart = (e: React.DragEvent, dayIndex: number, mealIndex: number) => {
    if (!isEditingMeals) return;
    setDraggedMealIndex({ dayIndex, mealIndex });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `meal-${dayIndex}-${mealIndex}`);
  };

  const handleMealDragOver = (e: React.DragEvent, dayIndex: number, mealIndex: number) => {
    if (!isEditingMeals || draggedMealIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverMealIndex({ dayIndex, mealIndex });
  };

  const handleMealDragLeave = () => {
    setDragOverMealIndex(null);
  };

  const handleMealDrop = (e: React.DragEvent, targetDayIndex: number, targetMealIndex: number) => {
    if (!isEditingMeals || draggedMealIndex === null) return;
    e.preventDefault();
    
    const { dayIndex: fromDayIndex, mealIndex: fromMealIndex } = draggedMealIndex;
    
    if (fromDayIndex === targetDayIndex && fromMealIndex === targetMealIndex) {
      setDraggedMealIndex(null);
      setDragOverMealIndex(null);
      return;
    }

    if (onSwapMeals) {
      onSwapMeals(fromDayIndex, fromMealIndex, targetDayIndex, targetMealIndex);
    }
    
    setDraggedMealIndex(null);
    setDragOverMealIndex(null);
  };

  const handleMealDragEnd = () => {
    setDraggedMealIndex(null);
    setDragOverMealIndex(null);
  };

  return (
    <div className="space-y-8" ref={planRef}>
      {showShareButtons && (
        <div className="flex items-center gap-2 print:hidden pdf-hide">
          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      )}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-emerald-500 p-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(/textures/noise.png)" }} />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {profileAvatarUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={profileAvatarUrl}
                  alt={userFirstName || "Profile"}
                  className="h-12 w-12 rounded-full border-2 border-white/60 object-cover shadow-md"
                />
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">
                  Personalized Meal Plan For {userFirstName || "You"}
                </p>
              </div>
            )}
            {!profileAvatarUrl && (
              <p className="text-sm uppercase tracking-[0.3em] text-white/80">
                Personalized Meal Plan For {userFirstName || "You"}
              </p>
            )}
            {(() => {
              const heading = safeText(plan?.overview, "");
              const description = safeText(plan?.dailyCalorieRationale, "");
              
              return (
                <>
                  {heading && (
                    <h2 className="text-xl md:text-xl font-bold mt-2 line-clamp-2 max-h-[3.5rem]">
                      {heading}
                    </h2>
                  )}
                  {description && (
                    <p className="text-white/80 mt-3 leading-relaxed text-justify">{description}</p>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-white/70">{t("analytics.nutrient.calories")}</div>
              <div className="text-2xl font-semibold">{dailyCalorieTarget ? `${dailyCalorieTarget} kcal` : "—"}</div>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-white/70">{t("mealplanner.saved.timeline")}</div>
              <div className="text-2xl font-semibold">{weeklyMealPlan.length} days</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {!isEditingMeals ? (
              <Button variant="secondary" className="bg-white text-primary hover:bg-white/90" onClick={onStartEditing}>
                <Edit3 className="mr-2 h-4 w-4" />
                {t("mealplanner.results.edit")}
              </Button>
            ) : (
              <>
                <Button variant="outline" className="bg-white/10 text-white border-white/40" onClick={onCancelEditing}>
                  <X className="mr-2 h-4 w-4" />
                  {t("mealplanner.results.cancel")}
                </Button>
                <Button 
                  className="bg-white text-primary hover:bg-white/90" 
                  onClick={onSaveEdits}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("mealplanner.results.saving") || "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {t("mealplanner.results.save")}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5" />
              {t("analytics.macro.target")}
            </CardTitle>
            <CardDescription>{t("analytics.macro.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-primary/5 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("analytics.nutrient.protein")}</p>
                <p className="text-xl font-semibold">{macroDistribution.protein_g} g</p>
              </div>
              <div className="rounded-2xl bg-primary/5 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("analytics.nutrient.carbs")}</p>
                <p className="text-xl font-semibold">{macroDistribution.carbohydrates_g} g</p>
              </div>
              <div className="rounded-2xl bg-primary/5 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("analytics.nutrient.fat")}</p>
                <p className="text-xl font-semibold">{macroDistribution.fat_g} g</p>
              </div>
              <div className="rounded-2xl bg-primary/5 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("analytics.nutrient.fiber")}</p>
                <p className="text-xl font-semibold">{macroDistribution.fiber_g} g</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{safeText(macroDistribution.rationale)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Dumbbell className="h-5 w-5" />
              Exercise Blueprint
            </CardTitle>
            <CardDescription>A weekly routine that matches your nutrition strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {safeArray(exercisePlan?.types).map((type, idx) => (
                <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary">
                  {type}
                </Badge>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-primary/10 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Frequency</p>
                <p className="font-semibold">{safeText(exercisePlan?.frequency, "Not specified")}</p>
              </div>
              <div className="rounded-xl border border-primary/10 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                <p className="font-semibold">{safeText(exercisePlan?.duration, "Not specified")}</p>
              </div>
              <div className="rounded-xl border border-primary/10 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Intensity</p>
                <p className="font-semibold">{safeText(exercisePlan?.intensity, "Not specified")}</p>
              </div>
              <div className="rounded-xl border border-primary/10 p-3 text-sm md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Weekly schedule</p>
                <p className="font-semibold leading-relaxed">
                  {safeText(exercisePlan?.weeklySchedule, "Not specified")}
                </p>
              </div>
            </div>
            {exercisePlan?.specificExercises?.length ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Specific exercises</p>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {exercisePlan.specificExercises.map((exercise, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                      {exercise}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Weekly meal calendar</h3>
            <p className="text-muted-foreground">Color-coded meals make skimming each day effortless.</p>
          </div>
          <div className="flex items-center gap-3">
            {totalWeeks > 1 && (
              <div className="flex items-center gap-2 rounded-full border border-muted px-3 py-1.5 text-sm bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedWeek((prev) => Math.max(1, prev - 1))}
                  disabled={selectedWeek === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col text-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Week</span>
                  <span className="font-semibold">
                    {selectedWeek} / {totalWeeks}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedWeek((prev) => Math.min(totalWeeks, prev + 1))}
                  disabled={selectedWeek === totalWeeks}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(Number(value))}>
                  <SelectTrigger className="w-24 border-none focus:ring-0">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalWeeks }, (_, idx) => (
                      <SelectItem key={`week-${idx + 1}`} value={(idx + 1).toString()}>
                        Week {idx + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isEditingMeals && (
              <Badge variant="outline" className="border-primary text-primary bg-primary/5">
                Editing mode
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {visibleDays.map((dayPlan, index) => {
            const dayIdx = weekStartIndex + index;
            const isDayDragged = draggedDayIndex === dayIdx;
            const isDayDragOver = dragOverDayIndex === dayIdx;
            
            return (
              <Card 
                key={`${dayPlan.day}-${dayIdx}`} 
                className={cn(
                  "shadow-md border-muted/40 transition-all",
                  isDayDragged && "opacity-50",
                  isDayDragOver && "border-primary ring-2 ring-primary/20"
                )}
                draggable={isEditingMeals}
                onDragStart={(e) => handleDayDragStart(e, dayIdx)}
                onDragOver={(e) => handleDayDragOver(e, dayIdx)}
                onDragLeave={handleDayDragLeave}
                onDrop={(e) => handleDayDrop(e, dayIdx)}
                onDragEnd={handleDayDragEnd}
              >
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex-1 flex items-center gap-2">
                  {isEditingMeals && (
                    <div className="cursor-move text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>
                  )}
                  <CardTitle>{safeText(dayPlan.day, `Day ${dayIdx + 1}`)}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Day {dayIdx + 1}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {safeArray(dayPlan.meals).map((meal, mealIdx) => {
                  const style = getMealStyle(meal?.type);
                  const isMealDragged = draggedMealIndex?.dayIndex === dayIdx && draggedMealIndex?.mealIndex === mealIdx;
                  const isMealDragOver = dragOverMealIndex?.dayIndex === dayIdx && dragOverMealIndex?.mealIndex === mealIdx;
                  
                  return (
                    <div
                      key={`${meal?.type}-${mealIdx}`}
                      className={cn(
                        "rounded-2xl border p-4 transition-all",
                        style.bg,
                        style.border,
                        isEditingMeals && "ring-2 ring-offset-2 ring-offset-background ring-primary/50",
                        isMealDragged && "opacity-50",
                        isMealDragOver && "ring-4 ring-primary/30"
                      )}
                      draggable={isEditingMeals}
                      onDragStart={(e) => handleMealDragStart(e, dayIdx, mealIdx)}
                      onDragOver={(e) => handleMealDragOver(e, dayIdx, mealIdx)}
                      onDragLeave={handleMealDragLeave}
                      onDrop={(e) => handleMealDrop(e, dayIdx, mealIdx)}
                      onDragEnd={handleMealDragEnd}
                    >
                      {isEditingMeals && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="cursor-move text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-4 w-4" />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                              style.chip,
                            )}
                          >
                            {meal?.type || "Meal"}
                          </span>
                          {!isEditingMeals ? (
                            <p className={cn("text-lg font-semibold", style.text)}>
                              {safeText(meal?.name, "Meal details not provided")}
                            </p>
                          ) : (
                            <Input
                              value={meal?.name || ""}
                              onChange={(event) => onMealNameChange(dayIdx, mealIdx, event.target.value)}
                              className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
                            />
                          )}
                        </div>
                        <p className={cn("text-sm font-semibold", style.accent)}>
                          {typeof meal?.totalCalories === "number" ? `${meal.totalCalories} kcal` : "—"}
                        </p>
                      </div>

                      {isEditingMeals ? (
                        <div className="mt-4 space-y-4 rounded-2xl bg-white/80 dark:bg-slate-900/60 p-4 shadow-inner dark:text-white">
                          {safeArray(meal?.foods).map((food, foodIdx) => (
                            <div key={foodIdx} className="grid gap-3 md:grid-cols-5 md:items-end">
                              <div className="md:col-span-2">
                                <LabelText>Ingredient</LabelText>
                                <Input
                                  value={food?.name || ""}
                                  onChange={(event) =>
                                    onIngredientChange(dayIdx, mealIdx, foodIdx, "name", event.target.value)
                                  }
                                  className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div>
                                <LabelText>Quantity</LabelText>
                                <Input
                                  value={food?.quantity || ""}
                                  onChange={(event) =>
                                    onIngredientChange(dayIdx, mealIdx, foodIdx, "quantity", event.target.value)
                                  }
                                  className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div>
                                <LabelText>Calories</LabelText>
                                <Input
                                  type="number"
                                  value={
                                    typeof food?.calories === "number" && Number.isFinite(food.calories)
                                      ? food.calories
                                      : ""
                                  }
                                  onChange={(event) =>
                                    onIngredientChange(dayIdx, mealIdx, foodIdx, "calories", event.target.value)
                                  }
                                  className="bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
                                />
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => onRemoveIngredient(dayIdx, mealIdx, foodIdx)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-dashed"
                            onClick={() => onAddIngredient(dayIdx, mealIdx)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add ingredient
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2 rounded-2xl bg-white/70 dark:bg-slate-900/50 p-4 shadow-inner">
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {safeArray(meal?.foods).map((food, foodIdx) => (
                              <li key={foodIdx} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-primary/70" />
                                <span className="flex-1">
                                  {food?.name || "Ingredient"} • {food?.quantity || "quantity not specified"}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {typeof food?.calories === "number" ? `${food.calories} kcal` : "—"}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground mt-3">
                            Macros · P: {meal?.macros?.protein_g ?? "—"}g · C: {meal?.macros?.carbohydrates_g ?? "—"}g · F:{" "}
                            {meal?.macros?.fat_g ?? "—"}g
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Action Items
            </CardTitle>
            <CardDescription>Daily habits to reinforce your plan</CardDescription>
          </CardHeader>
          <CardContent>
            {actionItems.length ? (
              <ul className="space-y-3 text-sm">
                {actionItems.map((item, idx) => (
                  <li key={idx} className="flex gap-3 rounded-xl border border-primary/10 p-3">
                    <span className="text-primary font-semibold">{item.category || "Focus"}</span>
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-muted-foreground">{item.details}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No action items provided.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tips & Considerations
            </CardTitle>
            <CardDescription>Practical strategies to stay consistent</CardDescription>
          </CardHeader>
          <CardContent>
            {tips.length ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary mt-2" />
                    {tip}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No tips were provided for this plan.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LabelText({ children }: { children: ReactNode }) {
  return <p className="text-xs uppercase tracking-wide text-muted-foreground dark:text-slate-300 mb-1">{children}</p>;
}

