# HTTP/HTTPS Compatibility Guide

This application is designed to work seamlessly on both HTTP and HTTPS protocols. This document outlines how the application handles protocol-agnostic features.

## Overview

The application automatically adapts to the protocol being used (HTTP or HTTPS) without requiring any configuration changes. All internal URLs and features work on both protocols.

## Key Features

### 1. Protocol-Agnostic URLs

All internal URLs use `window.location.origin`, which automatically uses the current protocol:

```typescript
// Automatically uses http:// or https:// based on current page
const shareUrl = `${window.location.origin}/shared/${id}`;
```

The `getUrl()` utility function in `src/utils/url.ts` also supports both protocols:

```typescript
import { getUrl } from '@/utils/url';

// Works with both http:// and https://
const url = getUrl('/dashboard');
```

### 2. Clipboard Operations

The `copyToClipboard()` utility in `src/utils/clipboard.ts` provides automatic fallback:

- **HTTPS**: Uses modern `navigator.clipboard.writeText()` API
- **HTTP**: Falls back to `document.execCommand('copy')` method
- **Both**: Works seamlessly without user intervention

**Usage:**
```typescript
import { copyToClipboard } from '@/utils/clipboard';

const success = await copyToClipboard('Text to copy');
if (!success) {
  // Show text in toast for manual copying
}
```

### 3. Web Share API

The Web Share API requires HTTPS, but the application gracefully degrades:

- **HTTPS**: Uses native Web Share API (mobile-friendly)
- **HTTP**: Automatically falls back to clipboard copy
- **Both**: Users can always share content

### 4. Authentication

Supabase authentication works on both HTTP and HTTPS:
- Session management works on both protocols
- Token refresh works on both protocols
- OAuth redirects adapt to current protocol

### 5. External Resources

External resources (CDNs, APIs) use HTTPS as required:
- YouTube embeds: `https://www.youtube.com`
- CDN resources: `https://cdn.*`
- Third-party services: All use HTTPS (required by their APIs)

These external HTTPS resources work fine when loaded from HTTP pages (no mixed content issues for iframes and scripts).

## Implementation Details

### URL Utilities

**File:** `src/utils/url.ts`

- `getAppUrl()`: Returns app URL from env var or `window.location.origin`
- `getUrl(path)`: Constructs full URL with proper protocol
- Both functions support `http://` and `https://`

### Clipboard Utility

**File:** `src/utils/clipboard.ts`

- `copyToClipboard(text)`: Universal clipboard function
- `isClipboardAvailable()`: Checks if clipboard operations are available
- Automatic fallback ensures it works everywhere

### Components Using Protocol-Agnostic Features

1. **Share Functionality**
   - `FoodResultsClient.tsx`
   - `ShareButton.tsx`
   - `SharedFoodResultsClient.tsx`
   - `MealPlanResults.tsx`

2. **Widget Dashboard**
   - `WidgetDashboardClient.tsx` - Copy embed code

3. **All Components**
   - Use `window.location.origin` for internal URLs
   - Use `copyToClipboard()` utility for clipboard operations

## Environment Variables

Set `NEXT_PUBLIC_APP_URL` to your deployment URL (can be HTTP or HTTPS):

```bash
# For HTTP deployment
NEXT_PUBLIC_APP_URL=http://72.60.113.9

# For HTTPS deployment
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

If not set, the application automatically uses `window.location.origin`.

## Testing

### HTTP Testing
1. Deploy to HTTP server (e.g., `http://72.60.113.9`)
2. Test clipboard operations - should work with fallback method
3. Test share functionality - should fallback to clipboard
4. Test authentication - should work normally

### HTTPS Testing
1. Deploy to HTTPS server
2. Test clipboard operations - should use modern API
3. Test share functionality - should use Web Share API on mobile
4. Test authentication - should work normally

## Browser Compatibility

### Clipboard API Support
- **Modern browsers (HTTPS)**: Full Clipboard API support
- **Modern browsers (HTTP)**: Falls back to `execCommand`
- **Older browsers**: Uses `execCommand` fallback

### Web Share API Support
- **Mobile browsers (HTTPS)**: Full Web Share API support
- **Desktop/HTTP**: Falls back to clipboard copy

## Best Practices

1. **Always use `window.location.origin`** for internal URLs
2. **Use `copyToClipboard()` utility** instead of direct clipboard API calls
3. **Provide fallback UI** when clipboard operations fail (show text in toast)
4. **Test on both protocols** before deployment
5. **Use HTTPS for production** when possible (better security and features)

## Troubleshooting

### Clipboard Not Working on HTTP
- ✅ **Fixed**: Uses `execCommand` fallback automatically
- If still not working, check browser console for errors
- Ensure user interaction (click event) triggered the copy

### Share Not Working on HTTP
- ✅ **Expected**: Web Share API requires HTTPS
- ✅ **Fixed**: Automatically falls back to clipboard copy
- Users can still share via copied link

### Mixed Content Warnings
- External HTTPS resources (CDNs, APIs) are fine
- Only issue would be loading HTTP resources from HTTPS page (not applicable here)

## Migration Notes

All clipboard operations have been migrated to use the `copyToClipboard()` utility:
- ✅ Widget dashboard copy buttons
- ✅ Share functionality in all components
- ✅ Any other clipboard operations

All URL constructions use protocol-agnostic methods:
- ✅ Share URLs
- ✅ Redirect URLs
- ✅ Internal navigation
