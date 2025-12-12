# How to View Supabase Edge Function Logs

## Method 1: Supabase Dashboard (Easiest - Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project

2. **Navigate to Edge Functions**
   - Click **Edge Functions** in the left sidebar
   - You'll see a list of all your deployed functions

3. **View Logs for a Specific Function**
   - Click on the function name (e.g., `stripe-webhook`, `create-checkout-session`)
   - Click on the **Logs** tab
   - You'll see all logs for that function

4. **Filter Logs**
   - Use the time range selector to filter by date/time
   - Look for specific log levels (Info, Warning, Error)

## Method 2: Supabase CLI (Note: Logs command may not be available)

**Important**: The `supabase functions logs` command is not available in all CLI versions. The Supabase Dashboard (Method 1) is the most reliable way to view logs.

### Alternative: Check Function Status via CLI

```bash
# List all deployed functions
supabase functions list

# Check if you're linked to the project
supabase projects list

# Link to your project if needed
supabase link --project-ref YOUR_PROJECT_REF
```

**Note**: If you need to view logs, use the **Supabase Dashboard** (Method 1) as it's always available and more reliable.

### List All Functions
```bash
supabase functions list
```

## Method 3: Check if Functions are Deployed

If you don't see any logs, the function might not be deployed:

```bash
# List all deployed functions
supabase functions list
```

If a function is missing, deploy it:
```bash
supabase functions deploy FUNCTION_NAME
```

## Troubleshooting: No Logs Appearing

### Issue 1: Function Not Being Called
**Symptoms**: No logs at all, even when you expect the function to run

**Check**:
1. Verify the function is actually being invoked
2. Check browser console for errors
3. Verify the function URL is correct
4. Check network tab to see if the request is being made

**Solution**:
- Add a test log at the very start of your function:
  ```typescript
  Deno.serve(async (req) => {
    console.log('Function called at:', new Date().toISOString());
    console.log('Request method:', req.method);
    // ... rest of code
  });
  ```

### Issue 2: Function Not Deployed
**Symptoms**: Function doesn't appear in dashboard or `supabase functions list`

**Solution**:
```bash
# Deploy the function
supabase functions deploy FUNCTION_NAME

# Verify deployment
supabase functions list
```

### Issue 3: Logs Not Showing in Dashboard
**Symptoms**: Function is deployed but logs tab is empty

**Possible Causes**:
1. **Time Range**: Logs might be outside the selected time range
   - **Fix**: Adjust the time range filter in the dashboard

2. **Function Never Executed**: Function hasn't been called yet
   - **Fix**: Trigger the function (e.g., complete a checkout, send a webhook)

3. **Logs Delayed**: Sometimes logs take a few seconds to appear
   - **Fix**: Wait 10-30 seconds and refresh

4. **Project Region**: Logs might be in a different region
   - **Fix**: Check your project settings for the region

### Issue 4: CLI Logs Command Not Available
**Symptoms**: `supabase functions logs` command doesn't exist

**Solution**: 
- **Use the Supabase Dashboard instead** (Method 1) - it's always available
- The CLI logs command may not be available in all versions
- Dashboard logs are more reliable and have better filtering options

### Issue 5: Console.log Not Appearing
**Symptoms**: Code has `console.log` but nothing shows in logs

**Check**:
1. Make sure you're using `console.log` (not `Deno.console.log` in some contexts)
2. Verify the code path is being executed
3. Check if there's an early return or error before your log statement

**Example**:
```typescript
Deno.serve(async (req) => {
  console.log('Function started'); // This should appear
  
  try {
    const body = await req.json();
    console.log('Body received:', body); // This should appear
    
    // Your code here
  } catch (error) {
    console.error('Error:', error); // This should appear
  }
});
```

## Testing Logs

### Test Function to Verify Logging Works

Create a simple test function:

```typescript
// supabase/functions/test-logs/index.ts
Deno.serve(async (req) => {
  console.log('Test function called');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Timestamp:', new Date().toISOString());
  
  return new Response(
    JSON.stringify({ message: 'Check logs for output' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

Deploy and test:
```bash
supabase functions deploy test-logs
```

Then call it:
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/test-logs
```

Check logs:
```bash
supabase functions logs test-logs
```

## Common Functions to Check Logs For

### 1. Stripe Webhook
**Dashboard**: Edge Functions → `stripe-webhook` → Logs tab
**When to check**: After completing a checkout or subscription change

### 2. Create Checkout Session
**Dashboard**: Edge Functions → `create-checkout-session` → Logs tab
**When to check**: When user clicks "Subscribe" or "Upgrade"

### 3. Send Lifecycle Email
**Dashboard**: Edge Functions → `send-lifecycle-email` → Logs tab
**When to check**: After signup, upgrade, or downgrade

### 4. Sync Subscription
**Dashboard**: Edge Functions → `sync-subscription` → Logs tab
**When to check**: When manually syncing subscription status

## Real-Time Monitoring

To monitor logs in real-time while testing:

**Using Dashboard** (Recommended):
1. Open multiple browser tabs
2. Tab 1: Edge Functions → `stripe-webhook` → Logs (refresh periodically)
3. Tab 2: Edge Functions → `create-checkout-session` → Logs (refresh periodically)
4. Tab 3: Your application (test checkout, etc.)

**Tip**: Keep the logs tabs open and refresh them every few seconds while testing.

## Log Levels

Supabase Edge Functions support these log levels:
- `console.log()` - Info level
- `console.warn()` - Warning level
- `console.error()` - Error level
- `console.info()` - Info level
- `console.debug()` - Debug level (may not appear in production)

## Best Practices

1. **Add Logs at Key Points**:
   ```typescript
   console.log('Function started');
   console.log('Processing request:', { userId, action });
   console.log('Request completed successfully');
   ```

2. **Log Errors Properly**:
   ```typescript
   try {
     // your code
   } catch (error) {
     console.error('Error details:', {
       message: error.message,
       stack: error.stack,
       context: { userId, action }
     });
     throw error; // Re-throw if needed
   }
   ```

3. **Use Structured Logging**:
   ```typescript
   console.log(JSON.stringify({
     event: 'checkout_completed',
     userId: user.id,
     timestamp: new Date().toISOString(),
     data: { subscriptionId, priceId }
   }));
   ```

## Quick Commands Reference

```bash
# View all functions
supabase functions list

# Deploy a function
supabase functions deploy FUNCTION_NAME

# Check if logged in
supabase projects list

# Link to project
supabase link --project-ref YOUR_PROJECT_REF

# Note: View logs via Dashboard (Edge Functions → Function Name → Logs tab)
```

## Still Not Seeing Logs?

1. **Verify CLI is linked to correct project**:
   ```bash
   supabase projects list
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Check Dashboard directly**:
   - Sometimes CLI might have issues
   - Dashboard is always the most reliable

3. **Verify function is actually being called**:
   - Check browser network tab
   - Verify the function URL is correct
   - Check for CORS or authentication errors

4. **Check function deployment status**:
   - Dashboard → Edge Functions → Check if function shows as "Deployed"
   - Look for any deployment errors

5. **Contact Support**:
   - If logs still don't appear after checking all above
   - Include: project ref, function name, time range checked
