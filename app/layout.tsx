import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "./providers";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import type { User } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/seo/siteUrl";

// Dynamic metadataBase that works with Vercel previews
const getMetadataBase = (): URL => {
  const baseUrl = getSiteUrl();
  return new URL(baseUrl);
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Free AI Food Scanner and Calorie Estimator | What The Food",
  description: "Get accurate nutritional analysis and recipe preparation instructions from any food image in seconds with our free AI food detection app; What The Food.",
  keywords: [
    "What The Food",
    "ai food scanner",
    "ai food tracker",
    "ai recipe generator",
    "best calorie counter app",
    "calorie counter app",
    "calorie counter by recipe",
    "calorie counter mobile app",
    "food detection",
    "food recognition",
    "free calorie counter app",
    "macro tracking",
    "what is this food","calorie estimator",
    "food calorie finder","calorie cal","calorie calculator","calorie counter","food calorie calculator",
    
  ],
  authors: [{ name: "Odeh Ahwal" }],
  robots: {
    index: true,
    follow: true,
  },
  themeColor: "#22C55E",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "AI Food Detection & Free Calorie Counter App By Recipe",
    description: "Get accurate nutritional analysis and recipe preparation instructions from any food image in seconds with our free AI food detection app; What The Food.",
    type: "website",
    url: "https://whatthefood.io",
    images: [
      {
        url: "https://ucarecdn.com/a3a1fb62-3a45-408f-864a-3b30789c8377/WTFpreview.png",
      },
    ],
  },
  alternates: {
    canonical: "https://whatthefood.io",
  },
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "fo-verify": "5e2b562c-d6e8-4a24-aef4-7c1bbdd4a97a",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XHDPX0CS7Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XHDPX0CS7Y');
          `}
        </Script>
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

