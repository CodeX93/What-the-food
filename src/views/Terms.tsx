"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function TermsPage() {
  const { t } = useLanguage();
  
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{t("terms.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("terms.lastupdated")} {new Date().toLocaleDateString()}</p>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-4">{t("terms.section1.title")}</h2>
            <p className="text-muted-foreground">
              {t("terms.section1.content")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t("terms.section2.title")}</h2>
            <p className="text-muted-foreground">
              {t("terms.section2.content")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t("terms.section3.title")}</h2>
            <p className="text-muted-foreground">
              {t("terms.section3.content")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t("terms.section4.title")}</h2>
            <p className="text-muted-foreground">
              {t("terms.section4.content")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t("terms.section5.title")}</h2>
            <p className="text-muted-foreground">
              {t("terms.section5.content")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">{t("terms.section6.title")}</h2>
            <p className="text-muted-foreground">
              {t("terms.section6.content")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}