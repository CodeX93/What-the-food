import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How accurate is the AI food analysis?",
    answer: "Our AI is trained on millions of food images and nutritional data. While we strive for high accuracy, results are estimates based on visual analysis. Premium users can adjust serving sizes and ingredients for even more precise results.",
  },
  {
    question: "What types of food can I scan?",
    answer: "You can scan any type of food from any cuisine! Our AI recognizes thousands of dishes, from home-cooked meals to restaurant dishes and packaged foods.",
  },
  {
    question: "How many scans do I get for free?",
    answer: "Free users get 5 total scans to try the service. After that, you can create a free account for 3 scans per day, or upgrade to Premium for unlimited scans.",
  },
  {
    question: "Can I export my nutrition data?",
    answer: "Yes! Premium members can export their scan history and nutritional data as PDF reports, perfect for sharing with healthcare providers or personal tracking.",
  },
  {
    question: "What's included in the Premium plan?",
    answer: "Premium includes unlimited scans, complete scan history, serving adjustment tools, customizable widget for your website, PDF reports, and an ad-free experience with priority support.",
  },
  {
    question: "How does the refund policy work?",
    answer: "We offer a 30-day money-back guarantee. If you're not satisfied with your Premium subscription, contact us within 30 days for a full refund.",
  },
  {
    question: "Can I use this for dietary restrictions?",
    answer: "Absolutely! Our detailed nutritional breakdown helps you track specific nutrients relevant to your dietary needs, whether you're managing allergies, following specific diets, or monitoring macros.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we take privacy seriously. Your food scans and data are encrypted and never shared with third parties. Read our full Privacy Policy for details.",
  },
];

const FAQ = () => {
  return (
    <section className="h-screen flex items-center overflow-y-auto relative snap-start snap-proximity bg-[#F8FAF9] dark:bg-[#111111] transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 w-full relative z-10 py-8 sm:py-0">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Frequently Asked Questions</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Everything you need to know about WhatTheFood
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-6xl mx-auto">
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