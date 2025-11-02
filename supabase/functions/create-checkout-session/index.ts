// @ts-nocheck - Deno global is available in Supabase Edge Functions runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers - defined at top level for OPTIONS handler
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests FIRST - before any imports or heavy operations
  // This ensures OPTIONS requests always succeed without any dependencies
  if (req.method === 'OPTIONS') {
    try {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders,
      });
    } catch (e) {
      // Fallback response if anything fails
      return new Response(null, { status: 204 });
    }
  }

  // Dynamic imports - loaded only for non-OPTIONS requests to avoid startup failures
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const Stripe = (await import('https://esm.sh/stripe@14.21.0?target=deno')).default;

  // Helper function to add CORS headers to responses
  const addCorsHeaders = (response: Response): Response => {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  };

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      const errorResponse = new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }

    // In Edge Functions, these are automatically available, but check anyway
    // @ts-ignore - Deno is available in Edge Functions runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore - Deno is available in Edge Functions runtime
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        // @ts-ignore - Deno is available in Edge Functions runtime
        hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
        // @ts-ignore - Deno is available in Edge Functions runtime
        hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      });
      
      const errorResponse = new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Supabase URL or key missing',
          hint: 'Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in Edge Function environment',
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      const errorResponse = new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }

    // Initialize Stripe
    // @ts-ignore - Deno is available in Edge Functions runtime
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured');
      const errorResponse = new Response(
        JSON.stringify({ 
          error: 'Stripe secret key not configured',
          hint: 'Set STRIPE_SECRET_KEY secret in Edge Function settings',
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body
    const { priceId, billingCycle, userId, email, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      const errorResponse = new Response(
        JSON.stringify({ error: 'Price ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors if no record exists

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: email || user.email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Store customer ID in database
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
        }, {
          onConflict: 'user_id',
        });

      if (updateError) {
        console.error('Error storing customer ID:', updateError);
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${supabaseUrl.replace('/functions/v1', '')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${supabaseUrl.replace('/functions/v1', '')}/plans`,
      metadata: {
        userId: userId,
        billingCycle: billingCycle || 'monthly',
      },
    });

    const successResponse = new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    return addCorsHeaders(successResponse);
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    const errorResponse = new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create checkout session',
        details: error.toString(),
        type: error.constructor?.name || error.name || 'Unknown',
        hint: 'Check Edge Function logs for more details',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return addCorsHeaders(errorResponse);
  }
});
