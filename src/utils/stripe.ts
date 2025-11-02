import { loadStripe } from '@stripe/stripe-js';
import { getUrl } from './url';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export const getStripe = () => {
  return stripePromise;
};

/**
 * Creates a Stripe Checkout session for subscription
 * This function calls your backend API to create a checkout session
 * 
 * Backend API endpoint should:
 * - Create a Stripe checkout session
 * - Return the session URL
 * - Handle webhooks to update subscription status
 * 
 * @param priceId - Stripe Price ID for the subscription
 * @param billingCycle - 'monthly' or 'yearly'
 * @returns Checkout session URL
 */
export async function createCheckoutSession(priceId: string, billingCycle: 'monthly' | 'yearly'): Promise<string> {
  try {
    // Get current user
    const { data: { session } } = await fetch('/api/auth/session').then(res => res.json()).catch(() => ({ data: { session: null } }));
    
    if (!session) {
      throw new Error('User not authenticated');
    }

    // Call your backend API to create checkout session
    // Replace this URL with your actual backend API endpoint
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    
    const response = await fetch(`${API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        priceId,
        billingCycle,
        userId: session.user.id,
        email: session.user.email,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.url; // Stripe Checkout URL
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create checkout session using Supabase Edge Function
 * This requires a Supabase Edge Function to be deployed
 */
export async function createCheckoutSessionSupabase(
  priceId: string,
  billingCycle: 'monthly' | 'yearly'
): Promise<string> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      throw new Error('User not authenticated');
    }

    // Call Supabase Edge Function to create checkout session
    const successUrl = `${getUrl('/checkout/success')}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = getUrl('/plans');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          billingCycle,
          userId: session.user.id,
          email: session.user.email,
          successUrl,
          cancelUrl,
        },
      });

      if (error) {
        console.error('Supabase Edge Function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error context:', {
          functionName: 'create-checkout-session',
          hasSession: !!session,
          userId: session.user.id,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        });
        
        // Try to extract error from response body
        let errorMessage = error.message || 'Failed to create checkout session';
        let errorDetails = '';
        let errorHint = '';
        
        // Check if error.context has a Response object
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorBody = await error.context.json();
            console.error('Parsed error body from response:', errorBody);
            if (errorBody?.error) {
              errorMessage = errorBody.error;
              errorDetails = errorBody.details || '';
              errorHint = errorBody.hint || '';
            }
          } catch (e) {
            console.error('Error parsing response JSON:', e);
            // Try to get text instead
            try {
              const errorText = await error.context.text();
              console.error('Error response text:', errorText);
              try {
                const parsed = JSON.parse(errorText);
                if (parsed.error) {
                  errorMessage = parsed.error;
                  errorDetails = parsed.details || '';
                  errorHint = parsed.hint || '';
                }
              } catch (parseError) {
                // Not JSON, use the text as error message
                errorMessage = errorText || errorMessage;
              }
            } catch (textError) {
              console.error('Error getting response text:', textError);
            }
          }
        }
        
        // Construct final error message
        let finalMessage = errorMessage;
        if (errorDetails) {
          finalMessage += `: ${errorDetails}`;
        }
        if (errorHint) {
          finalMessage += ` (${errorHint})`;
        }
        
        // Provide more specific error messages
        if (errorMessage.includes('Function not found') || errorMessage.includes('404')) {
          throw new Error('Checkout service is not configured. The Edge Function "create-checkout-session" is not deployed. Please deploy it first or contact support.');
        }
        
        if (errorMessage.includes('Failed to send') || errorMessage.includes('network')) {
          throw new Error('Network error: Unable to reach the checkout service. Please check your internet connection and try again. If the problem persists, the Edge Function may not be deployed.');
        }
        
        throw new Error(finalMessage);
      }

      if (!data) {
        console.error('No data returned from Edge Function');
        throw new Error('No response from checkout service. Please try again or contact support.');
      }

      if (!data.url) {
        console.error('No URL in response data:', data);
        throw new Error('No checkout URL returned from server. The service may not be configured correctly.');
      }

      return data.url;
    } catch (invokeError: any) {
      // Catch network errors and other invoke errors
      console.error('Error invoking Edge Function:', invokeError);
      
      // Check if it's a function not found error
      if (invokeError.message?.includes('Function not found') || 
          invokeError.message?.includes('404') ||
          invokeError.message?.includes('Failed to send')) {
        throw new Error(
          'The checkout service is not available. Please ensure the Edge Function "create-checkout-session" is deployed. ' +
          'See DEPLOY_EDGE_FUNCTIONS.md for deployment instructions.'
        );
      }
      
      // Re-throw the error
      throw invokeError;
    }
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    console.error('Error stack:', error.stack);
    
    // Re-throw with more context
    if (error.message) {
      throw error;
    }
    throw new Error(`Failed to create checkout session: ${error.toString()}`);
  }
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(checkoutUrl: string): Promise<void> {
  window.location.href = checkoutUrl;
}

