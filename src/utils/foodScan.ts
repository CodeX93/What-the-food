import { supabase } from "@/integrations/supabase/client";

export type FoodAnalysis = {
  dish: string;
  confidence: number;
  servingSize: string;
  nutrients?: {
    calories?: number;
    protein_g?: number;
    carbohydrates_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  ingredients: string[];
  instructions: string[];
};

export async function uploadFoodImage(file: File, userId: string): Promise<{ path: string; publicUrl: string; signedUrl?: string }>{
  const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const ext = cleanName.split(".").pop() || "jpg";
  const filename = `${Date.now()}.${ext}`;
  const path = `${userId}/${filename}`;

  const { error: upErr } = await supabase.storage.from("FoodScans").upload(path, file, {
    upsert: false,
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("FoodScans").getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  // Try to create a short-lived signed URL in case bucket is private
  let signedUrl: string | undefined;
  try {
    const { data: signed } = await supabase.storage.from("FoodScans").createSignedUrl(path, 60 * 5);
    signedUrl = signed?.signedUrl;
  } catch {}
  return { path, publicUrl, signedUrl };
}

export async function analyzeFood(
  imageUrl: string,
  serving: number = 1,
  insightsParams?: { age?: number; gender?: string; activity?: string; goal?: string; optimize?: boolean }
): Promise<{ analysis: FoodAnalysis; insights?: string; upgrade?: boolean }>{
  const { data, error } = await supabase.functions.invoke("analyze-food", {
    body: { imageUrl, serving, ...(insightsParams || {}) },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Analyze failed");
  }
  return {
    analysis: data.analysis as FoodAnalysis,
    insights: data.insights,
    upgrade: data.upgrade,
  };
}

export function scaleNutrients(base: FoodAnalysis["nutrients"] | undefined, multiplier: number){
  const scale = (v?: number) => (typeof v === "number" ? Math.round(v * multiplier * 10) / 10 : undefined);
  return {
    calories: scale(base?.calories),
    protein_g: scale(base?.protein_g),
    carbohydrates_g: scale(base?.carbohydrates_g),
    fat_g: scale(base?.fat_g),
    fiber_g: scale(base?.fiber_g),
    sugar_g: scale(base?.sugar_g),
  };
}

export async function saveScanHistory(params: {
  userId: string;
  imagePath: string;
  imageUrl: string;
  serving: number;
  result: FoodAnalysis;
}): Promise<string>{
  // Store image_path (never expires) and optionally a public URL if available
  // We'll always generate fresh signed URLs when displaying, so stored image_url is just a fallback
  const { data, error } = await (supabase as any).from("food_scans").insert({
    user_id: params.userId,
    image_path: params.imagePath, // This is the important one - never expires
    image_url: params.imageUrl, // Store as fallback, but we'll generate fresh URLs when displaying
    serving: params.serving,
    result_json: params.result as any,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Get a fresh signed URL for an image path
 * This ensures URLs never expire - we generate them on-demand
 */
export async function getFreshImageUrl(imagePath: string | null, expirySeconds: number = 60 * 60): Promise<string | null> {
  if (!imagePath) {
    console.warn("getFreshImageUrl: No image path provided");
    return null;
  }
  try {
    const { data, error } = await supabase.storage.from("FoodScans").createSignedUrl(imagePath, expirySeconds);
    if (error) {
      console.error("Failed to generate signed URL - error:", error);
      return null;
    }
    if (!data?.signedUrl) {
      console.error("Failed to generate signed URL - no data returned");
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("Exception generating signed URL:", e);
    return null;
  }
}

/**
 * Get a fresh signed URL for an image path
 * Always generates a signed URL (works for both public and private buckets)
 */
export async function getImageUrl(imagePath: string | null, expirySeconds: number = 60 * 60): Promise<string | null> {
  if (!imagePath) return null;
  return getFreshImageUrl(imagePath, expirySeconds);
}

export async function fetchRecentScans(userId: string, limit: number = 10){
  const { data, error } = await (supabase as any)
    .from("food_scans")
    .select("id, image_url, image_path, serving, result_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  
  // Generate fresh signed URLs for all scans
  const scansWithUrls = await Promise.all(
    ((data || []) as Array<{
      id: string;
      image_url?: string | null;
      image_path?: string | null;
      serving?: number | null;
      result_json?: any;
      created_at: string;
    }>).map(async (scan) => {
      let displayUrl: string | null = null;
      
      // Try to generate fresh signed URL from image_path
      if (scan.image_path) {
        displayUrl = await getImageUrl(scan.image_path, 60 * 60);
      }
      
      // Fallback to stored image_url if fresh generation fails or no path
      if (!displayUrl && scan.image_url) {
        displayUrl = scan.image_url as string;
      }
      
      return {
        ...scan,
        displayUrl,
      };
    })
  );
  
  return scansWithUrls;
}

export async function getPersonalizedInsights(params: {
  scanId: string;
  age?: number;
  gender?: string;
  activity?: string;
  goal?: string;
  optimize?: boolean;
}): Promise<{ insights?: string; upgrade?: boolean; message?: string }>{
  // Fetch the scan to get image URL
  const { data: scan, error: scanError } = await (supabase as any)
    .from("food_scans")
    .select("image_url, image_path, serving")
    .eq("id", params.scanId)
    .maybeSingle();
  
  if (scanError || !scan) {
    throw new Error("Scan not found");
  }

  // Always generate a fresh signed URL from image_path (never expires)
  const imageUrl = await getImageUrl(scan.image_path, 60 * 5) || scan.image_url as string;
  if (!imageUrl) {
    throw new Error("No valid image URL available");
  }

  // Call analyze-food with demographic data (single Gemini call)
  const { data, error } = await supabase.functions.invoke("analyze-food", {
    body: {
      imageUrl,
      serving: scan.serving || 1,
      age: params.age,
      gender: params.gender,
      activity: params.activity,
      goal: params.goal,
      optimize: params.optimize,
    },
  });
  
  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Failed to get insights");
  }
  
  return {
    insights: data.insights,
    upgrade: data.upgrade,
  };
}


