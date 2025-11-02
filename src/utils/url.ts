/**
 * Get the application URL from environment variable or fallback to window.location.origin
 * This ensures the correct URL is used in production vs development
 */
export const getAppUrl = (): string => {
  // Check for environment variable first (for production)
  const envUrl = import.meta.env.VITE_APP_URL;
  
  if (envUrl) {
    // Ensure URL doesn't end with a slash
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  
  // Fallback to window.location.origin (for development/localhost)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR
  return '';
};

/**
 * Get the full URL for a given path
 */
export const getUrl = (path: string): string => {
  const baseUrl = getAppUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

