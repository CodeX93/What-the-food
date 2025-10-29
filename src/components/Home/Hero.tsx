import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Hero = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
            Know What's Really in Your Food
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload a photo of any meal and get instant AI-powered nutritional analysis. 
            Track calories, macros, and make healthier choices effortlessly.
          </p>

          <Card className="max-w-2xl mx-auto shadow-strong">
            <CardContent className="p-8">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-12 hover:border-primary/50 transition-colors cursor-pointer bg-gradient-card">
                <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Upload Your Food Photo</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Drop an image here or click to browse
                </p>
                <Button size="lg" className="bg-primary hover:bg-primary-hover">
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  5 free scans available • No signup required
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Hero;