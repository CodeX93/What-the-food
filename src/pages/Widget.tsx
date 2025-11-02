import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Code } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const widgetPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "Branding included",
      "1 scan per day",
      "1 site",
      "Basic support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium Plan 1",
    price: "$4.99",
    period: "/month",
    yearlyPrice: "$49.99/year",
    features: [
      "Remove branding",
      "Unlimited scans",
      "1 site",
      "Premium support",
    ],
    cta: "Upgrade Now",
    popular: false,
  },
  {
    name: "Premium Plan 2",
    price: "$9.99",
    period: "/month",
    yearlyPrice: "$99.99/year",
    features: [
      "Remove branding",
      "Unlimited scans",
      "Up to 3 sites",
      "Premium support",
    ],
    cta: "Upgrade Now",
    popular: true,
  },
  {
    name: "Premium Plan 3",
    price: "$14.99",
    period: "/month",
    yearlyPrice: "$149.99/year",
    features: [
      "Remove branding",
      "Unlimited scans",
      "Unlimited sites",
      "Premium support",
    ],
    cta: "Upgrade Now",
    popular: false,
  },
];

const Widget = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if user has a widget subscription
          const { data: subscription } = await supabase
            .from("widget_subscriptions")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          // If subscription exists (even if not active yet), redirect to dashboard
          if (subscription) {
            navigate("/widget/dashboard", { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        // Continue to show the landing page on error
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <Header />
      <main>
        <section className="py-20 bg-gradient-hero/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-6">Embeddable Widget for Your Website</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Add WhatTheFood's AI-powered food scanning to your blog or website. 
                Perfect for food bloggers, nutrition sites, and health platforms.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary-hover" asChild>
                <Link to="/widget/plans">Get Your Widget</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">Widget Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card>
                  <CardHeader>
                    <Code className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Easy Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Simple iframe embed code. Copy, paste, and you're done. No technical expertise required.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <svg className="h-10 w-10 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    <CardTitle>Fully Customizable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Customize colors, borders, text, and styling to match your brand perfectly.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <svg className="h-10 w-10 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <CardTitle>Usage Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Track widget performance and API usage through your dedicated dashboard.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Widget Pricing</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Choose the plan that fits your needs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {widgetPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative ${plan.popular ? 'border-primary shadow-strong' : ''}`}
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
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary-hover' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      size="sm"
                      asChild
                    >
                      <Link to="/widget/plans">{plan.cta}</Link>
                    </Button>
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

export default Widget;