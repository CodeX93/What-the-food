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
 * Get URL for preview images
 * Returns relative path - Next.js will resolve it against metadataBase
 * This ensures it works correctly on all domains (Vercel preview, production, etc.)
 * 
 * The metadataBase in app/layout.tsx is now dynamic and will use the correct domain
 */
export function getPreviewImageUrl(filename: string): string {
  // Use relative path - Next.js resolves it against metadataBase
  // URL encode the filename to handle spaces and special characters
  const encodedFilename = encodeURIComponent(filename);
  return `/preview-images/${encodedFilename}`;
}

