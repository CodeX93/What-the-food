import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "WhatTheFood | AI-Powered Food Insights",
  description: "Analyze meals instantly with AI to understand calories, macros, and personalized health insights.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="ceebc044-5c92-4d48-b07c-65372c8cfbc8"
          strategy="afterInteractive"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

