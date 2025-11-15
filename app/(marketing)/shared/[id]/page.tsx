import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SharedFoodResultsPage from "@/views/SharedFoodResults";
import type { Database } from "@/integrations/supabase/types";

export const dynamic = "force-dynamic";

export default async function SharedFoodResultsRoute({
  params,
}: {
  params: { id: string };
}) {
  const scanId = params.id;

  if (!scanId) {
    notFound();
  }

  // Use service role key to bypass RLS for public access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    notFound();
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });

  // Fetch the food scan data (public access using service role)
  try {
    const { data: scanData, error } = await (supabase as any)
      .from("food_scans")
      .select("id, image_url, image_path, serving, result_json, created_at")
      .eq("id", scanId)
      .single();

    if (error || !scanData) {
      console.error("Error fetching scan:", error);
      notFound();
    }

    // Generate fresh signed URL for the image using service role
    let imageUrl: string | null = null;
    if (scanData.image_path) {
      try {
        const { data: signedData, error: urlError } = await supabase.storage
          .from("FoodScans")
          .createSignedUrl(scanData.image_path, 60 * 60 * 24); // 24 hours
        
        if (urlError) {
          console.error("Failed to generate signed URL:", urlError);
          imageUrl = scanData.image_url || null;
        } else {
          imageUrl = signedData?.signedUrl || scanData.image_url || null;
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
        imageUrl = scanData.image_url || null;
      }
    } else {
      imageUrl = scanData.image_url || null;
    }

    return (
      <SharedFoodResultsPage
        scanId={scanId}
        imageUrl={imageUrl}
        analysis={scanData.result_json}
        serving={scanData.serving || 1}
        createdAt={scanData.created_at}
      />
    );
  } catch (error) {
    console.error("Error fetching shared food scan:", error);
    notFound();
  }
}

