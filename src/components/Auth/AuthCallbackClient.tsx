'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";
import { supabase } from "@/integrations/supabase/client";

export function AuthCallbackClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const maybeSendSignupWelcome = async () => {
    if (!user?.id) return;

    try {
      console.log("AuthCallbackClient: sending signup welcome email for OAuth user", {
        userId: user.id,
        email: user.email,
        provider: (user.user_metadata as any)?.provider || "unknown",
      });

      await supabase.functions
        .invoke("send-lifecycle-email", {
          body: {
            event_type: "signup",
            email: user.email,
            name: (user.user_metadata as any)?.full_name || user.email,
          },
        })
        .then((response) => {
          if (response.error || (response.data && !response.data.success)) {
            console.error("send-lifecycle-email failed (OAuth):", {
              error: response.error,
              data: response.data,
            });
          } else {
            console.log("Signup email sent successfully (OAuth)");
          }
        })
        .catch((err) => {
          console.error("send-lifecycle-email signup error (OAuth):", {
            message: err?.message || err,
            error: err,
          });
        });
    } catch (err) {
      console.error("send-lifecycle-email signup (OAuth) failed:", err);
      toast({
        title: "Signup email not sent",
        description: "We couldn't send your welcome email. Please retry later.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Fast-path: as soon as AuthContext has a user, navigate away
    if (!user) return;

    const doRedirect = async () => {
      // Fire-and-forget to avoid blocking redirect
      void maybeSendSignupWelcome();
      toast({ title: "Success!", description: "You've been signed in successfully." });
      const redirectPath = await getPostAuthNavigationPath();
      // Use replace so the callback page isn't in the history stack
      router.replace(redirectPath);
    };

    void doRedirect();
  }, [router, toast, user]);

  useEffect(() => {
    // Fallback: if we never get a user within a few seconds, send them back to auth
    if (user) return;

    const timeout = setTimeout(() => {
      toast({
        title: "Authentication timeout",
        description: "We couldn't complete the sign-in. Please try again.",
        variant: "destructive",
      });
      router.replace("/auth");
    }, 8000); // 8s safety timeout

    return () => clearTimeout(timeout);
  }, [router, toast, user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
