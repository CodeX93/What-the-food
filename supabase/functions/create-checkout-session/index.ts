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

    // Parse request body (store it for error logging)
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError);
      const errorResponse = new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          details: parseError.message,
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }
    
    const { priceId, billingCycle, userId, email, successUrl, cancelUrl, subscriptionType } = requestBody;

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

    // Determine subscription table based on subscriptionType
    const isWidgetSubscription = subscriptionType === 'widget';
    const subscriptionTable = isWidgetSubscription ? 'widget_subscriptions' : 'subscriptions';

    // Ensure user profile exists (required for foreign key constraints)
    // Use authenticated client (respects RLS policies)
    const { data: existingProfile, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError);
    }

    // Create profile if it doesn't exist (requires RLS policy to allow insert)
    if (!existingProfile) {
      console.log('Profile does not exist, creating profile for user:', userId);
      const { error: createProfileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: userId,
          email: email || user.email || '',
        });

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        const errorResponse = new Response(
          JSON.stringify({ 
            error: 'Failed to create user profile',
            details: createProfileError.message,
            hint: 'The profile is required before creating a subscription. Please ensure the profiles table RLS policy allows user inserts.',
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        return addCorsHeaders(errorResponse);
      }
      console.log('Profile created successfully for user:', userId);
    }

    // Create or retrieve Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID in the appropriate table
    const { data: subscription } = await supabaseClient
      .from(subscriptionTable)
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors if no record exists

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Also check the other subscription table (in case customer exists there)
      const { data: altSubscription } = await supabaseClient
        .from(isWidgetSubscription ? 'subscriptions' : 'widget_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (altSubscription?.stripe_customer_id) {
        customerId = altSubscription.stripe_customer_id;
        // Store customer ID in the current subscription table too
        try {
          const upsertData: any = {
            user_id: userId,
            stripe_customer_id: customerId,
          };
          
          // Add required fields for widget_subscriptions
          if (isWidgetSubscription) {
            upsertData.subscription_type = 'free'; // Default until subscription is completed
            upsertData.site_limit = 1; // Default
            upsertData.is_active = false; // Will be activated when checkout completes
          }
          
          const { error: updateError } = await supabaseClient
            .from(subscriptionTable)
            .upsert(upsertData, {
              onConflict: 'user_id',
            });

          if (updateError) {
            console.error('Error storing customer ID:', updateError);
            
            // Check if the table doesn't exist
            if (updateError.message && updateError.message.includes('Could not find the table')) {
              console.error(`Table ${subscriptionTable} does not exist. Please run migrations.`);
              // Continue anyway - webhook will handle subscription creation
              console.warn(`Warning: Table ${subscriptionTable} not found. Continuing with checkout - webhook will handle subscription.`);
            } else if (isWidgetSubscription) {
              // If storing customer ID fails for widget subscriptions, it might be due to missing required fields
              // But we can still continue with Stripe checkout - the webhook will handle the subscription creation
              console.warn('Warning: Failed to store customer ID in widget_subscriptions, but continuing with checkout');
            } else {
              // For main subscriptions, log but continue - webhook will handle it
              console.warn('Warning: Failed to store customer ID, but continuing with checkout');
            }
          }
        } catch (upsertError: any) {
          console.error('Exception during upsert:', upsertError);
          // Continue anyway - webhook will handle subscription creation
          if (isWidgetSubscription) {
            console.warn('Warning: Exception during widget_subscriptions upsert, but continuing with checkout');
          } else {
            console.warn('Warning: Exception during subscription upsert, but continuing with checkout');
          }
        }
      } else {
        // Create new Stripe customer
        let customer;
        try {
          customer = await stripe.customers.create({
            email: email || user.email,
            metadata: {
              userId: userId,
            },
          });
          customerId = customer.id;
        } catch (stripeError: any) {
          console.error('Error creating Stripe customer:', stripeError);
          const errorResponse = new Response(
            JSON.stringify({ 
              error: 'Failed to create Stripe customer',
              details: stripeError.message,
              hint: 'Check Stripe API key and configuration'
            }),
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
          return addCorsHeaders(errorResponse);
        }

        // Store customer ID in the appropriate subscription table
        try {
          const upsertData: any = {
            user_id: userId,
            stripe_customer_id: customerId,
          };
          
          // Add required fields for widget_subscriptions
          if (isWidgetSubscription) {
            upsertData.subscription_type = 'free'; // Default until subscription is completed
            upsertData.site_limit = 1; // Default
            upsertData.is_active = false; // Will be activated when checkout completes
          }
          
          const { error: updateError } = await supabaseClient
            .from(subscriptionTable)
            .upsert(upsertData, {
              onConflict: 'user_id',
            });

          if (updateError) {
            console.error('Error storing customer ID:', updateError);
            
            // Check if the table doesn't exist
            if (updateError.message && updateError.message.includes('Could not find the table')) {
              console.error(`Table ${subscriptionTable} does not exist. Please run migrations.`);
              // Continue anyway - webhook will handle subscription creation
              console.warn(`Warning: Table ${subscriptionTable} not found. Continuing with checkout - webhook will handle subscription.`);
            } else if (isWidgetSubscription) {
              // If storing customer ID fails for widget subscriptions, it might be due to missing required fields
              // But we can still continue with Stripe checkout - the webhook will handle the subscription creation
              console.warn('Warning: Failed to store customer ID in widget_subscriptions, but continuing with checkout');
            } else {
              // For main subscriptions, log but continue - webhook will handle it
              console.warn('Warning: Failed to store customer ID, but continuing with checkout');
            }
          }
        } catch (upsertError: any) {
          console.error('Exception during upsert:', upsertError);
          // Continue anyway - webhook will handle subscription creation
          if (isWidgetSubscription) {
            console.warn('Warning: Exception during widget_subscriptions upsert, but continuing with checkout');
          } else {
            console.warn('Warning: Exception during subscription upsert, but continuing with checkout');
          }
        }
      }
    }

    // Construct baseUrl for redirects - use production URL, NEVER Supabase URL
    // @ts-ignore - Deno is available in Edge Functions runtime
    let baseUrl: string | undefined;
    
    // Try to get production URL from environment variable first
    // @ts-ignore - Deno is available in Edge Functions runtime
    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('PRODUCTION_URL') || Deno.env.get('VITE_APP_URL');
    
    if (appUrl) {
      let cleanUrl = appUrl.trim();
      // Remove quotes if present
      if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
          (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
        cleanUrl = cleanUrl.slice(1, -1);
      }
      // Remove trailing slash
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      // Validate it's a proper URL and not a Supabase URL
      try {
        new URL(cleanUrl);
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          // Check it's not a Supabase URL
          if (!cleanUrl.includes('supabase.co')) {
            baseUrl = cleanUrl;
            console.log('Using APP_URL from environment:', baseUrl);
          } else {
            console.warn('APP_URL is a Supabase URL, ignoring:', cleanUrl);
          }
        }
      } catch (e) {
        console.warn('Invalid APP_URL, ignoring:', cleanUrl, e);
      }
    }
    
    // Fallback: try to extract from request headers (but not Supabase URLs)
    if (!baseUrl) {
      const origin = req.headers.get('origin') || req.headers.get('referer') || '';
      if (origin) {
        try {
          const url = new URL(origin);
          // Only use origin if it's not a Supabase URL
          if (!origin.includes('supabase.co')) {
            baseUrl = `${url.protocol}//${url.host}`;
            console.log('Using baseUrl from request origin:', baseUrl);
          } else {
            console.warn('Request origin is Supabase URL, ignoring:', origin);
          }
        } catch (e) {
          console.warn('Could not parse origin/referer:', e);
        }
      }
    }
    
    // Final fallback - ALWAYS use production URL (never Supabase URL)
    if (!baseUrl || (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://'))) {
      baseUrl = 'https://what-the-food-theta.vercel.app'; // Your production URL
      console.log('Using fallback production baseUrl:', baseUrl);
    }
    
    // Safety check: Ensure we NEVER use Supabase URL for redirects
    if (baseUrl.includes('supabase.co')) {
      console.error('ERROR: BaseUrl is Supabase URL, replacing with production URL');
      baseUrl = 'https://what-the-food-theta.vercel.app';
    }
    
    // Type assertion - baseUrl is guaranteed to be a string at this point
    const finalBaseUrl: string = baseUrl;
    
    console.log('Final baseUrl for redirects:', finalBaseUrl);
    
    // Always construct URLs from baseUrl to ensure they're valid and use the correct domain
    // Don't trust URLs from frontend (especially localhost URLs)
    let finalSuccessUrl: string;
    
    // Reconstruct success URL from finalBaseUrl (ignore provided URL to ensure consistency)
    finalSuccessUrl = `${finalBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    if (subscriptionType === 'widget') {
      finalSuccessUrl += '&type=widget';
    }
    
    console.log('Reconstructed successUrl from baseUrl:', {
      baseUrl: finalBaseUrl,
      finalSuccessUrl,
      providedSuccessUrl: successUrl,
    });
    
    // Always construct cancel URL from baseUrl
    let finalCancelUrl: string;
    
    // Reconstruct cancel URL from finalBaseUrl (ignore provided URL to ensure consistency)
    if (subscriptionType === 'widget') {
      finalCancelUrl = `${finalBaseUrl}/widget/plans`;
    } else {
      finalCancelUrl = `${finalBaseUrl}/plans`;
    }
    
    console.log('Reconstructed cancelUrl from baseUrl:', {
      baseUrl: finalBaseUrl,
      finalCancelUrl,
      providedCancelUrl: cancelUrl,
    });
    
    // Final validation - URLs must be absolute and valid
    try {
      // Validate success URL (replace placeholder for validation)
      const testSuccessUrl = finalSuccessUrl.replace('{CHECKOUT_SESSION_ID}', 'test123');
      new URL(testSuccessUrl);
      
      // Validate cancel URL
      new URL(finalCancelUrl);
    } catch (urlError: any) {
      console.error('Invalid URL after reconstruction:', {
        finalSuccessUrl,
        finalCancelUrl,
        baseUrl,
        error: urlError.message,
      });
      const errorResponse = new Response(
        JSON.stringify({ 
          error: 'Invalid URL format',
          details: `Could not construct valid URLs: ${urlError.message}`,
          baseUrl,
          hint: 'Please check VITE_APP_URL environment variable or ensure the frontend provides valid absolute URLs.',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }
    
    console.log('Creating checkout session with URLs:', {
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      baseUrl,
      providedSuccessUrl: successUrl,
      providedCancelUrl: cancelUrl,
    });

    // Create Stripe Checkout Session
    console.log('About to create Stripe checkout session with:', {
      customerId,
      priceId,
      finalSuccessUrl,
      finalCancelUrl,
      subscriptionType: subscriptionType || 'main',
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        metadata: {
          userId: userId,
          billingCycle: billingCycle || 'monthly',
          subscriptionType: subscriptionType || 'main', // 'widget' or 'main'
        },
      });
      console.log('Stripe checkout session created successfully:', session.id);
    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      console.error('Stripe error details:', {
        message: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
        param: stripeError.param,
      });
      const errorResponse = new Response(
        JSON.stringify({ 
          error: 'Failed to create Stripe checkout session',
          details: stripeError.message || stripeError.toString(),
          code: stripeError.code,
          param: stripeError.param,
          hint: stripeError.param === 'success_url' ? 'Invalid success URL. Please check the URL format.' : 'Check Stripe API configuration and request parameters.',
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCorsHeaders(errorResponse);
    }

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
    
    // Log request context for debugging
    try {
      console.error('Request context:', {
        hasPriceId: !!requestBody?.priceId,
        subscriptionType: requestBody?.subscriptionType || 'main',
        userId: requestBody?.userId,
        email: requestBody?.email,
      });
    } catch (logError) {
      console.error('Could not log request context');
    }
    
    const errorResponse = new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create checkout session',
        details: error.toString(),
        type: error.constructor?.name || error.name || 'Unknown',
        hint: 'Check Edge Function logs for more details. Common issues: missing required fields for widget_subscriptions, database constraint violations, or Stripe API errors.',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return addCorsHeaders(errorResponse);
  }
});
