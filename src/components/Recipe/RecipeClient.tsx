"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { ArrowLeft, Salad, Flame, Beef, Wheat, Droplet, Apple, Candy } from "lucide-react";
import { getImageUrl } from "@/utils/foodScan";
import { Loader2 } from "lucide-react";

type RecipeClientProps = {
  recipeId: string;
};

export function RecipeClient({ recipeId }: RecipeClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<{
    food_name: string | null;
    image_url: string | null;
    image_path: string | null;
    recipe_text: string | null;
    displayUrl: string | null;
    ingredients: string[];
    nutrition_summary: {
      calories?: number | null;
      protein_g?: number | null;
      carbohydrates_g?: number | null;
      fat_g?: number | null;
      fiber_g?: number | null;
      sugar_g?: number | null;
      sodium_mg?: number | null;
      serving?: number | null;
    } | null;
  } | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.push("/auth");
          return;
        }

        // Fetch saved recipe
        const { data: savedRecipe, error: savedRecipeError } = await (supabase as any)
          .from("saved_recipes")
          .select("food_name, image_url, image_path, recipe_text, food_scan_id, nutrition_summary")
          .eq("id", recipeId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (savedRecipeError) {
          throw savedRecipeError;
        }

        if (!savedRecipe) {
          toast({
            title: t("recipe.notfound.title"),
            description: t("recipe.notfound.description"),
            variant: "destructive",
          });
          router.push("/saved-recipes");
          return;
        }

        let ingredients: string[] = [];

        // Fetch ingredients from food_scans if food_scan_id exists
        if (savedRecipe.food_scan_id) {
          try {
            const { data: scanData } = await (supabase as any)
              .from("food_scans")
              .select("result_json")
              .eq("id", savedRecipe.food_scan_id)
              .maybeSingle();

            if (scanData?.result_json) {
              const resultJson = scanData.result_json as any;
              ingredients = resultJson.ingredients || [];
            }
          } catch (err) {
            console.error("Error fetching ingredients:", err);
          }
        }

        // Load image URL
        let displayUrl = savedRecipe.image_url;
        if (savedRecipe.image_path && !savedRecipe.image_path.toLowerCase().startsWith("manual-entry")) {
          try {
            displayUrl = await getImageUrl(savedRecipe.image_path, 60 * 60);
          } catch (err) {
            console.error("Error loading image URL:", err);
          }
        }

        setRecipe({
          food_name: savedRecipe.food_name,
          image_url: savedRecipe.image_url,
          image_path: savedRecipe.image_path,
          recipe_text: savedRecipe.recipe_text,
          displayUrl,
          ingredients,
          nutrition_summary: savedRecipe.nutrition_summary || null,
        });
      } catch (err) {
        console.error("Error fetching recipe:", err);
        toast({
          title: t("recipe.error.title"),
          description: t("recipe.error.load"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchRecipe();
  }, [recipeId, router, toast, t]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Salad className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">{t("recipe.notfound.title")}</h3>
            <p className="text-muted-foreground mb-4">{t("recipe.notfound.description")}</p>
            <Button onClick={() => router.push("/saved-recipes")}>{t("recipe.notfound.back")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.push("/saved-recipes")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("recipe.back")}
      </Button>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Food Name */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Salad className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            {recipe.food_name || t("recipe.unknown")}
          </h1>
        </div>

        {/* Image */}
        {(recipe.displayUrl || recipe.image_url) && (
          <Card>
            <CardContent className="p-0">
              <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                <img
                  src={recipe.displayUrl || recipe.image_url || ""}
                  alt={recipe.food_name || "Recipe"}
                  className="w-full h-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nutrition Summary */}
        {recipe.nutrition_summary && (
          <Card>
            <CardHeader>
              <CardTitle>{t("recipe.nutrition.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: Flame, label: t("recipe.nutrition.calories"), value: recipe.nutrition_summary.calories, suffix: "kcal", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
                  { icon: Beef, label: t("recipe.nutrition.protein"), value: recipe.nutrition_summary.protein_g, suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
                  { icon: Wheat, label: t("recipe.nutrition.carbs"), value: recipe.nutrition_summary.carbohydrates_g, suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
                  { icon: Droplet, label: t("recipe.nutrition.fat"), value: recipe.nutrition_summary.fat_g, suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
                  recipe.nutrition_summary.fiber_g && { icon: Apple, label: t("recipe.nutrition.fiber"), value: recipe.nutrition_summary.fiber_g, suffix: "g", style: "bg-green-100/90 border-green-200 text-green-900" },
                  recipe.nutrition_summary.sugar_g && { icon: Candy, label: t("recipe.nutrition.sugar"), value: recipe.nutrition_summary.sugar_g, suffix: "g", style: "bg-pink-100/90 border-pink-200 text-pink-900" },
                ].filter(Boolean).map((item: any, index: number) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className={`p-3 sm:p-4 rounded-lg border ${item.style}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold">
                        {item.value != null ? Math.round(item.value) : "-"}
                        {item.value != null && item.suffix && <span className="text-sm sm:text-base ml-1">{item.suffix}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {recipe.nutrition_summary.serving && recipe.nutrition_summary.serving !== 1 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {t("recipe.nutrition.serving").replace("{serving}", recipe.nutrition_summary.serving.toString())}
                </p>
              )}
            </CardContent>
          </Card>
        )}

         {/* Ingredients */}
         {recipe.ingredients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("recipe.ingredients")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="text-muted-foreground">
                    {ingredient}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recipe Instructions */}
        {recipe.recipe_text && (
          <Card>
            <CardHeader>
              <CardTitle>{t("recipe.instructions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {recipe.recipe_text.split("\n\n").map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-muted-foreground whitespace-pre-line">{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

       
      </div>
    </div>
  );
}
