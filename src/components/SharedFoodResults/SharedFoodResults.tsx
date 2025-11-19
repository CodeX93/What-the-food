import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Salad,
  ArrowLeft,
  Flame,
  Beef,
  Apple,
  Droplet,
  Wheat,
  Candy,
  Info,
  Zap,
  Youtube,
  Target,
  Sparkles,
} from "lucide-react";
import { scaleNutrients, type FoodAnalysis } from "@/utils/foodScan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SharedFoodResultsProps = {
  scanId: string;
  imageUrl: string | null;
  analysis: FoodAnalysis;
  serving: number;
  createdAt: string;
};

function getServingApproximation(analysis: FoodAnalysis) {
  if (analysis?.servingWeightGrams && analysis.servingWeightGrams > 0) {
    return {
      grams: analysis.servingWeightGrams,
      label: analysis.servingSize || "1 serving"
    };
  }
  
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
}

export function SharedFoodResults({
  scanId,
  imageUrl,
  analysis,
  serving,
  createdAt,
}: SharedFoodResultsProps) {
  const scaled = scaleNutrients(analysis.nutrients, serving);
  const servingApproximation = getServingApproximation(analysis);

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-6 md:py-8 relative w-full">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="px-2">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2">
                <Salad className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                {analysis.dish || "Food Result"}
              </h1>
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
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Servings: {serving}</span>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: Flame, label: "Calories", value: scaled?.calories ?? "-", suffix: "", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
                    { icon: Beef, label: "Protein", value: scaled?.protein_g ?? "-", suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
                    { icon: Wheat, label: "Carbs", value: scaled?.carbohydrates_g ?? "-", suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
                    { icon: Droplet, label: "Fat", value: scaled?.fat_g ?? "-", suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
                    { icon: Apple, label: "Fiber", value: scaled?.fiber_g ?? "-", suffix: "g", style: "bg-emerald-100/90 border-emerald-200 text-emerald-900" },
                    { icon: Candy, label: "Sugar", value: scaled?.sugar_g ?? "-", suffix: "g", style: "bg-pink-100/90 border-pink-200 text-pink-900" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.label} className={`${stat.style} border-2`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-medium opacity-80">{stat.label}</span>
                          </div>
                          <div className="text-2xl font-bold">
                            {typeof stat.value === "number" ? stat.value.toFixed(stat.suffix === "" ? 0 : 1) : stat.value}
                            {stat.suffix && <span className="text-lg ml-1">{stat.suffix}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {analysis.instructions && analysis.instructions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <CardTitle>How to Prepare</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Step-by-step instructions to recreate this dish.
                  </p>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {analysis.instructions.map((step, index) => {
                      const boldMatch = step.match(/^\*\*(.+?)\*\*[:\s]*(.+)$/);
                      const hasBoldTitle = boldMatch !== null;
                      const title = hasBoldTitle ? boldMatch[1] : null;
                      const description = hasBoldTitle ? boldMatch[2] : step;

                      return (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            {title && (
                              <p className="text-sm font-semibold text-foreground mb-1">
                                {title}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {description}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {analysis.youtubeVideoUrl && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-foreground">Watch Video Tutorial</p>
                        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                          <iframe
                            src={(() => {
                              const url = analysis.youtubeVideoUrl;
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

            {analysis.additionalInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.additionalInfo}
                  </p>
                </CardContent>
              </Card>
            )}

            {analysis.ingredients && analysis.ingredients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ingredients</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.ingredients.map((ingredient, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis.insights && (
              <Card className="border-primary/30">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Personalized Health Context</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Insights tailored to wellness goals
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                    {analysis.insights}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Generated with AI · Informational only
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

