import { Upload, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Food Photo",
    description: "Take a picture of your meal or snack. Our AI works with any type of food from any cuisine.",
    number: "01",
  },
  {
    icon: Sparkles,
    title: "AI Analyzes Your Meal",
    description: "Our advanced AI identifies the food, estimates portions, and calculates detailed nutritional information instantly.",
    number: "02",
  },
  {
    icon: TrendingUp,
    title: "Get Instant Results",
    description: "View complete nutritional breakdown including calories, macros, and micronutrients. Track your progress over time.",
    number: "03",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground">
            Get nutritional insights in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <Card key={index} className="relative overflow-hidden hover:shadow-medium transition-shadow">
              <div className="absolute top-4 right-4 text-6xl font-bold text-primary/10">
                {step.number}
              </div>
              <CardHeader>
                <div className="bg-gradient-hero w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;