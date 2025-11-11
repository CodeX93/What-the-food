import { Camera, BarChart3, History, FileText, Sliders, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: Camera,
    title: "AI-Powered Scanning",
    description: "Simply snap a photo and our advanced AI instantly identifies your food and analyzes its nutritional content.",
    details: [
      "Recognizes over 10,000 food items",
      "Works with any cuisine or meal type",
      "No manual entry required",
      "Instant results in seconds",
    ],
  },
  {
    icon: BarChart3,
    title: "Detailed Nutrition Breakdown",
    description: "Get comprehensive data on calories, protein, carbs, fats, sugar, fiber, and sodium for every meal.",
    details: [
      "Macro and micronutrient tracking",
      "Daily value percentages",
      "Visual charts and graphs",
      "Historical comparison data",
    ],
  },
  {
    icon: History,
    title: "Scan History",
    description: "Track all your meals in one place. Premium members get unlimited access to their complete food diary.",
    details: [
      "Complete meal history",
      "Search and filter by date",
      "Export your data",
      "Unlimited history for premium users",
    ],
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description: "Export detailed nutritional reports as PDFs. Perfect for sharing with nutritionists or personal tracking.",
    details: [
      "Professional PDF format",
      "Customizable date ranges",
      "Share with healthcare providers",
      "Archive for personal records",
    ],
  },
  {
    icon: Sliders,
    title: "Serving Adjustments",
    description: "Fine-tune portion sizes and ingredients to get the most accurate nutritional information possible.",
    details: [
      "Adjust portion sizes easily",
      "Add or remove ingredients",
      "Custom serving measurements",
      "Save custom recipes",
    ],
  },
  {
    icon: Sparkles,
    title: "Ad-Free Experience",
    description: "Premium members enjoy a clean, distraction-free interface focused on your health goals.",
    details: [
      "Zero advertisements",
      "Faster performance",
      "Priority support",
      "Early access to new features",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-background">
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-hero/10">
        <div className="absolute inset-0 bg-gradient-hero opacity-10 pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Powerful Features for Healthy Living
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
              Everything you need to understand and improve your nutrition. Discover tools designed to help you make
              better food choices and reach your health goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                <Link href="/auth">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="min-h-screen flex items-center bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={index}
                  className="hover:shadow-strong transition-all duration-300 border border-slate-200/60 dark:border-white/10 hover:border-primary/30 backdrop-blur-sm bg-white/90 dark:bg-white/5 h-full flex flex-col"
                >
                  <CardHeader className="pb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center mb-4">
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="min-h-screen flex items-center bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Join thousands of users who are already tracking their nutrition with WhatTheFood.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
              <Link href="/auth">Start Your Free Trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

