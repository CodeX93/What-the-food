import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFood, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";
import { getRemainingFreeScans, decrementFreeScan, hasFreeScanAvailable, resetFreeScans } from "@/utils/freeScanLimit";
import { useToast } from "@/hooks/use-toast";

const Hero = () => {
  const [uploading, setUploading] = useState(false);
  const [remainingScans, setRemainingScans] = useState<number>(5);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication and premium status
    const checkAuthAndScans = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user is premium
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", session.user.id)
          .single();
        
        const premium = profile?.subscription_status === "active";
        setIsPremium(premium);
        
        // Reset free scan limits for authenticated premium users
        if (premium) {
          resetFreeScans();
        }
      }
      
      // Update remaining scans display
      setRemainingScans(getRemainingFreeScans());
    };
    
    checkAuthAndScans();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      checkAuthAndScans();
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const onChooseFile = async () => {
    // Check if user needs to register (no auth and no free scans)
    if (!user && !hasFreeScanAvailable()) {
      navigate("/auth");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setUploading(true);
        
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        // If not authenticated, check free scan limit
        if (!userId) {
          if (!hasFreeScanAvailable()) {
            navigate("/auth");
            return;
          }
          
          // For non-authenticated users, create a temporary user ID for storage
          const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Upload to Storage with temp ID
          const { path, publicUrl, signedUrl } = await uploadFoodImage(file, tempUserId);
          
          // Analyze via Edge Function (default serving 1)
          const analysis = await analyzeFood(signedUrl || publicUrl, 1);
          
          // Decrement free scan count
          const newCount = decrementFreeScan();
          setRemainingScans(newCount);
          
          // Save history with temp user (won't be retrievable later, just for current session)
          const scanId = await saveScanHistory({ 
            userId: tempUserId, 
            imagePath: path, 
            imageUrl: signedUrl || publicUrl, 
            serving: 1, 
            result: analysis.analysis 
          });
          
          toast({
            title: "Scan complete!",
            description: `${newCount} free scan${newCount !== 1 ? 's' : ''} remaining. Sign up to save your history!`,
          });
          
          navigate(`/food-results?id=${scanId}`);
        } else {
          // Authenticated user flow
          // Upload to Storage
          const { path, publicUrl, signedUrl } = await uploadFoodImage(file, userId);
          
          // Analyze via Edge Function (default serving 1)
          const analysis = await analyzeFood(signedUrl || publicUrl, 1);
          
          // Save history and open results page
          const scanId = await saveScanHistory({ 
            userId, 
            imagePath: path, 
            imageUrl: signedUrl || publicUrl, 
            serving: 1, 
            result: analysis.analysis 
          });
          
          navigate(`/food-results?id=${scanId}`);
        }
      } catch (e: any) {
        console.error("Hero upload error", e);
        toast({
          title: "Error",
          description: e?.message || "Failed to analyze image. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };
  return (
    <section className="relative h-screen flex items-center overflow-hidden bg-white dark:bg-[#000000] snap-start snap-proximity transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />
      
      <div className="container mx-auto px-4 relative w-full z-10 py-12 sm:py-16 md:py-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-16">
          {/* Left Section - Value Proposition (aligned with logo) */}
          <div className="flex-1 text-center lg:text-left max-w-2xl lg:max-w-none">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Know What's Really in Your Food
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              Upload a photo of any meal and get instant AI-powered nutritional analysis. 
              Track calories, macros, and make healthier choices effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                <Link to="/how-it-works">Learn More</Link>
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
              {user ? (
                isPremium ? (
                  "Unlimited scans available"
                ) : (
                  "3 scans per day for free users"
                )
              ) : (
                <>
                  {remainingScans} free scan{remainingScans !== 1 ? 's' : ''} available • No signup required
                </>
              )}
            </p>
          </div>

          {/* Right Section - Upload Placeholder (aligned with profile) */}
          <div className="flex-1 w-full max-w-lg lg:max-w-xl">
            <Card className="shadow-strong">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 sm:p-10 md:p-12 cursor-pointer bg-gradient-card">
                  <Upload className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary mx-auto mb-3 sm:mb-4" />
                  <p className="text-base sm:text-lg font-medium mb-2 text-center">Upload Your Food Photo</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 text-center">
                    Drop an image here or click to browse
                  </p>
                  <div className="flex justify-center">
                    <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" onClick={onChooseFile} disabled={uploading}>
                      {uploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Analyzing...</>) : ("Choose File")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;