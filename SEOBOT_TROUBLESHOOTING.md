# SEObot 403 Forbidden Error - Troubleshooting Guide

## Error: 403 Forbidden / Access Denied

If you're seeing a `403 Forbidden` error when trying to fetch blog posts, here are the most common causes and solutions:

## Common Causes

### 1. **Blog Not Synchronized in SEObot**

The most common cause is that your blog hasn't been synchronized in SEObot yet.

**Solution:**
1. Go to [app.seobotai.com](https://app.seobotai.com)
2. Make sure your blog source (WordPress, etc.) is connected
3. Wait for SEObot to synchronize your blog posts
4. Verify that blog posts appear in your SEObot dashboard

### 2. **Invalid or Incorrect API Key**

The API key might be incorrect or expired.

**Solution:**
1. Go to SEObot Settings
2. Copy your API key again
3. Make sure there are no extra spaces or characters
4. Update your `.env.local` file:
   ```env
   SEOBOT_API_KEY=your_correct_api_key_here
   ```
5. Restart your dev server

### 3. **API Key Permissions**

The API key might not have the right permissions to access blog posts.

**Solution:**
1. Check API key permissions in SEObot dashboard
2. Ensure the API key has "Blog API" access enabled
3. Regenerate the API key if needed

### 4. **Blog Not Connected**

Your blog source might not be properly connected to SEObot.

**Solution:**
1. In SEObot dashboard, check your blog connections
2. Verify WordPress (or other source) is connected
3. Reconnect if necessary
4. Wait for synchronization to complete

## Verification Steps

### Step 1: Check API Key Format

Your API key should look like:
```
ce980a90-eaba-4afc-b4e0-db16ecbfd0b9
```

Make sure:
- No spaces before or after
- All hyphens are included
- No quotes around it in `.env.local`

### Step 2: Verify Blog Posts Exist

1. Log into SEObot dashboard
2. Navigate to your blog/articles section
3. Verify that blog posts are visible
4. If no posts appear, wait for synchronization or check your blog connection

### Step 3: Test API Key Directly

You can test if your API key works by checking the SEObot CDN:

```bash
# This should return data (not 403)
curl https://cdn.seobotai.com/YOUR_API_KEY/system/base.json
```

Replace `YOUR_API_KEY` with your actual API key.

## Next Steps

1. **Wait for Synchronization:**
   - If you just connected your blog, wait a few minutes for SEObot to sync
   - Check SEObot dashboard for sync status

2. **Contact SEObot Support:**
   - If the issue persists, contact SEObot support
   - Provide them with your API key (first few characters only for security)
   - Explain that you're getting 403 errors

3. **Check SEObot Documentation:**
   - Review SEObot's API documentation
   - Check for any recent changes or requirements

## Temporary Workaround

If you need to test the integration while waiting for blog synchronization:

1. The API will return an empty array `{ posts: [] }` when there are no posts
2. Your blog page will still load but show "Failed to load blog posts"
3. Once synchronization completes, posts will appear automatically

## Error Response Format

When you get a 403 error, the API will return:

```json
{
  "error": "Access Denied (403)",
  "message": "SEObot API key may be invalid, expired, or the blog may not be synchronized yet...",
  "posts": []
}
```

This helps identify the issue quickly.

---

**Most likely solution:** Wait for blog synchronization to complete in SEObot dashboard, or verify your blog is properly connected.
