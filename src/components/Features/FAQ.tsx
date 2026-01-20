import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
    const faqs = [
        {
            question: "What is What The Food and who is it for?",
            answer: "What The Food is a macro trackor and nutrition companion for people who want to understand what they eat, how it affects their health, and how their eating patterns evolve over time. It’s built for anyone serious about improving nutrition, weight, or overall health through better food awareness.",
        },
        {
            question: "How does What The Food help me understand my macros?",
            answer: "Instead of just showing numbers, What The Food explains what your macros mean in context, how your meals impact balance, patterns, and progress toward your health goals. Over time, this helps you recognize habits and make better food decisions naturally.",
        },
        {
            question: "How do I log my meals in What The Food?",
            answer: "While you can log food manually on What The Food, we made it possible for you to log meals by snapping a photo of your food. Our AI food scanner automatically detects your meal and estimates macros, removing the need for manual food logging and making macro tracking fast, simple, and sustainable.",
        },
        {
            question: "What can I do for free on What The Food?",
            answer: "You can try the platform for up to 3 meals or 3 days, whichever comes first. This allows you to experience how meal logging works and see how macro insights are presented before deciding whether to upgrade.",
        },
        {
            question: "What does upgrading to Premium unlock?",
            answer: "Premium unlocks deeper macro insights, pattern recognition over time, health progress tracking, personalized context, and customized meal planning. It’s designed for users who want long-term clarity, consistency, and better eating habits, not just one-off meal scans.",
        },
    ];

    return (
        <section className="w-full bg-[#F8FAF9] dark:bg-[#111111] transition-colors duration-300">
            <div className="container mx-auto px-4 w-full relative z-10 py-16 sm:py-20 lg:py-24">
                <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
                        Frequently Asked <span className="text-primary">Questions</span>
                    </h2>
                </div>

                <div className="max-w-3xl mx-auto w-full">
                    <Accordion type="single" collapsible className="space-y-4 w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-3 sm:px-4 w-full">
                                <AccordionTrigger className="hover:text-primary text-left text-sm sm:text-base pr-4">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-sm sm:text-base pb-4">
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
