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
      question: t("faq.q1.question"),
      answer: t("faq.q1.answer"),
    },
    {
      question: t("faq.q2.question"),
      answer: t("faq.q2.answer"),
    },
    {
      question: t("faq.q3.question"),
      answer: t("faq.q3.answer"),
    },
    {
      question: t("faq.q4.question"),
      answer: t("faq.q4.answer"),
    },
    {
      question: t("faq.q5.question"),
      answer: t("faq.q5.answer"),
    },
    {
      question: t("faq.q6.question"),
      answer: t("faq.q6.answer"),
    },
    {
      question: t("faq.q7.question"),
      answer: t("faq.q7.answer"),
    },
    {
      question: t("faq.q8.question"),
      answer: t("faq.q8.answer"),
    },
    {
      question: t("faq.q9.question"),
      answer: t("faq.q9.answer"),
    },
    {
      question: t("faq.q10.question"),
      answer: t("faq.q10.answer"),
    },
    {
      question: t("faq.q11.question"),
      answer: t("faq.q11.answer"),
    },
    {
      question: t("faq.q12.question"),
      answer: t("faq.q12.answer"),
    },
    {
      question: t("faq.q13.question"),
      answer: t("faq.q13.answer"),
    },
    {
      question: t("faq.q14.question"),
      answer: t("faq.q14.answer"),
    },
    {
      question: t("faq.q15.question"),
      answer: t("faq.q15.answer"),
    },
    {
      question: t("faq.q16.question"),
      answer: t("faq.q16.answer"),
    },
    {
      question: t("faq.q17.question"),
      answer: t("faq.q17.answer"),
    },
    {
      question: t("faq.q18.question"),
      answer: t("faq.q18.answer"),
    },
    {
      question: t("faq.q19.question"),
      answer: t("faq.q19.answer"),
    },
  ];
  return (
    <section className="w-full bg-[#F8FAF9] dark:bg-[#111111] transition-colors duration-300">
      <div className="container mx-auto px-4 w-full relative z-10 py-16 sm:py-20 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">{t("faq.title")}</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("faq.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.slice(0, 10).map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-3 sm:px-4">
                <AccordionTrigger className="hover:text-primary text-left text-sm sm:text-base whitespace-nowrap">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm sm:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.slice(10).map((faq, index) => (
              <AccordionItem key={index + 10} value={`item-${index + 10}`} className="border rounded-lg px-3 sm:px-4">
                <AccordionTrigger className="hover:text-primary text-left text-sm sm:text-base whitespace-nowrap">
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