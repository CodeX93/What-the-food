import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFood, saveScanHistory, uploadFoodImage } from "@/utils/foodScan";

const Hero = () => {
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const onChooseFile = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setUploading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
          navigate("/auth");
          return;
        }
        // Upload to Storage
        const { path, publicUrl, signedUrl } = await uploadFoodImage(file, userId);
        // Analyze via Edge Function (default serving 1)
        const analysis = await analyzeFood(signedUrl || publicUrl, 1);
        // Save history and open results page
        const scanId = await saveScanHistory({ userId, imagePath: path, imageUrl: signedUrl || publicUrl, serving: 1, result: analysis });
        navigate(`/food-results?id=${scanId}`);
      } catch (e) {
        console.error("Hero upload error", e);
        alert("Failed to analyze image. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white dark:bg-[#000000] snap-start snap-proximity transition-colors duration-300">
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />
      
      <div className="container mx-auto px-4 sm:px-6 relative w-full z-10 py-8 sm:py-0">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center max-w-6xl mx-auto">
          {/* Left Section - Value Proposition */}
          <div className="text-center lg:text-left">
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
              5 free scans available • No signup required
            </p>
          </div>

          {/* Right Section - Upload Placeholder */}
          <div className="lg:flex lg:justify-end mt-8 lg:mt-0">
            <Card className="shadow-strong max-w-lg w-full mx-auto lg:mx-0">
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