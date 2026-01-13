"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, Settings, LayoutDashboard, LogOut, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NavigationLinks } from "./NavigationLinks";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type HeaderClientProps = {
  initialUser?: SupabaseUser | null;
};

export function HeaderClient({ initialUser = null }: HeaderClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null; full_name: string | null } | null>(null);
  const loading = authLoading && !initialUser;

  const currentUser = user || initialUser;
  const profileAvatarUrl = profile?.avatar_url ?? null;
  const profileFullName = profile?.full_name ?? null;

  // Fetch profile when user is available
  useEffect(() => {
    const fetchProfile = async () => {
      const userId = currentUser?.id;
      if (!userId) {
        setProfile(null);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("id", userId)
          .maybeSingle();

        // If auth error, try refreshing session and retry
        if (profileError && (
          profileError.message?.includes('JWT') ||
          profileError.message?.includes('expired') ||
          profileError.message?.includes('invalid') ||
          profileError.code === 'PGRST301' ||
          profileError.code === '42501' ||
          profileError.code === 'PGRST116'
        )) {
          console.log('HeaderClient: Auth error, refreshing session...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError) {
            // Retry after refresh
            const { data: retryData } = await supabase
              .from("profiles")
              .select("avatar_url, full_name")
              .eq("id", userId)
              .maybeSingle();
            
            if (retryData) {
              setProfile({
                avatar_url: retryData.avatar_url || null,
                full_name: retryData.full_name || null,
              });
            } else {
              setProfile(null);
            }
            return;
          }
        }

        if (profileData) {
          setProfile({
            avatar_url: profileData.avatar_url || null,
            full_name: profileData.full_name || null,
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("HeaderClient: profile fetch failed", error);
        setProfile(null);
      }
    };

    fetchProfile();
  }, [currentUser?.id, user?.id]); // Also depend on user.id to refetch when session refreshes

  const handleLogout = async () => {
    try {
      // clear client session first
      const { error: clientError } = await supabase.auth.signOut({ scope: "local" });
      if (clientError && clientError.message !== "Auth session missing!") {
        throw clientError;
      }

      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok && response.status !== 401) {
        const data = await response.json().catch(() => null);
        const message = data?.error || "Failed to clear session.";
        throw new Error(message);
      }

      toast({
        title: t("common.loggedout"),
        description: t("common.loggedoutdesc"),
      });

      router.push("/");
      router.refresh();
    } catch (error: any) {
      if (error?.message === "Auth session missing!") {
        // Auth state will be updated by AuthContext
        router.push("/");
        router.refresh();

        toast({
          title: t("common.loggedout"),
          description: t("common.loggedoutdesc"),
        });
        return;
      }

      toast({
        title: t("common.error"),
        description: error.message || t("common.failedlogout"),
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    
    // Try to get initials from full_name first
    if (profileFullName && profileFullName.trim()) {
      const names = profileFullName.trim().split(/\s+/);
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    
    // Fallback to email
    const email = user.email || "";
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      <div className="hidden md:flex items-center space-x-3">
        <LanguageToggle />
        <ThemeToggle />
        {loading ? (
          <div className="w-20 h-9" />
        ) : user ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  {profileAvatarUrl && (
                    <AvatarImage
                      src={profileAvatarUrl}
                      alt={user?.email ?? ""}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.user_metadata?.full_name || t("nav.user")}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>{t("nav.dashboard")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t("nav.profile")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t("nav.settings")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t("nav.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">{t("nav.signin")}</Link>
            </Button>
            <Button size="sm" asChild className="bg-primary hover:bg-primary-hover">
              <Link href="/auth">{t("nav.getstarted")}</Link>
            </Button>
          </>
        )}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">{t("common.openmenu")}</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between mb-4">
              <DrawerTitle className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {t("nav.menu")}
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                  <span className="sr-only">{t("common.closemenu")}</span>
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            <NavigationLinks onLinkClick={() => setOpen(false)} />
            <div className="flex flex-col space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between px-4 py-3 mb-2 border-b">
                <span className="text-base font-medium">{t("nav.language")}</span>
                <LanguageToggle />
              </div>
              <div className="flex items-center justify-between px-4 py-3 mb-2 border-b">
                <span className="text-base font-medium">{t("nav.theme")}</span>
                <ThemeToggle />
              </div>

              {loading ? (
                <div className="h-10" />
              ) : user ? (
                <>
                  <DrawerClose asChild>
                    <Link href="/dashboard" className="text-base font-medium py-3 px-4 rounded-lg hover:bg-muted transition-colors">
                      {t("nav.dashboard")}
                    </Link>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Link href="/profile" className="text-base font-medium py-3 px-4 rounded-lg hover:bg-muted transition-colors">
                      {t("nav.profile")}
                    </Link>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Link href="/settings" className="text-base font-medium py-3 px-4 rounded-lg hover:bg-muted transition-colors">
                      {t("nav.settings")}
                    </Link>
                  </DrawerClose>
                  <div className="my-2 border-t" />
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      {t("nav.logout")}
                    </Button>
                  </DrawerClose>
                </>
              ) : (
                <>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/auth">{t("nav.signin")}</Link>
                    </Button>
                  </DrawerClose>
                  <DrawerClose asChild>
                    <Button className="w-full bg-primary hover:bg-primary-hover" asChild>
                      <Link href="/auth">{t("nav.getstarted")}</Link>
                    </Button>
                  </DrawerClose>
                </>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

