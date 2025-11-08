import Link from "next/link";
import { Utensils } from "lucide-react";
import { NavigationLinks } from "./NavigationLinks";
import { HeaderClient } from "./HeaderClient";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export async function HeaderServer() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Utensils className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            WhatTheFood
          </span>
        </Link>
        <div className="hidden md:block">
          <NavigationLinks className="flex items-center space-x-6" />
        </div>
        <HeaderClient initialUser={user} />
      </div>
    </header>
  );
}

