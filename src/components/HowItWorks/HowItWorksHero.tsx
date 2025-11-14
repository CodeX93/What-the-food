"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HowItWorksHero() {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector("header");
      if (!header) return;
      const { height } = header.getBoundingClientRect();
      setHeaderHeight(Math.round(height));
    };
    measureHeader();
    window.addEventListener("resize", measureHeader);
    return () => window.removeEventListener("resize", measureHeader);
  }, []);

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-white dark:bg-[#000000] transition-colors duration-300 min-h-screen"
      style={headerHeight ? { minHeight: `calc(100vh - ${headerHeight}px)` } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />
      <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px] flex items-center">
        <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
          {/* Left Section - Content */}
          <div className="w-full text-center lg:text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[36rem] lg:pr-8 xl:pr-12 self-start">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent leading-tight tracking-tight pb-1">
              Snap, scan, and know exactly what&apos;s on your plate
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-7 leading-relaxed">
              Skip the manual tracking. WhatTheFood recognizes your meal, estimates portions, and surfaces accurate nutrition instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-6 sm:mb-7 lg:mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary-hover text-sm sm:text-base" asChild>
                <Link href="/#hero">Start Free Scan</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-sm sm:text-base" asChild>
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Foods detected</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-primary mt-1">12K+</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Accuracy</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-primary mt-1">97%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/70 dark:bg-white/5 px-4 py-3 shadow-sm">
                <div className="text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Time to insight</p>
                  <p className="text-2xl sm:text-3xl font-semibold text-primary mt-1">30s</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Preview Card */}
          <div className="w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto lg:mt-1.5 xl:mt-2">
            <Card className="shadow-strong">
              <CardContent className="p-4 sm:p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Scan Preview</p>
                    <h2 className="text-2xl font-semibold text-foreground">Mediterranean Bowl</h2>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                    Review Details
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary/70">Calories</p>
                    <p className="text-2xl font-bold text-primary">540 kcal</p>
                    <p className="text-xs text-muted-foreground mt-1">On par with your daily target</p>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-primary/70">Protein</p>
                    <p className="text-2xl font-bold text-primary">32 g</p>
                    <p className="text-xs text-muted-foreground mt-1">Great macro balance</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Fiber</p>
                    <p className="text-lg font-semibold text-foreground">11 g</p>
                  </div>
                  <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Carbs</p>
                    <p className="text-lg font-semibold text-foreground">58 g</p>
                  </div>
                  <div className="rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Fats</p>
                    <p className="text-lg font-semibold text-foreground">18 g</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Chickpeas
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Quinoa
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Olive Oil
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Feta
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

