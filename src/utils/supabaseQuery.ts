/**
 * Utility to wrap Supabase queries with automatic session refresh on auth failures
 * This ensures queries always work even after inactivity
 * 
 * OPTIMIZED: Queries run immediately without pre-checks for instant performance
 * Only refreshes session if the query fails with an auth error, then retries
 */

import { supabase } from "@/integrations/supabase/client";

type QueryFunction<T> = () => Promise<T>;

export async function queryWithRetry<T>(
  queryFn: QueryFunction<T>,
  maxRetries = 1
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // OPTIMIZED: No pre-check - just run the query immediately
      // Only refresh if the query fails with an auth error
      const result = await queryFn();
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's an auth error
      const isAuthError = 
        error?.message?.includes('JWT') ||
        error?.message?.includes('expired') ||
        error?.message?.includes('invalid') ||
        error?.message?.includes('access control') ||
        error?.code === 'PGRST301' ||
        error?.code === '42501' ||
        error?.code === 'PGRST116';

      if (isAuthError && attempt < maxRetries) {
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          throw error; // Give up if refresh fails
        }
        
        // Wait a moment for the client to update
        await new Promise(resolve => setTimeout(resolve, 100));
        // Loop will retry
      } else {
        // Not an auth error or out of retries
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Example usage:
 * 
 * const widgets = await queryWithRetry(async () => {
 *   const { data, error } = await supabase
 *     .from('widget_settings')
 *     .select('*')
 *     .eq('user_id', userId);
 *   
 *   if (error) throw error;
 *   return data;
 * });
 */
