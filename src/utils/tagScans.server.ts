import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { tagToSlug, slugToTag } from "@/utils/tagSlug";
import { calculateNutritionScore } from "@/utils/nutritionScore";

export type TagScanItem = {
  id: string;
  dish: string;
  imageUrl: string | null;
  nutrients: {
    calories?: number | null;
    protein_g?: number | null;
    carbohydrates_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    sugar_g?: number | null;
  };
  nutritionScore: number;
  created_at: string;
};

/**
 * Fetches all scans that contain a specific tag
 * Returns only public data (no images, no user info)
 */
export async function getScansByTag(tagSlug: string): Promise<TagScanItem[]> {
  const supabase = await createServerSupabaseClient();
  const tagName = slugToTag(tagSlug);

  try {
    // Fetch recent scans and filter by tag
    // Using JavaScript filtering since Supabase's .contains() doesn't work well with JSONB arrays
    // Reduced limit to prevent timeouts
    const { data, error } = await supabase
      .from("food_scans")
      .select("id, result_json, created_at, serving, image_path, image_url")
      .order("created_at", { ascending: false })
      .limit(500); // Reduced from 1000 to prevent timeouts

    if (error) {
      console.error("Error fetching scans by tag:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Filter scans that contain the tag (case-insensitive)
    const filteredData = data.filter((scan: any) => {
      const tags = scan.result_json?.tags || [];
      if (!Array.isArray(tags)) return false;
      return tags.some((tag: string) =>
        typeof tag === "string" && tag.trim().toLowerCase() === tagName.toLowerCase()
      );
    }).slice(0, 200); // Limit to 200 results

    return await processScans(filteredData);
  } catch (err) {
    console.error("Error in getScansByTag:", err);
    return [];
  }
}

/**
 * Helper function to process scans and generate image URLs
 * Processes in smaller batches to prevent connection timeouts
 */
async function processScans(scanData: any[]): Promise<TagScanItem[]> {
  const supabase = await createServerSupabaseClient();
  const BATCH_SIZE = 20; // Process 20 at a time to prevent timeouts
  const result: TagScanItem[] = [];

  // Process in batches to prevent connection timeouts
  for (let i = 0; i < scanData.length; i += BATCH_SIZE) {
    const batch = scanData.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (scan: any) => {
        const resultJson = scan.result_json || {};
        const nutrients = resultJson.nutrients || {};
        const serving = scan.serving || 1;

        // Check if this is a manual entry (no image)
        const isManualEntry =
          !!resultJson?.isManualEntry ||
          (typeof resultJson?.dish === "string" && resultJson.dish.trim().toLowerCase().startsWith("manual"));
        const hasStorageImage =
          !!scan.image_path &&
          !scan.image_path.toLowerCase().startsWith("manual-entry") &&
          !isManualEntry;

        let imageUrl: string | null = null;

        // Generate signed URL for storage images with timeout
        if (hasStorageImage) {
          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 3000) // 3 second timeout
            );

            const signedUrlPromise = supabase.storage
              .from("FoodScans")
              .createSignedUrl(scan.image_path as string, 60 * 60)
              .then(({ data: signed, error: signedError }) => {
                if (!signedError && signed?.signedUrl) {
                  return signed.signedUrl;
                }
                return null;
              });

            imageUrl = await Promise.race([signedUrlPromise, timeoutPromise]);
          } catch (err) {
            // Silently handle errors - will fallback to public URL
          }
        }

        // Fallback to public image_url if available
        if (!imageUrl && typeof scan.image_url === "string" && /^https?:\/\//i.test(scan.image_url)) {
          imageUrl = scan.image_url;
        }

        // Scale nutrients by serving size
        const scaledNutrients = {
          calories: (nutrients.calories || 0) * serving,
          protein_g: (nutrients.protein_g || 0) * serving,
          carbohydrates_g: (nutrients.carbohydrates_g || 0) * serving,
          fat_g: (nutrients.fat_g || 0) * serving,
          fiber_g: (nutrients.fiber_g || 0) * serving,
          sugar_g: (nutrients.sugar_g || 0) * serving,
        };

        const dish = resultJson.dish || "Unknown Dish";

        if (dish === "Unknown Dish") {
          return null; // Skip invalid scans
        }

        return {
          id: scan.id,
          dish,
          imageUrl,
          nutrients: scaledNutrients,
          nutritionScore: typeof resultJson.nutritionScore === 'number'
            ? resultJson.nutritionScore
            : calculateNutritionScore(scaledNutrients, resultJson.ingredients),
          created_at: scan.created_at,
        };
      })
    );

    // Collect successful results
    batchResults.forEach((resultItem) => {
      if (resultItem.status === "fulfilled" && resultItem.value) {
        result.push(resultItem.value);
      }
    });

    // Small delay between batches to prevent overwhelming the connection
    if (i + BATCH_SIZE < scanData.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return result;
}

/**
 * Gets all unique tags from the database
 * Used for sitemap generation
 */
export async function getAllTags(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();

  // Fetch all scans with tags
  const { data, error } = await supabase
    .from("food_scans")
    .select("result_json")
    .not("result_json->tags", "is", null);

  if (error) {
    console.error("Error fetching all tags:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Extract all unique tags
  const tagSet = new Set<string>();
  data.forEach((scan: any) => {
    const tags = scan.result_json?.tags || [];
    if (Array.isArray(tags)) {
      tags.forEach((tag: string) => {
        if (typeof tag === "string" && tag.trim()) {
          tagSet.add(tag.trim().toLowerCase());
        }
      });
    }
  });

  return Array.from(tagSet).sort();
}
