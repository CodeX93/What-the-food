// @ts-nocheck
// Deno runtime provides these globals - TypeScript errors are false positives

// ============================================
// CLEAN STRIPE WEBHOOK HANDLER
// ============================================
// Handles Stripe webhook events for both Platform and Widget subscriptions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY');
const MAILERSEND_FROM_EMAIL = Deno.env.get('MAILERSEND_FROM_EMAIL') || 'hi@odehahwal.com';
const MAILERSEND_FROM_NAME = Deno.env.get('MAILERSEND_FROM_NAME') || 'WhatTheFood';
const MAILERSEND_TEMPLATE_UPGRADE = 'v69oxl5dxyz4785k';
const MAILERSEND_TEMPLATE_MONTHLY_TO_ANNUAL = 'zr6ke4n67emlon12';
const MAILERSEND_TEMPLATE_DOWNGRADE = Deno.env.get('MAILERSEND_TEMPLATE_DOWNGRADE') || '';

Deno.console.log('MailerSend configured:', {
  hasApiKey: !!MAILERSEND_API_KEY,
  fromEmail: MAILERSEND_FROM_EMAIL,
  fromName: MAILERSEND_FROM_NAME,
});

async function sendMailerSendEmail(toEmail: string, templateId: string, data: Record<string, any> = {}) {
  if (!MAILERSEND_API_KEY) {
    console.warn('MAILERSEND_API_KEY not configured; skipping email send');
    return;
  }

  if (!templateId) {
    console.warn('No templateId provided; skipping email send');
    return;
  }

  try {
    const payload = {
      from: {
        email: MAILERSEND_FROM_EMAIL,
        name: MAILERSEND_FROM_NAME,
      },
      to: [{ email: toEmail }],
      template_id: templateId,
      personalization: [
        {
          email: toEmail,
          data,
        },
      ],
    };

    const res = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('MailerSend send failed:', res.status, errText);
    }
  } catch (err) {
    console.error('MailerSend error:', err?.message || err);
  }
}

// Log immediately when module loads
console.log('=== STRIPE-WEBHOOK FUNCTION LOADED ===', {
  timestamp: new Date().toISOString(),
  denoVersion: Deno.version?.deno || 'unknown',
});

Deno.serve(async (req) => {
  // Log every request immediately - this should ALWAYS appear
  console.log('=== STRIPE WEBHOOK REQUEST RECEIVED ===', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    hasBody: !!req.body,
  });
  
  // Also log to stderr for visibility
  console.error('[STRIPE-WEBHOOK] Request received:', req.method, req.url);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS preflight request');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('Health check request');
    return new Response(JSON.stringify({ 
      status: 'ok', 
      function: 'stripe-webhook',
      timestamp: new Date().toISOString() 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify webhook signature first (before any other checks)
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Stripe
    const Stripe = (await import('https://esm.sh/stripe@14.21.0?target=deno')).default;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Missing Stripe configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });

    // Initialize Supabase admin client (using service role to bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read body and verify webhook signature (async version for Deno)
    const body = await req.text();
    
    try {
      const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

      console.log(`Processing webhook event: ${event.type}`, {
        eventId: event.id,
        timestamp: new Date().toISOString(),
      });

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('Handling checkout.session.completed event');
          try {
            await handleCheckoutCompleted(stripe, supabase, event.data.object);
            console.log('checkout.session.completed handled successfully');
          } catch (checkoutError: any) {
            console.error('Error in handleCheckoutCompleted:', {
              error: checkoutError?.message || checkoutError,
              stack: checkoutError?.stack,
              eventId: event.id,
            });
            // Don't throw - return success so Stripe doesn't retry immediately
            // But log the error for debugging
          }
          break;

        case 'customer.subscription.created':
          console.log('Processing customer.subscription.created:', event.data.object.id);
          try {
            await handleSubscriptionUpdated(stripe, supabase, event.data.object);
            console.log('customer.subscription.created handled successfully');
          } catch (subError: any) {
            console.error('Error in handleSubscriptionUpdated (created):', {
              error: subError?.message || subError,
              stack: subError?.stack,
              eventId: event.id,
            });
          }
          break;

        case 'customer.subscription.updated':
          console.log('Processing customer.subscription.updated:', {
            subscriptionId: event.data.object.id,
            eventId: event.id,
          });
          try {
            await handleSubscriptionUpdated(stripe, supabase, event.data.object);
            console.log('customer.subscription.updated handled successfully');
          } catch (subError: any) {
            console.error('Error in handleSubscriptionUpdated (updated):', {
              error: subError?.message || subError,
              stack: subError?.stack,
              eventId: event.id,
            });
          }
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(stripe, supabase, event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (sigError: any) {
      console.error('Webhook signature verification failed:', sigError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message?.includes('signature') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================
// HANDLE CHECKOUT SESSION COMPLETED
// ============================================
async function handleCheckoutCompleted(stripe: any, supabase: any, session: any) {
  console.log('Processing checkout.session.completed:', {
    sessionId: session.id,
    subscriptionId: session.subscription,
    metadata: session.metadata,
    paymentStatus: session.payment_status,
  });

  // Get subscription details from Stripe
  let subscription = null;
  if (session.subscription) {
    try {
      subscription = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
      console.log('Retrieved subscription:', {
        id: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
      });
    } catch (error: any) {
      console.error('Error retrieving subscription:', error);
      return;
    }
  } else {
    console.error('No subscription found in checkout session');
    return;
  }

  const userId = session.metadata?.userId || session.client_reference_id;
  const subscriptionType = session.metadata?.subscriptionType || 'platform';
  const planId = session.metadata?.planId;
  const planName = session.metadata?.planName;
  const billingCycleFromMetadata = session.metadata?.billingCycle; // From checkout session

  console.log('Checkout metadata:', {
    userId,
    subscriptionType,
    planId,
    planIdType: typeof planId,
    planIdValid: planId && planId !== '' && planId !== 'null',
    planName,
    billingCycleFromMetadata,
    allMetadata: session.metadata,
    allMetadataKeys: Object.keys(session.metadata || {}),
  });

  if (!userId) {
    console.error('No userId found in checkout session metadata or client_reference_id');
    console.error('Session metadata:', session.metadata);
    console.error('Client reference ID:', session.client_reference_id);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
  
  // Get Stripe interval to determine billing cycle
  const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
  const normalizedInterval = stripeInterval === 'month' || stripeInterval === 'monthly' ? 'monthly' :
                             stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual' ? 'yearly' :
                             'monthly';

  console.log('Subscription details:', {
    priceId,
    subscriptionId,
    customerId,
    status: subscription.status,
    stripeInterval,
    normalizedInterval,
  });

  // Process subscription even if status is not 'active' (could be trialing, etc.)
  // We'll mark is_active based on status
  try {
    if (subscriptionType === 'widget') {
      await updateWidgetSubscription(supabase, userId, subscription, priceId, subscriptionId, customerId);
    } else {
      // If planId not in metadata, try to find it by billing cycle
      let finalPlanId = planId;
      if (!finalPlanId || finalPlanId === '' || finalPlanId === 'null') {
        console.log('planId not in metadata, looking up by billing cycle:', normalizedInterval);
        const { data: planByCycle } = await supabase
          .from('platform_plans')
          .select('id, billing_cycle, name')
          .eq('billing_cycle', normalizedInterval)
          .eq('name', 'Premium')
          .maybeSingle();
        
        if (planByCycle) {
          finalPlanId = planByCycle.id;
          console.log('Found plan by billing cycle:', {
            normalizedInterval,
            planId: finalPlanId,
            planBillingCycle: planByCycle.billing_cycle,
          });
        } else {
          console.warn('No plan found by billing cycle:', normalizedInterval);
        }
      }
      
      await updatePlatformSubscription(supabase, userId, subscription, priceId, subscriptionId, customerId, finalPlanId);
    }
    console.log('Checkout completed successfully processed for user:', userId);
  } catch (error: any) {
    console.error('Error processing checkout completion:', {
      userId,
      subscriptionId,
      error: error?.message || error,
      stack: error?.stack,
    });
    // Don't throw - let the webhook return success so Stripe doesn't retry
    // But log the error for debugging
  }
}

// ============================================
// HANDLE SUBSCRIPTION UPDATED
// ============================================
async function handleSubscriptionUpdated(stripe: any, supabase: any, subscription: any) {
  console.log('Processing customer.subscription.updated:', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customer: subscription.customer,
  });

  // Process all subscription statuses, not just active
  // We'll mark is_active based on status in updatePlatformSubscription

  // Find user by customer_id in platform_subscriptions or widget_subscriptions
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const priceId = subscription.items.data[0]?.price?.id;

  // Check platform subscriptions first
  const { data: platformSub } = await supabase
    .from('platform_subscriptions')
    .select('user_id, id, platform_plan_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (platformSub) {
    // Determine billing cycle from Stripe subscription interval (THIS IS THE SOURCE OF TRUTH)
    const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
    const normalizedInterval = stripeInterval === 'month' || stripeInterval === 'monthly' ? 'monthly' :
                               stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual' ? 'yearly' :
                               'monthly';
    
    console.log('Subscription updated - determining plan from Stripe:', {
      userId: platformSub.user_id,
      stripeInterval,
      normalizedInterval,
      priceId,
      existingPlanId: platformSub.platform_plan_id,
      subscriptionId: subscription.id,
    });
    
    // CRITICAL: Always determine plan from Stripe's billing cycle, not from existing plan_id
    // This ensures plan changes (monthly -> yearly) are detected correctly
    let planId = null;
    
    // Try to find plan by price_id first (if stripe_price_id is set in database)
    if (priceId) {
      const { data: plan } = await supabase
        .from('platform_plans')
        .select('id, billing_cycle, name')
        .eq('stripe_price_id', priceId)
        .maybeSingle();
      if (plan) {
        planId = plan.id;
        console.log('Plan found by price_id:', {
          priceId,
          planId,
          planBillingCycle: plan.billing_cycle,
          planName: plan.name,
        });
      } else {
        console.log('No plan found by price_id (stripe_price_id is likely null in DB):', priceId);
      }
    }
    
    // ALWAYS verify/find plan by billing_cycle + name (since stripe_price_id is null)
    // This is the most reliable method and ensures we get the correct plan
    const { data: planByCycle } = await supabase
      .from('platform_plans')
      .select('id, billing_cycle, name')
      .eq('billing_cycle', normalizedInterval)
      .eq('name', 'Premium')
      .maybeSingle();
    
    if (planByCycle) {
      // Use the plan found by billing cycle (source of truth from Stripe)
      planId = planByCycle.id;
      console.log('✓ Plan determined by billing_cycle + name (STRIPE SOURCE OF TRUTH):', {
        normalizedInterval,
        planId,
        planBillingCycle: planByCycle.billing_cycle,
        planName: planByCycle.name,
        previousPlanId: platformSub.platform_plan_id,
        planChanged: planId !== platformSub.platform_plan_id,
      });
    } else {
      console.error('CRITICAL: No plan found by billing_cycle + name:', {
        normalizedInterval,
        name: 'Premium',
        userId: platformSub.user_id,
      });
      // Fallback to existing plan if lookup fails (shouldn't happen)
      planId = platformSub.platform_plan_id;
      console.warn('Falling back to existing plan_id:', planId);
    }
    
    // Always call updatePlatformSubscription with the plan determined from Stripe
    // This ensures the database is updated even if the plan changed
    await updatePlatformSubscription(supabase, platformSub.user_id, subscription, priceId, subscription.id, customerId, planId);
    return;
  }

  // Check widget subscriptions
  const { data: widgetSub } = await supabase
    .from('widget_subscriptions')
    .select('user_id, id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (widgetSub) {
    await updateWidgetSubscription(supabase, widgetSub.user_id, subscription, priceId, subscription.id, customerId);
  }
}

// ============================================
// HANDLE SUBSCRIPTION DELETED
// ============================================
async function handleSubscriptionDeleted(stripe: any, supabase: any, subscription: any) {
  console.log('Processing customer.subscription.deleted:', subscription.id);

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  // Find and deactivate platform subscription
  const { data: platformSub } = await supabase
    .from('platform_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (platformSub) {
    // Get subscription details before updating
    const { data: oldSub } = await supabase
      .from('platform_subscriptions')
      .select('subscription_type, current_period_end')
      .eq('user_id', platformSub.user_id)
      .maybeSingle();

    const wasPremium = oldSub?.subscription_type === 'premium';

    await supabase
      .from('platform_subscriptions')
      .update({
        is_active: false,
        subscription_type: 'free',
        platform_plan_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
      })
      .eq('user_id', platformSub.user_id);

    // Send downgrade email if it was premium
    if (wasPremium) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', platformSub.user_id)
          .maybeSingle();

        if (profile?.email) {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          
          const expirationDate = oldSub?.current_period_end
            ? new Date(oldSub.current_period_end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'the end of your billing period';

          const { data: monthlyPlan } = await supabase
            .from('platform_plans')
            .select('price_cents')
            .eq('billing_cycle', 'monthly')
            .eq('name', 'Premium')
            .maybeSingle();
          
          const { data: yearlyPlan } = await supabase
            .from('platform_plans')
            .select('price_cents')
            .eq('billing_cycle', 'yearly')
            .eq('name', 'Premium')
            .maybeSingle();

          const monthlyPrice = monthlyPlan ? (monthlyPlan.price_cents / 100).toFixed(2) : '9.99';
          const monthlyOriginalPrice = '14.99';
          const yearlyPrice = yearlyPlan ? (yearlyPlan.price_cents / 100).toFixed(2) : '99.99';
          const yearlyOriginalPrice = '149.99';

          const response = await fetch(`${supabaseUrl}/functions/v1/send-lifecycle-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              event_type: 'downgrade',
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
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to send downgrade email:', errorText);
          } else {
            console.log('Downgrade email sent successfully');
          }
        }
      } catch (emailErr: any) {
        console.error('Error sending downgrade email:', emailErr?.message || emailErr);
      }
    }
  }

  // Find and deactivate widget subscription
  const { data: widgetSub } = await supabase
    .from('widget_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (widgetSub) {
    await supabase
      .from('widget_subscriptions')
      .update({
        is_active: false,
        subscription_type: 'free',
        stripe_subscription_id: null,
        stripe_price_id: null,
      })
      .eq('user_id', widgetSub.user_id);
  }
}

// ============================================
// UPDATE PLATFORM SUBSCRIPTION
// ============================================
async function updatePlatformSubscription(
  supabase: any,
  userId: string,
  subscription: any,
  priceId: string,
  subscriptionId: string,
  customerId: string,
  planId: string | null
) {
  console.log('Updating platform subscription:', { 
    userId, 
    priceId, 
    subscriptionId, 
    planId,
    subscriptionItems: subscription.items?.data?.map((item: any) => ({
      priceId: item.price?.id,
      interval: item.price?.recurring?.interval,
    })),
  });

  // Fetch existing subscription to detect upgrades/downgrades
  const { data: existingSub } = await supabase
    .from('platform_subscriptions')
    .select('subscription_type,billing_cycle,platform_plan_id,stripe_price_id,current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  // Fetch current user profile for email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();

  const toEmail = profile?.email || null;
  const fullName = profile?.full_name || null;

  // Fetch previous plan data if available (for downgrade detection)
  let previousPlan: any = null;
  if (existingSub?.platform_plan_id) {
    const { data: oldPlan } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('id', existingSub.platform_plan_id)
      .maybeSingle();
    previousPlan = oldPlan;
  } else if (existingSub?.stripe_price_id) {
    const { data: oldPlan } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('stripe_price_id', existingSub.stripe_price_id)
      .maybeSingle();
    previousPlan = oldPlan;
  }

  // Step 1: Fetch plan details from platform_plans table
  let planData: any = null;
  let finalPlanId = planId;

  // If planId provided, fetch plan by ID
  if (planId) {
    const { data: plan, error: planError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();
    
    if (planError) {
      console.error('Error fetching plan by ID:', planError);
    } else if (plan) {
      planData = plan;
      finalPlanId = plan.id;
    }
  }

  // If plan not found by ID, try to find by stripe_price_id
  if (!planData && priceId) {
    const { data: plan, error: planError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('stripe_price_id', priceId)
      .maybeSingle();
    
    if (planError) {
      console.error('Error fetching plan by price_id:', planError);
    } else if (plan) {
      planData = plan;
      finalPlanId = plan.id;
      console.log('Plan found by price_id:', {
        priceId,
        planId: finalPlanId,
        planBillingCycle: plan.billing_cycle,
      });
    }
  }

  // If still no plan found and stripe_price_id is null, find by billing_cycle + name
  if (!planData) {
    const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
    const normalizedInterval = stripeInterval === 'month' || stripeInterval === 'monthly' ? 'monthly' :
                               stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual' ? 'yearly' :
                               'monthly';
    
    console.log('No plan found by ID or price_id, looking up by billing_cycle:', {
      stripeInterval,
      normalizedInterval,
      priceId,
      planId,
    });
    
    const { data: planByCycle, error: planByCycleError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('billing_cycle', normalizedInterval)
      .eq('name', 'Premium')
      .maybeSingle();
    
    if (planByCycleError) {
      console.error('Error fetching plan by billing_cycle:', planByCycleError);
    } else if (planByCycle) {
      planData = planByCycle;
      finalPlanId = planByCycle.id;
      console.log('✓ Plan found by billing_cycle + name:', {
        normalizedInterval,
        planId: finalPlanId,
        planBillingCycle: planByCycle.billing_cycle,
        planName: planByCycle.name,
      });
    } else {
      console.warn('No plan found by billing_cycle + name:', {
        normalizedInterval,
        name: 'Premium',
      });
    }
  }

  if (planData) {
    console.log('Found plan in platform_plans:', {
      id: planData.id,
      name: planData.name,
      billing_cycle: planData.billing_cycle,
      price_cents: planData.price_cents,
      stripe_price_id: planData.stripe_price_id,
    });
  } else {
    console.warn('Plan not found in platform_plans table, using defaults');
  }

  // Step 2: Prepare subscription data with plan information
  // Normalize billing cycle: Stripe returns 'month'/'year', we store 'monthly'/'yearly'
  const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval || 'month';
  
  // Priority 1: Use planData (already fetched by planId or priceId) - most reliable
  let billingCycle: string = 'monthly'; // default
  
  if (planData?.billing_cycle) {
    const planCycle = planData.billing_cycle.toLowerCase().trim();
    if (planCycle === 'monthly' || planCycle === 'month') {
      billingCycle = 'monthly';
    } else if (planCycle === 'yearly' || planCycle === 'year' || planCycle === 'annual') {
      billingCycle = 'yearly';
    }
    console.log('Billing cycle from planData (PRIORITY 1):', {
      planId: finalPlanId,
      planBillingCycle: planData.billing_cycle,
      planName: planData.name,
      normalized: billingCycle,
      priceId,
    });
  } else {
    console.warn('No planData available, planId:', planId, 'priceId:', priceId);
    
    // Fallback: Try to find plan by billing_cycle + name
    if (!planData) {
      const normalizedInterval = stripeInterval === 'month' || stripeInterval === 'monthly' ? 'monthly' :
                                 stripeInterval === 'year' || stripeInterval === 'yearly' || stripeInterval === 'annual' ? 'yearly' :
                                 'monthly';
      
      const { data: planByCycle } = await supabase
        .from('platform_plans')
        .select('id, billing_cycle, name')
        .eq('billing_cycle', normalizedInterval)
        .eq('name', 'Premium')
        .maybeSingle();
      
      if (planByCycle) {
        planData = planByCycle;
        finalPlanId = planByCycle.id;
        billingCycle = normalizedInterval;
        console.log('Plan found by billing_cycle + name (fallback):', {
          normalizedInterval,
          planId: finalPlanId,
          planBillingCycle: planByCycle.billing_cycle,
        });
      }
    }
  }
  
  // Priority 3: Fallback to Stripe interval if plan data not available
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
  
  // Validate plan data matches (for logging only)
  if (planData?.billing_cycle) {
    const normalizedPlanCycle = planData.billing_cycle === 'month' ? 'monthly' :
                                planData.billing_cycle === 'year' ? 'yearly' :
                                planData.billing_cycle === 'annual' ? 'yearly' :
                                planData.billing_cycle;
    
    if (normalizedPlanCycle !== billingCycle) {
      console.warn('Billing cycle mismatch between plan and Stripe:', {
        planBillingCycle: planData.billing_cycle,
        normalizedPlanCycle,
        stripeInterval,
        normalizedBillingCycle: billingCycle,
        usingStripeValue: true,
      });
    }
  }
  
  // Get detailed price information for debugging
  const priceInfo = subscription.items.data[0]?.price;
  const recurringInfo = priceInfo?.recurring;
  
  console.log('Billing cycle normalization:', {
    stripeInterval,
    planBillingCycle: planData?.billing_cycle,
    finalBillingCycle: billingCycle,
    priceId,
    willStore: billingCycle, // This is what will be stored
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

  // Determine if subscription is active (active, trialing, or past_due are considered active)
  // Note: 'canceled' subscriptions are not active, so they become 'free'
  const isActive = ['active', 'trialing', 'past_due'].includes(subscription.status);
  const subscriptionType = isActive ? 'premium' : 'free';

  console.log('Subscription status:', {
    status: subscription.status,
    isActive,
    subscriptionType,
    userId,
    subscriptionId,
  });

  // Ensure billing_cycle is always normalized (monthly/yearly, not month/year)
  const normalizedBillingCycle = billingCycle === 'month' ? 'monthly' : 
                                 billingCycle === 'year' ? 'yearly' : 
                                 billingCycle === 'annual' ? 'yearly' :
                                 billingCycle; // Already normalized or default
  
  const updateData: any = {
    subscription_type: subscriptionType,
    platform_plan_id: finalPlanId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    stripe_customer_id: customerId,
    billing_cycle: normalizedBillingCycle, // Use normalized value
    is_active: isActive,
    current_period_end: subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };
  
  console.log('Final update data with normalized billing cycle:', {
    originalBillingCycle: billingCycle,
    normalizedBillingCycle: normalizedBillingCycle,
    stripeInterval,
  });

  console.log('Prepared update data:', {
    ...updateData,
    willSetPlatformPlanId: finalPlanId,
    willSetBillingCycle: normalizedBillingCycle,
    existingPlatformPlanId: existingSub?.platform_plan_id,
    existingBillingCycle: existingSub?.billing_cycle,
  });

  // Step 3: Create/Update platform_subscriptions
  // Use upsert to handle both insert and update cases
  console.log('Attempting to upsert platform subscription:', {
    userId,
    updateData: {
      ...updateData,
      platform_plan_id: finalPlanId, // Explicitly set
      billing_cycle: normalizedBillingCycle, // Explicitly set
    },
  });

  const { data: upsertedData, error } = await supabase
    .from('platform_subscriptions')
    .upsert({
      user_id: userId,
      ...updateData,
      // Explicitly set these to ensure they're updated
      platform_plan_id: finalPlanId,
      billing_cycle: normalizedBillingCycle,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating platform subscription:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
      updateData,
    });
    throw error;
  }

  if (!upsertedData) {
    console.error('Upsert returned no data:', { userId, updateData });
    throw new Error('Upsert returned no data');
  }

  console.log('Platform subscription updated successfully:', {
    userId,
    subscriptionId: upsertedData?.id,
    planId: finalPlanId,
    subscriptionType: updateData.subscription_type,
    isActive: isActive,
    billingCycleInUpdateData: updateData.billing_cycle,
    normalizedBillingCycle: normalizedBillingCycle,
    billingCycleInDB: upsertedData?.billing_cycle,
    stripeSubscriptionId: subscriptionId,
    previousBillingCycle: existingSub?.billing_cycle,
    newBillingCycle: billingCycle,
    previousSubscriptionType: existingSub?.subscription_type,
    newSubscriptionType: subscriptionType,
    stripeInterval,
    priceId,
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
      planIdFromMetadata: planId,
    });
    
    // Try to force update
    console.log('Attempting to force update billing cycle and plan ID...');
    const forceUpdateData: any = {
      billing_cycle: normalizedBillingCycle,
      updated_at: new Date().toISOString(),
    };
    
    if (finalPlanId) {
      forceUpdateData.platform_plan_id = finalPlanId;
    }
    
    const { data: forceUpdateResult, error: forceUpdateError } = await supabase
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

  // Verify the update was successful
  if (upsertedData) {
    if (upsertedData.billing_cycle !== billingCycle) {
      console.warn('WARNING: Billing cycle mismatch after update:', {
        expected: billingCycle,
        actual: upsertedData.billing_cycle,
        subscriptionId: upsertedData.id,
      });
    }
    if (upsertedData.subscription_type !== subscriptionType) {
      console.warn('WARNING: Subscription type mismatch after update:', {
        expected: subscriptionType,
        actual: upsertedData.subscription_type,
        subscriptionId: upsertedData.id,
      });
    }
  }

  // Step 4: Use the subscription ID from upsert result
  const subscriptionRecordId = upsertedData?.id;

  // Step 5: Profile is automatically updated via database trigger
  // But we can also do a direct update as fallback to ensure it's synced
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      platform_subscription_id: subscriptionRecordId || null,
      platform_subscription_type: updateData.subscription_type,
      platform_subscription_plan_id: finalPlanId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileError) {
    console.warn('Profile update failed (trigger should handle it):', profileError);
  } else {
    console.log('Profile updated directly as fallback:', {
      subscription_id: subscriptionRecordId,
      subscription_type: updateData.subscription_type,
      plan_id: finalPlanId,
      is_active: isActive,
    });
  }

  // Step 6: Send email notifications based on change
  try {
    let eventType: 'upgrade' | 'monthly_to_annual' | 'downgrade' | null = null;

    if (subscriptionType === 'premium') {
      if (!existingSub || existingSub.subscription_type !== 'premium') {
        eventType = 'upgrade';
      } else {
        const prevCycle = (existingSub.billing_cycle || '').toLowerCase().trim();
        const newCycle = (billingCycle || '').toLowerCase().trim();
        const prevPrice = previousPlan?.price_cents || null;
        const newPrice = planData?.price_cents || null;

        // Check for monthly (month, monthly, etc.)
        const isMonthly = prevCycle.startsWith('month') || 
                          prevCycle === 'monthly' || 
                          prevCycle.includes('month');
        // Check for yearly (year, yearly, annual, etc.)
        const isAnnual = newCycle.startsWith('year') || 
                        newCycle === 'annual' || 
                        newCycle === 'yearly' ||
                        newCycle.includes('year') ||
                        newCycle.includes('annual');

        console.log('Billing cycle comparison:', {
          prevCycle,
          newCycle,
          isMonthly,
          isAnnual,
          prevPrice,
          newPrice,
          userId,
        });

        if (isMonthly && isAnnual) {
          eventType = 'monthly_to_annual';
          console.log('Monthly to annual switch detected:', {
            userId,
            prevCycle,
            newCycle,
            existingSubType: existingSub.subscription_type,
          });
        } else if (prevPrice && newPrice && newPrice < prevPrice) {
          eventType = 'downgrade';
        }
      }
    } else if (existingSub?.subscription_type === 'premium' && subscriptionType !== 'premium') {
      // Cancel / move to free counts as downgrade
      eventType = 'downgrade';
      console.log('Downgrade detected:', {
        existingSubType: existingSub.subscription_type,
        newSubType: subscriptionType,
        subscriptionStatus: subscription.status,
        userId,
      });
    }

    console.log('Email notification check:', {
      eventType,
      hasEmail: !!toEmail,
      email: toEmail,
      userId,
      existingSubType: existingSub?.subscription_type,
      newSubType: subscriptionType,
      prevCycle: existingSub?.billing_cycle,
      newCycle: billingCycle,
    });

    // Send email notifications
    if (eventType && toEmail) {
      if (eventType === 'upgrade') {
        // Send HTML premium upgrade email via send-lifecycle-email function
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          
          console.log('Preparing to send premium upgrade email:', {
            userId,
            email: toEmail,
            subscriptionStatus: subscription.status,
            existingSubType: existingSub?.subscription_type,
            newSubType: subscriptionType,
          });

          const requestBody = {
            event_type: 'upgrade_premium',
            email: toEmail,
            name: fullName,
            metadata: {
              dashboard_url: `${appUrl}/dashboard`,
            },
          };

          console.log('Calling send-lifecycle-email function for upgrade:', {
            url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
            event_type: 'upgrade_premium',
            email: toEmail,
            name: fullName,
          });

          const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
          if (!anonKey) {
            console.error('SUPABASE_ANON_KEY not set, cannot call send-lifecycle-email');
          }

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
            console.error('Failed to send premium upgrade email:', {
              status: response.status,
              statusText: response.statusText,
              response: responseData,
              requestBody: JSON.stringify(requestBody, null, 2),
            });
          } else {
            console.log('Premium upgrade email sent successfully:', responseData);
          }
        } catch (emailErr: any) {
          console.error('Error sending premium upgrade email:', emailErr?.message || emailErr);
        }
      } else if (eventType === 'downgrade') {
        // Send HTML downgrade email via send-lifecycle-email function
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
          
          console.log('Preparing to send downgrade email:', {
            userId,
            email: toEmail,
            subscriptionStatus: subscription.status,
            existingSubType: existingSub?.subscription_type,
            newSubType: subscriptionType,
          });
          
          // Format expiration date - use subscription.current_period_end if available, otherwise use existingSub.current_period_end
          let expirationTimestamp = subscription.current_period_end;
          if (!expirationTimestamp && existingSub?.current_period_end) {
            // Use the database value if subscription object doesn't have it
            expirationTimestamp = new Date(existingSub.current_period_end).getTime() / 1000;
          }
          
          const expirationDate = expirationTimestamp
            ? new Date(expirationTimestamp * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'the end of your billing period';
          
          console.log('Expiration date calculated:', expirationDate);

          // Get pricing from platform_plans or use defaults
          const { data: monthlyPlan } = await supabase
            .from('platform_plans')
            .select('price_cents, stripe_price_id')
            .eq('billing_cycle', 'monthly')
            .eq('name', 'Premium')
            .maybeSingle();
          
          const { data: yearlyPlan } = await supabase
            .from('platform_plans')
            .select('price_cents, stripe_price_id')
            .eq('billing_cycle', 'yearly')
            .eq('name', 'Premium')
            .maybeSingle();

          const monthlyPrice = monthlyPlan ? (monthlyPlan.price_cents / 100).toFixed(2) : '9.99';
          const monthlyOriginalPrice = '14.99';
          const yearlyPrice = yearlyPlan ? (yearlyPlan.price_cents / 100).toFixed(2) : '99.99';
          const yearlyOriginalPrice = '149.99';

          const requestBody = {
            event_type: 'downgrade',
            email: toEmail,
            name: fullName,
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

          console.log('Calling send-lifecycle-email function:', {
            url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
            event_type: 'downgrade',
            email: toEmail,
            name: fullName,
            hasMetadata: !!requestBody.metadata,
          });

          const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
          if (!anonKey) {
            console.error('SUPABASE_ANON_KEY not set, cannot call send-lifecycle-email');
          }

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
        } catch (emailErr: any) {
          console.error('Error sending downgrade email:', emailErr?.message || emailErr);
        }
      } else {
        // Use template-based emails for other events
        // Handle monthly_to_annual upgrade - send HTML email
        if (eventType === 'monthly_to_annual') {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
            
            console.log('Preparing to send monthly to yearly email:', {
              userId,
              email: toEmail,
              subscriptionStatus: subscription.status,
            });

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
              email: toEmail,
              name: fullName,
              metadata: {
                next_renewal_date: nextRenewalDate,
                current_period_end: nextRenewalDate,
                manage_subscription_url: `${appUrl}/profile`,
              },
            };

            console.log('Calling send-lifecycle-email function for monthly to yearly:', {
              url: `${supabaseUrl}/functions/v1/send-lifecycle-email`,
              event_type: 'monthly_to_annual',
              email: toEmail,
              name: fullName,
            });

            const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
            if (!anonKey) {
              console.error('SUPABASE_ANON_KEY not set, cannot call send-lifecycle-email');
            }

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
          } catch (emailErr: any) {
            console.error('Error sending monthly to yearly email:', emailErr?.message || emailErr);
          }
        } else {
          console.warn(`Unhandled event type for template email: ${eventType}`);
        }
      }
    }
  } catch (emailErr: any) {
    console.error('Failed to send subscription lifecycle email:', emailErr?.message || emailErr);
  }
}

// ============================================
// UPDATE WIDGET SUBSCRIPTION
// ============================================
async function updateWidgetSubscription(
  supabase: any,
  userId: string,
  subscription: any,
  priceId: string,
  subscriptionId: string,
  customerId: string
) {
  console.log('Updating widget subscription:', { userId, priceId, subscriptionId });

  // Determine widget plan type from price ID
  let widgetPlanType = 'plan1';
  let siteLimit = 1;

  if (priceId) {
    if (priceId.includes('plan2') || priceId.includes('widget-plan2')) {
      widgetPlanType = 'plan2';
      siteLimit = 3;
    } else if (priceId.includes('plan3') || priceId.includes('widget-plan3')) {
      widgetPlanType = 'plan3';
      siteLimit = 999999;
    }
  }

  const updateData: any = {
    subscription_type: widgetPlanType,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    stripe_customer_id: customerId,
    billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
    is_active: subscription.status === 'active',
    site_limit: siteLimit,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  };

  // Upsert subscription
  const { data: subscriptionData, error } = await supabase
    .from('widget_subscriptions')
    .upsert({
      user_id: userId,
      ...updateData,
    }, {
      onConflict: 'user_id',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error updating widget subscription:', error);
    throw error;
  }

  console.log('Widget subscription updated successfully');

  // Manually update profile as fallback (trigger should handle this, but we do it manually too)
  if (subscriptionData?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        widget_subscription_id: subscriptionData.id,
        widget_subscription_type: widgetPlanType,
        widget_site_limit: siteLimit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Profile sync failed (trigger should handle it):', profileError);
    } else {
      console.log('Profile synced with widget subscription');
    }
  }
}
