"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "lucide-react";
import { WidgetHero } from "./WidgetHero";
import { useLanguage } from "@/contexts/LanguageContext";

export function WidgetLanding() {
  const { t } = useLanguage();
  return (
    <main className="overflow-x-hidden bg-white dark:bg-[#000000] transition-colors duration-300">
      <WidgetHero />

      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("widgetfeatures.title")}</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              {t("widgetfeatures.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left w-full">
            <Card className="h-full">
              <CardHeader>
                <Code className="h-10 w-10 text-primary mb-4" />
                <CardTitle>{t("widgetfeatures.easyintegration.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("widgetfeatures.easyintegration.description")}
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <svg className="h-10 w-10 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                <CardTitle>{t("widgetfeatures.customizable.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("widgetfeatures.customizable.description")}
                </p>
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <svg className="h-10 w-10 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <CardTitle>{t("widgetfeatures.analytics.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("widgetfeatures.analytics.description")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
