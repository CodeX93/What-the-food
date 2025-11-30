'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { Globe, Shield, Lock, Eye, EyeOff, LogOut } from "lucide-react";

export function SettingsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          router.push("/auth");
          return;
        }

        // Language is already managed by LanguageContext
      } catch (authError) {
        console.error("Error checking auth:", authError);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [router]);

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      // Update language context immediately
      setLanguage(newLanguage as Language);
      
      // Save to profile table in database
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { error } = await (supabase as any)
          .from("profiles")
          .update({ default_language: newLanguage })
          .eq("id", session.user.id);
        
        if (error) {
          console.error("Error saving language to profile:", error);
          toast({
            title: t("settings.error"),
            description: t("settings.error.description") || "Failed to save language preference",
            variant: "destructive",
          });
          return;
        }
      }
      
      toast({
        title: t("settings.success"),
        description: t("settings.success.description"),
      });
    } catch (error) {
      console.error("Error changing language:", error);
      toast({
        title: t("settings.error"),
        description: t("settings.error.description") || "Failed to save language preference",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: t("settings.password.error"),
        description: t("settings.password.fillAll"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t("settings.password.error"),
        description: t("settings.password.minLength"),
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t("settings.password.error"),
        description: t("settings.password.mismatch"),
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: t("settings.password.success"),
        description: t("settings.password.success.description"),
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: t("settings.password.error"),
        description: error?.message || t("settings.password.error.description"),
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Clear client session first
      const { error: clientError } = await supabase.auth.signOut({ scope: "local" });
      if (clientError && clientError.message !== "Auth session missing!") {
        throw clientError;
      }

      // Sign out from server session
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
        title: t("settings.logout.success") || "Logged out",
        description: t("settings.logout.success.description") || "You have been successfully logged out.",
      });

      router.push("/");
      router.refresh();
    } catch (error: any) {
      if (error?.message === "Auth session missing!") {
        router.push("/");
        router.refresh();
        toast({
          title: t("settings.logout.success") || "Logged out",
          description: t("settings.logout.success.description") || "You have been successfully logged out.",
        });
        return;
      }

      console.error("Error logging out:", error);
      toast({
        title: t("settings.logout.error") || "Logout failed",
        description: error?.message || t("settings.logout.error.description") || "Could not log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  if (!mounted || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 pb-2">{t("settings.title")}</h1>
          <p className="text-muted-foreground">{t("settings.description")}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>{t("settings.language.title")}</CardTitle>
            </div>
            <CardDescription>{t("settings.language.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="language">{t("settings.language.label")}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language">
                  <SelectValue placeholder={t("settings.language.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("settings.language.english")}</SelectItem>
                  <SelectItem value="es">{t("settings.language.spanish")}</SelectItem>
                  <SelectItem value="fr">{t("settings.language.french")}</SelectItem>
                  <SelectItem value="de">{t("settings.language.german")}</SelectItem>
                  <SelectItem value="it">{t("settings.language.italian")}</SelectItem>
                  <SelectItem value="pt">{t("settings.language.portuguese")}</SelectItem>
                  <SelectItem value="zh">{t("settings.language.chinese")}</SelectItem>
                  <SelectItem value="ja">{t("settings.language.japanese")}</SelectItem>
                  <SelectItem value="ar">{t("settings.language.arabic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>{t("settings.password.title")}</CardTitle>
            </div>
            <CardDescription>{t("settings.password.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("settings.password.current")}</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("settings.password.current.placeholder")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">{t("settings.password.new")}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("settings.password.new.placeholder")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("settings.password.confirm")}</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("settings.password.confirm.placeholder")}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword} 
              className="w-full"
            >
              {changingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t("settings.password.changing")}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {t("settings.password.change")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              <CardTitle>{t("settings.logout.title")}</CardTitle>
            </div>
            <CardDescription>{t("settings.logout.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleLogout} 
              disabled={loggingOut} 
              variant="destructive"
              className="w-full"
            >
              {loggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t("settings.logout.loggingOut") || "Logging out..."}
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("settings.logout.button") || "Log Out"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
