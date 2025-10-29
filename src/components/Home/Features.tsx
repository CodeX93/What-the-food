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
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold mb-4">Powerful Features for Healthy Living</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to understand and improve your nutrition
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-medium transition-shadow">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;