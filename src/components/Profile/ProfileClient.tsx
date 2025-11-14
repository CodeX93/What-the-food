'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Save,
  Camera,
  CheckCircle2,
  Crown,
  CreditCard,
  ArrowRight,
  Code,
} from "lucide-react";
import { getPlatformSubscription, getWidgetSubscription } from "@/utils/subscription";
import type { User } from "@supabase/supabase-js";

export type ProfileClientProps = {
  initialUser?: User | null;
  initialProfile?: any;
  initialSubscription?: any;
  initialWidgetSubscription?: any;
  initialPlanName?: string | null;
  initialWidgetPlanName?: string | null;
};

export function ProfileClient({
  initialUser = null,
  initialProfile = null,
  initialSubscription = null,
  initialWidgetSubscription = null,
  initialPlanName = null,
  initialWidgetPlanName = null,
}: ProfileClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<any>(initialProfile);
  const [loading, setLoading] = useState(!initialUser);
  const [subscription, setSubscription] = useState<any>(initialSubscription);
  const [widgetSubscription, setWidgetSubscription] = useState<any>(initialWidgetSubscription);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState<string | null>(initialPlanName);
  const [widgetPlanName, setWidgetPlanName] = useState<string | null>(initialWidgetPlanName);
  const [email, setEmail] = useState(initialUser?.email || "");
  const [userInitials, setUserInitials] = useState(
    initialUser?.email ? initialUser.email.split("@")[0].substring(0, 2).toUpperCase() : "U"
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setEmail(initialUser.email || "");
      setUserInitials(
        initialUser.email ? initialUser.email.split("@")[0].substring(0, 2).toUpperCase() : "U"
      );
      setLoading(false);
    }
  }, [initialUser]);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    setSubscription(initialSubscription);
  }, [initialSubscription]);

  useEffect(() => {
    setWidgetSubscription(initialWidgetSubscription);
  }, [initialWidgetSubscription]);

  useEffect(() => {
    setPlanName(initialPlanName ?? null);
  }, [initialPlanName]);

  useEffect(() => {
    setWidgetPlanName(initialWidgetPlanName ?? null);
  }, [initialWidgetPlanName]);

  useEffect(() => {
    if (initialUser) {
      return;
    }

    let cancelled = false;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          router.push("/auth");
          return;
        }

        if (cancelled) return;

        setUser(session.user);
        setEmail(session.user.email || "");
        setUserInitials(
          session.user.email ? session.user.email.split("@")[0].substring(0, 2).toUpperCase() : "U"
        );

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!cancelled && profileData) {
          setProfile(profileData);
        }

        const sub = await getPlatformSubscription(session.user.id);
        if (!cancelled) {
          setSubscription(sub);

          if (sub?.platform_plan_id) {
            const { data: planRow } = await (supabase as any)
              .from("platform_plans")
              .select("name")
              .eq("id", sub.platform_plan_id)
              .maybeSingle();
            if (!cancelled && planRow?.name) {
              setPlanName(planRow.name);
            }
          }
        }

        const widgetSub = await getWidgetSubscription(session.user.id);
        if (!cancelled) {
          setWidgetSubscription(widgetSub as any);

          const widgetSubData = widgetSub as { subscription_type?: string } | null;
          if (widgetSubData?.subscription_type) {
            const planNames: Record<string, string> = {
              free: "Free",
              plan1: "Premium Plan 1",
              plan2: "Premium Plan 2",
              plan3: "Premium Plan 3",
            };
            setWidgetPlanName(planNames[widgetSubData.subscription_type] || widgetSubData.subscription_type);
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchUserData();

    return () => {
      cancelled = true;
    };
  }, [initialUser, router]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const form = formRef.current || (event.currentTarget as HTMLFormElement);
      const formData = new FormData(form);
      const fullNameRaw = (formData.get("full_name") as string) ?? "";
      const bioRaw = (formData.get("bio") as string) ?? "";

      const fullName = fullNameRaw.trim() || null;
      const bio = bioRaw.trim() || null;

      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: fullName,
          bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (updateError) {
        throw updateError;
      }

      const { data: updatedProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!fetchError && updatedProfile) {
        setProfile(updatedProfile);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
        </div>
      </main>
    );
  }

  const isPremium = subscription?.subscription_type === "premium";
  const isWidgetPremium = widgetSubscription?.subscription_type !== "free" && widgetSubscription?.is_active;

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8 sm:py-12 w-full">
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent pb-1">
                Profile Settings
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your account information and subscriptions
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPremium && (
                <Badge variant="secondary" className="px-4 py-2 text-sm shadow-md">
                  <Crown className="h-4 w-4 mr-2" /> Platform Premium
                </Badge>
              )}
              {isWidgetPremium && (
                <Badge variant="secondary" className="px-4 py-2 text-sm shadow-md">
                  <Code className="h-4 w-4 mr-2" /> Widget Premium
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card className="mb-8 shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl">Profile Information</CardTitle>
                <CardDescription className="mt-1 text-base">Update your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col items-center sm:flex-row gap-8 pb-8 border-b-2 border-dashed">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                  <Avatar className="relative h-32 w-32 sm:h-40 sm:w-40 border-4 border-primary/30 shadow-2xl ring-4 ring-primary/10 transition-all">
                    <AvatarImage src={profile?.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-4xl sm:text-5xl bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer backdrop-blur-sm">
                    <div className="bg-white/20 backdrop-blur-md rounded-full p-3">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="text-center sm:text-left flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-2xl mb-1">{profile?.full_name || "Your Name"}</h3>
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                      <Mail className="h-4 w-4" /> {email}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast({
                        title: "Coming Soon",
                        description: "Avatar upload feature will be available soon.",
                      })
                    }
                  >
                    <Camera className="h-3 w-3 mr-2" /> Change Photo
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" /> Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} disabled className="pl-12 h-12 bg-muted/50 border-2" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" /> Full Name
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      defaultValue={profile?.full_name || ""}
                      placeholder="Enter your full name"
                      className="pl-12 h-12 border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bio" className="text-sm font-semibold">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    rows={5}
                    defaultValue={profile?.bio || ""}
                    placeholder="Tell us about yourself..."
                    className="resize-none border-2 min-h-[140px]"
                  />
                  <p className="text-xs text-muted-foreground">Share a brief description about yourself</p>
                </div>
              </div>

              <div className="pt-6 border-t-2">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Save className="mr-2 h-5 w-5 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          <Card className="shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isPremium ? "bg-gradient-to-br from-primary/30 to-primary/10" : "bg-muted/50"}`}>
                    <CreditCard className={`h-6 w-6 ${isPremium ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl">Platform Subscription</CardTitle>
                    <CardDescription className="mt-1">Your main app plan</CardDescription>
                  </div>
                </div>
                {isPremium && (
                  <Badge variant="default" className="shadow-md">
                    <Crown className="h-3 w-3 mr-1" /> Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-6">
                  <div className={`relative overflow-hidden p-5 rounded-xl border-2 ${
                    isPremium ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30" : "bg-muted/50 border-dashed"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${isPremium ? "bg-primary/20" : "bg-muted"}`}>
                        {isPremium ? (
                          <Crown className="h-6 w-6 text-primary" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Current Plan</p>
                        <p className="font-bold text-xl capitalize">
                          {subscription.subscription_type === "premium" ? "Premium" : "Free"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {planName && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Plan Name</p>
                      <p className="font-bold text-lg">{planName}</p>
                    </div>
                  )}

                  {subscription.billing_cycle && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Billing Cycle</p>
                      <p className="font-semibold text-base capitalize flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {subscription.billing_cycle}
                      </p>
                    </div>
                  )}

                  {subscription.current_period_end && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Next Billing Date</p>
                      <p className="font-semibold text-base">
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t-2">
                    <Button
                      variant={isPremium ? "outline" : "default"}
                      className="w-full h-12 font-semibold"
                      onClick={() => router.push("/plans")}
                    >
                      {isPremium ? (
                        <>
                          Change Plan <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        <>
                          Upgrade Plan <Crown className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                    <CreditCard className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 font-semibold">No subscription found</p>
                    <p className="text-sm text-muted-foreground mb-6">Choose a plan to get started</p>
                  </div>
                  <Button onClick={() => router.push("/plans")} className="w-full h-12 font-semibold">
                    View Plans <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    isWidgetPremium ? "bg-gradient-to-br from-primary/30 to-primary/10" : "bg-muted/50"
                  }`}>
                    <Code className={`h-6 w-6 ${isWidgetPremium ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl">Widget Subscription</CardTitle>
                    <CardDescription className="mt-1">Your widget plan</CardDescription>
                  </div>
                </div>
                {isWidgetPremium && (
                  <Badge variant="default" className="shadow-md">
                    <Code className="h-3 w-3 mr-1" /> Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {widgetSubscription ? (
                <div className="space-y-6">
                  <div className={`relative overflow-hidden p-5 rounded-xl border-2 ${
                    isWidgetPremium ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30" : "bg-muted/50 border-dashed"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${isWidgetPremium ? "bg-primary/20" : "bg-muted"}`}>
                        {isWidgetPremium ? (
                          <Crown className="h-6 w-6 text-primary" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Current Plan</p>
                        <p className="font-bold text-xl">{widgetPlanName || widgetSubscription.subscription_type}</p>
                      </div>
                    </div>
                  </div>

                  {widgetSubscription.site_limit !== undefined && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Site Limit</p>
                      <p className="font-bold text-lg">
                        {widgetSubscription.site_limit === null
                          ? "Unlimited"
                          : `${widgetSubscription.site_limit} ${widgetSubscription.site_limit === 1 ? "site" : "sites"}`}
                      </p>
                    </div>
                  )}

                  {widgetSubscription.billing_cycle && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Billing Cycle</p>
                      <p className="font-semibold text-base capitalize flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {widgetSubscription.billing_cycle}
                      </p>
                    </div>
                  )}

                  {widgetSubscription.current_period_end && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Next Billing Date</p>
                      <p className="font-semibold text-base">
                        {new Date(widgetSubscription.current_period_end).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t-2">
                    <Button
                      variant={isWidgetPremium ? "outline" : "default"}
                      className="w-full h-12 font-semibold"
                      onClick={() => router.push("/widget/plans")}
                    >
                      {isWidgetPremium ? (
                        <>
                          Change Plan <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        <>
                          View Widget Plans <Code className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                    <Code className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 font-semibold">No widget subscription</p>
                    <p className="text-sm text-muted-foreground mb-6">Choose a widget plan to get started</p>
                  </div>
                  <Button onClick={() => router.push("/widget/plans")} className="w-full h-12 font-semibold">
                    View Widget Plans <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
