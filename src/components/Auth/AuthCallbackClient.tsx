'use client';

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";
import { supabase } from "@/integrations/supabase/client";

export function AuthCallbackClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const hasRedirectedRef = useRef(false);

  // Direct session check as fallback if AuthContext is slow
  useEffect(() => {
    if (hasRedirectedRef.current) return;

    const checkSessionDirectly = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user && !hasRedirectedRef.current) {
          console.log('Session found directly (bypassing AuthContext):', session.user.id);
          hasRedirectedRef.current = true;
          
          // Quick check for new user
          let isNewUser = false;
          if (session.user.created_at) {
            const timeSinceCreation = Date.now() - new Date(session.user.created_at).getTime();
            isNewUser = timeSinceCreation < 60000;
          }

          // Send email in background if new user
          if (isNewUser) {
            sendSignupWelcome(session.user).catch(err => 
              console.error('Error sending welcome email:', err)
            );
          }

          toast({ 
            title: "Success!", 
            description: "You've been signed in successfully." 
          });

          const redirectPath = await getPostAuthNavigationPath();
          // Force full page reload to ensure Supabase client initializes properly with cookies
          window.location.href = redirectPath;
        }
      } catch (err) {
        console.error('Error checking session directly:', err);
      }
    };

    // Check after a short delay to give AuthContext a chance first
    const timeout = setTimeout(checkSessionDirectly, 1000);
    return () => clearTimeout(timeout);
  }, [router, toast]);

  useEffect(() => {
    // Once user is available from AuthContext, redirect
    if (!user || hasRedirectedRef.current) return;

    const handleSuccess = async () => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;

      console.log('User authenticated:', {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        provider: (user.user_metadata as any)?.provider || 'email',
      });

      // Quick check using user.created_at (no DB query, fast)
      // Check if user was created within last 60 seconds
      let isNewUser = false;
      if (user.created_at) {
        const timeSinceCreation = Date.now() - new Date(user.created_at).getTime();
        isNewUser = timeSinceCreation < 60000;
        
        console.log('New user check (quick):', {
          isNewUser,
          created_at: user.created_at,
          timeSinceCreation: timeSinceCreation,
          timeSinceCreationSeconds: Math.floor(timeSinceCreation / 1000),
        });
      }

      // Send email in background (non-blocking)
      if (isNewUser) {
        console.log('New user detected, sending welcome email in background...');
        // Fire and forget - don't block redirect
        sendSignupWelcome(user).then((result) => {
          if (result.success) {
            console.log('Welcome email sent successfully');
          } else {
            console.error('Failed to send welcome email:', result.error);
          }
        }).catch((err) => {
          console.error('Error in welcome email send:', err);
        });
      } else {
        console.log('Existing user, skipping welcome email');
      }

      // Redirect immediately - don't wait for email
      toast({ 
        title: "Success!", 
        description: "You've been signed in successfully." 
      });

      const redirectPath = await getPostAuthNavigationPath();
      // Force full page reload to ensure Supabase client initializes properly with cookies
      window.location.href = redirectPath;
    };

    handleSuccess();
  }, [user, router, toast]);

  // Fallback timeout - check session directly if AuthContext hasn't updated
  useEffect(() => {
    if (hasRedirectedRef.current) return;

    const timeout = setTimeout(async () => {
      if (!user && !hasRedirectedRef.current) {
        console.log('Timeout reached, checking session directly...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('Found session on timeout, redirecting...');
            hasRedirectedRef.current = true;
            toast({ 
              title: "Success!", 
              description: "You've been signed in successfully." 
            });
            const redirectPath = await getPostAuthNavigationPath();
            // Force full page reload to ensure Supabase client initializes properly with cookies
            window.location.href = redirectPath;
            return;
          }
        } catch (err) {
          console.error('Error checking session on timeout:', err);
        }

        console.error('Auth callback timeout - no session found');
        toast({
          title: "Authentication timeout",
          description: "Please try signing in again.",
          variant: "destructive",
        });
        router.replace('/auth');
      }
    }, 8000); // Reduced to 8 seconds

    return () => clearTimeout(timeout);
  }, [user, router, toast]);

  const sendSignupWelcome = async (user: any): Promise<{ success: boolean; error?: any }> => {
    try {
      const name = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.email?.split('@')[0] ||
                   'there';

      console.log('Invoking send-lifecycle-email function:', {
        event_type: 'signup',
        email: user.email,
        name,
      });

      const requestBody = {
        event_type: "signup",
        email: user.email,
        name: name,
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      console.log('Calling Supabase edge function...');
      console.log('Function name: send-lifecycle-email');
      
      const startTime = Date.now();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Missing Supabase environment variables');
        return { success: false, error: 'Missing Supabase configuration' };
      }
      
      const functionUrl = `${supabaseUrl}/functions/v1/send-lifecycle-email`;
      console.log('Function URL:', functionUrl);
      
      let response: any;
      try {
        // Try direct fetch first (more reliable)
        console.log('Attempting direct fetch to edge function...');
        const fetchPromise = fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify(requestBody),
        });
        
        // Add timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Function call timeout after 10 seconds')), 10000);
        });
        
        console.log('Waiting for function response...');
        const fetchResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          throw new Error(`Function returned ${fetchResponse.status}: ${errorText}`);
        }
        
        const responseData = await fetchResponse.json();
        response = { data: responseData, error: null };
        
        const duration = Date.now() - startTime;
        console.log(`✅ Function call completed in ${duration}ms`);
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`❌ Function call failed after ${duration}ms:`, err);
        console.error('Error details:', {
          message: err?.message,
          name: err?.name,
          stack: err?.stack,
        });
        
        // Store error in localStorage
        try {
          localStorage.setItem('last_email_response', JSON.stringify({
            timestamp: new Date().toISOString(),
            error: err?.message || err,
            request: requestBody,
            functionUrl,
          }));
        } catch (e) {
          // Ignore localStorage errors
        }
        
        return { success: false, error: err?.message || err };
      }

      // Store response in localStorage for debugging (even after redirect)
      try {
        localStorage.setItem('last_email_response', JSON.stringify({
          timestamp: new Date().toISOString(),
          response: {
            error: response.error,
            data: response.data,
          },
          request: requestBody,
        }));
      } catch (e) {
        // Ignore localStorage errors
      }

      console.log('=== send-lifecycle-email RESPONSE ===');
      console.log('Full response object:', response);
      console.log('Response error:', response.error);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data stringified:', JSON.stringify(response.data, null, 2));
      console.log('===================================');

      if (response.error) {
        console.error("❌ Email send error from Supabase:", response.error);
        console.error("Error details:", {
          message: response.error.message,
          name: response.error.name,
          stack: response.error.stack,
        });
        return { success: false, error: response.error };
      }

      // Check if response.data exists and parse it
      if (response.data) {
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        
        if (!data.success) {
          console.error("❌ Email send failed - function returned error:", data);
          console.error("Error details:", {
            error: data.error,
            result: data.result,
            skipped: data.skipped,
            reason: data.reason,
          });
          return { success: false, error: data.error || data.reason || 'Unknown error from function' };
        }

        console.log("✅ Welcome email sent successfully!");
        console.log("Function response:", data);
        return { success: true };
      }

      // If no data and no error, assume success (some functions return empty on success)
      console.log("✅ Welcome email function called (no response data, assuming success)");
      return { success: true };
    } catch (err: any) {
      console.error("❌ Exception sending welcome email:", err);
      console.error("Error details:", {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        cause: err?.cause,
      });
      return { success: false, error: err?.message || err };
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}