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
  if (process.env.VERCEL_URL) return normalizeSiteUrl(`https://${process.env.VERCEL_URL}`);

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
 * Get absolute URL for preview images
 * Works with Vercel preview deployments automatically
 */
export function getPreviewImageUrl(filename: string): string {
  const base = getSiteUrl();
  // URL encode the filename to handle spaces and special characters
  const encodedFilename = encodeURIComponent(filename);
  return `${base}/preview-images/${encodedFilename}`;
}

