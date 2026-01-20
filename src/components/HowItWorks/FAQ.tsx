import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
    const faqs = [
        {
            question: "How does What The Food help me understand my eating habits?",
            answer: "What The Food shows your macro patterns over time and explains how different foods affect your balance, helping you spot trends and make healthier decisions rather than just logging numbers.",
        },
        {
            question: "How do I log food in What The Food?",
            answer: "While manual food logging is an option, you can also log food by snapping a photo and our tool’s AI food scanner will breaks down your meal’s macros so you don’t have to type ingredients manually. This saves time and makes tracking more enjoyable, but real value comes from understanding patterns over time.",
        },
        {
            question: "What happens when I try What The Food for the first time?",
            answer: "New users can access What The Food for up to 3 meals or 3 days, whichever comes first, to explore how meal logging works and see initial macro tracking insights before upgrading.",
        },
        {
            question: "Do I need to sign up before using What The Food?",
            answer: "No, you can start logging meals using our smart AI food scanner immediately. Creating an account lets you save meal history, view trends over time, and personalize insights as you track longer.",
        },
        {
            question: "What does Premium add to the core experience?",
            answer: "Premium brings deeper pattern recognition, long-term progress tracking, personalized eating context, and features that help you build consistent healthy habits, not just one-off meal entries.",
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
