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

        // Verify subscription with backend or Supabase Edge Function
        // The backend should verify the Stripe session and update the subscription
        const { data, error } = await supabase.functions.invoke('verify-stripe-session', {
          body: { sessionId },
        });

        if (error) {
          console.error('Error verifying session:', error);
          // Try to fetch subscription directly from database
          const { data: subData } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (subData && subData.is_active && subData.subscription_type === 'premium') {
            setSubscription(subData);
            setLoading(false);
            return;
          }

          throw error;
        }

        // Refresh subscription from database
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (subData) {
          setSubscription(subData);
        }

        toast({
          title: "Success!",
          description: "Your Premium subscription is now active.",
        });

        setLoading(false);
      } catch (error: any) {
        console.error('Error verifying subscription:', error);
        toast({
          title: "Verification error",
          description: "We're verifying your subscription. Please refresh in a moment.",
          variant: "destructive",
        });
        
        // Still redirect to dashboard after a delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      }
    };

    verifySubscription();
  }, [sessionId, navigate, toast]);

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
                Your Premium subscription is now active
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="font-semibold">Premium - Active</p>
                  {subscription.current_period_end && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate("/plans")}
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

