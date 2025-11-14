import { Upload, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Food Photo",
    description: "Take a picture of your meal or snack. Our AI works with any type of food from any cuisine.",
    number: "01",
  },
  {
    icon: Sparkles,
    title: "AI Analyzes Your Meal",
    description: "Our advanced AI identifies the food, estimates portions, and calculates detailed nutritional information instantly.",
    number: "02",
  },
  {
    icon: TrendingUp,
    title: "Get Instant Results",
    description: "View complete nutritional breakdown including calories, macros, and micronutrients. Track your progress over time.",
    number: "03",
  },
];

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="relative w-full bg-white dark:bg-[#000000] transition-colors duration-300 py-16 sm:py-20 lg:py-24"
    >
      <div className="container mx-auto px-4 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-hero bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            Get nutritional insights in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 w-full relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-7 sm:top-8 md:top-9 left-8 right-8 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 z-0" />
          
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="relative z-10 flex flex-col pt-7 sm:pt-8 md:pt-9">
                {/* Step Number Badge - positioned outside the card */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30">
                  <div className="bg-gradient-hero w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg border-2 sm:border-4 border-background">
                    <span className="text-sm sm:text-base md:text-lg font-bold text-white">{index + 1}</span>
              </div>
                </div>
                
                <Card className="relative overflow-hidden border-2 border-transparent bg-card/50 backdrop-blur-sm h-full flex flex-col mt-3 sm:mt-4 md:mt-5">
                  {/* Large step number in background */}
                  {/* <div className="absolute top-4 sm:top-6 right-4 sm:right-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary/5 select-none pointer-events-none">
                    {step.number}
                  </div> */}
                  
                  <CardHeader className="pt-10 sm:pt-12 md:pt-14 pb-4 sm:pb-6 flex-grow">
                    <div className="bg-gradient-hero w-14 h-14 sm:w-16 sm:h-16 md:w-[4.5rem] md:h-[4.5rem] lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto shadow-lg">
                      <IconComponent className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-10 lg:w-10 text-white" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl md:text-2xl lg:text-3xl text-center font-bold mb-2 sm:mb-3">
                      {step.title}
                    </CardTitle>
              </CardHeader>
                  <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 md:pb-10">
                    <p className="text-sm sm:text-base md:text-lg text-muted-foreground text-center leading-relaxed">
                      {step.description}
                    </p>
              </CardContent>
            </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;