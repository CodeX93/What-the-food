'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const FAQ = () => {
  const { t } = useLanguage();
  
  const faqs = [
    {
      question: t("faq.accuracy.question"),
      answer: t("faq.accuracy.answer"),
    },
    {
      question: t("faq.types.question"),
      answer: t("faq.types.answer"),
    },
    {
      question: t("faq.freescans.question"),
      answer: t("faq.freescans.answer"),
    },
    {
      question: t("faq.export.question"),
      answer: t("faq.export.answer"),
    },
    {
      question: t("faq.premium.question"),
      answer: t("faq.premium.answer"),
    },
    {
      question: t("faq.refund.question"),
      answer: t("faq.refund.answer"),
    },
    {
      question: t("faq.dietary.question"),
      answer: t("faq.dietary.answer"),
    },
    {
      question: t("faq.security.question"),
      answer: t("faq.security.answer"),
    },
  ];
  return (
    <section className="w-full bg-[#F8FAF9] dark:bg-[#111111] transition-colors duration-300">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16 relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{t("faq.title")}</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.slice(0, 4).map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-3 sm:px-4">
                <AccordionTrigger className="hover:text-primary text-left text-sm sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm sm:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.slice(4).map((faq, index) => (
              <AccordionItem key={index + 4} value={`item-${index + 4}`} className="border rounded-lg px-3 sm:px-4">
                <AccordionTrigger className="hover:text-primary text-left text-sm sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm sm:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;