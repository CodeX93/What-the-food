# MailerSend Email Setup & Troubleshooting

This guide helps you set up and troubleshoot the MailerSend email integration for signup and lifecycle emails.

## Prerequisites

1. **MailerSend Account**: Sign up at [mailersend.com](https://www.mailersend.com)
2. **API Key**: Get your API key from MailerSend Dashboard → Settings → API Tokens
3. **Email Templates**: Create templates in MailerSend and note their template IDs
4. **Verified Domain**: Your sending domain must be verified in MailerSend

## Step 1: Set Up MailerSend Secrets

Set the required environment variables in your Supabase Edge Functions:

```bash
# Required: Your MailerSend API key
supabase secrets set MAILERSEND_API_KEY=your_api_key_here

# Optional: Customize sender email and name (defaults provided)
supabase secrets set MAILERSEND_FROM_EMAIL=hi@odehahwal.com
supabase secrets set MAILERSEND_FROM_NAME=WhatTheFood

# Optional: Template IDs (defaults provided, but you can override)
supabase secrets set MAILERSEND_TEMPLATE_SIGNUP=jy7zpl9dw9pg5vx6
supabase secrets set MAILERSEND_TEMPLATE_UPGRADE_PREMIUM=v69oxl5dxyz4785k
supabase secrets set MAILERSEND_TEMPLATE_MONTHLY_TO_ANNUAL=zr6ke4n67emlon12
supabase secrets set MAILERSEND_TEMPLATE_DOWNGRADE=your_template_id

# Optional: Email subjects (defaults provided, but you can override)
supabase secrets set MAILERSEND_SUBJECT_SIGNUP="Welcome to What The Food!"
supabase secrets set MAILERSEND_SUBJECT_UPGRADE_PREMIUM="Welcome to Premium!"
supabase secrets set MAILERSEND_SUBJECT_MONTHLY_TO_ANNUAL="Thank you for upgrading to Annual!"
supabase secrets set MAILERSEND_SUBJECT_DOWNGRADE="Subscription Updated"
```

**Note**: MailerSend requires a `subject` field even when using templates. The function includes default subjects, but you can customize them via environment variables.

## Step 2: Deploy the Edge Function

Make sure the `send-lifecycle-email` function is deployed:

```bash
supabase functions deploy send-lifecycle-email
```

## Step 3: Verify Function Deployment

Check that the function exists:

```bash
supabase functions list
```

You should see `send-lifecycle-email` in the list.

## Step 4: Test the Function

### Test via cURL

```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/send-lifecycle-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "signup",
    "email": "test@example.com",
    "name": "Test User",
    "dry_run": true
  }'
```

The `dry_run: true` will return the configuration without actually sending an email.

### Test from Your App

1. Sign up with a test email
2. Check the browser console for logs
3. Check Supabase function logs (see below)

## Step 5: Check Logs

View the edge function logs to see what's happening:

```bash
# View recent logs
supabase functions logs send-lifecycle-email

# Follow logs in real-time
supabase functions logs send-lifecycle-email --follow

# View logs with more details
supabase functions logs send-lifecycle-email --limit 50
```

## Common Issues & Solutions

### Issue 1: "MAILERSEND_API_KEY not configured"

**Solution**: Set the API key secret:
```bash
supabase secrets set MAILERSEND_API_KEY=your_api_key
```

### Issue 2: "Template ID is not configured"

**Solution**: Set the template ID for the event type:
```bash
supabase secrets set MAILERSEND_TEMPLATE_SIGNUP=your_template_id
```

### Issue 3: "401 Unauthorized" from MailerSend

**Causes**:
- Invalid API key
- API key doesn't have email sending permissions

**Solution**:
1. Verify your API key in MailerSend Dashboard
2. Make sure the API key has "Email" permissions enabled
3. Regenerate the key if needed

### Issue 4: "422 Unprocessable Entity" from MailerSend

**Causes**:
- Missing `subject` field (most common)
- Invalid template ID
- Template doesn't exist
- Invalid email address format
- Sender email not verified

**Solution**:
1. **If error mentions "subject field is required"**: The function now includes default subjects, but ensure the subject is set. You can customize it via `MAILERSEND_SUBJECT_SIGNUP` (or other event-specific env vars).
2. Verify the template ID exists in MailerSend
3. Check that your sender email domain is verified
4. Verify the recipient email format is correct

### Issue 5: "403 Forbidden" from MailerSend

**Causes**:
- Domain not verified
- Account limitations (trial account restrictions)

**Solution**:
1. Verify your sending domain in MailerSend Dashboard
2. Check your account status and limits
3. Upgrade your MailerSend plan if needed

### Issue 6: Email not received but no errors

**Check**:
1. Check spam/junk folder
2. Verify the email address is correct
3. Check MailerSend activity logs in their dashboard
4. Verify the function is actually being called (check browser console)

## Debugging Steps

1. **Check if function is deployed**:
   ```bash
   supabase functions list
   ```

2. **Verify secrets are set**:
   ```bash
   supabase secrets list
   ```
   Note: This might not show all secrets for security reasons, but you can test by checking logs.

3. **Test with dry run**:
   Use `dry_run: true` in the request body to test configuration without sending emails.

4. **Check MailerSend Dashboard**:
   - Go to MailerSend Dashboard → Activity
   - Look for sent emails or error messages
   - Check API logs for detailed error information

5. **Enable detailed logging**:
   The function now logs detailed information including:
   - Request payload
   - MailerSend API response
   - Error details

## MailerSend Template Setup

When creating templates in MailerSend:

1. Use variables in `{{variable_name}}` format
2. Common variables used:
   - `{{name}}` - User's name (defaults to "there" if not provided)
3. Save the template and copy the template ID
4. Set the template ID in Supabase secrets

## API Endpoint

The function uses MailerSend's v1 API:
- Endpoint: `https://api.mailersend.com/v1/email`
- Method: POST
- Authentication: Bearer token (API key)

## Rate Limits

MailerSend has rate limits based on your plan:
- Trial/Hobby: 10 requests/minute
- Starter: 15 requests/minute
- Professional: 30 requests/minute
- Enterprise: 60 requests/minute

If you hit rate limits, you'll receive a 429 error. The function will log this error.

## Support

If issues persist:
1. Check Supabase function logs
2. Check MailerSend Dashboard → Activity
3. Verify all secrets are set correctly
4. Test with a simple email first (without templates)
5. Contact MailerSend support if API errors persist
