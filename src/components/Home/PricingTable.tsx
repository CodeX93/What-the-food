"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Try out WhatTheFood",
    features: [
      "3 scans per day",
      "No scan history",
      "Ads included",
      "No serving adjuster",
      "No customizable widget",
      "No PDF reports",
      "Basic email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium",
    price: "$6.99",
    period: "/month",
    yearlyPrice: "$69.99/year",
    description: "Everything you need",
    features: [
      "Unlimited scans",
      "Complete scan history",
      "Ad-free experience",
      "Serving adjuster",
      "Customizable widget",
      "PDF reports",
      "Premium chat support",
    ],
    cta: "Upgrade Now",
    popular: true,
  },
];

const PricingTable = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePlanClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggedIn) {
      router.push("/plans");
    } else {
      router.push("/auth");
    }
  };

  return (
    <section className="h-screen flex items-center overflow-y-auto relative bg-white dark:bg-[#000000] snap-start snap-proximity transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 w-full relative z-10 py-8 sm:py-0">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Simple, Transparent Pricing</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Choose the plan that works best for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} 
              className={`relative ${plan.popular ? 'border-primary shadow-strong' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm sm:text-base">{plan.description}</CardDescription>
                <div className="mt-3 sm:mt-4">
                  <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm sm:text-base">{plan.period}</span>
                  {plan.yearlyPrice && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      or {plan.yearlyPrice}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <ul className="space-y-2 sm:space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 pt-0">
                <Button 
                  className={`w-full text-sm sm:text-base ${plan.popular ? 'bg-primary hover:bg-primary-hover' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={handlePlanClick}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingTable;