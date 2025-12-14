'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type ProfileData = {
  avatar_url: string | null;
  full_name: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  profile: ProfileData | null;
  refreshSession: (force?: boolean) => Promise<void>;
  ensureFreshSession: () => Promise<boolean>; // Returns true if session is valid, false if expired
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  refreshSession: async () => {},
  ensureFreshSession: async () => false,
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Cache profile and session in localStorage for instant loading
const PROFILE_CACHE_KEY = 'wtf_profile_cache';
const SESSION_CACHE_KEY = 'wtf_session_cache';

function getCachedProfile(userId: string): ProfileData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${PROFILE_CACHE_KEY}_${userId}`);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is less than 10 minutes old
      if (Date.now() - data.timestamp < 10 * 60 * 1000) {
        return data.profile;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

function setCachedProfile(userId: string, profile: ProfileData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${PROFILE_CACHE_KEY}_${userId}`, JSON.stringify({
      profile,
      timestamp: Date.now(),
    }));
  } catch (error) {
    // Ignore errors
  }
}

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is less than 5 minutes old
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        return data.user;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

function setCachedUser(user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
        user,
        timestamp: Date.now(),
      }));
    } else {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch (error) {
    // Ignore errors
  }
}

type AuthProviderProps = {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: ProfileData | null;
};

export function AuthProvider({ children, initialUser = null, initialProfile = null }: AuthProviderProps) {
  // OPTIMIZATION: Initialize user with cached data for instant display
  const [user, setUser] = useState<User | null>(() => {
    if (initialUser) return initialUser;
    const cached = getCachedUser();
    return cached;
  });
  
  // CRITICAL: Always start with loading=false for instant rendering
  // The auth sync happens in background without blocking
  const [loading, setLoading] = useState(false);
  
  // OPTIMIZATION: Initialize profile with cached data for instant display
  const [profile, setProfile] = useState<ProfileData | null>(() => {
    if (initialProfile) return initialProfile;
    const currentUser = initialUser || getCachedUser();
    if (currentUser?.id) {
      const cached = getCachedProfile(currentUser.id);
      if (cached) return cached;
    }
    return null;
  });
  
  // Track if we've fetched profile for a user to prevent duplicate fetches
  const profileFetchedRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const isFetchingProfileRef = useRef(false);

  // Fetch profile data for a user
  const fetchProfile = useCallback(async (userId: string) => {
    // Prevent duplicate fetches for the same user or concurrent fetches
    if (profileFetchedRef.current === userId || isFetchingProfileRef.current) {
      return;
    }
    
    // OPTIMIZATION: Show cached data immediately, fetch fresh in background
    const cached = getCachedProfile(userId);
    if (cached) {
      setProfile(cached);
    }
    
    // Set refs immediately to prevent concurrent fetches
    profileFetchedRef.current = userId;
    isFetchingProfileRef.current = true;

    try {
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', userId)
        .maybeSingle();
      
      // Only update if we're still fetching for the same user (user hasn't changed)
      if (profileFetchedRef.current === userId) {
        const newProfile = profileData 
          ? {
              avatar_url: profileData.avatar_url || null,
              full_name: profileData.full_name || null,
            }
          : { avatar_url: null, full_name: null };
        
        setProfile(newProfile);
        // Cache the fresh profile data
        setCachedProfile(userId, newProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Only update if we're still fetching for the same user
      if (profileFetchedRef.current === userId && !cached) {
        setProfile({ avatar_url: null, full_name: null });
      }
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, []);

  // If initialUser is provided, fetch profile immediately (don't wait for session check)
  useEffect(() => {
    if (initialUser?.id && profileFetchedRef.current !== initialUser.id) {
      profileFetchedRef.current = initialUser.id;
      fetchProfile(initialUser.id).catch(() => {});
    }
  }, [initialUser?.id, fetchProfile]); // Removed profile from deps to prevent loops

  const refreshSession = useCallback(async (force = false) => {
    // OPTIMIZATION: Balance between proactive refresh and performance
    supabase.auth.getSession().then(({ data: { session: currentSession }, error: getError }) => {
      if (getError || !currentSession) {
        // Only clear user if it's actually an auth error (not just network)
        if (getError?.message?.includes('JWT') || getError?.message?.includes('expired')) {
          setUser(null);
          setProfile(null);
        }
        return;
      }

      // Check if refresh is needed
      if (currentSession?.expires_at) {
        const expiresAt = currentSession.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh if expired or expiring within 10 minutes (proactive but not excessive)
        if (force || timeUntilExpiry < 0 || timeUntilExpiry < 10 * 60 * 1000) {
          // Refresh the session
          supabase.auth.refreshSession().then(({ data: { session: refreshedSession }, error: refreshError }) => {
            if (refreshError) {
              if (timeUntilExpiry < 0) {
                // Token expired and refresh failed - clear user
                setUser(null);
                setProfile(null);
              }
              return;
            }
            
            if (refreshedSession?.user) {
              setUser(prevUser => {
                if (prevUser?.id === refreshedSession.user.id) return prevUser;
                return refreshedSession.user;
              });
              
              // Also update cached user
              setCachedUser(refreshedSession.user);
            }
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  // Utility function to ensure session is fresh before making queries
  // BALANCED: Refresh if expiring within 5 minutes
  const ensureFreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }

      // Check if token is expired or expiring soon
      if (session.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh if expired or expiring within 5 minutes
        if (timeUntilExpiry < 5 * 60 * 1000) {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshedSession) {
            return timeUntilExpiry > 0; // If not expired yet, allow query to proceed
          }
          
          setUser(refreshedSession.user);
          setCachedUser(refreshedSession.user);
          return true;
        }
      }
      
      return true;
    } catch (error) {
      return true; // Don't block queries on error
    }
  }, []);

  useEffect(() => {
    // Prevent re-initialization
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let mounted = true;
    let initTimeout: NodeJS.Timeout | null = null;

    // CRITICAL OPTIMIZATION: onAuthStateChange fires immediately with current session
    // when subscribed, so we rely on it as the primary source
    // Set up listener FIRST before any async operations
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // CRITICAL: Update user state IMMEDIATELY and SYNCHRONOUSLY
      // This ensures UI updates instantly without waiting for async operations
      const newUser = session?.user ?? null;
      
      // Cache the user for instant future loads
      setCachedUser(newUser);
      
      // Only update if user actually changed to prevent unnecessary re-renders
      setUser(prevUser => {
        if (prevUser?.id === newUser?.id) return prevUser;
        return newUser;
      });
      
      setLoading(false);

      // Fetch profile data in parallel (non-blocking) - only if user changed
      if (newUser?.id && profileFetchedRef.current !== newUser.id) {
        profileFetchedRef.current = newUser.id;
        fetchProfile(newUser.id).catch(err => {
          console.error('Error fetching profile after auth change:', err);
        });
      } else if (!newUser) {
        setProfile(null);
        profileFetchedRef.current = null;
      }

      // Handle different auth events
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        profileFetchedRef.current = null;
      } else if (event === 'USER_UPDATED' && newUser?.id) {
        // User data was updated, refresh profile (only if not already fetched)
        if (profileFetchedRef.current !== newUser.id) {
          profileFetchedRef.current = newUser.id;
          fetchProfile(newUser.id).catch(err => {
            console.error('Error fetching profile after user update:', err);
          });
        }
      } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Check token expiry in background (non-blocking)
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          // Refresh if expired or expiring soon (in background, don't block)
          if (timeUntilExpiry < 0 || timeUntilExpiry < 10 * 60 * 1000) {
            supabase.auth.refreshSession().then(({ data: { session: refreshedSession } }) => {
              if (!mounted) return;
              if (refreshedSession?.user) {
                setUser(prevUser => {
                  if (prevUser?.id === refreshedSession.user.id) return prevUser;
                  return refreshedSession.user;
                });
                if (refreshedSession.user.id && profileFetchedRef.current !== refreshedSession.user.id) {
                  profileFetchedRef.current = refreshedSession.user.id;
                  fetchProfile(refreshedSession.user.id).catch(() => {});
                }
              }
            }).catch((err) => {
              console.error('Error refreshing session in background:', err);
            });
          }
        }
      }
    });

    // OPTIMIZATION: Always set loading to false immediately for instant rendering
    // The onAuthStateChange listener will update user state when ready
    setLoading(false);
    
    // If no initialUser, start a background session check (non-blocking)
    if (!initialUser) {
      // Fire and forget - don't block on this
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        if (error || !session?.user) {
          setUser(null);
          return;
        }

        const userToSet = session.user;
        setUser(prevUser => {
          if (prevUser?.id === userToSet?.id) return prevUser;
          return userToSet;
        });
        
        if (userToSet.id && profileFetchedRef.current !== userToSet.id) {
          profileFetchedRef.current = userToSet.id;
          fetchProfile(userToSet.id).catch(() => {});
        }
      }).catch(() => {});
    }

    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      subscription.unsubscribe();
      hasInitializedRef.current = false;
    };
  }, []); // Empty deps - only run once on mount

  // Periodic session refresh to keep auth state fresh and handle token expiration
  useEffect(() => {
    if (!user) return;

    // Check every 3 minutes - balanced approach
    const checkInterval = setInterval(() => {
      refreshSession();
    }, 3 * 60 * 1000); // Check every 3 minutes

    return () => clearInterval(checkInterval);
  }, [user?.id, refreshSession]); // Only depend on user.id, not entire user object

  // Refresh when page becomes visible (user returns after being away)
  useEffect(() => {
    if (!user) return;

    let lastCheck = Date.now();
    const MIN_CHECK_INTERVAL = 30 * 1000; // Don't check more than once per 30 seconds

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Only check if enough time has passed since last check
        if (now - lastCheck > MIN_CHECK_INTERVAL) {
          lastCheck = now;
          // Check and refresh if needed (not forced)
          refreshSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, refreshSession]);

  return (
    <AuthContext.Provider value={{ user, loading, profile, refreshSession, ensureFreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}
