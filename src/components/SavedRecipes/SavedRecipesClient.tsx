'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { BookOpen, Calendar as CalendarIcon, Trash2, Search, ChevronDown, ArrowLeft, Lock, Sparkles, ArrowRight } from "lucide-react";
import { DataCache, CACHE_DURATION } from "@/utils/dataCache";
import { getImageUrl } from "@/utils/foodScan";

interface Recipe {
  id: string;
  food_scan_id: string | null;
  dish_name: string | null;
  image_url: string | null;
  image_path: string | null;
  recipe_text: string | null;
  created_at: string;
  displayUrl?: string | null;
}

type SavedRecipesClientProps = {
  initialSubscription?: any;
};

export function SavedRecipesClient({ initialSubscription = null }: SavedRecipesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const isPremium = initialSubscription?.subscription_type === "premium";
  const cacheKeyRef = useRef<string | null>(null);
  const retriedImageIdsRef = useRef<Set<string>>(new Set());
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [openRange, setOpenRange] = useState(false);
  const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [activePreset, setActivePreset] = useState<string>("all");

  useEffect(() => {
    if (!isPremium) {
      setLoading(false);
      return;
    }

    const fetchRecipes = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          router.push("/auth");
          return;
        }

        const cacheKey = `saved_recipes_${session.user.id}`;
        cacheKeyRef.current = cacheKey;
        
        // OPTIMIZATION: Check cache first for instant loading
        const cached = DataCache.get<Recipe[]>(cacheKey);
        if (cached && cached.length >= 0 && recipes.length === 0) {
          setRecipes(cached);
          setFilteredRecipes(cached);
          setLoading(false);
          // Continue fetching fresh data in background (don't return early)
        }

        // Fetch saved recipes from database
        const { data: savedRecipesData, error: savedRecipesError } = await (supabase as any)
          .from("saved_recipes")
          .select("id, food_name, image_url, image_path, recipe_text, food_scan_id, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (savedRecipesError) {
          throw savedRecipesError;
        }

        // Transform saved recipes to Recipe format
        const recipesList: Recipe[] = (savedRecipesData || []).map((savedRecipe: any) => {
          return {
            id: savedRecipe.id,
            food_scan_id: savedRecipe.food_scan_id,
            dish_name: savedRecipe.food_name || "Unknown Recipe",
            image_url: savedRecipe.image_url,
            image_path: savedRecipe.image_path,
            recipe_text: savedRecipe.recipe_text || null,
            created_at: savedRecipe.created_at,
            displayUrl: null,
          };
        });

        // OPTIMIZATION: Use cached displayUrls if available, otherwise use image_url immediately
        // Don't block on image URL loading - use image_url for instant display
        const recipesWithImages = recipesList.map((recipe) => {
          // Check if we have cached data with displayUrl for this recipe
          const cachedRecipe = cached?.find((r) => r.id === recipe.id);
          if (cachedRecipe?.displayUrl) {
            return { ...recipe, displayUrl: cachedRecipe.displayUrl };
          }
          // Use image_url immediately for instant display (don't wait for signed URLs)
          return { ...recipe, displayUrl: recipe.image_url };
        });

        setRecipes(recipesWithImages);
        setFilteredRecipes(recipesWithImages);
        
        // OPTIMIZATION: Cache for 2 minutes
        DataCache.set(cacheKey, recipesWithImages, CACHE_DURATION.SHORT);

        // Load signed image URLs in background (only for recipes that need it)
        // Only load if image_path exists and we don't already have a cached signed URL.
        const recipesNeedingSignedUrls = recipesWithImages.filter(
          (recipe) => {
            if (!recipe.image_path) return false;
            if (recipe.image_path.toLowerCase().startsWith("manual-entry")) return false;

            // If we already have a cached signed URL (different from raw image_url), skip.
            // Otherwise fetch a signed URL (covers missing/expired image_url).
            if (recipe.displayUrl && recipe.image_url && recipe.displayUrl !== recipe.image_url) return false;
            return true;
          }
        );

        if (recipesNeedingSignedUrls.length > 0) {
          // Load signed URLs in background without blocking UI
          Promise.all(
            recipesNeedingSignedUrls.map(async (recipe) => {
              try {
                const displayUrl = await getImageUrl(recipe.image_path!, 60 * 60);
                return { id: recipe.id, displayUrl: displayUrl || recipe.image_url };
              } catch (err) {
                return { id: recipe.id, displayUrl: recipe.image_url };
              }
            })
          ).then((imageUpdates) => {
            setRecipes((currentRecipes) => {
              const updated = currentRecipes.map((recipe) => {
                const update = imageUpdates.find((u) => u.id === recipe.id);
                return update && update.displayUrl !== recipe.displayUrl 
                  ? { ...recipe, displayUrl: update.displayUrl } 
                  : recipe;
              });
              // Update cache with new signed URLs
              DataCache.set(cacheKey, updated, CACHE_DURATION.SHORT);
              return updated;
            });
          });
        }
      } catch (err) {
        console.error("Error fetching recipes:", err);
        toast({
          title: t("savedrecipes.error.title"),
          description: t("savedrecipes.error.load"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchRecipes();
  }, [router, toast, isPremium, t]);

  useEffect(() => {
    let filtered = recipes;

    // Apply date range filter
    if (range.from && range.to) {
      const fromMs = new Date(range.from.toDateString()).getTime();
      const toMs = new Date(range.to.toDateString()).getTime() + 24 * 60 * 60 * 1000 - 1;
      filtered = filtered.filter((recipe) => {
        const timestamp = new Date(recipe.created_at).getTime();
        return timestamp >= fromMs && timestamp <= toMs;
      });
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.dish_name?.toLowerCase().includes(lower) || recipe.id.toLowerCase().includes(lower)
      );
    }

    setFilteredRecipes(filtered);
  }, [searchQuery, recipes, range]);

  const applyPreset = (key: string) => {
    setActivePreset(key);
    const now = new Date();

    if (key === "all") {
      setRange({ from: null, to: null });
      return;
    }

    if (key === "today") {
      const today = new Date(now);
      setRange({ from: today, to: today });
      return;
    }

    if (key === "7d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setRange({ from, to: now });
      return;
    }

    if (key === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setRange({ from, to });
    }
  };

  const handleDelete = async (recipeId: string) => {
    try {
      const { error } = await (supabase as any).from("saved_recipes").delete().eq("id", recipeId);
      if (error) throw error;

      const nextAll = recipes.filter((recipe) => recipe.id !== recipeId);
      const nextFiltered = filteredRecipes.filter((recipe) => recipe.id !== recipeId);
      setRecipes(nextAll);
      setFilteredRecipes(nextFiltered);
      
      // OPTIMIZATION: Update cache after deletion
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const cacheKey = `saved_recipes_${session.user.id}`;
        DataCache.set(cacheKey, nextAll, CACHE_DURATION.SHORT);
      }

      toast({ 
        title: t("savedrecipes.delete.success.title"), 
        description: t("savedrecipes.delete.success.description") 
      });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast({
        title: t("savedrecipes.delete.error.title"),
        description: t("savedrecipes.delete.error.description"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  if (!isPremium) {
    return (
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("savedrecipes.back")}
          </Button>

          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Lock className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2">{t("savedrecipes.premium.title")}</CardTitle>
                <CardDescription className="text-base">
                  {t("savedrecipes.premium.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("savedrecipes.premium.upgrade")}
                </p>
                <Button
                  onClick={() => router.push("/plans")}
                  className="w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("savedrecipes.premium.button")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="px-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold">{t("savedrecipes.title")}</h1>
          </div>
          <p className="text-muted-foreground">{t("savedrecipes.description")}</p>
        </div>
        <div className="mt-6 mb-6 grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
          <Card className="h-full">
            <CardContent className="pt-6 h-full flex items-center">
              <div className="w-full flex items-center justify-between gap-4 min-h-10">
                <h4 className="text-lg font-bold text-foreground">
                  {t("savedrecipes.total.title")}
                </h4>
                <p className="text-base font-semibold tabular-nums">
                  {recipes.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="pt-6 h-full">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("savedrecipes.search.placeholder")}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <Popover open={openRange} onOpenChange={setOpenRange}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {range.from && range.to
                        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                        : t("savedrecipes.daterange")}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2">{t("savedrecipes.daterange.presets")}</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: "all", label: t("savedrecipes.daterange.all") },
                            { key: "today", label: t("savedrecipes.daterange.today") },
                            { key: "7d", label: t("savedrecipes.daterange.7d") },
                            { key: "month", label: t("savedrecipes.daterange.month") },
                          ].map(({ key, label }) => (
                            <Badge
                              key={key}
                              onClick={() => applyPreset(key)}
                              className={cn("cursor-pointer", activePreset === key && "bg-primary text-primary-foreground")}
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRange({ from: null, to: null });
                              setActivePreset("all");
                            }}
                          >
                            {t("savedrecipes.daterange.clear")}
                          </Button>
                          <Button size="sm" onClick={() => setOpenRange(false)}>
                            {t("savedrecipes.daterange.apply")}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">{t("savedrecipes.daterange.custom")}</div>
                        <Calendar
                          mode="range"
                          selected={{ from: range.from || undefined, to: range.to || undefined }}
                          onSelect={(selectedRange: any) =>
                            setRange({ from: selectedRange?.from || null, to: selectedRange?.to || null })
                          }
                          numberOfMonths={2}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        {filteredRecipes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">{t("savedrecipes.empty.title")}</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? t("savedrecipes.empty.search") : t("savedrecipes.empty.noRecipes")}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push("/dashboard")}>{t("savedrecipes.empty.button")}</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/recipe/${recipe.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {(() => {
                          const dish = recipe.dish_name || t("savedrecipes.unknown");
                          if (typeof dish === "string" && dish.trim().toLowerCase().startsWith("manual")) {
                            const cleanDish = dish.replace(/^Manual( Input)?:\s*/i, "");
                            return `${t("savedrecipes.manual")}: ${cleanDish}`;
                          }
                          return dish;
                        })()}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        {new Date(recipe.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(recipe.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(recipe.displayUrl || recipe.image_url) && (
                    <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      <img
                        src={recipe.displayUrl || recipe.image_url || ""}
                        alt={recipe.dish_name || "Recipe"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={async (event) => {
                          const imgEl = event.currentTarget;

                          // If we have an image_path, try once to refresh with a signed URL.
                          if (
                            recipe.image_path &&
                            !recipe.image_path.toLowerCase().startsWith("manual-entry") &&
                            !retriedImageIdsRef.current.has(recipe.id)
                          ) {
                            retriedImageIdsRef.current.add(recipe.id);
                            try {
                              const freshUrl = await getImageUrl(recipe.image_path, 60 * 60);
                              if (!freshUrl) throw new Error("No signed URL");
                              imgEl.src = freshUrl;
                              setRecipes((current) => {
                                const updated = current.map((r) =>
                                  r.id === recipe.id ? { ...r, displayUrl: freshUrl } : r
                                );
                                if (cacheKeyRef.current) {
                                  DataCache.set(cacheKeyRef.current, updated, CACHE_DURATION.SHORT);
                                }
                                return updated;
                              });
                              return;
                            } catch {
                              // fallthrough to hide
                            }
                          }

                          // Hide broken image icon if we can't recover.
                          imgEl.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

       
      </div>
    </main>
  );
}
