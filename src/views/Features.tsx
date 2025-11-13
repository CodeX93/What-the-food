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
          <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.05fr_minmax(0,1fr)] items-center">
            <div className="text-center lg:text-left space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                All-in-one AI nutrition suite
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-tight">
                Powerful Features for Healthy Living
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl lg:max-w-none mx-auto lg:mx-0">
                Scan, analyze, track, and share every meal with confidence. WhatTheFood brings together advanced AI,
                actionable insights, and seamless collaboration so you can focus on feeling your best.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                  <Link href="/auth">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Camera className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Instant macro breakdowns</p>
                      <p className="text-sm text-muted-foreground">
                        Upload any meal and get calorie, macro, and micronutrient data in seconds.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BarChart3 className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Trends & progress tracking</p>
                      <p className="text-sm text-muted-foreground">
                        Spot habits, compare weeks, and share digestible reports with your coach or dietitian.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Ready-to-share reports</p>
                      <p className="text-sm text-muted-foreground">
                        Create polished PDFs or embeddable widgets that keep clients and teammates in sync.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/70 dark:bg-white/5 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <History className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Your nutrition command center</p>
                      <p className="text-sm text-muted-foreground">
                        Access scan history, compare servings, and reset goals from one intuitive dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Trusted by dietitians, coaches, and health-focused teams in over <span className="font-semibold text-foreground">35 countries</span>.
              </p>
            </div>

            <Card className="relative overflow-hidden border border-primary/20 bg-white/80 dark:bg-white/5 shadow-strong backdrop-blur">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-hero opacity-80 blur-3xl" />
              <CardHeader className="relative z-10 pb-2">
                <span className="text-xs uppercase tracking-widest text-primary font-semibold">Live snapshot</span>
                <CardTitle className="text-2xl">Nutrition assistant at work</CardTitle>
                <CardDescription>
                  A quick glance at the insights WhatTheFood surfaces after each scan.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-primary/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary font-semibold">Avg. time to insights</p>
                    <p className="text-3xl font-bold text-primary mt-2">7s</p>
                    <p className="text-xs text-primary/80 mt-1">From upload to full macro breakdown</p>
                  </div>
                  <div className="rounded-xl bg-slate-900 text-white dark:bg-white/10 dark:text-white p-4">
                    <p className="text-xs uppercase tracking-wide text-white/70 font-semibold">Nutrient confidence</p>
                    <p className="text-3xl font-bold mt-2">98%</p>
                    <p className="text-xs text-white/70 mt-1">Validated against verified food databases</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-black/40 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      RD
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">“Gemma Ray, RDN”</p>
                      <p className="text-xs text-muted-foreground">Sports Nutrition Partner</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    “The accuracy and clarity help our athletes understand what fuels their performance.
                    It’s like having a dietitian assistant available 24/7.”
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-background transition-colors duration-300">
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

      <section className="bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-5">
              <h2 className="text-3xl sm:text-4xl font-bold">Ready to Get Started?</h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                Start with 10 free scans to explore the platform, then keep your goals moving with daily insights and
                premium coaching tools designed for lasting change.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                  <Link href="/auth">Start Your Free Trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">See Plans</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl border border-primary/15 bg-white/80 dark:bg-white/5 px-4 py-5 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-primary mb-1 font-semibold">When you sign up</p>
                <p className="text-3xl font-bold text-primary">3 scans / day</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Stay on track with daily analysis, history, and insights tailored to your nutrition goals.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-5 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 font-semibold">Upgrade any time</p>
                <p className="text-3xl font-bold text-foreground">Unlimited scans</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Unlock complete history, white-label widgets, and PDF reporting for professional use.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-5 shadow-sm backdrop-blur sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Community Results</p>
                    <p className="text-lg font-semibold text-foreground mt-1">Trusted worldwide</p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:gap-8 text-left sm:text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">35+</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Countries</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">4.8★</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">User Rating</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">2M+</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Meals analyzed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">24/7</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">AI nutrition support</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

