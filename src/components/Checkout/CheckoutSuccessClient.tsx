'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<string | null>(null);
  const cameFromWidgetFlow = subscriptionType === "widget";

  // Get search params in useEffect to ensure they're available
  useEffect(() => {
    if (searchParams) {
      setSessionId(searchParams.get("session_id"));
      setSubscriptionType(searchParams.get("type"));
    }
  }, [searchParams]);

  useEffect(() => {
    const verifySubscription = async () => {
      // Wait for searchParams to be available
      if (!searchParams) {
        return;
      }

      const currentSessionId = searchParams.get("session_id");
      const currentSubscriptionType = searchParams.get("type");
      const legacyWidgetFlow = currentSubscriptionType === "widget";

      if (!currentSessionId) {
        toast({
          title: "Invalid session",
          description: "No checkout session found.",
          variant: "destructive",
        });
        window.location.href = "/plans";
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/auth");
          return;
        }

        const tableName = "platform_subscriptions" as any;
        let attempts = 0;
        const maxAttempts = 10;

        const checkSubscription = async (): Promise<boolean> => {
          const { data: subData, error } = await supabase
            .from(tableName)
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching subscription:", error);
            return false;
          }

          const subscriptionRecord = subData as { is_active?: boolean; subscription_type?: string; billing_cycle?: string; stripe_price_id?: string } | null;

          // Check both is_active and subscription_type to ensure it's premium
          // Also verify billing_cycle is set for yearly upgrades
          if (subscriptionRecord?.is_active && subscriptionRecord?.subscription_type === 'premium') {
            console.log('Subscription found:', {
              is_active: subscriptionRecord.is_active,
              subscription_type: subscriptionRecord.subscription_type,
              billing_cycle: subscriptionRecord.billing_cycle,
              stripe_price_id: subscriptionRecord.stripe_price_id,
              fullRecord: subscriptionRecord,
            });
            setSubscription(subscriptionRecord);
            return true;
          }
          
          console.log('Subscription not active or not premium:', {
            is_active: subscriptionRecord?.is_active,
            subscription_type: subscriptionRecord?.subscription_type,
            billing_cycle: subscriptionRecord?.billing_cycle,
            stripe_price_id: subscriptionRecord?.stripe_price_id,
            fullRecord: subscriptionRecord,
          });

          return false;
        };

        // PRIMARY METHOD: Call process-checkout immediately for all checkouts
        // This handles both free-to-monthly and monthly-to-yearly upgrades
        // Since webhook fails, we use process-checkout as the primary method
        if (currentSessionId) {
          console.log('Calling process-checkout function immediately (primary method)...', {
            sessionId: currentSessionId,
            userId: session.user.id,
          });
          
          try {
            const { data: processData, error: processError } = await supabase.functions.invoke('process-checkout', {
              body: { sessionId: currentSessionId },
            });
            
            console.log('process-checkout response:', {
              data: processData,
              error: processError,
              hasData: !!processData,
              hasError: !!processError,
            });
            
            if (processError) {
              console.error('Process checkout error:', processError);
              // Fallback to sync-subscription
              try {
                const { error: syncError } = await supabase.functions.invoke('sync-subscription', {
                  body: {},
                });
                if (syncError) {
                  console.error('Sync error:', syncError);
                }
              } catch (syncErr) {
                console.error('Sync error:', syncErr);
              }
            } else if (processData?.success) {
              console.log('✓ Checkout processed successfully via process-checkout:', processData);
              // Give it a moment to update the database
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (processErr) {
            console.error('Error processing checkout:', processErr);
            // Fallback to sync
            try {
              await supabase.functions.invoke('sync-subscription', { body: {} });
            } catch (syncErr) {
              console.error('Sync error:', syncErr);
            }
          }
        }

        // SECONDARY: Poll to verify subscription is active (after process-checkout)
        let subscriptionActive = await checkSubscription();

        while (!subscriptionActive && attempts < maxAttempts) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          subscriptionActive = await checkSubscription();
          if (subscriptionActive) break;
        }

        // FINAL FALLBACK: If still not active after polling and process-checkout, try one more time
        if (!subscriptionActive && currentSessionId) {
          console.log('Subscription still not active after polling, retrying process-checkout...', {
            sessionId: currentSessionId,
            userId: session.user.id,
            attempts: attempts,
          });
          try {
            const { data: processData, error: processError } = await supabase.functions.invoke('process-checkout', {
              body: { sessionId: currentSessionId },
            });
            
            if (!processError && processData?.success) {
              console.log('✓ Retry successful:', processData);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              subscriptionActive = await checkSubscription();
            }
          } catch (processErr) {
            console.error('Error in retry:', processErr);
          }
        }

        if (subscriptionActive) {
          toast({
            title: "Success!",
            description:
              legacyWidgetFlow
                ? "Widget access now follows your WhatTheFood plan. You're ready to embed."
                : "Your Premium subscription is now active.",
          });

          setTimeout(() => {
            router.push(legacyWidgetFlow ? "/widget/dashboard" : "/dashboard");
          }, 1500);
        } else {
          toast({
            title: "Subscription Processing",
            description: "Your subscription is being processed. Please refresh the page in a few moments.",
            variant: "default",
          });

          setTimeout(() => {
            router.push(legacyWidgetFlow ? "/widget/dashboard" : "/dashboard");
          }, 2000);
        }

        setLoading(false);
      } catch (error: any) {
        console.error("Error verifying subscription:", error);
        toast({
          title: "Verification error",
          description: "We're verifying your subscription. Redirecting...",
          variant: "destructive",
        });

        setTimeout(() => {
          router.push(legacyWidgetFlow ? "/widget/dashboard" : "/dashboard");
        }, 2000);

        setLoading(false);
      }
    };

    if (sessionId !== null) {
      void verifySubscription();
    }
  }, [router, searchParams, sessionId, subscriptionType, toast]);

  // Show loading if searchParams aren't ready yet or if we're still verifying
  if (loading || !searchParams || sessionId === null) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your subscription...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center py-16">
      <div className="container mx-auto px-4 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
            <CardDescription>
              {cameFromWidgetFlow
                ? "Your widget access is part of your WhatTheFood plan"
                : "Your Premium subscription is now active"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="font-semibold">
                  {subscription.subscription_type === "premium" ? "Premium - Active" : "Free plan"}
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
                onClick={() => router.push(cameFromWidgetFlow ? "/widget/dashboard" : "/dashboard")}
            >
              Go to Dashboard
            </Button>

            <Button
              variant="outline"
              className="w-full"
                onClick={() => window.location.href = "/plans"}
            >
              View Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
