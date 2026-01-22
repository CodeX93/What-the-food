# SEObot Blog API Integration Setup

This guide explains how to set up and use the SEObot Blog API integration for fetching and displaying blog posts.

## Overview

The integration uses SEObot's Blog API Client library to fetch blog posts and render them with server-side rendering (SSR) for optimal SEO performance.

## Prerequisites

1. **SEObot API Key** - Get your API key from [app.seobotai.com](https://app.seobotai.com) settings
2. **Node.js** - Ensure Node.js is installed
3. **Next.js** - Already set up in your project

## Installation

Install the SEObot npm package:

```bash
npm install seobot
```

## Configuration

### 1. Set Environment Variable

Add your SEObot API key to your environment variables:

**For local development (`.env.local`):**
```env
SEOBOT_API_KEY=your_seobot_api_key_here
```

**For production (Vercel/Deployment platform):**
- Go to your deployment platform settings
- Add `SEOBOT_API_KEY` as an environment variable
- Set the value to your SEObot API key

## Features Implemented

### ✅ Server-Side Rendering (SSR)
- Blog post pages are rendered on the server for better SEO
- Blog listing page uses SSR for initial load
- Metadata is generated server-side for each blog post

### ✅ API Routes
- `/api/blog-posts` - Fetches list of blog posts with pagination
- `/api/blog/[slug]` - Fetches a single blog post by slug

### ✅ Blog Pages
- `/blog` - Blog listing page (SSR)
- `/blog/[slug]` - Individual blog post page (SSR)

### ✅ Navigation Updates
- Blog links temporarily removed from header and footer
- Will be re-enabled after blog posts are synchronized

## API Usage

### Fetching Articles

The `useBlogPosts` hook is available for client-side fetching:

```typescript
import { useBlogPosts } from "@/hooks/useBlogPosts";

const { data, isLoading, isError } = useBlogPosts(limit, page);
```

### Server-Side Fetching

For server components, use the BlogClient directly:

```typescript
import { BlogClient } from "seobot";

const blogClient = new BlogClient(process.env.SEOBOT_API_KEY!);
const articles = await blogClient.getArticles(page, limit);
const article = await blogClient.getArticle(slug);
```

## Blog Post Structure

Each blog post includes:

- `id` - Unique article ID
- `slug` - URL-friendly slug
- `headline` - Article title
- `metaDescription` - SEO description
- `metaKeywords` - SEO keywords
- `html` - Full HTML content
- `markdown` - Markdown content
- `image` - Featured image URL
- `readingTime` - Estimated reading time
- `publishedAt` - Publication date
- `category` - Article category
- `tags` - Article tags
- `relatedPosts` - Related articles

## Redirects

### Subdomain Redirects

The blog subdomain (`blog.whatthefood.io`) should remain live and handle 301 redirects. These redirects are configured in WordPress and will redirect traffic from Google to the new `/blog` route URLs.

The middleware is set up to handle subdomain redirects, but WordPress will also handle 301 redirects for individual blog posts.

## Next Steps

1. ✅ **Install SEObot package:**
   ```bash
   npm install seobot
   ```

2. ✅ **Set SEOBOT_API_KEY environment variable:**
   - Add to `.env.local` for local development
   - Add to your deployment platform for production

3. ✅ **Test the integration:**
   - Visit `/blog` to see the blog listing
   - Visit `/blog/[slug]` to see individual posts
   - Check that posts are loading correctly

4. ⏳ **After blog synchronization:**
   - Re-enable blog links in header and footer
   - Verify all internal links are updated
   - Test 301 redirects from subdomain

## Troubleshooting

### Blog posts not loading

1. **Check API key:**
   - Verify `SEOBOT_API_KEY` is set in environment variables
   - Check that the API key is correct in SEObot dashboard

2. **Check API route:**
   - Visit `/api/blog-posts` directly to see if it returns data
   - Check browser console for errors

3. **Check server logs:**
   - Look for errors in deployment logs
   - Verify SEObot API is accessible

### 404 errors on blog posts

- Verify the slug exists in SEObot
- Check that the article is published
- Ensure the article slug matches the URL

### Metadata not showing

- Check that `generateMetadata` function is working
- Verify Open Graph tags in page source
- Test with SEO tools like Google Rich Results Test

## SEO Best Practices

✅ **Server-Side Rendering** - All blog pages use SSR for better SEO
✅ **Metadata Generation** - Dynamic metadata for each blog post
✅ **Structured Data** - JSON-LD schema for blog pages
✅ **301 Redirects** - Subdomain redirects preserve SEO value
✅ **Caching** - API responses are cached for performance

## Support

For issues with:
- **SEObot API** - Contact SEObot support
- **Integration** - Check this documentation
- **Next.js/SSR** - Refer to Next.js documentation

## References

- [SEObot Blog API Documentation](https://github.com/seobotai/seobot-nextjs-blog)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
