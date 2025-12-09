"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wand2,
  Layout,
  Palette,
  ShieldCheck,
  Sparkles,
  Gauge,
  Globe,
  Plug,
  Workflow,
  Rocket,
} from "lucide-react";
import { WidgetHero } from "./WidgetHero";
import { useLanguage } from "@/contexts/LanguageContext";

export function WidgetLanding() {
  const { t } = useLanguage();

  const quickWins = [
    {
      icon: Wand2,
      title: t("widget.rich.quick.no_code.title"),
      desc: t("widget.rich.quick.no_code.desc"),
    },
    {
      icon: Layout,
      title: t("widget.rich.quick.layout.title"),
      desc: t("widget.rich.quick.layout.desc"),
    },
    {
      icon: Palette,
      title: t("widget.rich.quick.brand.title"),
      desc: t("widget.rich.quick.brand.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("widget.rich.quick.guardrails.title"),
      desc: t("widget.rich.quick.guardrails.desc"),
    },
    {
      icon: Gauge,
      title: t("widget.rich.quick.performance.title"),
      desc: t("widget.rich.quick.performance.desc"),
    },
    {
      icon: Globe,
      title: t("widget.rich.quick.everywhere.title"),
      desc: t("widget.rich.quick.everywhere.desc"),
    },
  ];

  const steps = [
    {
      title: t("widget.rich.how.step1.title"),
      body: t("widget.rich.how.step1.body"),
    },
    {
      title: t("widget.rich.how.step2.title"),
      body: t("widget.rich.how.step2.body"),
    },
    {
      title: t("widget.rich.how.step3.title"),
      body: t("widget.rich.how.step3.body"),
    },
  ];

  const useCases = [
    t("widget.rich.usecases.1"),
    t("widget.rich.usecases.2"),
    t("widget.rich.usecases.3"),
    t("widget.rich.usecases.4"),
    t("widget.rich.usecases.5"),
  ];

  return (
    <main className="overflow-x-hidden bg-white dark:bg-[#000000] transition-colors duration-300">
      <WidgetHero />

      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("widget.rich.title")}</h2>
            <p className="text-base sm:text-lg text-muted-foreground">{t("widget.rich.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left w-full">
            {quickWins.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="h-full">
                  <CardHeader className="p-5">
                    <Icon className="h-8 w-8 text-primary mb-3" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <p className="text-muted-foreground text-sm sm:text-base">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F9FCFB] dark:bg-[#0A0A0A] transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("widget.rich.how.label")}</p>
              <h3 className="text-3xl sm:text-4xl font-bold leading-tight">{t("widget.rich.how.title")}</h3>
              <p className="text-base sm:text-lg text-muted-foreground">{t("widget.rich.how.subtitle")}</p>
              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{step.title}</p>
                      <p className="text-sm sm:text-base text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="h-full">
                <CardHeader className="p-5">
                  <Plug className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-lg">{t("widget.rich.cards.embed.title")}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-muted-foreground text-sm sm:text-base">
                  {t("widget.rich.cards.embed.body")}
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="p-5">
                  <Sparkles className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-lg">{t("widget.rich.cards.result.title")}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-muted-foreground text-sm sm:text-base">
                  {t("widget.rich.cards.result.body")}
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="p-5">
                  <Workflow className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-lg">{t("widget.rich.cards.usage.title")}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-muted-foreground text-sm sm:text-base">
                  {t("widget.rich.cards.usage.body")}
                </CardContent>
              </Card>
              <Card className="h-full">
                <CardHeader className="p-5">
                  <Rocket className="h-8 w-8 text-primary mb-3" />
                  <CardTitle className="text-lg">{t("widget.rich.cards.launch.title")}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-muted-foreground text-sm sm:text-base">
                  {t("widget.rich.cards.launch.body")}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background transition-colors duration-300">
        <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("widget.rich.usecases.label")}</p>
              <h3 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{t("widget.rich.usecases.title")}</h3>
              <p className="text-base sm:text-lg text-muted-foreground mb-6">{t("widget.rich.usecases.subtitle")}</p>
              <ul className="space-y-3 text-sm sm:text-base text-muted-foreground">
                {useCases.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/50 border rounded-2xl p-6 sm:p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">{t("widget.rich.embed.title")}</p>
              <pre className="text-xs sm:text-sm bg-black text-white rounded-xl p-4 overflow-x-auto">
{`<div id="wtf-widget"></div>
<script src="https://your-domain.com/widget.js" defer></script>
<script>
  WTFWidget.init({
    target: "#wtf-widget",
    widgetId: "your-widget-id",
    resultMode: "modal", // same_page | modal | new_tab
    styles: {
      width: "100%",
      height: "600px",
      padding: "16px",
      margin: "0 auto",
      uploadAreaBg: "#f8fafc",
    },
  });
</script>`}
              </pre>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3">{t("widget.rich.embed.note")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
