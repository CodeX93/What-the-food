import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutSessionSupabase, redirectToCheckout } from "@/utils/stripe";

const Plans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already on a plan, redirect to dashboard
    const checkSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (subscription && subscription.is_active) {
          navigate("/dashboard");
        }
      }
    };
    
    checkSubscription();
  }, [navigate]);
  type PlanType = {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    popular: boolean;
    priceId: string | null;
    billingCycle?: 'monthly' | 'yearly';
    yearlyPrice?: string;
  };

  const plans: PlanType[] = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out our service",
      features: [
        "3 scans per day",
        "Basic nutritional information",
        "Scan history",
        "Email support",
      ],
      popular: false,
      priceId: null, // No Stripe price ID for free plan
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "per month",
      description: "Unlimited access to all features",
      features: [
        "Unlimited scans",
        "Advanced nutritional analysis",
        "Macro tracking",
        "Meal planning",
        "Export reports",
        "Priority support",
      ],
      popular: true,
      priceId: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_1SOxp7PO1jMh2jA4zdTfgcqW', // Stripe Price ID for monthly premium
      billingCycle: 'monthly',
    },
    {
      name: "Premium",
      price: "$99.99",
      period: "per year",
      yearlyPrice: "$8.33/month",
      description: "Best value - Save 17% with yearly billing",
      features: [
        "Unlimited scans",
        "Advanced nutritional analysis",
        "Macro tracking",
        "Meal planning",
        "Export reports",
        "Priority support",
        "Save 17% vs monthly",
      ],
      popular: false,
      priceId: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_1SOxp7PO1jMh2jA45lqLzOxN', // Stripe Price ID for yearly premium
      billingCycle: 'yearly',
    },
  ];

  const handleSelectPlan = async (planName: string, billingCycle: 'monthly' | 'yearly' | 'free' = 'free') => {
    try {
      setLoading(`${planName}-${billingCycle}`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      if (planName === "Free") {
        // For free plan, create or update subscription in database
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          const { error } = await supabase
            .from("subscriptions")
            .update({
              subscription_type: "free",
              is_active: true,
            })
            .eq("user_id", session.user.id);

          if (error) throw error;
        } else {
          // Create new subscription
          const { error } = await supabase
            .from("subscriptions")
            .insert({
              user_id: session.user.id,
              subscription_type: "free",
              is_active: true,
            });

          if (error) throw error;
        }

        toast({
          title: "Plan selected!",
          description: "You're now on the Free plan. Enjoy 3 scans per day!",
        });

        navigate("/dashboard");
        window.location.reload();
      } else {
        // For premium, create Stripe checkout session
        const premiumPlan = plans.find(p => p.name === planName && p.billingCycle === billingCycle);
        if (!premiumPlan?.priceId) {
          toast({
            title: "Error",
            description: "Price ID not configured. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        try {
          // Create checkout session using Supabase Edge Function
          const checkoutUrl = await createCheckoutSessionSupabase(
            premiumPlan.priceId,
            premiumPlan.billingCycle || 'monthly'
          );

          // Redirect to Stripe Checkout
          await redirectToCheckout(checkoutUrl);
        } catch (error: any) {
          console.error('Stripe checkout error:', error);
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
          });
          
          // Provide more helpful error message
          const errorMessage = error.message || 'Unknown error occurred';
          toast({
            title: "Checkout unavailable",
            description: errorMessage.includes('not configured') || errorMessage.includes('not deployed')
              ? "The checkout service needs to be set up. Please contact support or refer to the setup documentation."
              : `Unable to create checkout session: ${errorMessage}. Please try again or contact support.`,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="text-lg text-muted-foreground">
              Select a plan that works best for you. You can upgrade or downgrade at any time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={`${plan.name}-${plan.billingCycle || 'free'}`}
                className={`relative ${
                  plan.popular
                    ? "border-primary border-2 shadow-lg md:scale-105"
                    : "border-2"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.name === "Free" && (
                      <Sparkles className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.yearlyPrice && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.yearlyPrice}</p>
                  )}
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.name, plan.billingCycle || 'monthly')}
                    disabled={loading === `${plan.name}-${plan.billingCycle || 'free'}`}
                  >
                    {loading === `${plan.name}-${plan.billingCycle || 'free'}`
                      ? "Processing..."
                      : plan.name === "Free"
                      ? "Get Started"
                      : plan.billingCycle === 'yearly'
                      ? "Subscribe Yearly"
                      : "Subscribe Monthly"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Plans;

