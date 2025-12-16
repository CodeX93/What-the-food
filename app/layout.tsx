import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "./providers";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import type { User } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "WhatTheFood | AI-Powered Food Insights",
  description: "Analyze meals instantly with AI to understand calories, macros, and personalized health insights.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  // OPTIMIZATION: Fetch user and profile on server for instant display
  let initialUser: User | null = null;
  let initialProfile: { avatar_url: string | null; full_name: string | null } | null = null;
  
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    initialUser = user;
    
    // Fetch profile if user exists
    if (user?.id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .maybeSingle() as { data: { avatar_url: string | null; full_name: string | null } | null };
      
      if (profileData) {
        initialProfile = {
          avatar_url: profileData.avatar_url || null,
          full_name: profileData.full_name || null,
        };
      }
    }
  } catch (error) {
    // Silent fail - client will handle auth
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="ceebc044-5c92-4d48-b07c-65372c8cfbc8"
          strategy="lazyOnload"
        />
        <AppProviders initialUser={initialUser} initialProfile={initialProfile}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

