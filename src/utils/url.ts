/**
 * Get the application URL from environment variable or fallback to window.location.origin
 * This ensures the correct URL is used in production vs development
 */
export const getAppUrl = (): string => {
  // Check for environment variable first (for production)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (envUrl) {
    // Clean and validate the URL
    let cleanUrl = envUrl.trim();
    // Remove quotes if present
    if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || 
        (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
      cleanUrl = cleanUrl.slice(1, -1);
    }
    // Ensure URL doesn't end with a slash
    cleanUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
    
    // Validate the URL format
    try {
      // Check if it starts with http:// or https://
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        // Validate it's a proper URL
        new URL(cleanUrl);
        return cleanUrl;
      } else {
      console.warn('NEXT_PUBLIC_APP_URL does not start with http:// or https://, using window.location.origin');
      }
    } catch (e) {
      console.warn('NEXT_PUBLIC_APP_URL is not a valid URL, using window.location.origin:', e);
    }
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
  
  // If baseUrl is empty or invalid, use window.location.origin as fallback
  if (!baseUrl) {
    if (typeof window !== 'undefined') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${normalizedPath}`;
    }
    throw new Error('Cannot construct URL: baseUrl is empty and window is not available');
  }
  
  // Validate baseUrl is a proper URL
  try {
    new URL(baseUrl);
  } catch (e) {
    // If baseUrl is invalid, fallback to window.location.origin
    console.warn('Invalid baseUrl, using window.location.origin:', baseUrl);
    if (typeof window !== 'undefined') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${normalizedPath}`;
    }
    throw new Error(`Invalid baseUrl: ${baseUrl}`);
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${normalizedPath}`;
  
  // Final validation
  try {
    new URL(fullUrl);
    return fullUrl;
  } catch (e) {
    console.error('Constructed invalid URL:', fullUrl, e);
    // Fallback to window.location.origin
    if (typeof window !== 'undefined') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${normalizedPath}`;
    }
    throw new Error(`Cannot construct valid URL from baseUrl: ${baseUrl}`);
  }
};

