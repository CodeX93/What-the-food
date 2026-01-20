import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
    const faqs = [
        {
            question: "What do users like most about What The Food?",
            answer: "Users often highlight how easy it is to log meals, understand macro numbers in context, and recognize eating patterns over time, making healthier decisions feel simpler and more sustainable.",
        },
        {
            question: "Why do users say What The Food feels different from other macro trackers?",
            answer: "Many users appreciate that What The Food focuses on explaining food choices and patterns, not just displaying calories or macros, which makes tracking feel like building a habit not just judging what they eat.",
        },
        {
            question: "What type of users are featured on the Wall of Love?",
            answer: "Feedback comes from a wide range of users, including beginners, casual trackers, and people actively working toward specific nutrition or health goals.",
        },
        {
            question: "How should I read and interpret these testimonials?",
            answer: "Testimonials are shared as personal experiences, not guarantees. They’re meant to provide context and real-world examples rather than promise specific outcomes.",
        },
        {
            question: "Should I expect the same experience as the users featured here?",
            answer: "Every user’s experience is personal and depends on how consistently they use the platform. The testimonials reflect real experiences, but individual results may vary based on goals and habits.",
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
