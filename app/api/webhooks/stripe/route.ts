import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This Next.js API route acts as a proxy for Stripe webhooks
// It's publicly accessible and forwards requests to the Supabase Edge Function
// with proper authentication using the SUPABASE_ANON_KEY from environment

// Environment variables
// Note: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET should be set as server-side env vars
// (not NEXT_PUBLIC_* as they're sensitive)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Stripe webhook endpoint URL (Supabase Edge Function)
const WEBHOOK_FUNCTION_URL = supabaseUrl ? `${supabaseUrl}/functions/v1/stripe-webhook` : '';

export async function POST(request: NextRequest) {
  try {
    if (!stripeWebhookSecret || !supabaseUrl || !supabaseAnonKey) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get the raw body for signature verification
    const body = await request.text();
    
    // Get the stripe-signature header
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify the webhook signature using Stripe SDK
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      console.log(`Verified webhook event: ${event.type}`);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Forward the request to Supabase Edge Function with authentication
    // The function expects the raw body and stripe-signature header
    try {
      const response = await fetch(WEBHOOK_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: body, // Send raw body (text)
      });

      const responseData = await response.text();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
      } catch {
        parsedResponse = responseData;
      }

      if (!response.ok) {
        console.error('Supabase function error:', {
          status: response.status,
          statusText: response.statusText,
          response: parsedResponse,
        });
        // Still return 200 to Stripe so it doesn't retry
        // The function will handle the error internally
        return NextResponse.json(
          { received: true, forwarded: false, error: parsedResponse },
          { status: 200 }
        );
      }

      console.log('Webhook forwarded successfully to Supabase function');
      return NextResponse.json(
        { received: true, forwarded: true, ...parsedResponse },
        { status: 200 }
      );
    } catch (fetchError: any) {
      console.error('Error forwarding to Supabase function:', fetchError);
      // Return 200 to acknowledge receipt even if forwarding fails
      // The webhook will be retried by Stripe if needed
      return NextResponse.json(
        { received: true, forwarded: false, error: fetchError.message },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'stripe-signature, content-type',
    },
  });
}

