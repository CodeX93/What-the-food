// app/providers.tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import TawkWidget from "@/components/Integrations/TawkWidget";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { User } from "@supabase/supabase-js";

type ProfileData = { avatar_url: string | null; full_name: string | null; };

type AppProvidersProps = {
  children: ReactNode;
  initialUser?: User | null;
  initialProfile?: ProfileData | null;
};

export function AppProviders({ children, initialUser, initialProfile }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <TooltipProvider>
                <ShadcnToaster />
                <Sonner />
                <TawkWidget />
                {children}
              </TooltipProvider>
            </ThemeProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}