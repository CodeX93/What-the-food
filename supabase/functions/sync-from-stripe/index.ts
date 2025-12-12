// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

// Log immediately when module loads
console.log('=== SYNC-FROM-STRIPE FUNCTION LOADED ===', {
  timestamp: new Date().toISOString(),
  denoVersion: Deno.version?.deno || 'unknown',
});

Deno.serve(async (req) => {
  // Log every request immediately
  console.log('=== SYNC-FROM-STRIPE REQUEST RECEIVED ===', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      function: 'sync-from-stripe',
      timestamp: new Date().toISOString() 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // Parse request body
    const body = await req.json();
    const { userId, subscriptionId, customerId } = body;

    console.log('Sync request:', { userId, subscriptionId, customerId });

    // Determine which identifier to use
    let stripeSubscription = null;
    let stripeCustomerId = null;

    if (subscriptionId) {
      // Fetch by subscription ID
      console.log('Fetching subscription by ID:', subscriptionId);
      stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      stripeCustomerId = typeof stripeSubscription.customer === 'string' 
        ? stripeSubscription.customer 
        : stripeSubscription.customer?.id;
    } else if (customerId) {
      // Fetch by customer ID
      console.log('Fetching subscription by customer ID:', customerId);
      stripeCustomerId = customerId;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
        status: 'all',
      });
      if (subscriptions.data.length > 0) {
        stripeSubscription = subscriptions.data[0];
      } else {
        return new Response(
          JSON.stringify({ error: 'No subscription found for customer' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (userId) {
      // Fetch by user ID - find customer ID from database first
      console.log('Fetching subscription by user ID:', userId);
      const { data: platformSub } = await adminSupabase
        .from('platform_subscriptions')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!platformSub?.stripe_customer_id && !platformSub?.stripe_subscription_id) {
        return new Response(
          JSON.stringify({ error: 'No Stripe customer or subscription ID found for user' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (platformSub.stripe_subscription_id) {
        stripeSubscription = await stripe.subscriptions.retrieve(platformSub.stripe_subscription_id);
        stripeCustomerId = typeof stripeSubscription.customer === 'string' 
          ? stripeSubscription.customer 
          : stripeSubscription.customer?.id;
      } else if (platformSub.stripe_customer_id) {
        stripeCustomerId = platformSub.stripe_customer_id;
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          limit: 1,
          status: 'all',
        });
        if (subscriptions.data.length > 0) {
          stripeSubscription = subscriptions.data[0];
        } else {
          return new Response(
            JSON.stringify({ error: 'No subscription found for customer' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Must provide userId, subscriptionId, or customerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeSubscription) {
      return new Response(
        JSON.stringify({ error: 'Could not retrieve subscription from Stripe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Retrieved Stripe subscription:', {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      customer: stripeCustomerId,
    });

    // Get subscription details
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const stripeInterval = stripeSubscription.items.data[0]?.price?.recurring?.interval || 'month';
    const normalizedInterval = stripeInterval === 'month' || stripeInterval === 'monthly' ? 'monthly' :
                               stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual' ? 'yearly' :
                               'monthly';

    console.log('Subscription details:', {
      priceId,
      stripeInterval,
      normalizedInterval,
    });

    // Find user by customer ID
    const { data: platformSub } = await adminSupabase
      .from('platform_subscriptions')
      .select('user_id, id, platform_plan_id')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();

    if (!platformSub) {
      return new Response(
        JSON.stringify({ error: 'No platform subscription found for this Stripe customer' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = platformSub.user_id;

    // Find plan by billing cycle + name (since stripe_price_id is null)
    console.log('Looking up plan by billing_cycle + name:', {
      normalizedInterval,
      name: 'Premium',
    });

    const { data: planByCycle } = await adminSupabase
      .from('platform_plans')
      .select('*')
      .eq('billing_cycle', normalizedInterval)
      .eq('name', 'Premium')
      .maybeSingle();

    if (!planByCycle) {
      return new Response(
        JSON.stringify({ 
          error: 'Plan not found',
          details: `No Premium plan found with billing_cycle: ${normalizedInterval}` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ Plan found:', {
      planId: planByCycle.id,
      billingCycle: planByCycle.billing_cycle,
      name: planByCycle.name,
    });

    // Prepare update data
    const isActive = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
    
    const updateData: any = {
      subscription_type: 'premium',
      is_active: isActive,
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: priceId,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      // Explicitly set these to ensure they're updated
      platform_plan_id: planByCycle.id,
      billing_cycle: normalizedInterval,
      updated_at: new Date().toISOString(),
    };

    console.log('Updating subscription with:', {
      userId: targetUserId,
      platform_plan_id: planByCycle.id,
      billing_cycle: normalizedInterval,
      is_active: isActive,
    });

    // Update platform_subscriptions
    const { data: updatedSub, error: updateError } = await adminSupabase
      .from('platform_subscriptions')
      .upsert({
        user_id: targetUserId,
        ...updateData,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✓ Subscription updated successfully:', {
      id: updatedSub.id,
      billing_cycle: updatedSub.billing_cycle,
      platform_plan_id: updatedSub.platform_plan_id,
    });

    // Verify the update
    if (updatedSub.billing_cycle !== normalizedInterval || updatedSub.platform_plan_id !== planByCycle.id) {
      console.error('CRITICAL: Mismatch after update!', {
        expectedBillingCycle: normalizedInterval,
        actualBillingCycle: updatedSub.billing_cycle,
        expectedPlanId: planByCycle.id,
        actualPlanId: updatedSub.platform_plan_id,
      });

      // Force update
      const { data: forceUpdated, error: forceError } = await adminSupabase
        .from('platform_subscriptions')
        .update({
          billing_cycle: normalizedInterval,
          platform_plan_id: planByCycle.id,
        })
        .eq('id', updatedSub.id)
        .select()
        .single();

      if (forceError) {
        console.error('Force update failed:', forceError);
      } else {
        console.log('✓ Force update successful:', {
          billing_cycle: forceUpdated.billing_cycle,
          platform_plan_id: forceUpdated.platform_plan_id,
        });
      }
    }

    // Sync to profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        platform_subscription_id: updatedSub.id,
        platform_subscription_type: 'premium',
        platform_subscription_plan_id: planByCycle.id,
      })
      .eq('id', targetUserId);

    if (profileError) {
      console.error('Error syncing to profile:', profileError);
    } else {
      console.log('✓ Profile synced successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription synced from Stripe successfully',
        subscription: {
          id: updatedSub.id,
          user_id: targetUserId,
          billing_cycle: updatedSub.billing_cycle,
          platform_plan_id: updatedSub.platform_plan_id,
          is_active: updatedSub.is_active,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error syncing from Stripe:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync from Stripe', 
        details: error?.message || error 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
