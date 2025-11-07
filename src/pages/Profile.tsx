// ============================================
// ENHANCED PROFILE PAGE
// ============================================

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Calendar, Save, Camera, CheckCircle2, Crown, CreditCard, ArrowRight, Code } from "lucide-react";
import { getPlatformSubscription, getWidgetSubscription } from "@/utils/subscription";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [widgetSubscription, setWidgetSubscription] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [widgetPlanName, setWidgetPlanName] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [userInitials, setUserInitials] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          navigate("/auth");
          return;
        }

        setUser(session.user);
        setEmail(session.user.email || "");
        setUserInitials(
          session.user.email
            ? session.user.email
                .split("@")[0]
                .substring(0, 2)
                .toUpperCase()
            : "U"
        );

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
        }

        // Fetch platform subscription
        const sub = await getPlatformSubscription(session.user.id);
        setSubscription(sub);

        // Resolve platform plan name
        if (sub?.platform_plan_id) {
          const { data: planRow } = await supabase
            .from("platform_plans")
            .select("name")
            .eq("id", sub.platform_plan_id)
            .maybeSingle();
          if (planRow?.name) setPlanName(planRow.name);
        }

        // Fetch widget subscription
        const widgetSub = await getWidgetSubscription(session.user.id);
        setWidgetSubscription(widgetSub);

        // Resolve widget plan name (map subscription_type to display name)
        if (widgetSub?.subscription_type) {
          const planNames: Record<string, string> = {
            'free': 'Free',
            'plan1': 'Premium Plan 1',
            'plan2': 'Premium Plan 2',
            'plan3': 'Premium Plan 3',
          };
          setWidgetPlanName(planNames[widgetSub.subscription_type] || widgetSub.subscription_type);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      // Get form element from ref or event target
      const form = formRef.current || e.currentTarget;
      if (!form || !(form instanceof HTMLFormElement)) {
        throw new Error('Form element not found');
      }

      const formData = new FormData(form);
      const fullNameRaw = formData.get("full_name") as string;
      const bioRaw = formData.get("bio") as string;
      
      // Trim and convert empty strings to null
      const fullName = fullNameRaw?.trim() || null;
      const bio = bioRaw?.trim() || null;

      // Prepare profile data - use upsert to handle both create and update
      const profileData: any = {
        id: session.user.id,
        email: session.user.email || '',
        full_name: fullName,
        bio: bio,
        updated_at: new Date().toISOString(),
      };

      console.log('Saving profile:', { 
        fullNameRaw,
        bioRaw,
        fullName, 
        bio, 
        userId: session.user.id,
        userEmail: session.user.email,
        profileData,
      });

      // Try update first (since profile should exist)
      // Use .select() with minimal columns to check if update succeeded
      // If select fails with 406, we'll check count separately
      let updateResult: any[] | null = null;
      let updateError: any = null;
      
      try {
        const result = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            bio: bio,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id)
          .select("id");
        
        updateResult = result.data;
        updateError = result.error;
      } catch (err: any) {
        // If select fails, try without select to see if update works
        console.warn('Select failed, trying update without select:', err);
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            bio: bio,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);
        
        updateError = error;
        // If update without select succeeds, assume it worked
        if (!error) {
          updateResult = [{ id: session.user.id }];
        }
      }

      if (updateError) {
        console.error('Error updating profile:', updateError);
        console.error('Error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        
        // If update fails, it might be RLS blocking it
        // Try to fetch the profile first to see if it exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!existingProfile) {
          throw new Error('Profile not found. Please contact support.');
        } else {
          // Profile exists but update failed - likely RLS policy issue
          console.error('RLS Policy Error:', {
            errorCode: updateError.code,
            errorMessage: updateError.message,
            userId: session.user.id,
            profileId: existingProfile.id,
            idsMatch: session.user.id === existingProfile.id,
          });
          
          throw new Error(
            `Update blocked by security policy. Error: ${updateError.message}. ` +
            `Please ensure the UPDATE RLS policy is correctly configured. ` +
            `Run migration: 20250104000000_fix_profiles_update_policy.sql`
          );
        }
      }

      // Check if update actually affected rows
      if (!updateResult || updateResult.length === 0) {
        console.warn('Update returned no rows - RLS might be blocking');
        console.error('RLS Policy Issue:', {
          userId: session.user.id,
          errorCode: updateError?.code,
          errorMessage: updateError?.message,
          hint: 'Run FIX_PROFILE_RLS.sql in Supabase SQL Editor',
        });
        throw new Error(
          'Update did not affect any rows. The RLS policy is blocking the update. ' +
          'Please run the SQL script: FIX_PROFILE_RLS.sql in Supabase SQL Editor to fix this.'
        );
      }

      console.log('Profile update succeeded, rows affected:', updateResult.length);

      // Wait a moment for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fetch the updated profile separately - try multiple times if needed
      let updatedProfile = null;
      let fetchError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, bio, email, created_at, updated_at")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!error && data) {
          updatedProfile = data;
          fetchError = null;
          break;
        }
        
        fetchError = error;
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (fetchError) {
        console.error('Error fetching updated profile after retries:', fetchError);
        // Don't throw - update might have succeeded, just fetch failed
      } else if (updatedProfile) {
        console.log('Profile updated and fetched successfully:', updatedProfile);
        console.log('Updated profile data:', {
          fullName: updatedProfile.full_name,
          bio: updatedProfile.bio,
          email: updatedProfile.email,
          hasProfile: !!updatedProfile,
        });
      } else {
        console.warn('Profile update succeeded but fetch returned null');
        // Update succeeded, but fetch failed - update local state from what we know
        updatedProfile = {
          id: session.user.id,
          email: session.user.email,
          full_name: fullName,
          bio: bio,
        };
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });

      // Update local state with the fetched profile
      if (updatedProfile) {
        setProfile(updatedProfile);
        console.log('Local profile state updated with:', updatedProfile);
      } else {
        // Fallback: Update local state with what we know was saved
        const fallbackProfile = {
          ...profile, // Keep existing profile data
          full_name: fullName,
          bio: bio,
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        console.log('Using fallback profile data:', fallbackProfile);
        
        // Try one more fetch after a delay
        setTimeout(async () => {
          const { data: finalProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          if (finalProfile) {
            setProfile(finalProfile);
            console.log('Final fallback profile fetched:', finalProfile);
          }
        }, 1000);
      }
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
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <TopBar />
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <User className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPremium = subscription?.subscription_type === 'premium';
  const isWidgetPremium = widgetSubscription?.subscription_type !== 'free' && widgetSubscription?.is_active;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header Section with Enhanced Design */}
            <div className="mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    Profile Settings
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your account information and subscriptions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isPremium && (
                    <Badge variant="secondary" className="px-4 py-2 text-sm shadow-md">
                      <Crown className="h-4 w-4 mr-2" />
                      Platform Premium
                    </Badge>
                  )}
                  {isWidgetPremium && (
                    <Badge variant="secondary" className="px-4 py-2 text-sm shadow-md">
                      <Code className="h-4 w-4 mr-2" />
                      Widget Premium
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Information Section */}
            <Card className="mb-8 shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl sm:text-3xl">Profile Information</CardTitle>
                    <CardDescription className="mt-1 text-base">Update your personal information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleSave} className="space-y-6">
                  {/* Enhanced Avatar Section */}
                  <div className="flex flex-col items-center sm:flex-row gap-8 pb-8 border-b-2 border-dashed">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                      <Avatar className="relative h-32 w-32 sm:h-40 sm:w-40 border-4 border-primary/30 shadow-2xl ring-4 ring-primary/10 transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-110">
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
                        <h3 className="font-bold text-2xl mb-1">{profile?.full_name || 'Your Name'}</h3>
                        <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                          <Mail className="h-4 w-4" />
                          {email}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shadow-md hover:shadow-lg transition-all"
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Avatar upload feature will be available soon.",
                          });
                        }}
                      >
                        <Camera className="h-3 w-3 mr-2" />
                        Change Photo
                      </Button>
                    </div>
                  </div>

                  {/* Enhanced Form Fields */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="pl-12 h-12 bg-muted/50 border-2 focus-visible:ring-2 focus-visible:ring-primary/20 text-base"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="full_name"
                          name="full_name"
                          type="text"
                          defaultValue={profile?.full_name || ""}
                          placeholder="Enter your full name"
                          className="pl-12 h-12 border-2 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-base"
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
                        className="resize-none border-2 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all min-h-[140px] text-base"
                      />
                      <p className="text-xs text-muted-foreground">Share a brief description about yourself</p>
                    </div>
                  </div>

                  {/* Enhanced Save Button */}
                  <div className="pt-6 border-t-2">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Save className="mr-2 h-5 w-5 animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Subscriptions Section - Side by Side */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Platform Subscription Card */}
              <Card className="shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50 hover:border-primary/20 transition-all">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${isPremium ? 'bg-gradient-to-br from-primary/30 to-primary/10' : 'bg-muted/50'}`}>
                        <CreditCard className={`h-6 w-6 ${isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl sm:text-2xl">Platform Subscription</CardTitle>
                        <CardDescription className="mt-1">Your main app plan</CardDescription>
                      </div>
                    </div>
                    {isPremium && (
                      <Badge variant="default" className="shadow-md">
                        <Crown className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {subscription ? (
                    <div className="space-y-6">
                      {/* Enhanced Plan Type Badge */}
                      <div className={`relative overflow-hidden p-5 rounded-xl border-2 ${isPremium ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30' : 'bg-muted/50 border-dashed'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${isPremium ? 'bg-primary/20' : 'bg-muted'}`}>
                              {isPremium ? (
                                <Crown className="h-6 w-6 text-primary" />
                              ) : (
                                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 font-medium">Current Plan</p>
                              <p className="font-bold text-xl capitalize">
                                {subscription.subscription_type === 'premium' ? 'Premium' : 'Free'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Plan Details */}
                      <div className="space-y-3">
                        {planName && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/20 transition-all">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Plan Name</p>
                            <p className="font-bold text-lg">{planName}</p>
                          </div>
                        )}

                        {subscription.billing_cycle && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/20 transition-all">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Billing Cycle</p>
                            <p className="font-semibold text-base capitalize flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-primary" />
                              {subscription.billing_cycle}
                            </p>
                          </div>
                        )}

                        {subscription.current_period_end && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/20 transition-all">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Next Billing Date</p>
                            <p className="font-semibold text-base">
                              {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Enhanced Action Button */}
                      <div className="pt-4 border-t-2">
                        <Button
                          variant={isPremium ? "outline" : "default"}
                          className="w-full h-12 font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                          onClick={() => navigate('/plans')}
                        >
                          {isPremium ? (
                            <>
                              Change Plan
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          ) : (
                            <>
                              Upgrade Plan
                              <Crown className="ml-2 h-5 w-5" />
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
                        <p className="text-sm text-muted-foreground mb-6">
                          Choose a plan to get started
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate('/plans')}
                        className="w-full h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                      >
                        View Plans
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Widget Subscription Card */}
              <Card className="shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50 hover:border-primary/20 transition-all">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${isWidgetPremium ? 'bg-gradient-to-br from-primary/30 to-primary/10' : 'bg-muted/50'}`}>
                        <Code className={`h-6 w-6 ${isWidgetPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl sm:text-2xl">Widget Subscription</CardTitle>
                        <CardDescription className="mt-1">Your widget plan</CardDescription>
                      </div>
                    </div>
                    {isWidgetPremium && (
                      <Badge variant="default" className="shadow-md">
                        <Code className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {widgetSubscription ? (
                    <div className="space-y-6">
                      {/* Enhanced Plan Type Badge */}
                      <div className={`relative overflow-hidden p-5 rounded-xl border-2 ${isWidgetPremium ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30' : 'bg-muted/50 border-dashed'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${isWidgetPremium ? 'bg-primary/20' : 'bg-muted'}`}>
                              {isWidgetPremium ? (
                                <Crown className="h-6 w-6 text-primary" />
                              ) : (
                                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1 font-medium">Current Plan</p>
                              <p className="font-bold text-xl">
                                {widgetPlanName || widgetSubscription.subscription_type}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Plan Details */}
                      <div className="space-y-3">
                        {widgetSubscription.site_limit !== undefined && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/20 transition-all">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Site Limit</p>
                            <p className="font-bold text-lg">
                              {widgetSubscription.site_limit === null
                                ? 'Unlimited'
                                : `${widgetSubscription.site_limit} ${widgetSubscription.site_limit === 1 ? 'site' : 'sites'}`}
                            </p>
                          </div>
                        )}

                        {widgetSubscription.billing_cycle && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/20 transition-all">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Billing Cycle</p>
                            <p className="font-semibold text-base capitalize flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-primary" />
                              {widgetSubscription.billing_cycle}
                            </p>
                          </div>
                        )}

                        {widgetSubscription.current_period_end && (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10 hover:border-primary/20 transition-all">
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Next Billing Date</p>
                            <p className="font-semibold text-base">
                              {new Date(widgetSubscription.current_period_end).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Enhanced Action Button */}
                      <div className="pt-4 border-t-2">
                        <Button
                          variant={isWidgetPremium ? "outline" : "default"}
                          className="w-full h-12 font-semibold transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                          onClick={() => navigate('/widget/plans')}
                        >
                          {isWidgetPremium ? (
                            <>
                              Change Plan
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          ) : (
                            <>
                              View Widget Plans
                              <Code className="ml-2 h-5 w-5" />
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
                        <p className="text-sm text-muted-foreground mb-6">
                          Choose a widget plan to get started
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate('/widget/plans')}
                        className="w-full h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                      >
                        View Widget Plans
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
