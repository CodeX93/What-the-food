import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Utensils, Mail, Lock, Eye, EyeOff, Sparkles, Camera, BarChart3, Zap, User, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPostAuthNavigationPath } from "@/utils/auth-navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getUrl } from "@/utils/url";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [tabValue, setTabValue] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
  // Multi-step signup state
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<any>(null);
  const [bioData, setBioData] = useState({
    fullName: "",
    bio: "",
  });

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "You've been signed in successfully.",
      });

      // Check subscription status and navigate accordingly
      const redirectPath = await getPostAuthNavigationPath();
      navigate(redirectPath);
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message || "An error occurred while signing in.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Store values (kept for future if needed)
        setSignupEmail(email);
        setSignupUserId(data.user.id);
        setSignupSession(data.session);

        // With confirmations ON, ask user to verify then sign in
        toast({
          title: "Verify your email",
          description: "We sent you a verification link. Please verify, then sign in to continue.",
        });

        setTabValue("signin");
      } else {
        toast({
          title: "Error creating account",
          description: "User data not returned. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message || "An error occurred while creating your account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBioSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!signupUserId) {
        throw new Error("User ID not found. Please start over.");
      }

      // Ensure session is available - required for RLS
      let session = signupSession;
      if (!session) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        session = currentSession;
      }
      
      // Call Edge Function to upsert profile using service role (bypasses RLS safely)
      const { data: fnData, error: fnError } = await supabase.functions.invoke('complete-profile', {
        body: {
          userId: signupUserId,
          email: signupEmail,
          full_name: bioData.fullName,
          bio: bioData.bio,
        },
      });

      const error = fnError ? new Error(fnError.message || 'Failed to save profile') : null;

      if (error) {
        // If RLS error, provide more helpful message
        // Provide clearer message with fallback path
        throw new Error("Unable to save profile right now. Please sign in and complete your profile from the Profile page.");
        throw error;
      }

      // Check if email is confirmed
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const isEmailConfirmed = currentSession?.user?.email_confirmed_at;

      toast({
        title: "Profile completed!",
        description: isEmailConfirmed
          ? "Your profile has been created. Welcome!"
          : "Your profile has been created. Please check your email to verify your account.",
      });

      // Navigate based on email confirmation
      if (isEmailConfirmed) {
        const redirectPath = await getPostAuthNavigationPath();
        navigate(redirectPath);
        window.location.reload();
      } else {
        // Stay on page but show verification message
        setSignupStep(1);
        setTabValue("signin");
      }
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message || "An error occurred while saving your profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async (mode: "signin" | "signup") => {
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getUrl('/auth/callback'),
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred with Google authentication.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 dark:from-[#000000] dark:via-[#0A0A0A] dark:to-[#1A1A1A] p-4 relative overflow-hidden">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto relative z-10 px-4 lg:pl-4 lg:pr-8 xl:pr-12">
        <div className="flex lg:items-center gap-8">
          {/* Left Side - Branding and Features */}
          <div className="hidden lg:flex flex-col space-y-8 flex-shrink-0 max-w-2xl">
            <Link to="/" className="flex items-center space-x-2 mb-8">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Utensils className="h-8 w-8 text-primary" />
              </div>
              <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">WhatTheFood</span>
            </Link>
            
            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight text-foreground">
                Start Your Journey to Better Nutrition
              </h1>
              <p className="text-lg text-muted-foreground dark:text-slate-300">
                Join thousands of users who are making healthier choices<br className="hidden lg:block" />
                <span className="lg:ml-0">with AI-powered food analysis</span>
              </p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/20 rounded-lg mt-1">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Instant Food Recognition</h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">
                      Upload a photo and get instant nutritional analysis
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/20 rounded-lg mt-1">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Detailed Nutrition Breakdown</h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">
                      Track calories, macros, and micronutrients with precision
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/20 rounded-lg mt-1">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Unlimited Scans (Premium)</h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">
                      Get unlimited access to all premium features
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer - 5% gap */}
          <div className="hidden lg:block flex-shrink-0" style={{ width: '5%' }}></div>

          {/* Right Side - Auth Form */}
          <div className="w-full flex-shrink-0 lg:max-w-xl xl:max-w-2xl">
            <Link to="/" className="flex items-center justify-center lg:hidden space-x-2 mb-8">
              <Utensils className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">WhatTheFood</span>
            </Link>

            <div className="w-full">
              <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    {tabValue === "signin" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {tabValue === "signin" 
                      ? "Sign in to access your scan history and premium features"
                      : "Get 3 free scans daily or upgrade to Premium for unlimited access"}
                  </p>
                </div>
                
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 dark:bg-black/10 backdrop-blur-sm border-2 border-white/20 dark:border-white/10">
                  <TabsTrigger value="signin" className="text-sm font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                          <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="you@example.com" 
                            required 
                            className="pl-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                          <Input 
                            id="password" 
                            name="password" 
                            type={showPassword ? "text" : "password"} 
                            required 
                            className="pl-10 pr-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t-2 border-white/20 dark:border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white/10 dark:bg-black/20 backdrop-blur-sm px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full h-11 border-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-white/30 dark:border-white/20 hover:bg-white/20 dark:hover:bg-black/20 hover:border-white/40 dark:hover:border-white/30 transition-all" 
                        type="button"
                        onClick={() => handleGoogleAuth("signin")}
                        disabled={isGoogleLoading}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {isGoogleLoading ? "Loading..." : "Continue with Google"}
                      </Button>
                      
                      <Button className="w-full h-11 bg-primary hover:bg-primary-hover mt-4" type="submit" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  {signupStep === 1 ? (
                    <form onSubmit={handleSignUp}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4 backdrop-blur-sm">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <p className="text-sm text-muted-foreground">
                            Get <span className="font-semibold text-foreground">3 free scans daily</span> or upgrade to Premium for unlimited access
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                            <Input 
                              id="signup-email" 
                              name="signup-email" 
                              type="email" 
                              placeholder="you@example.com" 
                              required 
                              className="pl-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                            <Input 
                              id="signup-password" 
                              name="signup-password" 
                              type={showSignupPassword ? "text" : "password"} 
                              required 
                              minLength={6}
                              className="pl-10 pr-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupPassword(!showSignupPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                            >
                              {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                        </div>
                        
                        <div className="relative py-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t-2 border-white/20 dark:border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white/10 dark:bg-black/20 backdrop-blur-sm px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          className="w-full h-11 border-2 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-white/30 dark:border-white/20 hover:bg-white/20 dark:hover:bg-black/20 hover:border-white/40 dark:hover:border-white/30 transition-all" 
                          type="button"
                          onClick={() => handleGoogleAuth("signup")}
                          disabled={isGoogleLoading}
                        >
                          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          {isGoogleLoading ? "Loading..." : "Sign up with Google"}
                        </Button>
                        
                        <Button className="w-full h-11 bg-primary hover:bg-primary-hover mt-4" type="submit" disabled={isLoading}>
                          {isLoading ? "Creating account..." : "Create Account"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleBioSubmit}>
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <h3 className="text-xl font-bold mb-2">Complete Your Profile</h3>
                          <p className="text-sm text-muted-foreground">
                            Tell us a bit about yourself to personalize your experience
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="full-name" className="text-sm font-medium">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                            <Input 
                              id="full-name" 
                              name="full-name" 
                              type="text" 
                              placeholder="John Doe" 
                              required 
                              value={bioData.fullName}
                              onChange={(e) => setBioData({ ...bioData, fullName: e.target.value })}
                              className="pl-10 h-11 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-sm font-medium">Bio (Optional)</Label>
                          <div className="relative">
                            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                            <Textarea 
                              id="bio" 
                              name="bio" 
                              placeholder="Tell us about yourself, your health goals, or why you're interested in food analysis..."
                              value={bioData.bio}
                              onChange={(e) => setBioData({ ...bioData, bio: e.target.value })}
                              rows={4}
                              className="pl-10 pt-3 bg-white/10 dark:bg-black/10 backdrop-blur-sm border-2 border-white/30 dark:border-white/20 focus:border-primary/50 resize-none"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">A short bio helps us understand your needs better</p>
                        </div>

                        <Button className="w-full h-11 bg-primary hover:bg-primary-hover mt-4" type="submit" disabled={isLoading}>
                          {isLoading ? "Saving..." : "Complete Registration"}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSignupStep(1);
                            setBioData({ fullName: "", bio: "" });
                            setSignupUserId(null);
                            setSignupEmail("");
                            setSignupSession(null);
                          }}
                        >
                          Back
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6 px-4">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline font-medium">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;