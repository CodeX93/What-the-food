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
import { User, Mail, Calendar, Save, Camera, CheckCircle2, Crown, CreditCard, ArrowRight } from "lucide-react";
import { getPlatformSubscription } from "@/utils/subscription";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
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

        // Resolve plan name
        if (sub?.platform_plan_id) {
          const { data: planRow } = await supabase
            .from("platform_plans")
            .select("name")
            .eq("id", sub.platform_plan_id)
            .maybeSingle();
          if (planRow?.name) setPlanName(planRow.name);
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8 sm:mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Profile Settings
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your account information and subscription
                  </p>
                </div>
                {isPremium && (
                  <Badge variant="secondary" className="w-fit px-4 py-2 text-sm">
                    <Crown className="h-4 w-4 mr-2" />
                    Premium Member
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Profile Information Card - Takes 2 columns on large screens */}
              <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 border-2">
                <CardHeader className="pb-4 sm:pb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">Profile Information</CardTitle>
                      <CardDescription className="mt-1">Update your personal information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form ref={formRef} onSubmit={handleSave} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b">
                      <div className="relative group">
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-primary/20 shadow-lg ring-4 ring-primary/10 transition-all duration-300 group-hover:ring-primary/20 group-hover:scale-105">
                          <AvatarImage src={profile?.avatar_url} className="object-cover" />
                          <AvatarFallback className="text-3xl sm:text-4xl bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h3 className="font-semibold text-lg mb-1">{profile?.full_name || 'Your Name'}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{email}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            // TODO: Implement avatar upload
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

                    {/* Form Fields */}
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            className="pl-10 h-11 bg-muted/50 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="full_name" className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            id="full_name"
                            name="full_name"
                            type="text"
                            defaultValue={profile?.full_name || ""}
                            placeholder="Enter your full name"
                            className="pl-10 h-11 border-2 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          rows={5}
                          defaultValue={profile?.bio || ""}
                          placeholder="Tell us about yourself..."
                          className="resize-none border-2 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all min-h-[120px]"
                        />
                        <p className="text-xs text-muted-foreground">Share a brief description about yourself</p>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 border-t">
                      <Button
                        type="submit"
                        className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Save className="mr-2 h-4 w-4 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Subscription Card - Takes 1 column on large screens */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 bg-gradient-to-br from-card to-card/50">
                <CardHeader className="pb-4 sm:pb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPremium ? 'bg-primary/20' : 'bg-muted'}`}>
                      <CreditCard className={`h-5 w-5 ${isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl sm:text-2xl">Subscription</CardTitle>
                      <CardDescription className="mt-1">Your current plan details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subscription ? (
                    <div className="space-y-6">
                      {/* Plan Type Badge */}
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border-2 border-dashed">
                        <div className="flex items-center gap-3">
                          {isPremium ? (
                            <Crown className="h-5 w-5 text-primary" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                            <p className="font-bold text-lg capitalize">
                              {subscription.subscription_type === 'premium' ? 'Premium' : 'Free'}
                            </p>
                          </div>
                        </div>
                        {isPremium && (
                          <Badge variant="default" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </div>

                      {/* Plan Details */}
                      <div className="space-y-4">
                        {planName && (
                          <div className="p-3 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground mb-1.5">Plan Name</p>
                            <p className="font-semibold text-base">{planName}</p>
                          </div>
                        )}

                        {subscription.billing_cycle && (
                          <div className="p-3 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground mb-1.5">Billing Cycle</p>
                            <p className="font-semibold text-base capitalize flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {subscription.billing_cycle}
                            </p>
                          </div>
                        )}

                        {subscription.current_period_end && (
                          <div className="p-3 rounded-lg bg-muted/30 border">
                            <p className="text-xs text-muted-foreground mb-1.5">Next Billing Date</p>
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

                      {/* Action Button */}
                      <div className="pt-4 border-t">
                        <Button
                          variant={isPremium ? "outline" : "default"}
                          className="w-full h-11 font-semibold transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-lg"
                          onClick={() => navigate('/plans')}
                        >
                          {isPremium ? (
                            <>
                              Change Plan
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Upgrade Plan
                              <Crown className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-2 font-medium">No subscription found</p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Choose a plan to get started
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate('/plans')}
                        className="w-full h-11 font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      >
                        View Plans
                        <ArrowRight className="ml-2 h-4 w-4" />
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
