import { Upload, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HowItWorksHero } from "@/components/HowItWorks/HowItWorksHero";

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

function HowItWorksPage() {
  return (
    <div className="overflow-x-hidden bg-background">
      <HowItWorksHero />

      {/* Process */}
      <section className="bg-background">
        <div className="container mx-auto px-4 lg:px-12 py-16 sm:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Your meal, decoded in three guided stages</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Capture, analyze, and act—each scan moves from photo to insights in seconds.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <Card
                  key={index}
                  className="relative flex flex-col border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-white/5 backdrop-blur-sm shadow-lg hover:shadow-strong transition-all duration-300 hover:border-primary/30 dark:hover:border-primary/30"
                >
                  <CardContent className="flex flex-1 flex-col gap-5 p-6 sm:p-8">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-xl ${step.colorClass} p-3 shadow-lg`}>
                        <IconComponent className="h-7 w-7 text-white" />
                      </div>
                      <span className="text-4xl font-black text-primary dark:text-primary">{step.number}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                    <div className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 dark:bg-white/5 px-3 py-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1 block h-2 w-2 rounded-full bg-primary" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

   

      {/* CTA */}
      <section className="relative bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_70%)] pointer-events-none" />
        <div className="container relative z-10 mx-auto px-4 lg:px-16 py-16 sm:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto text-center space-y-6 mb-10">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              Join the WhatTheFood community
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Ready for your most informed meal yet?</h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              See why athletes, dietitians, and busy professionals trust WhatTheFood to decode every plate and stay on track.
            </p>
          </div>

          <div className="grid w-full max-w-5xl mx-auto gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch">
            <Card className="border border-primary/20 bg-white/95 dark:bg-white/5 backdrop-blur-md shadow-lg h-full">
              <CardContent className="flex h-full flex-col justify-between gap-6 p-6 sm:p-10 text-left">
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold text-foreground">Start scanning in under 60 seconds</h3>
                  <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-primary" />
                      Upload a meal photo and instantly receive calories, macros, and micronutrients.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-primary" />
                      Save scans, sync across devices, and keep your nutrition journal organized automatically.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-primary" />
                      Invite your coach or nutritionist to review your data in real time.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary-hover" asChild>
                    <Link href="/auth">Create Free Account</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/40 text-primary hover:bg-primary/10" asChild>
                    <Link href="/pricing">Compare Plans</Link>
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  No credit card required • Cancel anytime • Works on web & mobile
                </div>
              </CardContent>
            </Card>

            <Card className="border border-primary/25 bg-white/90 dark:bg-white/5 backdrop-blur-md shadow-lg h-full">
              <CardContent className="flex h-full flex-col gap-5 p-6 sm:p-10">
                <div className="space-y-3 text-left">
                  <p className="text-xs uppercase tracking-wide text-primary/70">Loved by experts</p>
                  <blockquote className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                    “Patients finally understand their nutrition. The visual breakdowns keep them engaged between visits.”
                    <span className="mt-2 block text-xs font-semibold text-primary">Dr. Malik • Registered Dietitian</span>
                  </blockquote>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary/70">Weekly time saved</p>
                    <p className="text-3xl font-semibold text-primary mt-1">4.2 hrs</p>
                    <p className="text-xs text-muted-foreground mt-1">vs manual logging</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary/70">Habit streaks</p>
                    <p className="text-3xl font-semibold text-primary mt-1">12 days</p>
                    <p className="text-xs text-muted-foreground mt-1">Average among power users</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-white/5 p-4 text-left space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Featured meal plans</p>
                  <div className="flex flex-wrap gap-2">
                    {["Lean Muscle", "Balanced Vegan", "Diabetic Friendly", "Athlete Fuel"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HowItWorksPage;

