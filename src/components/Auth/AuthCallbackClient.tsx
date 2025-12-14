'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";

export function AuthCallbackClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, refreshSession } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Wait for auth context to load
      if (loading) return;

      try {
        // Refresh session to ensure we have latest state
        await refreshSession();
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check session again after refresh
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session || user) {
          toast({ title: "Success!", description: "You've been signed in successfully." });
          const redirectPath = await getPostAuthNavigationPath();
          // Small delay to ensure auth context has updated
          setTimeout(() => {
            router.push(redirectPath);
          }, 500);
        } else {
          toast({
            title: "Authentication failed",
            description: "Unable to authenticate. Please try again.",
            variant: "destructive",
          });
          router.push("/auth");
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "An error occurred during authentication.",
          variant: "destructive",
        });
        router.push("/auth");
      }
    };

    void handleAuthCallback();
  }, [router, toast, user, loading, refreshSession]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
