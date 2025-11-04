// ============================================
// CLEAN CHECKOUT SUCCESS PAGE
// ============================================

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  const sessionId = searchParams.get('session_id');
  const subscriptionType = searchParams.get('type'); // 'widget' or 'platform'

  useEffect(() => {
    const verifySubscription = async () => {
      if (!sessionId) {
        toast({
          title: "Invalid session",
          description: "No checkout session found.",
          variant: "destructive",
        });
        navigate("/plans");
        return;
      }

      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/auth");
          return;
        }

        // Wait for webhook to process - poll subscription status
        const tableName = subscriptionType === 'widget' ? 'widget_subscriptions' : 'platform_subscriptions';
        let attempts = 0;
        const maxAttempts = 10; // Wait up to 10 seconds

        const checkSubscription = async (): Promise<boolean> => {
          const { data: subData, error } = await supabase
            .from(tableName)
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching subscription:', error);
            return false;
          }

          if (subData && subData.is_active) {
            setSubscription(subData);
            return true;
          }

          return false;
        };

        // Try immediately first
        let subscriptionActive = await checkSubscription();

        // Poll if not active yet (webhook might be processing)
        while (!subscriptionActive && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          subscriptionActive = await checkSubscription();

          if (subscriptionActive) {
            console.log(`Subscription activated after ${attempts} attempts`);
            break;
          }
        }

        if (subscriptionActive) {
          toast({
            title: "Success!",
            description: subscriptionType === 'widget'
              ? "Your widget subscription is now active. You can now create your widget!"
              : "Your Premium subscription is now active.",
          });

          // Redirect to dashboard after short delay
          setTimeout(() => {
            if (subscriptionType === 'widget') {
              navigate("/widget/dashboard");
            } else {
              navigate("/dashboard");
            }
          }, 1500);
        } else {
          toast({
            title: "Subscription Processing",
            description: "Your subscription is being processed. You'll have access shortly.",
          });

          setTimeout(() => {
            if (subscriptionType === 'widget') {
              navigate("/widget/dashboard");
            } else {
              navigate("/dashboard");
            }
          }, 2000);
        }

        setLoading(false);
      } catch (error: any) {
        console.error('Error verifying subscription:', error);
        toast({
          title: "Verification error",
          description: "We're verifying your subscription. Redirecting...",
          variant: "destructive",
        });

        setTimeout(() => {
          if (subscriptionType === 'widget') {
            navigate("/widget/dashboard");
          } else {
            navigate("/dashboard");
          }
        }, 2000);

        setLoading(false);
      }
    };

    verifySubscription();
  }, [sessionId, subscriptionType, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your subscription...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-2xl">Payment Successful!</CardTitle>
              <CardDescription>
                {subscriptionType === 'widget'
                  ? "Your widget subscription is now active"
                  : "Your Premium subscription is now active"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="font-semibold">
                    {subscriptionType === 'widget'
                      ? `Widget Plan ${subscription.subscription_type} - Active`
                      : "Premium - Active"}
                  </p>
                  {subscription.current_period_end && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => navigate(subscriptionType === 'widget' ? "/widget/dashboard" : "/dashboard")}
              >
                Go to Dashboard
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(subscriptionType === 'widget' ? "/widget/plans" : "/plans")}
              >
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutSuccess;
