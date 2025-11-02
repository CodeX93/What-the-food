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

        if (userId && session.subscription) {
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const priceId = subscription.items.data[0]?.price?.id;
          
          // Update subscription in database
          const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .update({
              subscription_type: 'premium',
              stripe_subscription_id: session.subscription,
              stripe_price_id: priceId,
              billing_cycle: session.metadata?.billingCycle || subscription.items.data[0]?.price?.recurring?.interval || 'monthly',
              is_active: subscription.status === 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('user_id', userId);

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
          const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .update({
              is_active: subscription.status === 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              subscription_type: subscription.status === 'active' ? 'premium' : 'free',
            })
            .eq('stripe_subscription_id', subscription.id);

          if (updateError) {
            console.error('Error updating subscription:', updateError);
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
