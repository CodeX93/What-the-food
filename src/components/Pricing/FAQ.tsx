import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
    const faqs = [
        {
            question: "What’s included in the free version of What The Food?",
            answer: "The free version lets you try What The Food for up to 3 meals or 3 days, whichever comes first, so you can explore how meal logging works and see initial macro tracking insights before upgrading.",
        },
        {
            question: "How is Premium different from the free version?",
            answer: "Premium unlocks deeper eating pattern insights, long-term macro tracking, personalized context, progress trends, and features designed to help you make better food decisions and build healthier habits over time.",
        },
        {
            question: "Do I need to enter payment information to start for free?",
            answer: "No, you can begin using the free version of What The Food without entering payment details. Premium is optional and only required if you want ongoing insights and advanced tracking.",
        },
        {
            question: "Is the Premium subscription cancellable at any time?",
            answer: "Yes, the Premium subscription is flexible and can be canceled at any time without long-term commitment, so you’re only billed for the period you choose to use it.",
        },
        {
            question: "How does What The Food help justify the cost of Premium?",
            answer: "Premium emphasizes understanding and behavior change, not just logging: you get pattern analysis, progress visualization, and personalized eating context that supports real, sustainable habit improvement, not just numbers.",
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
