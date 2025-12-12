'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Users,
  Scale,
  Ruler,
  AlertCircle,
  CheckCircle,
  Target,
  Activity,
  Globe,
} from "lucide-react";
import { getPlatformSubscription } from "@/utils/subscription";
import type { User } from "@supabase/supabase-js";
import { calculateBMI, getBMICategory, getIdealWeightRange } from "@/utils/bmi";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

// Country list with flag emojis
const COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CV", name: "Cape Verde", flag: "🇨🇻" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", name: "Congo (Republic)", flag: "🇨🇬" },
  { code: "CD", name: "Congo (DRC)", flag: "🇨🇩" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
    { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KP", name: "North Korea", flag: "🇰🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "PS", name: "Palestine", flag: "🇵🇸" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" }
].sort((a, b) => a.name.localeCompare(b.name));


export type ProfileClientProps = {
  initialUser?: User | null;
  initialProfile?: any;
  initialSubscription?: any;
  initialPlanName?: string | null;
};

export function ProfileClient({
  initialUser = null,
  initialProfile = null,
  initialSubscription = null,
  initialPlanName = null,
}: ProfileClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslation();
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<any>(initialProfile);
  const [loading, setLoading] = useState(!initialUser);
  const [subscription, setSubscription] = useState<any>(initialSubscription);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState<string | null>(initialPlanName);
  const [email, setEmail] = useState(initialUser?.email || "");
  // Helper function to get initials from full_name or email
  const getInitials = (fullName: string | null | undefined, email: string | null | undefined): string => {
    if (fullName && fullName.trim()) {
      const names = fullName.trim().split(/\s+/);
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (email) {
      return email.split("@")[0].substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const [userInitials, setUserInitials] = useState(
    getInitials(initialProfile?.full_name, initialUser?.email || null)
  );
  const [gender, setGender] = useState<string>(initialProfile?.gender || "");
  const [age, setAge] = useState<string>(initialProfile?.age?.toString() || "");
  const [country, setCountry] = useState<string>(initialProfile?.country || "");
  const [countryOpen, setCountryOpen] = useState(false);
  const [weight, setWeight] = useState<string>(initialProfile?.weight_kg?.toString() || "");
  const [height, setHeight] = useState<string>(initialProfile?.height_cm?.toString() || "");
  const [goal, setGoal] = useState<string>(initialProfile?.goal || "");
  const [activityLevel, setActivityLevel] = useState<string>(initialProfile?.activity_level || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setEmail(initialUser.email || "");
      setUserInitials(getInitials(initialProfile?.full_name, initialUser.email || null));
      setLoading(false);
    }
  }, [initialUser, initialProfile]);

  useEffect(() => {
    setProfile(initialProfile);
    if (initialProfile) {
      setGender(initialProfile.gender || "");
      setAge(initialProfile.age?.toString() || "");
      setCountry(initialProfile.country || "");
      setWeight(initialProfile.weight_kg?.toString() || "");
      setHeight(initialProfile.height_cm?.toString() || "");
      setGoal(initialProfile.goal || "");
      setActivityLevel(initialProfile.activity_level || "");
      // Update initials when profile changes
      setUserInitials(getInitials(initialProfile.full_name, user?.email || null));
    }
  }, [initialProfile, user]);

  useEffect(() => {
    setSubscription(initialSubscription);
    // Clear plan name if subscription is free
    if (initialSubscription?.subscription_type === "free") {
      setPlanName(null);
    }
  }, [initialSubscription]);

  useEffect(() => {
    setPlanName(initialPlanName ?? null);
  }, [initialPlanName]);

  // Refresh subscription data on mount to ensure it's up-to-date after checkout
  useEffect(() => {
    const refreshSubscription = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        
        if (!session?.user) return;

        // Fetch latest subscription from platform_subscriptions
        const { data: latestSub, error } = await supabase
          .from("platform_subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error refreshing subscription:", error);
          return;
        }

        if (latestSub) {
          setSubscription(latestSub);
          
          // Update plan name if premium
          const sub = latestSub as any; // Type assertion to match subscription state type
          if (sub.subscription_type === "premium" && sub.platform_plan_id) {
            const { data: planRow } = await supabase
              .from("platform_plans")
              .select("name")
              .eq("id", sub.platform_plan_id)
              .maybeSingle();
            
            const plan = planRow as any; // Type assertion for plan row
            if (plan?.name) {
              setPlanName(plan.name);
            }
          } else {
            setPlanName(null);
          }
        }
      } catch (err) {
        console.error("Error refreshing subscription:", err);
      }
    };

    // Refresh subscription data on mount
    refreshSubscription();
  }, []);

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
        
        const { data: profileData } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!cancelled && profileData) {
          setProfile(profileData);
          setGender(profileData.gender || "");
          setAge(profileData.age?.toString() || "");
          setCountry(profileData.country || "");
          setWeight(profileData.weight_kg?.toString() || "");
          setHeight(profileData.height_cm?.toString() || "");
          setGoal(profileData.goal || "");
          setActivityLevel(profileData.activity_level || "");
          // Update initials with full_name from profile
          setUserInitials(getInitials(profileData.full_name, session.user.email || null));
        } else {
          // Fallback to email if no profile
          setUserInitials(getInitials(null, session.user.email || null));
        }

        const sub = await getPlatformSubscription(session.user.id);
        if (!cancelled) {
          setSubscription(sub);

          // Only fetch plan name if subscription is premium and has platform_plan_id
          if (sub?.subscription_type === "premium" && sub?.platform_plan_id) {
            const { data: planRow } = await (supabase as any)
              .from("platform_plans")
              .select("name")
              .eq("id", sub.platform_plan_id)
              .maybeSingle();
            if (!cancelled && planRow?.name) {
              setPlanName(planRow.name);
            } else {
              setPlanName(null);
            }
          } else {
            // Clear plan name if subscription is free
            setPlanName(null);
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

  const handleAvatarUpload = async (file: File) => {
    if (!user || !isPremium) return;

    try {
      setUploadingAvatar(true);
      
      // Upload to Supabase storage
      const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const ext = cleanName.split(".").pop() || "jpg";
      const filename = `avatar_${Date.now()}.${ext}`;
      const path = `${user.id}/${filename}`;

      // Upload to avatars bucket (or use FoodScans if avatars doesn't exist)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        // Try FoodScans bucket as fallback
        const { error: fallbackError } = await supabase.storage
          .from("FoodScans")
          .upload(`avatars/${path}`, file, {
            upsert: true,
            cacheControl: "3600",
          });
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        const { data: pub } = supabase.storage.from("FoodScans").getPublicUrl(`avatars/${path}`);
        const avatarUrl = pub.publicUrl;
        
        // Update profile with avatar URL
        const { error: updateError } = await (supabase as any)
          .from("profiles")
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Update user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { avatar_url: avatarUrl },
        });

        if (metadataError) throw metadataError;

        // Update local state
        setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
        toast({
          title: t("profile.changephoto"),
          description: "Profile image updated successfully",
        });
      } else {
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        const avatarUrl = pub.publicUrl;
        
        // Update profile with avatar URL
        const { error: updateError } = await (supabase as any)
          .from("profiles")
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Update user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { avatar_url: avatarUrl },
        });

        if (metadataError) throw metadataError;

        // Update local state
        setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
        toast({
          title: t("profile.changephoto"),
          description: "Profile image updated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile image",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarClick = () => {
    if (!isPremium) {
      toast({
        title: "Premium Required",
        description: "Customizations are available for premium users. Upgrade now for a more personalized experience.",
        variant: "default",
      });
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

      const fullName = fullNameRaw.trim() || null;
      
      // Parse demographic fields
      const genderValue = gender.trim() || null;
      const ageValue = age.trim() ? parseInt(age.trim(), 10) : null;
      const countryValue = country.trim() || null;
      const weightValue = weight.trim() ? parseFloat(weight.trim()) : null;
      const heightValue = height.trim() ? parseInt(height.trim(), 10) : null;
      const goalValue = goal.trim() || null;
      const activityLevelValue = activityLevel.trim() || null;

      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: fullName,
          gender: genderValue,
          age: ageValue,
          country: countryValue,
          weight_kg: weightValue,
          height_cm: heightValue,
          goal: goalValue,
          activity_level: activityLevelValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (updateError) {
        throw updateError;
      }

      const { data: updatedProfile, error: fetchError } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!fetchError && updatedProfile) {
        setProfile(updatedProfile);
        // Update state variables to reflect saved values
        setGender(updatedProfile.gender || "");
        setAge(updatedProfile.age?.toString() || "");
        setCountry(updatedProfile.country || "");
        setWeight(updatedProfile.weight_kg?.toString() || "");
        setHeight(updatedProfile.height_cm?.toString() || "");
        setGoal(updatedProfile.goal || "");
        setActivityLevel(updatedProfile.activity_level || "");
      }

      // Check if profile is now complete
      const isNowComplete = updatedProfile && 
        updatedProfile.full_name &&
        updatedProfile.gender &&
        updatedProfile.age !== null &&
        updatedProfile.weight_kg !== null &&
        updatedProfile.height_cm !== null &&
        updatedProfile.goal &&
        updatedProfile.activity_level;

      toast({
        title: t("profile.success"),
        description: isNowComplete 
          ? t("profile.success.completed")
          : t("profile.success.updated"),
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: t("profile.error"),
        description: error.message || t("profile.error.save"),
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
          <p className="text-muted-foreground animate-pulse">{t("profile.loading")}</p>
        </div>
      </main>
    );
  }

  const isPremium = subscription?.subscription_type === "premium";

  // Calculate BMI
  const currentBMI = calculateBMI(profile?.weight_kg, profile?.height_cm);
  const bmiCategory = getBMICategory(currentBMI);
  const idealWeightRange = getIdealWeightRange(profile?.height_cm);

  // Calculate profile completion
  const profileFields = [
    { key: 'full_name', value: profile?.full_name },
    { key: 'gender', value: profile?.gender },
    { key: 'age', value: profile?.age },
    { key: 'weight_kg', value: profile?.weight_kg },
    { key: 'height_cm', value: profile?.height_cm },
    { key: 'goal', value: profile?.goal },
    { key: 'activity_level', value: profile?.activity_level },
  ];
  
  const completedFields = profileFields.filter(field => {
    if (field.key === 'age' || field.key === 'weight_kg' || field.key === 'height_cm') {
      return field.value !== null && field.value !== undefined && field.value !== '';
    }
    return field.value && field.value.toString().trim() !== '';
  }).length;
  
  const totalFields = profileFields.length;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);
  const isProfileComplete = completedFields === totalFields;
  const missingFields = profileFields
    .filter(field => {
      if (field.key === 'age' || field.key === 'weight_kg' || field.key === 'height_cm') {
        return field.value === null || field.value === undefined || field.value === '';
      }
      return !field.value || field.value.toString().trim() === '';
    })
    .map(field => {
                          const labels: Record<string, string> = {
                            full_name: t("profile.field.fullname"),
                            gender: t("profile.field.gender"),
                            age: t("profile.field.age"),
                            weight_kg: t("profile.field.weight"),
                            height_cm: t("profile.field.height"),
                          };
      return labels[field.key];
    });

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8 sm:py-12 w-full">
        {!isProfileComplete && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{t("profile.complete.title")}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {missingFields.length > 0 
                        ? t("profile.complete.description").replace("{fields}", missingFields.join(', ').toLowerCase())
                        : t("profile.complete.almost")}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("profile.completion")}</span>
                        <span className="font-semibold text-primary">{completionPercentage}%</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profileFields.map((field) => {
                          const isCompleted = field.key === 'age' || field.key === 'weight_kg' || field.key === 'height_cm'
                            ? field.value !== null && field.value !== undefined && field.value !== ''
                            : field.value && field.value.toString().trim() !== '';
                          const labels: Record<string, string> = {
                            full_name: t("profile.field.fullname"),
                            gender: t("profile.field.gender"),
                            age: t("profile.field.age"),
                            weight_kg: t("profile.field.weight"),
                            height_cm: t("profile.field.height"),
                            goal: t("profile.field.goal"),
                            activity_level: t("profile.field.activity"),
                          };
                          return (
                            <div
                              key={field.key}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                                isCompleted
                                  ? 'bg-primary/20 text-primary border border-primary/30'
                                  : 'bg-muted text-muted-foreground border border-muted'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              <span>{labels[field.key]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 pb-2">
                {t("profile.settings.title")}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t("profile.settings.description")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPremium && (
                <Badge variant="secondary" className="px-4 py-2 text-sm shadow-md">
                  <Crown className="h-4 w-4 mr-2" /> {t("profile.premium")}
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
                <CardTitle className="text-2xl sm:text-3xl">{t("profile.information.title")}</CardTitle>
                <CardDescription className="mt-1 text-base">{t("profile.information.description")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col items-center sm:flex-row gap-8 pb-8 border-b-2 border-dashed">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "relative group",
                          "cursor-pointer"
                        )}
                        onClick={handleAvatarClick}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                        <Avatar className="relative h-32 w-32 sm:h-40 sm:w-40 border-4 border-primary/30 shadow-2xl ring-4 ring-primary/10 transition-all">
                          {profile?.avatar_url && isPremium ? (
                            <AvatarImage 
                              src={profile.avatar_url} 
                              className="object-cover" 
                            />
                          ) : null}
                          <AvatarFallback className="text-4xl sm:text-5xl bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground font-bold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        {uploadingAvatar ? (
                          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                            <div className="bg-white/20 backdrop-blur-md rounded-full p-3">
                              <Camera className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isPremium ? t("profile.uploadphoto") : "Customizations are available for premium users. Upgrade now for a more personalized experience."}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && isPremium) {
                      handleAvatarUpload(file);
                    }
                    // Reset input
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                />
                <div className="text-center sm:text-left flex-1 space-y-3">
                  <div>
                    <h3 className="font-bold text-2xl mb-1">{profile?.full_name || t("profile.yourname")}</h3>
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                      <Mail className="h-4 w-4" /> {email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" /> {t("profile.email")}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} disabled className="pl-12 h-12 bg-muted/50 border-2" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{t("profile.email.cannotchange")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" /> {t("profile.fullname")}
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      defaultValue={profile?.full_name || ""}
                      placeholder={t("profile.fullname.placeholder")}
                      className="pl-12 h-12 border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> {t("profile.gender")}
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue placeholder={t("profile.gender.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("profile.gender.male")}</SelectItem>
                      <SelectItem value="female">{t("profile.gender.female")}</SelectItem>
                      <SelectItem value="other">{t("profile.gender.other")}</SelectItem>
                      <SelectItem value="prefer_not_to_say">{t("profile.gender.prefernot")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> {t("profile.age")}
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={t("profile.age.placeholder")}
                      className="pl-12 h-12 border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> {t("profile.country")} <span className="text-xs font-normal text-muted-foreground">({t("profile.optional")})</span>
                  </Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full h-12 border-2 justify-between font-normal"
                      >
                        {country ? (
                          <span className="flex items-center gap-2 truncate">
                            <span className="text-lg flex-shrink-0">{COUNTRIES.find((c) => c.code === country)?.flag}</span>
                            <span className="truncate">{COUNTRIES.find((c) => c.code === country)?.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t("profile.country.placeholder")}</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t("profile.country.search") || "Search country..."} />
                        <CommandList>
                          <CommandEmpty>{t("profile.country.notfound") || "No country found."}</CommandEmpty>
                          <CommandGroup>
                            {COUNTRIES.map((countryOption) => (
                              <CommandItem
                                key={countryOption.code}
                                value={`${countryOption.name} ${countryOption.code}`}
                                onSelect={() => {
                                  setCountry(countryOption.code === country ? "" : countryOption.code);
                                  setCountryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    country === countryOption.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">{countryOption.flag}</span>
                                  <span>{countryOption.name}</span>
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-semibold flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" /> {t("profile.weight")}
                  </Label>
                  <div className="relative">
                    <Scale className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={t("profile.weight.placeholder")}
                      className="pl-12 h-12 border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm font-semibold flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-primary" /> {t("profile.height")}
                  </Label>
                  <div className="relative">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="height"
                      type="number"
                      min="0"
                      max="300"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder={t("profile.height.placeholder")}
                      className="pl-12 h-12 border-2"
                    />
                  </div>
                </div>

                {/* BMI Display */}
                {currentBMI && (
                  <div className="sm:col-span-2 p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">{t("profile.bmi")}</p>
                        <p className="text-2xl font-bold text-foreground">{currentBMI}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-sm px-3 py-1 ${
                          bmiCategory.color === "green" ? "border-green-500 text-green-700 bg-green-50" :
                          bmiCategory.color === "blue" ? "border-blue-500 text-blue-700 bg-blue-50" :
                          bmiCategory.color === "orange" ? "border-orange-500 text-orange-700 bg-orange-50" :
                          "border-red-500 text-red-700 bg-red-50"
                        }`}
                      >
                        {bmiCategory.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{bmiCategory.description}</p>
                    {idealWeightRange && (
                      <p className="text-xs text-muted-foreground">
                        {t("profile.bmi.idealrange").replace("{min}", idealWeightRange.min.toString()).replace("{max}", idealWeightRange.max.toString())}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="goal" className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> {t("profile.goal")}
                  </Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue placeholder={t("profile.goal.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">{t("profile.goal.weightloss")}</SelectItem>
                      <SelectItem value="weight_gain">{t("profile.goal.weightgain")}</SelectItem>
                      <SelectItem value="maintain_weight">{t("profile.goal.maintain")}</SelectItem>
                      <SelectItem value="build_muscle">{t("profile.goal.muscle")}</SelectItem>
                      <SelectItem value="improve_fitness">{t("profile.goal.fitness")}</SelectItem>
                      <SelectItem value="general_health">{t("profile.goal.health")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_level" className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> {t("profile.activity")}
                  </Label>
                  <Select value={activityLevel} onValueChange={setActivityLevel}>
                    <SelectTrigger className="h-12 border-2">
                      <SelectValue placeholder={t("profile.activity.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">{t("profile.activity.sedentary")}</SelectItem>
                      <SelectItem value="light_active">{t("profile.activity.light")}</SelectItem>
                      <SelectItem value="moderately_active">{t("profile.activity.moderate")}</SelectItem>
                      <SelectItem value="very_active">{t("profile.activity.very")}</SelectItem>
                      <SelectItem value="extremely_active">{t("profile.activity.extreme")}</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <Save className="mr-2 h-5 w-5 animate-spin" /> {t("profile.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> {t("profile.save")}
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
                    <CardTitle className="text-xl sm:text-2xl">{t("profile.subscription.title")}</CardTitle>
                    <CardDescription className="mt-1">{t("profile.subscription.description")}</CardDescription>
                  </div>
                </div>
                {isPremium && (
                  <Badge variant="default" className="shadow-md">
                    <Crown className="h-3 w-3 mr-1" /> {t("profile.subscription.active")}
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
                        <p className="text-xs text-muted-foreground mb-1 font-medium">{t("profile.subscription.current")}</p>
                        <p className="font-bold text-xl capitalize">
                          {subscription.subscription_type === "premium" ? t("profile.subscription.premium") : t("profile.subscription.free")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {planName && isPremium && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">{t("profile.subscription.planname")}</p>
                      <p className="font-bold text-lg">{planName}</p>
                    </div>
                  )}

                  {subscription.billing_cycle && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">{t("profile.subscription.billing")}</p>
                      <p className="font-semibold text-base capitalize flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {subscription.billing_cycle}
                      </p>
                    </div>
                  )}

                  {subscription.current_period_end && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-primary/10">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">{t("profile.subscription.nextbilling")}</p>
                      <p className="font-semibold text-base">
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                    <CreditCard className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-2 font-semibold">{t("profile.subscription.notfound")}</p>
                    <p className="text-sm text-muted-foreground mb-6">{t("profile.subscription.chooseplan")}</p>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t-2 mt-6">
                <Button
                  variant={isPremium ? "outline" : "default"}
                  className="w-full h-12 font-semibold"
                  onClick={() => router.push("/plans")}
                >
                  {isPremium ? (
                    <>
                      {t("profile.subscription.change")} <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  ) : (
                    <>
                      {t("profile.subscription.upgrade")} <Crown className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
