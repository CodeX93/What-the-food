import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
    const faqs = [
        {
            question: "What is the What The Food widget?",
            answer: "The What The Food widget is an embeddable food analysis tool that lets visitors log meals and explore macro insights directly on your website, helping you increase engagement and provide added value to your audience.",
        },
        {
            question: "Who can use the What The Food widget?",
            answer: "Anyone can use the widget, including but not limited to, food bloggers, content creators, health websites, and publishers, to enhance their content and give readers an interactive nutrition experience without building their own tool.",
        },
        {
            question: "What’s included with the free widget plan?",
            answer: "Free users can create one embeddable widget with up to 100 widget calls per month. The free widget includes a visible “Powered by What The Food” branding.",
        },
        {
            question: "What do I get by upgrading my What The Food subscription to Premium?",
            answer: "Premium removes usage limits, allows you to create multiple widgets, enables unlimited widget calls, and lets you remove “Powered by What The Food” branding. It’s ideal for high-traffic sites and usage on multiple websites at the same time.",
        },
        {
            question: "How does the widget help increase engagement on my website?",
            answer: "The widget turns passive readers into active participants by letting them have fun spending more time on your page and interacting with food content in real time, which can increase time on page, return visits, and boost the perceived value of your content.",
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
