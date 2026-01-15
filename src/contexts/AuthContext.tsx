'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes - Supabase automatically refreshes tokens
    // and fires TOKEN_REFRESHED events, which we handle here
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        // Update user state for all events (TOKEN_REFRESHED is handled automatically)
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Periodically check session and trigger refresh if needed
    // This ensures tokens refresh even during long inactivity
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Session error - try to refresh
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            // Refresh token also expired - clear user
            setUser(null);
          }
        } else if (session) {
          // Session exists - refresh it to get a new access token
          // Pass the session object to ensure we use the correct refresh token
          const { error: refreshError } = await supabase.auth.refreshSession(session);
          if (refreshError) {
            // If refresh fails, clear user
            if (refreshError.message?.includes('expired') || refreshError.message?.includes('invalid')) {
              setUser(null);
            }
          }
          // onAuthStateChange will update user state if refresh succeeds
        }
      } catch (error) {
        console.error('Error in session refresh interval:', error);
      }
    }, 1 * 60 * 1000); // 1 minutes - check frequently to prevent expiration

    // Also check session when user returns to the tab or focuses the window
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          // Force a session check when tab becomes visible
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            // Try to recover session
            await supabase.auth.refreshSession();
          } else {
            // Session exists, ensure it's valid
            await supabase.auth.refreshSession(session);
          }
        } catch (error) {
          console.error('Error refreshing session on visibility change:', error);
        }
      }
    };

    // Check on focus as well (more reliable than visibility change in some browsers)
    const handleFocus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.refreshSession(session);
        } else {
          // Attempt recovery if no session found but we think we're logged in
          await supabase.auth.refreshSession();
        }
      } catch (e) {
        console.error("Focus refresh error", e);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};