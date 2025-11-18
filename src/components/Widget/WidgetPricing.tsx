"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const includedPlans = [
  {
    name: "Free plan",
    price: "$0",
    period: "/month",
    widgetHighlights: [
      "Embed with WhatTheFood branding",
      "1 website connection",
      "Community support",
    ],
    platformHighlights: ["3 scans per day", "Basic insights"],
  },
  {
    name: "Premium plan",
    price: "$6.99",
    period: "/month",
    yearlyPrice: "$69.99/year",
    widgetHighlights: [
      "Remove widget branding",
      "Unlimited website connections",
      "Priority chat support",
    ],
    platformHighlights: ["Unlimited scans", "Full analytics + PDF exports"],
    popular: true,
  },
];

export function WidgetPricing() {
  return (
    <section id="widget-pricing" className="bg-muted/30">
      <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4">
          <Badge className="px-4 py-1 text-xs uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
            Included with your plan
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            Widget access comes with every WhatTheFood subscription
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            No separate billing, no extra checkout. Activate the widget as soon as you start a WhatTheFood plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {includedPlans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative h-full border-2 ${plan.popular ? "border-primary shadow-strong" : "border-border"}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  Most popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="space-y-1">
                  <div>
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.yearlyPrice && (
                    <p className="text-xs text-muted-foreground">or {plan.yearlyPrice}</p>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                    Widget benefits
                  </p>
                  <ul className="space-y-2">
                    {plan.widgetHighlights.map((feature) => (
                      <li key={feature} className="flex items-start text-sm">
                        <Check className="h-4 w-4 text-primary mr-2 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                    Platform benefits
                  </p>
                  <ul className="space-y-2">
                    {plan.platformHighlights.map((feature) => (
                      <li key={feature} className="flex items-start text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-muted-foreground mr-2 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link href="/pricing">View platform pricing</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/plans">Manage subscription</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


