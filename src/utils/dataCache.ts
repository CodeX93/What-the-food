/**
 * Comprehensive data caching utility for instant UI loading
 * Caches: subscriptions, scans, profile data, etc.
 */

const CACHE_DURATION = {
  SHORT: 10 * 60 * 1000,      // 2 minutes
  MEDIUM: 25 * 60 * 1000,     // 5 minutes
  LONG: 50 * 60 * 1000,      // 10 minutes
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

export class DataCache {
  private static isClient = typeof window !== 'undefined';

  /**
   * Get cached data if valid
   */
  static get<T>(key: string): T | null {
    if (!this.isClient) return null;
    
    try {
      const cached = localStorage.getItem(`wtf_cache_${key}`);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() < entry.expiresAt) {
        return entry.data;
      }
      
      // Cache expired, remove it
      this.remove(key);
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Set cached data with expiration
   */
  static set<T>(key: string, data: T, duration: number = CACHE_DURATION.MEDIUM): void {
    if (!this.isClient) return;
    
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      };
      
      localStorage.setItem(`wtf_cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Remove cached data
   */
  static remove(key: string): void {
    if (!this.isClient) return;
    
    try {
      localStorage.removeItem(`wtf_cache_${key}`);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache
   */
  static clearAll(): void {
    if (!this.isClient) return;
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('wtf_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache age in milliseconds
   */
  static getAge(key: string): number | null {
    if (!this.isClient) return null;
    
    try {
      const cached = localStorage.getItem(`wtf_cache_${key}`);
      if (!cached) return null;

      const entry: CacheEntry<any> = JSON.parse(cached);
      return Date.now() - entry.timestamp;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if cache exists and is valid
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Fetch with cache - returns cached data immediately, fetches fresh in background
   */
  static async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      duration?: number;
      forceRefresh?: boolean;
      onUpdate?: (data: T) => void;
    } = {}
  ): Promise<T> {
    const { duration = CACHE_DURATION.MEDIUM, forceRefresh = false, onUpdate } = options;

    // Return cached data immediately if available and not forcing refresh
    if (!forceRefresh) {
      const cached = this.get<T>(key);
      if (cached) {
        // Fetch fresh data in background
        fetcher().then(fresh => {
          this.set(key, fresh, duration);
          onUpdate?.(fresh);
        }).catch(console.error);
        
        return cached;
      }
    }

    // No cache or force refresh - fetch fresh data
    const fresh = await fetcher();
    this.set(key, fresh, duration);
    return fresh;
  }
}

// Predefined cache keys
export const CACHE_KEYS = {
  SUBSCRIPTION: (userId: string) => `subscription_${userId}`,
  SCANS: (userId: string) => `scans_${userId}`,
  SCAN_COUNT: (userId: string) => `scan_count_${userId}`,
  ANALYTICS: (userId: string) => `analytics_${userId}`,
  FREE_SCANS: (userId: string) => `free_scans_${userId}`,
};

// Export cache durations for convenience
export { CACHE_DURATION };
