export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Ensure protocol for values like "whatthefood.io"
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (fromEnv) return normalizeSiteUrl(fromEnv);
  
  // VERCEL_URL is available during build and runtime on Vercel
  if (process.env.VERCEL_URL) {
    return normalizeSiteUrl(`https://${process.env.VERCEL_URL}`);
  }

  // Local/dev fallback (still absolute URLs).
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  // Production default (matches `app/layout.tsx` metadataBase).
  return "https://whatthefood.io";
}

export function toAbsoluteUrl(pathname: string): string {
  const base = getSiteUrl();
  const cleanPath = pathname === "/" ? "/" : `/${pathname}`.replace(/\/{2,}/g, "/");
  return new URL(cleanPath, base).toString();
}

/**
 * Get the request URL from Next.js headers
 * Helper for generateMetadata functions
 */
export async function getRequestUrl(): Promise<string> {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("host") || "whatthefood.io";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

/**
 * Get absolute URL for preview images
 * For use in generateMetadata functions where we can access request headers
 */
export function getPreviewImageUrlFromRequest(
  filename: string,
  requestUrl?: string | URL
): string {
  let base: string;
  
  if (requestUrl) {
    // Use the request URL to determine the base
    const url = typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;
    base = `${url.protocol}//${url.host}`;
  } else {
    // Fallback to getSiteUrl() for static metadata
    base = getSiteUrl();
  }
  
  // URL encode the filename to handle spaces and special characters
  const encodedFilename = encodeURIComponent(filename);
  return `${base}/preview-images/${encodedFilename}`;
}

/**
 * Get URL for preview images (for static metadata)
 * Returns absolute URL using getSiteUrl()
 */
export function getPreviewImageUrl(filename: string): string {
  const base = getSiteUrl();
  // URL encode the filename to handle spaces and special characters
  const encodedFilename = encodeURIComponent(filename);
  return `${base}/preview-images/${encodedFilename}`;
}

