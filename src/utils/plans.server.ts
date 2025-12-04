import { createServerSupabaseClient } from "@/integrations/supabase/server";

// Helper function to parse features from JSON string to array
function parseFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  if (typeof features === 'string') {
    try {
      // Try parsing as JSON string
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed;
      // If it's still a string, try parsing again (double-encoded case)
      if (typeof parsed === 'string') {
        const doubleParsed = JSON.parse(parsed);
        if (Array.isArray(doubleParsed)) return doubleParsed;
      }
      return [];
    } catch (e) {
      console.error("Error parsing features:", e);
      return [];
    }
  }
  return [];
}

export async function fetchActivePlatformPlansServer() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("platform_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  if (error) {
    console.error("Server: error fetching platform plans", error);
    return [];
  }

  // Parse features from JSON string to array for each plan
  const plans = (data ?? []).map((plan: any) => ({
    ...plan,
    features: parseFeatures(plan.features),
  }));

  return plans;
}


