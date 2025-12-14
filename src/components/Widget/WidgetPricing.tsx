"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function WidgetPricing() {
  const { t } = useLanguage();
  
  const includedPlans = [
    {
      name: t("widgetpricing.freeplan.name"),
      price: "$0",
      period: "/month",
      widgetHighlights: [
        t("widgetpricing.freeplan.widget1"),
        t("widgetpricing.freeplan.widget2"),
        t("widgetpricing.freeplan.widget3"),
      ],
      platformHighlights: [t("widgetpricing.freeplan.platform1"), t("widgetpricing.freeplan.platform2")],
    },
    {
      name: t("widgetpricing.premiumplan.name"),
      price: "$14.99",
      period: "/month",
      yearlyPrice: "$149.99/year",
      widgetHighlights: [
        t("widgetpricing.premiumplan.widget1"),
        t("widgetpricing.premiumplan.widget2"),
        t("widgetpricing.premiumplan.widget3"),
      ],
      platformHighlights: [t("widgetpricing.premiumplan.platform1"), t("widgetpricing.premiumplan.platform2")],
      popular: true,
    },
  ];
  return (
    <section id="widget-pricing" className="bg-muted/30">
      <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-4">
          <Badge className="px-4 py-1 text-xs uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
            {t("widgetpricing.badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">
            {t("widgetpricing.title")}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t("widgetpricing.description")}
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
                  {t("widgetpricing.mostpopular")}
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
                    <p className="text-xs text-muted-foreground">{t("widgetpricing.or")} {plan.yearlyPrice}</p>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground uppercase mb-2">
                    {t("widgetpricing.widgetbenefits")}
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
                    {t("widgetpricing.platformbenefits")}
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
            <Link href="/pricing">{t("widgetpricing.viewplatform")}</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/plans">{t("widgetpricing.managesubscription")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


