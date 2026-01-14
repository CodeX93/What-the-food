import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SharedFoodResultsPage from "@/views/SharedFoodResults";
import type { Database } from "@/integrations/supabase/types";
import type { Metadata } from "next";
import { getRequestUrl, getCanonicalUrlFromRequest, getPreviewImageUrlFromRequest } from "@/lib/seo/siteUrl";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const rawId = params?.id || "";
  const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const match = rawId.match(uuidPattern);
  const scanId = match ? match[1] : rawId.split(/[%?\s]/)[0];

  if (!scanId || scanId.length < 36) {
    return {
      title: "Food Analysis Results | What The Food",
      description: "Check out this food analysis on What The Food",
    };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        title: "Food Analysis Results | What The Food",
        description: "Check out this food analysis on What The Food",
      };
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: scanData } = await (supabase as any)
      .from("food_scans")
      .select("result_json, image_url")
      .eq("id", scanId)
      .maybeSingle();

    if (!scanData?.result_json) {
      return {
        title: "Food Analysis Results | What The Food",
        description: "Check out this food analysis on What The Food",
      };
    }

    const analysis = scanData.result_json as any;
    const dishDisplay = analysis.isManualEntry || analysis.dish?.startsWith("Manual") || analysis.dish?.startsWith("Manual Input")
      ? `Manual Input: ${analysis.dish?.replace(/^Manual( Input)?:\s*/i, "") || ""}`
      : analysis.dish || "Food Analysis";
    
    const title = `${dishDisplay} - Food Analysis | What The Food`;
    const description = `Check out this food analysis: ${dishDisplay}. View detailed nutrition information, recipe instructions, and more.`;
    const canonicalUrl = await getCanonicalUrlFromRequest(`/shared/${scanId}`);
    const imageUrl = scanData.image_url 
      ? scanData.image_url 
      : getPreviewImageUrlFromRequest("Homepage.png", requestUrl);

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: "website",
        images: imageUrl ? [{ url: imageUrl }] : [getPreviewImageUrlFromRequest("Homepage.png", requestUrl)],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : [getPreviewImageUrlFromRequest("Homepage.png", requestUrl)],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Food Analysis Results | What The Food",
      description: "Check out this food analysis on What The Food",
    };
  }
}

export default async function SharedFoodResultsRoute({
  params,
}: {
  params: { id: string };
}) {
  // Extract just the UUID from the params (in case extra text was appended to the URL)
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters)
  const rawId = params?.id || "";
  
  // Try to extract a valid UUID from the string
  // Match UUID pattern: 8-4-4-4-12 hex digits
  const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const match = rawId.match(uuidPattern);
  const scanId = match ? match[1] : rawId.split(/[%?\s]/)[0]; // Fallback: take first part before % or space

  // Debug: Log that the route is being hit
  console.log("Shared route accessed with rawId:", rawId, "extracted scanId:", scanId);

  if (!scanId || scanId.length < 36) {
    console.error("Invalid scan ID provided:", scanId);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Route</h1>
          <p className="text-muted-foreground">Invalid scan ID format.</p>
          <p className="text-sm text-muted-foreground mt-2">Received: {rawId.substring(0, 100)}</p>
        </div>
      </div>
    );
  }

  // Use service role key to bypass RLS for public access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      scanId,
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE')),
    });
    // Return error page with marketing layout
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
            <p className="text-muted-foreground mb-2">
              Missing Supabase environment variables.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your Vercel deployment environment.
            </p>
            <p className="text-xs text-muted-foreground">
              Has URL: {supabaseUrl ? "Yes" : "No"} | Has Service Key: {supabaseServiceKey ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </div>
    );
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
      .maybeSingle();

    if (error) {
      console.error("Error fetching scan:", {
        error,
        scanId,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return (
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Scan</h1>
          <p className="text-muted-foreground mb-2">
            Failed to fetch scan data.
          </p>
          <p className="text-sm text-muted-foreground">
            Error: {error.message || "Unknown error"}
          </p>
        </div>
      );
    }

    if (!scanData) {
      console.error("Scan not found:", scanId);
      return (
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Scan Not Found</h1>
          <p className="text-muted-foreground mb-2">
            The requested scan could not be found.
          </p>
          <p className="text-sm text-muted-foreground">
            Scan ID: {scanId}
          </p>
        </div>
      );
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

