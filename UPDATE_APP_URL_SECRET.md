# Update APP_URL Secret in Supabase

## Problem
Emails are using ngrok URL (`https://sacculate-dissociable-dorla.ngrok-free.dev`) instead of your IP address (`http://72.60.113.9`).

## Solution
The `APP_URL` environment variable in Supabase Edge Functions is set to the ngrok URL. You need to update it to your IP address.

## Steps to Update

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your **Supabase Dashboard**
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Find the `APP_URL` secret
4. Click **Edit** or **Update**
5. Change the value from:
   ```
   https://sacculate-dissociable-dorla.ngrok-free.dev
   ```
   to:
   ```
   http://72.60.113.9
   ```
6. Click **Save**

### Option 2: Via Supabase CLI

```bash
# Set the APP_URL secret
supabase secrets set APP_URL=http://72.60.113.9

# Verify it was set
supabase secrets list
```

### Option 3: Delete and Recreate

If the secret doesn't exist or you want to recreate it:

```bash
# Remove the old secret (if needed)
supabase secrets unset APP_URL

# Set the new secret
supabase secrets set APP_URL=http://72.60.113.9
```

## Verify the Change

After updating the secret, test by:

1. **Trigger a test email** (e.g., upgrade to premium)
2. **Check the email** - the "Go to Dashboard" button should now point to `http://72.60.113.9/dashboard`
3. **Check Edge Function logs** to see what URL is being used:
   ```bash
   supabase functions logs send-lifecycle-email --follow
   ```

## Important Notes

- **No redeployment needed**: Edge Function secrets are updated immediately
- **All functions use this**: The `APP_URL` secret is used by:
  - `send-lifecycle-email`
  - `process-checkout`
  - `stripe-webhook`
- **Fallback**: If `APP_URL` is not set, the code will use `http://72.60.113.9` as a fallback, but it's better to set it explicitly

## Current Code Behavior

The code checks for `APP_URL` environment variable first, then falls back to `http://72.60.113.9`:

```typescript
const appUrl = Deno.env.get('APP_URL') || 'http://72.60.113.9';
```

If `APP_URL` is set to the ngrok URL in Supabase secrets, it will use that instead of the fallback. That's why you need to update the secret.
