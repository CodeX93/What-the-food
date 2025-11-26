'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Bell, Globe, Shield, Palette, Moon, Sun, Save } from "lucide-react";

export function SettingsClient() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [language, setLanguage] = useState("en");

  const isDarkMode = resolvedTheme === "dark";

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

        const savedEmailNotifs = typeof window !== "undefined" ? localStorage.getItem("emailNotifications") : null;
        const savedPushNotifs = typeof window !== "undefined" ? localStorage.getItem("pushNotifications") : null;
        const savedLanguage = typeof window !== "undefined" ? localStorage.getItem("language") : null;

        if (savedEmailNotifs !== null) {
          setEmailNotifications(savedEmailNotifs === "true");
        }
        if (savedPushNotifs !== null) {
          setPushNotifications(savedPushNotifs === "true");
        }
        if (savedLanguage) {
          setLanguage(savedLanguage);
        }
      } catch (authError) {
        console.error("Error checking auth:", authError);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("emailNotifications", emailNotifications.toString());
        localStorage.setItem("pushNotifications", pushNotifications.toString());
        localStorage.setItem("language", language);
      }

      toast({
        title: t("settings.success"),
        description: t("settings.success.description"),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("settings.error"),
        description: t("settings.error.description"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const handleThemeSelect = (value: string) => {
    setTheme(value);
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
              <Bell className="h-5 w-5" />
              <CardTitle>{t("settings.notifications.title")}</CardTitle>
            </div>
            <CardDescription>{t("settings.notifications.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">{t("settings.notifications.email")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notifications.email.description")}</p>
              </div>
              <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">{t("settings.notifications.push")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.notifications.push.description")}</p>
              </div>
              <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} disabled />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>{t("settings.appearance.title")}</CardTitle>
            </div>
            <CardDescription>{t("settings.appearance.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">{t("settings.appearance.darkmode")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.appearance.darkmode.description")}</p>
              </div>
              <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={handleThemeToggle} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">{t("settings.appearance.theme")}</Label>
              <Select value={theme || "system"} onValueChange={handleThemeSelect}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder={t("settings.appearance.theme.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> {t("settings.appearance.theme.system")}
                    </div>
                  </SelectItem>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" /> {t("settings.appearance.theme.light")}
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" /> {t("settings.appearance.theme.dark")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
              <Select value={language} onValueChange={setLanguage}>
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
              <CardTitle>{t("settings.privacy.title")}</CardTitle>
            </div>
            <CardDescription>{t("settings.privacy.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              {t("settings.privacy.changepassword")}
            </Button>
            <Button variant="outline" className="w-full justify-start">
              {t("settings.privacy.twofactor")}
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
              {t("settings.privacy.deleteaccount")}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {t("settings.saving")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> {t("settings.save")}
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
