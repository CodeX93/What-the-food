import { Camera, BarChart3, History, FileText, Sliders, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Camera,
    title: "AI-Powered Scanning",
    description: "Simply snap a photo and our advanced AI instantly identifies your food and analyzes its nutritional content.",
  },
  {
    icon: BarChart3,
    title: "Detailed Nutrition Breakdown",
    description: "Get comprehensive data on calories, protein, carbs, fats, sugar, fiber, and sodium for every meal.",
  },
  {
    icon: History,
    title: "Scan History",
    description: "Track all your meals in one place. Premium members get unlimited access to their complete food diary.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description: "Export detailed nutritional reports as PDFs. Perfect for sharing with nutritionists or personal tracking.",
  },
  {
    icon: Sliders,
    title: "Serving Adjustments",
    description: "Fine-tune portion sizes and ingredients to get the most accurate nutritional information possible.",
  },
  {
    icon: Sparkles,
    title: "Ad-Free Experience",
    description: "Premium members enjoy a clean, distraction-free interface focused on your health goals.",
  },
];

const Features = () => {
  return (
    <section
      id="features"
      className="relative w-full bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Powerful Features for Healthy Living</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Everything you need to understand and improve your nutrition
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="h-full">
                <CardHeader className="p-4 sm:p-6">
                  <IconComponent className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-2" />
                  <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;