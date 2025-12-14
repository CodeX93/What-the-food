import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { subscriptionType, userId } = await request.json();

    if (!userId || !subscriptionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine which table to update
    const tableName = subscriptionType === "platform" ? "platform_subscriptions" : "widget_subscriptions";

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching subscription:", fetchError);
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!subscription) {
      // If subscription doesn't exist, create a free one
      console.log(`Subscription not found for user ${userId}, creating free subscription`);
      
      const insertData: any = {
        user_id: userId,
        subscription_type: "free",
        is_active: false,
      };

      // Add site_limit for widget subscriptions
      if (tableName === "widget_subscriptions") {
        insertData.site_limit = 1;
      }

      const { data: newSubscription, error: insertError } = await supabase
        .from(tableName)
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        return NextResponse.json(
          { error: `Failed to create subscription: ${insertError.message}` },
          { status: 500 }
        );
      }

      // Return success since we've created a free subscription
      return NextResponse.json({ 
        success: true,
        message: "Subscription set to free" 
      });
    }

    // Cancel Stripe subscription if it exists
    if (subscription.stripe_subscription_id && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2025-10-29.clover",
        });
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } catch (stripeError: any) {
        console.error("Stripe cancellation error:", stripeError);
        // Continue with database update even if Stripe cancellation fails
      }
    }

    // Check if this is a platform subscription downgrade (premium to free)
    const wasPremium = subscription.subscription_type === "premium" && subscriptionType === "platform";
    const currentPeriodEnd = subscription.current_period_end;

    // Update subscription to free
    const updateData: any = {
      subscription_type: "free",
      is_active: false,
      stripe_subscription_id: null,
      stripe_price_id: null,
      billing_cycle: null,
      current_period_end: null,
    };

    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    // Send downgrade email if this was a premium platform subscription
    if (wasPremium) {
      try {
        // Get user profile for email and name
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://72.60.113.9";
          
          // Format expiration date
          const expirationDate = currentPeriodEnd
            ? new Date(currentPeriodEnd).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "the end of your billing period";

          // Get pricing from platform_plans
          const { data: monthlyPlan } = await supabase
            .from("platform_plans")
            .select("price_cents")
            .eq("billing_cycle", "monthly")
            .eq("name", "Premium")
            .maybeSingle();

          const { data: yearlyPlan } = await supabase
            .from("platform_plans")
            .select("price_cents")
            .eq("billing_cycle", "yearly")
            .eq("name", "Premium")
            .maybeSingle();

          const monthlyPrice = monthlyPlan ? (monthlyPlan.price_cents / 100).toFixed(2) : "9.99";
          const monthlyOriginalPrice = "14.99";
          const yearlyPrice = yearlyPlan ? (yearlyPlan.price_cents / 100).toFixed(2) : "99.99";
          const yearlyOriginalPrice = "149.99";

          // Call send-lifecycle-email function
          const emailRequestBody = {
            event_type: "downgrade",
            email: profile.email,
            name: profile.full_name,
            metadata: {
              premium_expiration_date: expirationDate,
              current_period_end: expirationDate,
              monthly_price: monthlyPrice,
              monthly_original_price: monthlyOriginalPrice,
              yearly_price: yearlyPrice,
              yearly_original_price: yearlyOriginalPrice,
              monthly_checkout_url: `${appUrl}/plans?plan=premium&cycle=monthly`,
              yearly_checkout_url: `${appUrl}/plans?plan=premium&cycle=yearly`,
            },
          };

          console.log("Calling send-lifecycle-email for downgrade:", {
            email: profile.email,
            name: profile.full_name,
            expirationDate,
          });

          const response = await fetch(`${supabaseUrl}/functions/v1/send-lifecycle-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(emailRequestBody),
          });

          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          if (!response.ok) {
            console.error("Failed to send downgrade email:", {
              status: response.status,
              statusText: response.statusText,
              response: responseData,
              requestBody: emailRequestBody,
            });
          } else {
            console.log("Downgrade email sent successfully:", responseData);
          }
        }
      } catch (emailErr: any) {
        console.error("Error sending downgrade email:", emailErr?.message || emailErr);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

