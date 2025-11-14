"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FeaturesHero() {
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
      style={{ minHeight: headerHeight ? `calc(100vh - ${headerHeight}px)` : undefined }}
    >
      <div className="absolute inset-0 bg-gradient-hero opacity-5 dark:opacity-10" />
      <div className="container mx-auto px-4 relative w-full z-10 py-[19px] sm:py-[35px] md:py-[43px] lg:py-[51px] flex items-center">
        <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 sm:gap-10 lg:gap-12 xl:gap-16">
          <div className="w-full text-center lg:text-left max-w-2xl lg:max-w-[32rem] xl:max-w-[34rem] self-start lg:-mt-1">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-tight pb-2 sm:pb-3">
              Powerful Features for Healthy Living
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl lg:max-w-none mx-auto lg:mx-0 my-4">
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
            <p className="text-sm text-muted-foreground lg:mt-6">
              Trusted by dietitians, coaches, and health-focused teams in over <span className="font-semibold text-foreground">35 countries</span>.
            </p>
          </div>

          <Card className="relative overflow-hidden border border-primary/20 bg-white/80 dark:bg-white/5 shadow-strong backdrop-blur w-full max-w-lg lg:max-w-[32rem] xl:max-w-[36rem] self-start lg:ml-auto">
            <CardHeader className="pb-2">
              <span className="text-xs uppercase tracking-widest text-primary font-semibold">Live snapshot</span>
              <CardTitle className="text-2xl">Nutrition assistant at work</CardTitle>
              <CardDescription>
                A quick glance at the insights WhatTheFood surfaces after each scan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    <p className="font-semibold text-foreground">&quot;Gemma Ray, RDN&quot;</p>
                    <p className="text-xs text-muted-foreground">Sports Nutrition Partner</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  &quot;The accuracy and clarity help our athletes understand what fuels their performance.
                  It&apos;s like having a dietitian assistant available 24/7.&quot;
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

