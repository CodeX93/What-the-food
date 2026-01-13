# Stripe Webhook Setup

## Overview

Stripe webhooks are handled through a Next.js API route proxy (`/api/webhooks/stripe`) that automatically adds authentication when forwarding to the Supabase Edge Function. This means **you don't need to add the API key to your Stripe webhook URL**.

## Configuration

### 1. Environment Variables

Make sure these are set in your Next.js environment (`.env.local` or Vercel):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Webhook URL

In your Stripe Dashboard → Developers → Webhooks:

**Use this URL format:**
```
https://your-domain.com/api/webhooks/stripe
```

**Do NOT include any API keys in the URL** - the Next.js route handles authentication automatically.

### 3. Supabase Edge Function Secrets

Make sure these secrets are set for the `stripe-webhook` function:

```bash
supabase secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_ANON_KEY=your-anon-key \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_...
```

## How It Works

1. **Stripe sends webhook** → `https://your-domain.com/api/webhooks/stripe`
2. **Next.js API route** (`app/api/webhooks/stripe/route.ts`):
   - Receives the webhook (no auth required)
   - Verifies Stripe signature
   - Forwards to Supabase Edge Function with `SUPABASE_ANON_KEY` in headers
3. **Supabase Edge Function** (`supabase/functions/stripe-webhook/index.ts`):
   - Receives authenticated request
   - Verifies Stripe signature again (double verification)
   - Processes the webhook event

## Webhook Events Handled

The webhook function handles:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.paid`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `customer.created`
- ✅ `customer.updated`
- ✅ `customer.deleted`

All events return HTTP 200 to acknowledge receipt.

## Testing

1. Deploy the Next.js API route
2. Configure Stripe webhook URL: `https://your-domain.com/api/webhooks/stripe`
3. Send a test webhook from Stripe Dashboard
4. Check logs:
   - Next.js logs (Vercel/logs)
   - Supabase function logs (Dashboard → Edge Functions → stripe-webhook → Logs)

## Troubleshooting

### 401 Errors

If you see 401 errors, check:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- ✅ Stripe webhook URL points to `/api/webhooks/stripe` (not the Supabase function directly)

### Webhook Not Received

- Check Stripe Dashboard → Webhooks → Recent deliveries
- Verify the webhook URL is correct
- Check Next.js deployment logs
- Check Supabase function logs

### Signature Verification Failed

- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Ensure the webhook secret is for the correct environment (test vs live)
- Check that the raw body is being forwarded correctly

