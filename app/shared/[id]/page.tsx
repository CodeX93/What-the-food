import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SharedFoodResultsPage from "@/views/SharedFoodResults";
import type { Database } from "@/integrations/supabase/types";
import TopBar from "@/components/Layout/TopBar";
import { HeaderServer } from "@/components/Layout/HeaderServer";
import Footer from "@/components/Layout/Footer";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export default async function SharedFoodResultsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let scanId: string;
  
  try {
    const resolvedParams = await params;
    scanId = resolvedParams.id;
  } catch (error) {
    console.error("Error resolving params:", error);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar />
        <HeaderServer />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Route Error</h1>
            <p className="text-muted-foreground">Failed to resolve route parameters.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!scanId) {
    console.error("No scan ID provided");
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar />
        <HeaderServer />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid Route</h1>
            <p className="text-muted-foreground">No scan ID provided in the URL.</p>
          </div>
        </main>
        <Footer />
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
    });
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar />
        <HeaderServer />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
            <p className="text-muted-foreground mb-2">
              Missing Supabase environment variables.
            </p>
            <p className="text-sm text-muted-foreground">
              Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your deployment environment.
            </p>
          </div>
        </main>
        <Footer />
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
        <div className="min-h-screen bg-background flex flex-col">
          <TopBar />
          <HeaderServer />
          <main className="flex-1">
            <div className="container mx-auto px-4 py-16 text-center">
              <h1 className="text-2xl font-bold mb-4">Error Loading Scan</h1>
              <p className="text-muted-foreground mb-2">
                Failed to fetch scan data.
              </p>
              <p className="text-sm text-muted-foreground">
                Error: {error.message || "Unknown error"}
              </p>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    if (!scanData) {
      console.error("Scan not found:", scanId);
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <TopBar />
          <HeaderServer />
          <main className="flex-1">
            <div className="container mx-auto px-4 py-16 text-center">
              <h1 className="text-2xl font-bold mb-4">Scan Not Found</h1>
              <p className="text-muted-foreground mb-2">
                The requested scan could not be found.
              </p>
              <p className="text-sm text-muted-foreground">
                Scan ID: {scanId}
              </p>
            </div>
          </main>
          <Footer />
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
      <div className="min-h-screen bg-background flex flex-col">
        <TopBar />
        <HeaderServer />
        <main className="flex-1">
          <SharedFoodResultsPage
            scanId={scanId}
            imageUrl={imageUrl}
            analysis={scanData.result_json}
            serving={scanData.serving || 1}
            createdAt={scanData.created_at}
          />
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error("Error fetching shared food scan:", error);
    notFound();
  }
}

