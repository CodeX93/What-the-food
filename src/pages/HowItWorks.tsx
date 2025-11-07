import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Upload, Sparkles, TrendingUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Food Photo",
    description: "Take a picture of your meal or snack. Our AI works with any type of food from any cuisine.",
    details: [
      "Use your phone camera or upload from gallery",
      "Works with any lighting condition",
      "No need to clean up or arrange food",
      "Supports multiple food items in one photo"
    ],
    number: "01",
    colorClass: "bg-gradient-hero",
  },
  {
    icon: Sparkles,
    title: "AI Analyzes Your Meal",
    description: "Our advanced AI identifies the food, estimates portions, and calculates detailed nutritional information instantly.",
    details: [
      "AI identifies each food item accurately",
      "Automatically estimates portion sizes",
      "Calculates nutritional values from databases",
      "Processes in under 5 seconds"
    ],
    number: "02",
    colorClass: "bg-gradient-hero",
  },
  {
    icon: TrendingUp,
    title: "Get Instant Results",
    description: "View complete nutritional breakdown including calories, macros, and micronutrients. Track your progress over time.",
    details: [
      "See calories and macros at a glance",
      "Detailed micronutrient breakdown",
      "Save to your food diary",
      "Track trends and progress"
    ],
    number: "03",
    colorClass: "bg-gradient-hero",
  },
];

const HowItWorks = () => {
  return (
    <div>
      <TopBar />
      <Header />
      <main className="scroll-snap-proximity">
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 snap-start">
          <div className="container mx-auto px-4 relative py-12 sm:py-16 md:py-20">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
                How It Works
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Get nutritional insights in three simple steps. It's fast, easy, and accurate - no complicated setup required.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                <Link to="/auth">Try It Now - It's Free</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Timeline Steps Section */}
        <section className="h-screen flex items-center justify-center bg-background snap-start overflow-auto">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Vertical Timeline Line */}
                <div className="hidden md:block absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-primary/50 to-primary/30" />
                
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  const isLast = index === steps.length - 1;
                  return (
                    <div key={index} className="relative mb-16 md:mb-24 last:mb-0">
                      {/* Timeline Step */}
                      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                        {/* Left Side - Step Number & Icon */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${step.colorClass} flex items-center justify-center shadow-xl border-4 border-background relative`}>
                            <IconComponent className="h-8 w-8 md:h-10 md:w-10 text-white" />
                            <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-background">
                              {index + 1}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Side - Content */}
                        <div className="flex-1 pt-2">
                          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all shadow-lg hover:shadow-xl">
                            <CardContent className="p-6 md:p-8">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
                                    {step.title}
                                  </h3>
                                  <p className="text-base md:text-lg text-muted-foreground mb-4">
                                    {step.description}
                                  </p>
                                </div>
                                <div className="text-6xl md:text-7xl font-black text-primary/5 ml-4">
                                  {step.number}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {step.details.map((detail, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    <span className="text-muted-foreground">{detail}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      
                      {/* Arrow Connector (between steps) */}
                      {!isLast && (
                        <div className="hidden md:flex items-center justify-center absolute left-8 -bottom-12">
                          <ArrowDown className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="h-screen flex items-center justify-center bg-muted/30 snap-start">
          <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold mb-4">Why Choose WhatTheFood?</h2>
                <p className="text-lg text-muted-foreground">
                  Fast, accurate, and easy to use - everything you need for better nutrition tracking
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="text-center border-2 hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
                    <p className="text-muted-foreground text-sm">
                      Get results in under 5 seconds. No waiting, no delays - just instant nutritional insights.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="text-center border-2 hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-xl font-bold mb-2">Highly Accurate</h3>
                    <p className="text-muted-foreground text-sm">
                      Trained on millions of food images for precise identification and nutritional calculation.
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="text-center border-2 hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">🆓</div>
                    <h3 className="text-xl font-bold mb-2">Free to Start</h3>
                    <p className="text-muted-foreground text-sm">
                      No account needed. Get 5 free scans daily, with unlimited access available for premium members.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="h-screen flex items-center justify-center bg-muted/30 snap-start">
          <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Start Tracking?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of users discovering what's really in their food
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                  <Link to="/auth">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/features">See All Features</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;

