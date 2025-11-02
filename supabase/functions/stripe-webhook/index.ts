// @ts-nocheck - Deno global is available in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle OPTIONS preflight requests first
  if (req.method === 'OPTIONS') {
    try {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders,
      });
    } catch (e) {
      return new Response(null, { status: 204 });
    }
  }

  // Dynamic imports - loaded only for non-OPTIONS requests
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const Stripe = (await import('https://esm.sh/stripe@14.21.0?target=deno')).default;

  const signature = req.headers.get('stripe-signature');
  // @ts-ignore - Deno is available in Edge Functions runtime
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

  if (!signature || !webhookSecret) {
    const errorResponse = new Response(
      JSON.stringify({ error: 'Missing signature or webhook secret' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
    return errorResponse;
  }

  try {
    const body = await req.text();
    
    // @ts-ignore - Deno is available in Edge Functions runtime
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // @ts-ignore - Deno is available in Edge Functions runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // @ts-ignore - Deno is available in Edge Functions runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const subscriptionType = session.metadata?.subscriptionType || 'main'; // 'widget' or 'main'

        if (userId && session.subscription) {
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const priceId = subscription.items.data[0]?.price?.id;
          
          // Determine subscription table and type
          const isWidgetSubscription = subscriptionType === 'widget';
          const subscriptionTable = isWidgetSubscription ? 'widget_subscriptions' : 'subscriptions';
          
          // Map price ID to subscription type (for widgets: plan1, plan2, plan3)
          let subscriptionTypeValue = 'premium';
          let siteLimit = 1;
          
          if (isWidgetSubscription) {
            // Determine widget plan from price ID
            // This should match your Stripe price IDs
            // You can improve this by storing plan mapping in environment or database
            if (priceId.includes('plan1') || priceId.includes('widget-plan1')) {
              subscriptionTypeValue = 'plan1';
              siteLimit = 1;
            } else if (priceId.includes('plan2') || priceId.includes('widget-plan2')) {
              subscriptionTypeValue = 'plan2';
              siteLimit = 3;
            } else if (priceId.includes('plan3') || priceId.includes('widget-plan3')) {
              subscriptionTypeValue = 'plan3';
              siteLimit = 999999; // Unlimited
            } else {
              subscriptionTypeValue = 'plan1'; // Default
              siteLimit = 1;
            }
          }
          
          // Update subscription in appropriate table
          const updateData: any = {
            stripe_subscription_id: session.subscription,
            stripe_price_id: priceId,
            billing_cycle: session.metadata?.billingCycle || subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
            is_active: subscription.status === 'active',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          };
          
          if (isWidgetSubscription) {
            updateData.subscription_type = subscriptionTypeValue;
            updateData.site_limit = siteLimit;
          } else {
            updateData.subscription_type = subscriptionTypeValue;
          }
          
          const { error: updateError } = await supabaseClient
            .from(subscriptionTable)
            .upsert({
              user_id: userId,
              ...updateData,
            }, {
              onConflict: 'user_id',
            });

          if (updateError) {
            console.error('Error updating subscription:', updateError);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        if (subscription.id) {
          // Check which table has this subscription ID
          const { data: mainSub } = await supabaseClient
            .from('subscriptions')
            .select('user_id, subscription_type')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle();

          const { data: widgetSub } = await supabaseClient
            .from('widget_subscriptions')
            .select('user_id, subscription_type')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle();

          // Update the appropriate table(s)
          if (mainSub) {
            const { error: updateError } = await supabaseClient
              .from('subscriptions')
              .update({
                is_active: subscription.status === 'active',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                subscription_type: subscription.status === 'active' ? 'premium' : 'free',
              })
              .eq('stripe_subscription_id', subscription.id);

            if (updateError) {
              console.error('Error updating main subscription:', updateError);
            }
          }

          if (widgetSub) {
            const subscriptionType = subscription.status === 'active' 
              ? widgetSub.subscription_type || 'plan1'
              : 'free';
            
            const { error: updateError } = await supabaseClient
              .from('widget_subscriptions')
              .update({
                is_active: subscription.status === 'active',
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                subscription_type: subscription.status === 'active' ? subscriptionType : 'free',
              })
              .eq('stripe_subscription_id', subscription.id);

            if (updateError) {
              console.error('Error updating widget subscription:', updateError);
            }
          }
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Webhook processing failed',
        details: error.toString(),
      }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
