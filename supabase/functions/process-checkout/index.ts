// @ts-nocheck
// Manual checkout processing function
// Used when webhook hasn't processed the checkout yet

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Log immediately when module loads
console.log('=== PROCESS-CHECKOUT FUNCTION LOADED ===', {
  timestamp: new Date().toISOString(),
  denoVersion: Deno.version?.deno || 'unknown',
});

Deno.serve(async (req) => {
  // Log every request immediately - this should ALWAYS appear
  console.log('=== PROCESS-CHECKOUT REQUEST RECEIVED ===', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    hasBody: !!req.body,
  });
  
  // Also log to stderr for visibility
  console.error('[PROCESS-CHECKOUT] Request received:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight request');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('Health check request');
    return new Response(JSON.stringify({ 
      status: 'ok', 
      function: 'process-checkout',
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const Stripe = (await import('https://esm.sh/stripe@14.21.0?target=deno')).default;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });

    // Retrieve checkout session from Stripe
    console.log('Retrieving checkout session:', sessionId);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    console.log('Checkout session retrieved:', {
      id: session.id,
      paymentStatus: session.payment_status,
      subscription: session.subscription,
      metadata: session.metadata,
    });

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', paymentStatus: session.payment_status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this session belongs to the current user
    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (sessionUserId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Session does not belong to current user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription from Stripe
    if (!session.subscription) {
      return new Response(
        JSON.stringify({ error: 'No subscription found in checkout session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    console.log('Subscription retrieved:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
    });

    // Use service role client for database updates
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Import the update function logic (simplified version)
    const subscriptionType = session.metadata?.subscriptionType || 'platform';
    const planId = session.metadata?.planId || null;
    const billingCycleFromMetadata = session.metadata?.billingCycle || null; // From checkout session metadata
    const priceId = subscription.items.data[0]?.price?.id;
    const subscriptionId = subscription.id;
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
    
    console.log('Checkout session metadata:', {
      planId,
      planIdType: typeof planId,
      planIdLength: planId?.length,
      billingCycleFromMetadata,
      subscriptionType,
      sessionMetadata: session.metadata,
      allMetadataKeys: Object.keys(session.metadata || {}),
    });
    
    // Validate planId
    if (!planId || planId === '' || planId === 'null') {
      console.error('WARNING: planId is missing or invalid in checkout session metadata!', {
        planId,
        metadata: session.metadata,
      });
    }

    // Find plan - prioritize planId from metadata, fallback to price_id lookup
    let finalPlanId = planId && planId !== '' && planId !== 'null' ? planId : null;
    let planDataFromPrice: any = null;
    
    // If planId provided, fetch the plan to verify and get billing_cycle
    if (finalPlanId) {
      console.log('Looking up plan by planId:', finalPlanId);
      const { data: planById, error: planByIdError } = await adminSupabase
        .from('platform_plans')
        .select('id, billing_cycle, name, stripe_price_id')
        .eq('id', finalPlanId)
        .maybeSingle();
      
      if (planByIdError) {
        console.error('Error fetching plan by planId:', planByIdError);
      } else if (planById) {
        planDataFromPrice = planById;
        finalPlanId = planById.id;
        console.log('✓ Plan found by planId from metadata:', {
          planId: finalPlanId,
          planBillingCycle: planById.billing_cycle,
          planName: planById.name,
          stripe_price_id: planById.stripe_price_id,
        });
      } else {
        console.warn('✗ Plan not found by planId from metadata:', finalPlanId);
        finalPlanId = null; // Reset if not found
      }
    } else {
      console.warn('No valid planId provided in metadata:', {
        planId,
        planIdType: typeof planId,
      });
    }
    
    // Fallback: try to find plan by price_id if planId lookup failed
    if (!planDataFromPrice && priceId) {
      const { data: plan } = await adminSupabase
        .from('platform_plans')
        .select('id, billing_cycle, name, stripe_price_id')
        .eq('stripe_price_id', priceId)
        .maybeSingle();
      if (plan) {
        finalPlanId = plan.id;
        planDataFromPrice = plan;
        console.log('Plan found by price ID (fallback):', {
          priceId,
          planId: finalPlanId,
          planBillingCycle: plan.billing_cycle,
          planName: plan.name,
        });
      } else {
        console.log('No plan found by price ID (stripe_price_id is likely null in DB):', priceId);
      }
    }
    
    // CRITICAL FALLBACK: If still no plan found, determine from Stripe's billing cycle
    // This ensures yearly checkouts work even when metadata is missing
    if (!finalPlanId || !planDataFromPrice) {
      // Get Stripe interval to determine billing cycle (SOURCE OF TRUTH)
      const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
      const normalizedInterval = stripeInterval === 'month' || stripeInterval === 'monthly' ? 'monthly' :
                                 stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual' ? 'yearly' :
                                 'monthly';
      
      console.log('No plan found by planId or price_id, looking up by billing_cycle + name:', {
        stripeInterval,
        normalizedInterval,
        planIdFromMetadata: planId,
        priceId,
      });
      
      // Look up plan by billing_cycle + name (most reliable when stripe_price_id is null)
      const { data: planByCycle } = await adminSupabase
        .from('platform_plans')
        .select('id, billing_cycle, name, stripe_price_id')
        .eq('billing_cycle', normalizedInterval)
        .eq('name', 'Premium')
        .maybeSingle();
      
      if (planByCycle) {
        finalPlanId = planByCycle.id;
        planDataFromPrice = planByCycle;
        console.log('✓ Plan found by billing_cycle + name (STRIPE SOURCE OF TRUTH):', {
          normalizedInterval,
          planId: finalPlanId,
          planBillingCycle: planByCycle.billing_cycle,
          planName: planByCycle.name,
        });
      } else {
        console.error('CRITICAL: No plan found by billing_cycle + name:', {
          normalizedInterval,
          name: 'Premium',
          userId: user.id,
        });
      }
    }
    
    if (!finalPlanId) {
      console.error('CRITICAL: No plan ID determined after all fallbacks!', {
        planIdFromMetadata: planId,
        priceId,
        billingCycleFromMetadata,
        stripeInterval: subscription.items.data[0]?.price?.recurring?.interval,
      });
    }

    // Determine subscription status
    const isActive = ['active', 'trialing', 'past_due'].includes(subscription.status);
    const subscriptionTypeValue = isActive ? 'premium' : 'free';
    
    // Normalize billing cycle: Stripe returns 'month'/'year', we store 'monthly'/'yearly'
    const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
    
    // Determine billing cycle with multiple fallbacks
    let billingCycle = 'monthly'; // default
    
    // Priority 1: Use planDataFromPrice (already fetched above) - most reliable
    if (planDataFromPrice?.billing_cycle) {
      const planCycle = planDataFromPrice.billing_cycle.toLowerCase().trim();
      if (planCycle === 'monthly' || planCycle === 'month') {
        billingCycle = 'monthly';
      } else if (planCycle === 'yearly' || planCycle === 'year' || planCycle === 'annual') {
        billingCycle = 'yearly';
      }
      console.log('Billing cycle from planDataFromPrice (PRIORITY 1):', {
        planId: finalPlanId,
        planBillingCycle: planDataFromPrice.billing_cycle,
        planName: planDataFromPrice.name,
        normalized: billingCycle,
      });
    }
    
    // Priority 2: Use billingCycle from checkout session metadata
    if (billingCycle === 'monthly' && billingCycleFromMetadata) {
      const metaCycle = billingCycleFromMetadata.toLowerCase().trim();
      if (metaCycle === 'monthly' || metaCycle === 'month') {
        billingCycle = 'monthly';
      } else if (metaCycle === 'yearly' || metaCycle === 'year' || metaCycle === 'annual') {
        billingCycle = 'yearly';
      }
      console.log('Billing cycle from checkout metadata (PRIORITY 2):', {
        billingCycleFromMetadata,
        normalized: billingCycle,
      });
    }
    
    // Priority 3: Use Stripe interval as final fallback
    if (billingCycle === 'monthly' && stripeInterval) {
      if (stripeInterval === 'month' || stripeInterval === 'monthly') {
        billingCycle = 'monthly';
      } else if (stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual') {
        billingCycle = 'yearly';
      }
      console.log('Billing cycle from Stripe interval (PRIORITY 3 - FALLBACK):', {
        stripeInterval,
        normalized: billingCycle,
      });
    }
    
    // Final validation: if we have planDataFromPrice, use its billing_cycle as source of truth
    if (planDataFromPrice?.billing_cycle) {
      const expectedBillingCycle = planDataFromPrice.billing_cycle.toLowerCase().trim();
      const normalizedExpected = expectedBillingCycle === 'monthly' || expectedBillingCycle === 'month' ? 'monthly' :
                                 expectedBillingCycle === 'yearly' || expectedBillingCycle === 'year' || expectedBillingCycle === 'annual' ? 'yearly' :
                                 expectedBillingCycle;
      
      if (billingCycle !== normalizedExpected) {
        console.warn('Billing cycle mismatch! Forcing use of plan data:', {
          calculatedBillingCycle: billingCycle,
          planBillingCycle: planDataFromPrice.billing_cycle,
          normalizedExpected,
          usingPlanData: true,
        });
        billingCycle = normalizedExpected; // Force use plan data as source of truth
      }
    }
    
    // Get detailed price information
    const priceInfo = subscription.items.data[0]?.price;
    const recurringInfo = priceInfo?.recurring;
    
    console.log('Subscription details from Stripe:', {
      status: subscription.status,
      isActive,
      subscriptionTypeValue,
      stripeInterval,
      normalizedBillingCycle: billingCycle,
      priceId,
      subscriptionId,
      priceInfo: {
        id: priceInfo?.id,
        nickname: priceInfo?.nickname,
        unit_amount: priceInfo?.unit_amount,
      },
      recurringInfo: {
        interval: recurringInfo?.interval,
        interval_count: recurringInfo?.interval_count,
      },
      allItems: subscription.items.data.map((item: any) => ({
        priceId: item.price?.id,
        interval: item.price?.recurring?.interval,
        interval_count: item.price?.recurring?.interval_count,
      })),
    });

    // Check existing subscription BEFORE updating to determine if this is an upgrade or monthly to yearly switch
    const { data: existingSub } = await adminSupabase
      .from('platform_subscriptions')
      .select('subscription_type, billing_cycle, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const wasPremium = existingSub?.subscription_type === 'premium';
    const isUpgrade = !wasPremium && subscriptionTypeValue === 'premium' && isActive;
    const isDowngrade = wasPremium && (subscriptionTypeValue === 'free' || !isActive);
    
    // Check if this is a monthly ↔ yearly switch
    // Normalize billing cycles for comparison
    const prevCycle = (existingSub?.billing_cycle || '').toLowerCase().trim();
    const newCycle = (billingCycle || '').toLowerCase().trim();
    
    // Previous monthly?
    const isPrevMonthly = prevCycle.startsWith('month') || prevCycle === 'monthly' || prevCycle.includes('month');
    // New yearly?
    const isNewYearly = newCycle.startsWith('year') || 
                     newCycle === 'annual' || 
                     newCycle === 'yearly' || 
                     newCycle.includes('year') ||
                     newCycle.includes('annual');
    // Previous yearly?
    const isPrevYearly = prevCycle.startsWith('year') ||
                         prevCycle === 'yearly' ||
                         prevCycle === 'annual' ||
                         prevCycle.includes('year') ||
                         prevCycle.includes('annual');
    // New monthly?
    const isNewMonthly = newCycle.startsWith('month') || newCycle === 'monthly' || newCycle.includes('month');
    
    const isMonthlyToYearly = wasPremium && isPrevMonthly && isNewYearly;
    const isYearlyToMonthly = wasPremium && isPrevYearly && isNewMonthly;
    
    console.log('Monthly / yearly switch detection:', {
      prevCycle,
      newCycle,
      isPrevMonthly,
      isNewYearly,
      isPrevYearly,
      isNewMonthly,
      wasPremium,
      isMonthlyToYearly,
      isYearlyToMonthly,
      existingSubBillingCycle: existingSub?.billing_cycle,
      stripeBillingCycle: billingCycle,
    });

    console.log('Subscription status check:', {
      userId: user.id,
      wasPremium,
      newType: subscriptionTypeValue,
      isActive,
      isUpgrade,
      isDowngrade,
      prevCycle,
      newCycle,
      isPrevMonthly,
      isNewYearly,
      isPrevYearly,
      isNewMonthly,
      isMonthlyToYearly,
      isYearlyToMonthly,
      existingSubData: existingSub,
      billingCycleFromStripe: billingCycle,
    });

    // Update platform_subscriptions
    // Ensure billing_cycle is always normalized (monthly/yearly, not month/year)
    const normalizedBillingCycle = billingCycle === 'month' ? 'monthly' : 
                                   billingCycle === 'year' ? 'yearly' : 
                                   billingCycle === 'annual' ? 'yearly' :
                                   billingCycle; // Already normalized or default
    
    const updateData = {
      subscription_type: subscriptionTypeValue,
      platform_plan_id: finalPlanId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      stripe_customer_id: customerId,
      billing_cycle: normalizedBillingCycle, // Use normalized value
      is_active: isActive,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };
    
    console.log('Final update data with normalized billing cycle:', {
      originalBillingCycle: billingCycle,
      normalizedBillingCycle: normalizedBillingCycle,
      finalPlanId,
      planIdFromMetadata: planId,
      updateData,
      willUpdatePlatformPlanId: existingSub?.platform_plan_id !== finalPlanId,
      willUpdateBillingCycle: existingSub?.billing_cycle !== normalizedBillingCycle,
    });

    console.log('Updating subscription with data:', { 
      userId: user.id, 
      updateData,
      existingSubscription: existingSub,
      willUpdateBillingCycle: existingSub?.billing_cycle !== billingCycle,
    });

    // Log what we're about to update
    console.log('About to upsert subscription with:', {
      userId: user.id,
      updateData,
      willSetPlatformPlanId: finalPlanId,
      willSetBillingCycle: normalizedBillingCycle,
      existingPlatformPlanId: existingSub?.platform_plan_id,
      existingBillingCycle: existingSub?.billing_cycle,
    });

    const { data: upsertedData, error: upsertError } = await adminSupabase
      .from('platform_subscriptions')
      .upsert({
        user_id: user.id,
        ...updateData,
        // Explicitly set these to ensure they're updated
        platform_plan_id: finalPlanId,
        billing_cycle: normalizedBillingCycle,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error updating subscription:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Subscription updated successfully:', {
      userId: user.id,
      subscriptionId: upsertedData?.id,
      subscriptionType: upsertedData?.subscription_type,
      billingCycleInDB: upsertedData?.billing_cycle,
      platformPlanIdInDB: upsertedData?.platform_plan_id,
      isActive: upsertedData?.is_active,
      previousBillingCycle: existingSub?.billing_cycle,
      previousPlatformPlanId: existingSub?.platform_plan_id,
      newBillingCycle: billingCycle,
      normalizedBillingCycle: normalizedBillingCycle,
      expectedPlatformPlanId: finalPlanId,
      previousSubscriptionType: existingSub?.subscription_type,
      newSubscriptionType: subscriptionTypeValue,
      stripeInterval,
      priceId,
      planIdFromMetadata: planId,
    });
    
    // Critical check: verify both billing_cycle and platform_plan_id were updated
    const billingCycleMismatch = upsertedData?.billing_cycle !== normalizedBillingCycle;
    const planIdMismatch = upsertedData?.platform_plan_id !== finalPlanId;
    
    if (billingCycleMismatch || planIdMismatch) {
      console.error('CRITICAL: Mismatch after update!', {
        billingCycle: {
          expected: normalizedBillingCycle,
          actual: upsertedData?.billing_cycle,
          mismatch: billingCycleMismatch,
        },
        platformPlanId: {
          expected: finalPlanId,
          actual: upsertedData?.platform_plan_id,
          mismatch: planIdMismatch,
        },
        stripeInterval,
        priceId,
        subscriptionId: upsertedData?.id,
        planBillingCycle: planDataFromPrice?.billing_cycle,
        planIdFromMetadata: planId,
      });
      
      // Try to force update if mismatch detected
      console.log('Attempting to force update billing cycle and plan ID...');
      const forceUpdateData: any = {
        billing_cycle: normalizedBillingCycle,
        updated_at: new Date().toISOString(),
      };
      
      if (finalPlanId) {
        forceUpdateData.platform_plan_id = finalPlanId;
      }
      
      const { data: forceUpdateResult, error: forceUpdateError } = await adminSupabase
        .from('platform_subscriptions')
        .update(forceUpdateData)
        .eq('id', upsertedData?.id)
        .select()
        .single();
      
      if (forceUpdateError) {
        console.error('Force update failed:', forceUpdateError);
      } else {
        console.log('Force update successful:', {
          billing_cycle: forceUpdateResult?.billing_cycle,
          platform_plan_id: forceUpdateResult?.platform_plan_id,
        });
      }
    } else {
      console.log('✓ Both billing cycle and platform_plan_id correctly updated:', {
        billing_cycle: normalizedBillingCycle,
        platform_plan_id: finalPlanId,
      });
    }

    // Verify the update was successful by checking the returned data
    if (upsertedData) {
      if (upsertedData.billing_cycle !== billingCycle) {
        console.warn('WARNING: Billing cycle mismatch after update:', {
          expected: billingCycle,
          actual: upsertedData.billing_cycle,
          subscriptionId: upsertedData.id,
        });
      }
      if (upsertedData.subscription_type !== subscriptionTypeValue) {
        console.warn('WARNING: Subscription type mismatch after update:', {
          expected: subscriptionTypeValue,
          actual: upsertedData.subscription_type,
          subscriptionId: upsertedData.id,
        });
      }
    }

    // Update profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        platform_subscription_id: upsertedData?.id || null,
        platform_subscription_type: updateData.subscription_type,
        platform_subscription_plan_id: finalPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.warn('Profile update failed:', profileError);
    }

    // Send monthly to yearly email if this is a switch from monthly to yearly
    if (isMonthlyToYearly) {
      try {
        console.log('Detected monthly to yearly switch, sending email:', {
          userId: user.id,
          prevCycle,
          newCycle,
        });

        // Get user profile for email and name
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.email) {
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

          // Format next renewal date
          const nextRenewalDate = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'your next billing date';

          const requestBody = {
            event_type: 'monthly_to_annual',
            email: profile.email,
            name: profile.full_name,
            metadata: {
              next_renewal_date: nextRenewalDate,
              current_period_end: nextRenewalDate,
              manage_subscription_url: `${appUrl}/profile`,
            },
          };

          console.log('Calling send-lifecycle-email for monthly to yearly:', {
            url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
            email: profile.email,
            name: profile.full_name,
          });

          if (anonKey) {
            const response = await fetch(`${supabaseUrl}/functions/v1/send-lifecycle-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = responseText;
            }

            if (!response.ok) {
              console.error('Failed to send monthly to yearly email:', {
                status: response.status,
                statusText: response.statusText,
                response: responseData,
                requestBody: JSON.stringify(requestBody, null, 2),
              });
            } else {
              console.log('Monthly to yearly email sent successfully:', responseData);
            }
          } else {
            console.error('SUPABASE_ANON_KEY not set, cannot send monthly to yearly email');
          }
        } else {
          console.warn('User profile email not found, cannot send monthly to yearly email');
        }
      } catch (emailErr: any) {
        console.error('Error sending monthly to yearly email:', emailErr?.message || emailErr);
        // Don't fail the request if email fails
      }
    }
    // Send yearly to monthly email if this is a switch from yearly to monthly
    else if (isYearlyToMonthly) {
      try {
        console.log('Detected yearly to monthly switch, sending email:', {
          userId: user.id,
          prevCycle,
          newCycle,
        });

        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.email) {
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

          const nextRenewalDate = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'your next billing date';

          const requestBody = {
            event_type: 'yearly_to_monthly',
            email: profile.email,
            name: profile.full_name,
            metadata: {
              next_renewal_date: nextRenewalDate,
              current_period_end: nextRenewalDate,
              manage_subscription_url: `${appUrl}/profile`,
            },
          };

          console.log('Calling send-lifecycle-email for yearly to monthly:', {
            url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
            email: profile.email,
            name: profile.full_name,
          });

          if (anonKey) {
            const response = await fetch(`${supabaseUrl}/functions/v1/send-lifecycle-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = responseText;
            }

            if (!response.ok) {
              console.error('Failed to send yearly to monthly email:', {
                status: response.status,
                statusText: response.statusText,
                response: responseData,
                requestBody: JSON.stringify(requestBody, null, 2),
              });
            } else {
              console.log('Yearly to monthly email sent successfully:', responseData);
            }
          } else {
            console.error('SUPABASE_ANON_KEY not set, cannot send yearly to monthly email');
          }
        } else {
          console.warn('User profile email not found, cannot send yearly to monthly email');
        }
      } catch (emailErr: any) {
        console.error('Error sending yearly to monthly email:', emailErr?.message || emailErr);
        // Don't fail the request if email fails
      }
    }
    // Send downgrade email if this is a downgrade from premium to free
    else if (isDowngrade) {
      try {
        console.log('Detected downgrade from premium to free, sending email:', {
          userId: user.id,
          wasPremium,
          newType: subscriptionTypeValue,
          isActive,
          prevCycle,
        });

        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.email) {
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

          // Format premium expiration date (current period end or use existing subscription's end date)
          const premiumExpirationDate = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : existingSub?.current_period_end
            ? new Date(existingSub.current_period_end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'the end of your billing period';

          // Get pricing from platform_plans or use defaults
          let monthlyPrice = '9.99';
          let monthlyOriginalPrice = '14.99';
          let yearlyPrice = '99.99';
          let yearlyOriginalPrice = '149.99';

          try {
            const { data: monthlyPlan } = await adminSupabase
              .from('platform_plans')
              .select('price, original_price')
              .eq('name', 'Premium')
              .eq('billing_cycle', 'monthly')
              .maybeSingle();
            
            if (monthlyPlan?.price) {
              monthlyPrice = (monthlyPlan.price / 100).toFixed(2);
            }
            if (monthlyPlan?.original_price) {
              monthlyOriginalPrice = (monthlyPlan.original_price / 100).toFixed(2);
            }

            const { data: yearlyPlan } = await adminSupabase
              .from('platform_plans')
              .select('price, original_price')
              .eq('name', 'Premium')
              .eq('billing_cycle', 'yearly')
              .maybeSingle();
            
            if (yearlyPlan?.price) {
              yearlyPrice = (yearlyPlan.price / 100).toFixed(2);
            }
            if (yearlyPlan?.original_price) {
              yearlyOriginalPrice = (yearlyPlan.original_price / 100).toFixed(2);
            }
          } catch (priceErr) {
            console.warn('Error fetching plan prices, using defaults:', priceErr);
          }

          const requestBody = {
            event_type: 'downgrade',
            email: profile.email,
            name: profile.full_name,
            metadata: {
              premium_expiration_date: premiumExpirationDate,
              current_period_end: premiumExpirationDate,
              monthly_price: monthlyPrice,
              monthly_original_price: monthlyOriginalPrice,
              yearly_price: yearlyPrice,
              yearly_original_price: yearlyOriginalPrice,
              monthly_checkout_url: `${appUrl}/plans?plan=premium&cycle=monthly`,
              yearly_checkout_url: `${appUrl}/plans?plan=premium&cycle=yearly`,
            },
          };

          console.log('Calling send-lifecycle-email for downgrade:', {
            url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
            email: profile.email,
            name: profile.full_name,
          });

          if (anonKey) {
            const response = await fetch(`${supabaseUrl}/functions/v1/send-lifecycle-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = responseText;
            }

            if (!response.ok) {
              console.error('Failed to send downgrade email:', {
                status: response.status,
                statusText: response.statusText,
                response: responseData,
                requestBody: JSON.stringify(requestBody, null, 2),
              });
            } else {
              console.log('Downgrade email sent successfully:', responseData);
            }
          } else {
            console.error('SUPABASE_ANON_KEY not set, cannot send downgrade email');
          }
        } else {
          console.warn('User profile email not found, cannot send downgrade email');
        }
      } catch (emailErr: any) {
        console.error('Error sending downgrade email:', emailErr?.message || emailErr);
        // Don't fail the request if email fails
      }
    }
    // Send upgrade email if this is an upgrade to premium
    else if (isUpgrade) {
      try {
        // Determine if this is a yearly upgrade (Free → Yearly Premium)
        const isYearlyUpgrade = normalizedBillingCycle === 'yearly' || billingCycle === 'yearly';
        
        console.log('Detected upgrade to premium, sending email:', {
          userId: user.id,
          wasPremium,
          newType: subscriptionTypeValue,
          billingCycle: normalizedBillingCycle,
          isYearlyUpgrade,
        });

        // Get user profile for email and name
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.email) {
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

          // Use different event type for yearly vs monthly upgrade
          const eventType = isYearlyUpgrade ? 'upgrade_premium_yearly' : 'upgrade_premium';

          const requestBody = {
            event_type: eventType,
            email: profile.email,
            name: profile.full_name,
            metadata: {
              dashboard_url: `${appUrl}/dashboard`,
            },
          };

          console.log(`Calling send-lifecycle-email for ${isYearlyUpgrade ? 'yearly' : 'monthly'} upgrade:`, {
            url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
            email: profile.email,
            name: profile.full_name,
            eventType,
          });

          if (anonKey) {
            const response = await fetch(`${supabaseUrl}/functions/v1/send-lifecycle-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
              },
              body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = responseText;
            }

            if (!response.ok) {
              console.error(`Failed to send ${isYearlyUpgrade ? 'yearly' : 'monthly'} premium upgrade email:`, {
                status: response.status,
                statusText: response.statusText,
                response: responseData,
                requestBody: JSON.stringify(requestBody, null, 2),
              });
            } else {
              console.log(`${isYearlyUpgrade ? 'Yearly' : 'Monthly'} premium upgrade email sent successfully:`, responseData);
            }
          } else {
            console.error('SUPABASE_ANON_KEY not set, cannot send upgrade email');
          }
        } else {
          console.warn('User profile email not found, cannot send upgrade email');
        }
      } catch (emailErr: any) {
        console.error(`Error sending ${isYearlyUpgrade ? 'yearly' : 'monthly'} premium upgrade email:`, emailErr?.message || emailErr);
        // Don't fail the request if email fails
      }
    } else {
      console.log('Not an upgrade (wasPremium:', wasPremium, ', newType:', subscriptionTypeValue, ', isActive:', isActive, '), skipping email');
    }

    console.log('Checkout processed successfully:', {
      userId: user.id,
      subscriptionId: subscriptionId,
      subscriptionType: updateData.subscription_type,
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: upsertedData?.id,
          subscription_type: updateData.subscription_type,
          is_active: isActive,
          platform_plan_id: finalPlanId,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
