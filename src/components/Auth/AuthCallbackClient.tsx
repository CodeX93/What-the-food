'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";

export function AuthCallbackClient() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          toast({ title: "Success!", description: "You've been signed in successfully." });
          const redirectPath = await getPostAuthNavigationPath();
          router.push(redirectPath);
          window.location.reload();
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
  }, [router, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
