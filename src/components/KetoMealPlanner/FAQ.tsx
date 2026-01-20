import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
    const faqs = [
        {
            question: "Is the What The Food meal planner only for keto diets?",
            answer: "No. While this page focuses on keto, the meal planner supports multiple diet preferences. Users can create meal plans for keto, low-carb, high-protein, balanced diets, and more, all from the same meal planner.",
        },
        {
            question: "What is a keto meal planner?",
            answer: "A keto meal planner helps organize meals that align with a diet keto meal plan by focusing on low carbohydrates, moderate protein, and higher fat intake while keeping macros balanced.",
        },
        {
            question: "How does the keto meal planner help with macro tracking?",
            answer: "The keto meal planner tracks fat, protein, and carb intake and shows how each meal contributes to your daily and weekly macro balance, helping you stay consistent with a diet keto meal plan.",
        },
        {
            question: "Can beginners use our ketp meal planner effectively?",
            answer: "Yes. What The Food’s keto meal planner is built to help beginners understand how keto macros work in practice, making it easier to follow a diet keto meal plan without manually calculating macros.",
        },
        {
            question: "Do I need a subscription to use the What The Food’s meal planner?",
            answer: "Yes, while you can test out the platform for up to 3 meals or 3 days, continued access to meal planning, long-term macro tracking, and personalized insights requires upgrading to Premium.",
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
