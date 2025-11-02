import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { redirectToCheckout } from "@/utils/stripe";
import { getUrl } from "@/utils/url";

type WidgetPlanType = {
  name: string;
  subscriptionType: "free" | "plan1" | "plan2" | "plan3";
  price: string;
  period: string;
  yearlyPrice?: string;
  priceId?: string;
  yearlyPriceId?: string;
  features: string[];
  popular: boolean;
  siteLimit: number | string;
  scans: string;
  support: string;
  branding: string;
};

const WidgetPlans = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const plans: WidgetPlanType[] = [
    {
      name: "Free",
      subscriptionType: "free",
      price: "$0",
      period: "/month",
      // No priceId needed for free plan - handled directly in database
      features: [
        "Branding included",
        "1 scan per day",
        "1 site",
        "Basic Support",
      ],
      popular: false,
      siteLimit: 1,
      scans: "1/day",
      support: "Basic Support",
      branding: "No",
    },
    {
      name: "Premium Plan 1",
      subscriptionType: "plan1",
      price: "$4.99",
      period: "/month",
      yearlyPrice: "$49.99/year",
      priceId: import.meta.env.VITE_STRIPE_WIDGET_PLAN1_MONTHLY_PRICE_ID,
      yearlyPriceId: import.meta.env.VITE_STRIPE_WIDGET_PLAN1_YEARLY_PRICE_ID,
      features: [
        "Remove branding",
        "Unlimited scans",
        "1 site",
        "Premium Support",
      ],
      popular: false,
      siteLimit: 1,
      scans: "Unlimited",
      support: "Premium Support",
      branding: "Yes",
    },
    {
      name: "Premium Plan 2",
      subscriptionType: "plan2",
      price: "$9.99",
      period: "/month",
      yearlyPrice: "$99.90/year",
      priceId: import.meta.env.VITE_STRIPE_WIDGET_PLAN2_MONTHLY_PRICE_ID,
      yearlyPriceId: import.meta.env.VITE_STRIPE_WIDGET_PLAN2_YEARLY_PRICE_ID,
      features: [
        "Remove branding",
        "Unlimited scans",
        "Up to 3 sites",
        "Premium Support",
      ],
      popular: true,
      siteLimit: 3,
      scans: "Unlimited",
      support: "Premium Support",
      branding: "Yes",
    },
    {
      name: "Premium Plan 3",
      subscriptionType: "plan3",
      price: "$14.99",
      period: "/month",
      yearlyPrice: "$149.99/year",
      priceId: import.meta.env.VITE_STRIPE_WIDGET_PLAN3_MONTHLY_PRICE_ID,
      yearlyPriceId: import.meta.env.VITE_STRIPE_WIDGET_PLAN3_YEARLY_PRICE_ID,
      features: [
        "Remove branding",
        "Unlimited scans",
        "Unlimited sites",
        "Premium Support",
      ],
      popular: false,
      siteLimit: "Unlimited",
      scans: "Unlimited",
      support: "Premium Support",
      branding: "Yes",
    },
  ];

  const handleSelectPlan = async (plan: WidgetPlanType, billingCycle: "monthly" | "yearly" = "monthly") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setLoading(`${plan.subscriptionType}-${billingCycle}`);

    try {
      // Handle free plan (no Stripe price ID needed)
      if (plan.subscriptionType === "free") {
        // Ensure user profile exists first (required for foreign key constraint)
        const { data: existingProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error checking profile:", profileError);
          throw profileError;
        }

        // Create profile if it doesn't exist
        if (!existingProfile) {
          const { error: createProfileError } = await supabase
            .from("profiles")
            .insert({
              id: session.user.id,
              email: session.user.email || "",
            });

          if (createProfileError) {
            console.error("Error creating profile:", createProfileError);
            throw createProfileError;
          }
        }

        // Now create/update widget subscription
        const { error } = await supabase.from("widget_subscriptions").upsert({
          user_id: session.user.id,
          subscription_type: "free",
          is_active: true,
          site_limit: 1,
        }, {
          onConflict: "user_id",
        });

        if (error) throw error;

        toast({
          title: "Success!",
          description: "Free plan activated. You can now create your widget.",
        });

        navigate("/widget/dashboard");
        return;
      }

      // Handle paid plans with Stripe
      const priceId = billingCycle === "yearly" ? plan.yearlyPriceId : plan.priceId;

      if (!priceId) {
        throw new Error("Price ID not configured for this plan");
      }

      // Use widget-specific success URL
      const successUrl = `${getUrl('/checkout/success')}?session_id={CHECKOUT_SESSION_ID}&type=widget`;
      const cancelUrl = getUrl('/widget/plans');

      let responseData: any = null;
      let responseError: any = null;

      try {
        const response = await supabase.functions.invoke('create-checkout-session', {
          body: {
            priceId,
            billingCycle,
            userId: session.user.id,
            email: session.user.email,
            successUrl,
            cancelUrl,
            subscriptionType: 'widget', // Indicate this is a widget subscription
          },
        });

        responseData = response.data;
        responseError = response.error;
      } catch (invokeError: any) {
        // Catch any unexpected errors
        console.error('Unexpected error invoking Edge Function:', invokeError);
        responseError = invokeError;
      }

      if (responseError) {
        console.error('Edge Function error:', responseError);
        console.error('Error type:', responseError.constructor?.name);
        console.error('Error details:', JSON.stringify(responseError, null, 2));
        console.error('Error keys:', Object.keys(responseError));
        
        // Try to extract error from response body
        let errorMessage = 'Failed to create checkout session';
        let errorDetails = '';
        let errorHint = '';
        
        // Method 1: Check error.context for Response object
        if (responseError.context) {
          console.error('Error context keys:', Object.keys(responseError.context));
          console.error('Error context:', responseError.context);
          
          // Check if context has a Response object
          const responseObj = responseError.context;
          if (responseObj && typeof responseObj.json === 'function') {
            try {
              const errorBody = await responseObj.json();
              console.error('Parsed error body from response:', errorBody);
              if (errorBody?.error) {
                errorMessage = errorBody.error;
                errorDetails = errorBody.details || '';
                errorHint = errorBody.hint || '';
              }
            } catch (e) {
              console.error('Error parsing response JSON:', e);
              // Try to get text instead
              try {
                const errorText = await responseObj.text();
                console.error('Error response text:', errorText);
                try {
                  const parsed = JSON.parse(errorText);
                  if (parsed.error) {
                    errorMessage = parsed.error;
                    errorDetails = parsed.details || '';
                    errorHint = parsed.hint || '';
                  }
                } catch (parseError) {
                  // Not JSON, use the text as error message
                  errorMessage = errorText || errorMessage;
                }
              } catch (textError) {
                console.error('Error getting response text:', textError);
              }
            }
          }
          
          // Try other possible locations
          const possibleBodies = [
            responseError.context.body,
            responseError.context.response?.body,
            responseError.context.response?.data,
            responseError.context.data,
            responseError.context.message,
          ];
          
          for (const errorBody of possibleBodies) {
            if (errorBody) {
              try {
                const parsed = typeof errorBody === 'string' 
                  ? JSON.parse(errorBody)
                  : errorBody;
                  
                if (parsed && typeof parsed === 'object') {
                  if (parsed.error) {
                    errorMessage = parsed.error;
                    errorDetails = parsed.details || '';
                    errorHint = parsed.hint || '';
                    break; // Found it, stop looking
                  }
                }
              } catch (e) {
                // Continue to next possible location
              }
            }
          }
        }
        
        // Method 2: Check error.message directly
        if (errorMessage === 'Failed to create checkout session' && responseError.message) {
          errorMessage = responseError.message;
          
          // Try to parse if it's JSON
          try {
            const parsed = JSON.parse(responseError.message);
            if (parsed.error) {
              errorMessage = parsed.error;
              errorDetails = parsed.details || '';
              errorHint = parsed.hint || '';
            }
          } catch (e) {
            // Not JSON, use message as is
          }
        }
        
        // Construct final error message
        let finalMessage = errorMessage;
        if (errorDetails) {
          finalMessage += `: ${errorDetails}`;
        }
        if (errorHint) {
          finalMessage += ` (${errorHint})`;
        }
        
        throw new Error(finalMessage);
      }
      
      // Check if we got data but no URL
      if (!responseData || !responseData.url) {
        console.error('No URL in response:', responseData);
        throw new Error('No checkout URL returned from server. Check Edge Function logs for details.');
      }
      
      // Success - we have a URL
      await redirectToCheckout(responseData.url);
    } catch (error: any) {
      console.error("Error selecting plan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process plan selection. Please try again.",
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
        <section className="py-20 bg-gradient-hero/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="text-5xl font-bold mb-6">Choose your Widget Pricing</h1>
              <p className="text-xl text-muted-foreground">
                Select the perfect plan for your website needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans.map((plan, index) => (
                <Card
                  key={`${plan.subscriptionType}-${index}`}
                  className={`relative ${plan.popular ? "border-primary shadow-strong" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                      {plan.yearlyPrice && (
                        <div className="text-xs text-muted-foreground mt-1">
                          or {plan.yearlyPrice}
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    {plan.subscriptionType === "free" ? (
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        disabled={loading === `${plan.subscriptionType}-monthly`}
                      >
                        {loading === `${plan.subscriptionType}-monthly` ? (
                          <>
                            <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                            Activating...
                          </>
                        ) : (
                          "Get Started Free"
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleSelectPlan(plan, "monthly")}
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          disabled={loading?.startsWith(plan.subscriptionType)}
                        >
                          {loading === `${plan.subscriptionType}-monthly` ? (
                            <>
                              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Subscribe ${plan.price}/mo`
                          )}
                        </Button>
                        {plan.yearlyPriceId && (
                          <Button
                            onClick={() => handleSelectPlan(plan, "yearly")}
                            className="w-full"
                            variant="outline"
                            size="sm"
                            disabled={loading?.startsWith(plan.subscriptionType)}
                          >
                            {loading === `${plan.subscriptionType}-yearly` ? (
                              <>
                                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              `Save with Yearly`
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WidgetPlans;

