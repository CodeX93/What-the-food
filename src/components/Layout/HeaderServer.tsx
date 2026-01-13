import Link from "next/link";
import { NavigationLinks } from "./NavigationLinks";
import { HeaderClient } from "./HeaderClient";
import { Logo } from "./Logo";
import { createServerSupabaseClient } from "@/integrations/supabase/server";

export async function HeaderServer() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center gap-6">
        <Link href="/" className="flex items-center border-0 outline-none focus:outline-none focus-visible:outline-none">
          <Logo />
        </Link>
        <div className="hidden md:flex flex-1">
          <NavigationLinks className="ml-6 flex items-center space-x-6" />
        </div>
        <div className="flex-1 md:flex-none flex justify-end">
          <HeaderClient initialUser={user} />
        </div>
      </div>
    </header>
  );
}


// Actually the adding of website is not yet properly implemented, the structure is based on one website but its fully functionality is under development
// The API calls issue is nearly fixed, just going to be final soon

// To Edit the saved widget, you tap on the edit button and scroll down to see the edit section, this seems awful user experience will design it to make proper UI

// Okay I remove the hide button for powered by wTF

// Yea, I just did the integration of widgets not fully functional just need to 