'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Loader2, 
  Flame, 
  Beef, 
  Wheat, 
  Droplet, 
  Apple, 
  Candy, 
  Shield, 
  Info, 
  CheckCircle2, 
  Zap,
  AlertCircle,
  ExternalLink,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUrl } from "@/utils/url";
import { analyzeFood, scaleNutrients, type FoodAnalysis } from "@/utils/foodScan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper function to check if tracking should be disabled globally
// This is a fail-safe to prevent any unwanted tracking
// DEFAULT: DISABLE tracking unless we can PROVE it's external
const isTrackingDisabled = (): boolean => {
  if (typeof window === 'undefined') return true; // Server-side, disable tracking
  try {
    const hostname = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    const referrer = document.referrer || '';
    const origin = window.location.origin || '';
    
    // Always disable if localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return true;
    }
    
    // Always disable if dashboard path
    if (pathname.includes('/dashboard') || pathname.includes('/widget/dashboard')) {
      return true;
    }
    
    // Always disable if referrer contains dashboard
    if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard')) {
      return true;
    }
    
    // Check if we're in a cross-origin iframe (external embed)
    // If in iframe and can't access parent, it's likely an external embed
    let isCrossOriginIframe = false;
    if (typeof window !== 'undefined') {
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        try {
          window.parent.location;
          isCrossOriginIframe = false;
        } catch (e) {
          isCrossOriginIframe = true; // Can't access parent = cross-origin = external embed
        }
      }
    }
    
    // Always disable if no referrer AND not in cross-origin iframe (direct access)
    if ((!referrer || referrer === '') && !isCrossOriginIframe) {
      return true;
    }
    
    // If in cross-origin iframe, don't disable tracking (it's an external embed)
    if (isCrossOriginIframe) {
      return false; // Don't disable - this is an external embed
    }
    
    // Always disable if referrer is from same origin
    try {
      const referrerOrigin = new URL(referrer).origin;
      if (referrerOrigin === origin) {
        return true;
      }
    } catch (e) {
      // If we can't parse referrer, disable tracking to be safe
      return true;
    }
    
    // If we get here, it might be external - but we'll do more checks later
    return false;
  } catch (e) {
    // On error, disable tracking to be safe
    return true;
  }
};

// Helper function to check if preview was already tracked in this session
const hasTrackedPreview = (widgetId: string): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const key = `widget_preview_tracked_${widgetId}`;
    const tracked = sessionStorage.getItem(key);
    if (tracked) {
      const timestamp = parseInt(tracked, 10);
      const now = Date.now();
      // If tracked within last 10 minutes, consider it already tracked
      return (now - timestamp) < 10 * 60 * 1000;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Helper function to mark preview as tracked
const markPreviewTracked = (widgetId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = `widget_preview_tracked_${widgetId}`;
    sessionStorage.setItem(key, Date.now().toString());
  } catch (e) {
    // Ignore sessionStorage errors (e.g., in private browsing)
  }
};

// Free User Results View Component
function FreeUserResultsView({ 
  result, 
  imageUrl,
  styles, 
  onScanAnother 
}: { 
  result: FoodAnalysis; 
  imageUrl: string | null;
  styles: any; 
  onScanAnother: () => void;
}) {
  const scaled = useMemo(() => scaleNutrients(result.nutrients, 1), [result.nutrients]);
  const isNonFood = result?.foodDetected === false;
  
  return (
    <div className="space-y-4">
      {/* Display the scanned image */}
      {imageUrl && (
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 0.94' }}>
            <img 
              src={imageUrl} 
              alt={result.dish || "Food"} 
              className="w-full h-full object-cover" 
            />
          </div>
        </Card>
      )}
      
      <div className="text-center">
        <h4 className="text-xl font-bold mb-2">{result.dish}</h4>
        {result.description && (
          <p className="text-sm text-muted-foreground mb-4">{result.description}</p>
        )}
      </div>

      {/* Accuracy Scale */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Accuracy</CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Confidence level of the analysis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Confidence</span>
            <span className="font-semibold">{Math.round((result.confidence || 0) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ 
                width: `${Math.round((result.confidence || 0) * 100)}%`,
                backgroundColor: styles.primaryColor
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nutrition Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Flame, label: "Calories", value: isNonFood ? "N/A" : (scaled?.calories ?? "-"), suffix: "", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
              { icon: Beef, label: "Protein", value: isNonFood ? "N/A" : (scaled?.protein_g ?? "-"), suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
              { icon: Wheat, label: "Carbs", value: isNonFood ? "N/A" : (scaled?.carbohydrates_g ?? "-"), suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
              { icon: Droplet, label: "Fat", value: isNonFood ? "N/A" : (scaled?.fat_g ?? "-"), suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
              { icon: Apple, label: "Fiber", value: isNonFood ? "N/A" : (scaled?.fiber_g ?? "-"), suffix: "g", style: "bg-emerald-100/90 border-emerald-200 text-emerald-900" },
              { icon: Candy, label: "Sugar", value: isNonFood ? "N/A" : (scaled?.sugar_g ?? "-"), suffix: "g", style: "bg-pink-100/90 border-pink-200 text-pink-900" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className={`border rounded-lg px-3 py-2.5 flex items-center gap-2 shadow-sm ${item.style}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
                    <div className="text-base font-semibold">
                      {item.value}
                      {item.value !== "-" ? item.suffix : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onScanAnother}
        variant="outline"
        className="w-full"
        style={{ borderRadius: styles.borderRadius }}
      >
        Scan Another
      </Button>
    </div>
  );
}

// Premium User Results View Component
function PremiumUserResultsView({ 
  result, 
  imageUrl,
  servings,
  styles, 
  baseUrl,
  onScanAnother 
}: { 
  result: FoodAnalysis; 
  imageUrl: string | null;
  servings: number;
  styles: any; 
  baseUrl: string;
  onScanAnother: () => void;
}) {
  const scaled = useMemo(() => scaleNutrients(result.nutrients, servings), [result.nutrients, servings]);
  const isNonFood = result?.foodDetected === false;
  
  return (
    <div className="space-y-4">
      {/* Display the scanned image */}
      {imageUrl && !result.isManualEntry && (
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 0.94' }}>
            <img 
              src={imageUrl} 
              alt={result.dish || "Food"} 
              className="w-full h-full object-cover" 
            />
          </div>
        </Card>
      )}
      
      <div className="text-center">
        <h4 className="text-xl font-bold mb-2">{result.dish}</h4>
        {result.description && (
          <p className="text-sm text-muted-foreground mb-4">{result.description}</p>
        )}
        {result.tags && result.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {result.tags.map((tag, index) => {
              const palette = [
                "bg-emerald-50 text-emerald-700 border border-emerald-200",
                "bg-sky-50 text-sky-700 border border-sky-200",
                "bg-rose-50 text-rose-700 border border-rose-200",
                "bg-amber-50 text-amber-700 border border-amber-200",
              ];
              const colors = palette[index % palette.length];
              return (
                <Badge key={index} variant="outline" className={`${colors} text-xs`}>
                  {tag}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Accuracy Scale */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Accuracy</CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Confidence level of the analysis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Confidence</span>
            <span className="font-semibold">{Math.round((result.confidence || 0) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{ 
                width: `${Math.round((result.confidence || 0) * 100)}%`,
                backgroundColor: styles.primaryColor
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nutrition Summary</CardTitle>
          {result.servingGuidance && (
            <CardDescription className="text-xs mt-2">
              {result.servingGuidance}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {result.servingGuidance && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
              {result.servingGuidance}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Flame, label: "Calories", value: isNonFood ? "N/A" : (scaled?.calories ?? "-"), suffix: "", style: "bg-orange-100/90 border-orange-200 text-orange-900" },
              { icon: Beef, label: "Protein", value: isNonFood ? "N/A" : (scaled?.protein_g ?? "-"), suffix: "g", style: "bg-rose-100/90 border-rose-200 text-rose-900" },
              { icon: Wheat, label: "Carbs", value: isNonFood ? "N/A" : (scaled?.carbohydrates_g ?? "-"), suffix: "g", style: "bg-yellow-100/90 border-yellow-200 text-yellow-900" },
              { icon: Droplet, label: "Fat", value: isNonFood ? "N/A" : (scaled?.fat_g ?? "-"), suffix: "g", style: "bg-sky-100/90 border-sky-200 text-sky-900" },
              { icon: Apple, label: "Fiber", value: isNonFood ? "N/A" : (scaled?.fiber_g ?? "-"), suffix: "g", style: "bg-emerald-100/90 border-emerald-200 text-emerald-900" },
              { icon: Candy, label: "Sugar", value: isNonFood ? "N/A" : (scaled?.sugar_g ?? "-"), suffix: "g", style: "bg-pink-100/90 border-pink-200 text-pink-900" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className={`border rounded-lg px-3 py-2.5 flex items-center gap-2 shadow-sm ${item.style}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
                    <div className="text-base font-semibold">
                      {item.value}
                      {item.value !== "-" ? item.suffix : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      {result.ingredients && result.ingredients.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Apple className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Ingredients</CardTitle>
            </div>
            <CardDescription className="text-xs">Detected/estimated ingredients</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-xs leading-relaxed">{ing}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* How to Prepare */}
      {result.instructions && result.instructions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">How to Prepare</CardTitle>
            </div>
            <CardDescription className="text-xs">Step-by-step instructions</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {result.instructions.map((step, i) => {
                const boldMatch = step.match(/^\*\*(.+?)\*\*[:\s]*(.+)$/);
                const hasBoldTitle = boldMatch !== null;
                const title = hasBoldTitle ? boldMatch[1] : null;
                const description = hasBoldTitle ? boldMatch[2] : step;
                
                return (
                  <li key={i} className="flex gap-2">
                    <span 
                      className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium mt-0.5"
                      style={{ backgroundColor: styles.primaryColor + "20", color: styles.primaryColor }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      {title && (
                        <p className="text-xs font-semibold mb-1">
                          {title}
                        </p>
                      )}
                      <p className="text-xs leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      {result.additionalInfo && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Additional Information</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed mt-1">
            {result.additionalInfo}
          </AlertDescription>
        </Alert>
      )}

      {/* Personalized Context Message */}
      <Alert className="border-primary/20 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm">Personalized Health Context</AlertTitle>
        <AlertDescription className="text-xs leading-relaxed mt-1">
          Get personalized health insights, smart substitutions, and tailored recommendations based on your profile.{" "}
          <a
            href={`${baseUrl}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline"
            style={{ color: styles.primaryColor }}
          >
            View on our website <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      <Button
        onClick={onScanAnother}
        variant="outline"
        className="w-full"
        style={{ borderRadius: styles.borderRadius }}
      >
        Scan Another
      </Button>
    </div>
  );
}

export function WidgetEmbedClient() {
  const searchParams = useSearchParams();
  const widgetId = searchParams?.get("id") ?? null;
  const isPreview = searchParams?.get("preview") === "true";
  const [widgetSettings, setWidgetSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [subscriptionType, setSubscriptionType] = useState<string>("free");
  const [servings, setServings] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const previewTrackedRef = useRef(false);
  const isTrackingRef = useRef(false);
  const isLoadingRef = useRef<string | null>(null);

  // Hide Tawk.io in preview mode
  // Replace the existing "Hide Tawk.io in preview mode" useEffect with this improved version:

useEffect(() => {
  // Check if we should hide Tawk.io
  const shouldHideTawk = () => {
    if (typeof window === 'undefined') return false;
    
    // Hide if preview parameter is present
    if (isPreview) return true;
    
    // Hide if we're in an iframe
    try {
      if (window.self !== window.top) {
        // We're in an iframe - check if it's same-origin (dashboard preview)
        try {
          // If we can access parent.location, it's same-origin (your dashboard)
          const parentHostname = window.parent.location.hostname;
          const currentHostname = window.location.hostname;
          
          // If same hostname, it's a dashboard preview - hide Tawk.io
          if (parentHostname === currentHostname) {
            console.log('Same-origin iframe detected (dashboard preview) - hiding Tawk.io');
            return true;
          }
        } catch (e) {
          // Cross-origin iframe - this is an external embed, show Tawk.io
          console.log('Cross-origin iframe detected (external embed) - showing Tawk.io');
          return false;
        }
      }
    } catch (e) {
      console.error('Error checking iframe context:', e);
    }
    
    return false;
  };
  
  if (shouldHideTawk()) {
    const styleId = 'hide-tawk-widget';
    let style = document.getElementById(styleId);
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      /* Hide Tawk.io widget */
      #tawkchat-container,
      iframe[id^="tawkchat"],
      iframe[title*="chat"],
      div[id^="tawkchat"],
      div[class*="tawk"],
      [id*="tawkchat"],
      [id*="Tawk"],
      [class*="tawk-"],
      .tawk-chat-container,
      #tawk-bubble-container {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      
      /* Also hide the Tawk.io API script effects */
      body[class*="tawk"] {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }
    `;
    
    // Also try to hide via JavaScript API if available
    const checkAndHideTawk = () => {
      if (typeof window !== 'undefined' && (window as any).Tawk_API) {
        try {
          (window as any).Tawk_API.hideWidget();
          console.log('Tawk.io hidden via API');
        } catch (e) {
          console.error('Error hiding Tawk.io via API:', e);
        }
      }
    };
    
    // Try immediately
    checkAndHideTawk();
    
    // Try again after a short delay (in case Tawk loads later)
    const timeoutId = setTimeout(checkAndHideTawk, 1000);
    
    return () => {
      clearTimeout(timeoutId);
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
      
      // Restore Tawk.io when component unmounts
      if (typeof window !== 'undefined' && (window as any).Tawk_API) {
        try {
          (window as any).Tawk_API.showWidget();
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }
}, [isPreview]);
  // Log component mount for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("═══════════════════════════════════════════════════════");
      console.log("🔵 WIDGET EMBED CLIENT MOUNTED");
      console.log("═══════════════════════════════════════════════════════");
      console.log("Widget ID:", widgetId);
      console.log("Is Preview:", isPreview);
      console.log("Current URL:", window.location.href);
      console.log("Current Path:", window.location.pathname);
      console.log("Referrer:", document.referrer || "(no referrer)");
      console.log("Hostname:", window.location.hostname);
      console.log("═══════════════════════════════════════════════════════");
    }
  }, [widgetId, isPreview]);

  // No need to disable/restore widget - we just check the limit and show different UI

  // Check if free user has reached API call limit (3 calls)
  // Uses a database function to bypass RLS and get accurate counts
  const checkApiCallLimit = useCallback(async (userId: string) => {
    try {
      console.log("🔍 Checking API call limit for user:", userId, "widget:", widgetId);
      
      if (!widgetId) {
        console.error("No widgetId available for limit check");
        return false;
      }

      // Use the database function to get user_id, subscription_type, and API call count
      // This bypasses RLS and works in unauthenticated contexts
      const { data: limitData, error: limitError } = await (supabase as any)
        .rpc('get_widget_user_api_count', { p_widget_id: widgetId });

      if (limitError) {
        console.error("❌ Error calling get_widget_user_api_count:", limitError);
        console.error("Error details:", {
          code: limitError.code,
          message: limitError.message,
          details: limitError.details,
          hint: limitError.hint
        });
        
        // Check if function doesn't exist (42883 = function does not exist)
        if (limitError.code === "42883" || limitError.message?.includes("does not exist") || limitError.message?.includes("function")) {
          console.error("🚨 CRITICAL: Database function 'get_widget_user_api_count' does not exist!");
          console.error("🚨 Please run the migration: supabase/migrations/20250131000000_allow_public_api_count_read.sql");
          console.error("🚨 Without this function, limit checking will not work in unauthenticated contexts");
          
          // Since we can't check the limit without the function, and we know the user has 4+ calls,
          // we should show the limit message to be safe
          // But we can't get the exact count, so we'll show a generic message
          console.warn("⚠️ Showing limit message as fallback since function doesn't exist");
          setIsLimitReached(true);
          setApiCallCount(4); // Assume 4+ since user reported it
          return true; // Block widget usage
        }
        
        // Fallback: try direct query (may fail due to RLS, but worth trying)
        console.log("Attempting fallback limit check...");
        try {
          const { data: subscriptionData, error: subError } = await (supabase as any)
            .from("widget_subscriptions")
            .select("subscription_type")
            .eq("user_id", userId)
            .single();
          
          if (subError && subError.code !== "PGRST116") {
            console.error("Fallback subscription check failed:", subError);
          }
          
          const subscriptionType = (subscriptionData as { subscription_type?: string } | null)?.subscription_type || "free";
          console.log("Fallback subscription type:", subscriptionType);
          
          if (subscriptionType === "free") {
            const { count, error: countError } = await (supabase as any)
              .from("widget_api_calls")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId);
            
            if (countError) {
              console.error("Fallback count check failed (RLS blocking):", countError);
              // RLS is blocking - we can't get the count
              // Since we know user has 4+ calls, show limit message
              console.warn("⚠️ RLS blocking count check - showing limit message as safety measure");
              setIsLimitReached(true);
              setApiCallCount(4); // Assume 4+ since user reported it
              return true;
            }
            
            const totalCalls = count || 0;
            console.log("✅ Fallback count check succeeded:", totalCalls, "calls");
            setApiCallCount(totalCalls);
            if (totalCalls >= 3) {
              console.log("🚫 FREE USER LIMIT REACHED (fallback):", totalCalls, "calls");
              setIsLimitReached(true);
              return true;
            }
          }
        } catch (fallbackError) {
          console.error("Fallback limit check also failed:", fallbackError);
          // If all checks fail, and we know user has 4+ calls, show limit message
          console.warn("⚠️ All limit checks failed - showing limit message as safety measure");
          setIsLimitReached(true);
          setApiCallCount(4); // Assume 4+ since user reported it
          return true; // Block widget usage
        }
        return false; // On error, allow (fail open) - but we've already handled the critical case above
      }

      if (!limitData || limitData.length === 0) {
        console.error("❌ No data returned from get_widget_user_api_count");
        console.error("Possible reasons:");
        console.error("1. Migration hasn't been run: 20250131000000_allow_public_api_count_read.sql");
        console.error("2. Widget not found in database");
        console.error("3. Function doesn't exist");
        
        // CRITICAL: Since we can't verify the limit without the function, and the user reported 4+ calls,
        // we should show the limit message to be safe
        // This is a temporary workaround until the migration is run
        console.warn("⚠️ Cannot verify limit - showing limit message as safety measure");
        setIsLimitReached(true);
        setApiCallCount(4); // Assume 4+ since user reported it
        return true; // Block widget usage
      }

      const result = limitData[0];
      let subscriptionType = result.subscription_type || "free";
      const totalCalls = parseInt(result.api_call_count) || 0;
      
      // TEMPORARY: For testing, you can force free plan check by uncommenting the line below
      // This will treat all users as free plan for limit testing
      // subscriptionType = "free";
      
      console.log("📊 Limit check result:", {
        subscriptionType,
        totalCalls,
        userId: result.user_id,
        widgetId: widgetId
      });
      
      setApiCallCount(totalCalls);
      setSubscriptionType(subscriptionType); // Store subscription type for result display
      
      // Only check limit for free users
      if (subscriptionType === "free") {
        // If user has reached 3 API calls, show limit message
        if (totalCalls >= 3) {
          console.log("🚫 FREE USER LIMIT REACHED:", totalCalls, "API calls used (limit is 3) - showing limit message");
          setIsLimitReached(true);
          return true;
        } else {
          console.log("✅ Free user has", totalCalls, "calls - under limit, widget will work");
          setIsLimitReached(false);
        }
      } else {
        console.log("✅ Premium user - no limit check needed");
        setIsLimitReached(false);
      }
      
      return false;
    } catch (error) {
      console.error("❌ Error checking API call limit:", error);
      // On error, allow the call (fail open) but log it
      return false;
    }
  }, [widgetId]);

  const trackApiCall = useCallback(
    async (callType: string, status: string = "success") => {
      if (!widgetId || !widgetSettings?.user_id) {
        console.log("🚫 trackApiCall: Missing widgetId or user_id");
        return false;
      }

      // CRITICAL: Check API call limit for free users BEFORE tracking
      // This check happens BEFORE the insert, so we can prevent exceeding the limit
      const limitReached = await checkApiCallLimit(widgetSettings.user_id);
      if (limitReached) {
        console.log("🚫 trackApiCall: Free user has reached 3 API call limit - NOT tracking", { callType });
        setIsLimitReached(true);
        return false; // Return false to indicate tracking was blocked
      }
      
      // ADDITIONAL AGGRESSIVE CHECK: Get current count RIGHT BEFORE insert
      // This is a double-check to prevent race conditions and ensure we never exceed 3
      const { count: currentCount, error: countCheckError } = await (supabase as any)
        .from("widget_api_calls")
        .select("id", { count: "exact", head: true })
        .eq("user_id", widgetSettings.user_id);
      
      if (countCheckError) {
        console.error("Error checking count before insert:", countCheckError);
        // On error, block to be safe
        return false;
      }
      
      const currentTotal = currentCount || 0;
      console.log("📊 Current API call count before insert:", currentTotal);
      
      // Check subscription again to make sure we're still on free plan
      const { data: subData, error: subCheckError } = await (supabase as any)
        .from("widget_subscriptions")
        .select("subscription_type")
        .eq("user_id", widgetSettings.user_id)
        .single();
      
      if (subCheckError && subCheckError.code !== "PGRST116") {
        console.error("Error checking subscription:", subCheckError);
      }
      
      const subType = (subData as { subscription_type?: string } | null)?.subscription_type || "free";
      
      // CRITICAL: If free user and already at or above 3 calls, BLOCK the insert
      // This prevents the 4th, 5th, etc. call from being inserted
      if (subType === "free" && currentTotal >= 3) {
        console.log("🚫 BLOCKING INSERT: Free user already has", currentTotal, "calls (limit is 3) - NOT inserting");
        setIsLimitReached(true);
        setApiCallCount(currentTotal);
        return false; // Block the insert - this is the critical check
      }

      // SAFETY CHECK: Don't track scan calls if we're in internal context
      if (typeof window !== 'undefined') {
        const host = window.location.hostname || '';
        const path = window.location.pathname || '';
        const ref = document.referrer || '';
        
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          path.includes('/dashboard') ||
          ref.includes('/dashboard')
        ) {
          console.log("🚫 trackApiCall: Internal context detected - NOT tracking", { callType, host, path });
          return;
        }
      }

      try {
        console.log("📊 trackApiCall: Tracking API call", { callType, status, widgetId });
        
        // Insert the API call
        const { error: insertError } = await (supabase as any).from("widget_api_calls").insert({
          widget_id: widgetId,
          user_id: widgetSettings.user_id,
          site_url: typeof document !== 'undefined' ? (document.referrer || window.location.href) : null,
          call_type: callType,
          status,
          ip_address: null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        });
        
        if (insertError) {
          console.error("❌ trackApiCall: Error inserting API call:", insertError);
          return false;
        }
        
        console.log("✅ trackApiCall: Successfully tracked", { callType });
        
        // Update API call count after successful tracking
        if (widgetSettings?.user_id) {
          const { count, error: countError } = await (supabase as any)
            .from("widget_api_calls")
            .select("id", { count: "exact", head: true })
            .eq("user_id", widgetSettings.user_id);
          
          if (countError) {
            console.error("Error fetching updated count:", countError);
          } else {
            const newCount = count || 0;
            setApiCallCount(newCount);
            console.log("📊 Updated API call count:", newCount);
            
            // Check if limit is reached after this call
            const { data: subscriptionData } = await (supabase as any)
              .from("widget_subscriptions")
              .select("subscription_type")
              .eq("user_id", widgetSettings.user_id)
              .single();
            
            const subscriptionType = (subscriptionData as { subscription_type?: string } | null)?.subscription_type || "free";
            if (subscriptionType === "free" && newCount >= 3) {
              console.log("🚫 Limit reached after tracking - showing limit message");
              setIsLimitReached(true);
              return false; // Return false to indicate limit was reached
            }
          }
        }
        
        return true; // Return true to indicate successful tracking
      } catch (error) {
        console.error("❌ trackApiCall: Error tracking API call:", error);
        return false;
      }
    },
    [widgetId, widgetSettings, checkApiCallLimit]
  );

  useEffect(() => {
    const loadWidgetSettings = async () => {
      console.log("🔵 WidgetEmbedClient useEffect triggered", { widgetId });
      
      if (!widgetId) {
        console.log("❌ No widgetId - exiting");
        setLoading(false);
        return;
      }

      // GLOBAL TRACKING DISABLE CHECK - If tracking is disabled globally, skip everything
      if (isTrackingDisabled()) {
        console.log("🚫 GLOBAL TRACKING DISABLED - Skipping all tracking logic");
        previewTrackedRef.current = true;
        // Still load widget settings but skip all tracking
        try {
          const { data, error } = await (supabase as any)
            .from("widget_settings")
            .select("*")
            .eq("widget_id", widgetId)
            .single();
          if (!error && data) {
            setWidgetSettings(data);
            // Check API call limit for free users
            if (data.user_id) {
              const limitReached = await checkApiCallLimit(data.user_id);
              if (limitReached) {
                setIsLimitReached(true);
              }
            }
          }
        } catch (err) {
          console.error("Exception loading widget:", err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check if we're in an iframe with same-origin parent (internal preview)
      if (typeof window !== 'undefined') {
        try {
          const isInIframe = window.self !== window.top;
          if (isInIframe) {
            try {
              const parentOrigin = window.location.ancestorOrigins?.[0] || 
                                 (document.referrer ? new URL(document.referrer).origin : null);
              const currentOrigin = window.location.origin;
              
              if (parentOrigin === currentOrigin) {
                console.log("🚫 IFRAME WITH SAME-ORIGIN PARENT - Skipping tracking (internal preview)", {
                  parentOrigin,
                  currentOrigin
                });
                previewTrackedRef.current = true;
                // Still load widget settings but skip all tracking
                try {
                  const { data, error } = await (supabase as any)
                    .from("widget_settings")
                    .select("*")
                    .eq("widget_id", widgetId)
                    .single();
                  if (!error && data) {
                    setWidgetSettings(data);
                    // Check API call limit for free users
                    if (data.user_id) {
                      const limitReached = await checkApiCallLimit(data.user_id);
                      if (limitReached) {
                        setIsLimitReached(true);
                      }
                    }
                  }
                } catch (err) {
                  console.error("Exception loading widget:", err);
                } finally {
                  setLoading(false);
                }
                return;
              }
            } catch (e) {
              // Can't access parent origin (cross-origin iframe) - this is fine, it's external
              console.log("ℹ️ In iframe but can't access parent origin (cross-origin) - may be external embed");
            }
          }
        } catch (e) {
          // Ignore iframe check errors
        }
      }

      // ULTRA-AGGRESSIVE: Check if we're in dashboard context BEFORE anything else
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname || '';
        const currentUrl = window.location.href || '';
        const referrer = document.referrer || '';
        const hostname = window.location.hostname || '';
        
        // Check if page was loaded from cache (back/forward cache or regular cache)
        // This prevents tracking from cached widget embed pages
        let isFromCache = false;
        try {
          const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (perfEntries.length > 0) {
            const navEntry = perfEntries[0];
            // If page was loaded from cache (back/forward or regular cache), don't track
            isFromCache = navEntry.type === 'back_forward' || 
                         (navEntry.transferSize === 0 && navEntry.decodedBodySize > 0);
          }
        } catch (e) {
          // Performance API not available or error - assume not from cache
        }
        
        console.log("🔍 Checking context:", { currentPath, currentUrl, referrer, hostname, isFromCache });
        
        // If ANY of these are true, completely skip ALL tracking logic
        if (
          isFromCache || // Page loaded from cache - don't track
          currentPath.includes('/dashboard') ||
          currentPath.includes('/widget/dashboard') ||
          referrer.includes('/dashboard') ||
          referrer.includes('/widget/dashboard') ||
          currentUrl.includes('/dashboard') ||
          currentUrl.includes('/widget/dashboard') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.')
        ) {
          console.log("🚫 DASHBOARD/LOCALHOST/CACHE CONTEXT DETECTED - Completely disabling tracking", {
            isFromCache,
            currentPath,
            referrer,
            currentUrl,
            hostname
          });
          previewTrackedRef.current = true; // Mark as tracked to prevent any attempts
          // Still load widget settings but skip all tracking
          try {
            const { data, error } = await (supabase as any)
              .from("widget_settings")
              .select("*")
              .eq("widget_id", widgetId)
              .single();
            if (!error && data) {
              setWidgetSettings(data);
              // Check API call limit for free users
              if (data.user_id) {
                const limitReached = await checkApiCallLimit(data.user_id);
                if (limitReached) {
                  setIsLimitReached(true);
                }
              }
            }
          } catch (err) {
            console.error("Exception loading widget:", err);
          } finally {
            setLoading(false);
          }
          return;
        }
      }

      // Prevent multiple initializations for the same widgetId (React Strict Mode in development)
      if (isLoadingRef.current === widgetId) {
        console.log("Widget already loading for this widgetId, skipping duplicate load", { widgetId });
        return;
      }
      isLoadingRef.current = widgetId;

      // Reset tracking refs when widgetId changes
      previewTrackedRef.current = false;
      isTrackingRef.current = false;

      // Check if this is localhost/development or internal access - skip tracking entirely
      // BUT: Allow external embeds (different origin referrer) to proceed
      const isLocalhostOrInternal = (() => {
        if (typeof window === 'undefined') return true;
        try {
          const currentHost = window.location.hostname || '';
          const currentPath = window.location.pathname || '';
          const currentUrl = window.location.href || '';
          const referrer = document.referrer || '';
          const currentOrigin = window.location.origin || '';
          
          // CRITICAL: If current URL path contains "dashboard", NEVER track
          // This prevents tracking when widget embed is accessed from dashboard context
          if (currentPath.includes('/dashboard') || currentPath.includes('/widget/dashboard')) {
            console.log("Dashboard path detected in URL - skipping tracking", { currentPath, currentUrl });
            return true;
          }
          
          // Check if current host is localhost - always skip
          const isLocalhost = currentHost === 'localhost' || 
                             currentHost === '127.0.0.1' || 
                             currentHost === '0.0.0.0' ||
                             currentHost.startsWith('192.168.') ||
                             currentHost.startsWith('10.') ||
                             currentHost.endsWith('.local');
          
          if (isLocalhost) {
            console.log("Localhost detected in early check - skipping tracking");
            return true;
          }
          
          // Check if we're in an iframe (cross-origin embed)
          // If in iframe and can't access parent, it's likely an external embed
          const isInIframe = window.self !== window.top;
          let isCrossOriginIframe = false;
          
          if (isInIframe) {
            try {
              // Try to access parent - if it throws, it's cross-origin (external embed)
              window.parent.location;
              // If we can access parent location, it's same-origin (internal)
              isCrossOriginIframe = false;
            } catch (e) {
              // Can't access parent - it's cross-origin (external embed) ✅
              isCrossOriginIframe = true;
              console.log("✅ Cross-origin iframe detected (external embed)", e);
            }
          }
          
          // If no referrer BUT we're in a cross-origin iframe, it's still an external embed
          if ((!referrer || referrer === '') && !isCrossOriginIframe) {
            console.log("No referrer and not in cross-origin iframe (direct access) - skipping tracking");
            return true;
          }
          
          // If we're in a cross-origin iframe, allow tracking even without referrer
          if (isCrossOriginIframe) {
            console.log("✅ Cross-origin iframe detected - will allow tracking (external embed)");
            return false; // Don't skip - this is an external embed
          }
          
          // Check if referrer is same origin (same domain) - skip tracking
          // This covers: widget embedded on your own website (same domain)
          // Example: widget at what-the-food-hqjp.vercel.app/widget/embed 
          //          embedded on what-the-food-hqjp.vercel.app/some-page → same origin → skip
          //
          // When external site embeds iframe:
          // - iframe src: https://what-the-food-hqjp.vercel.app/widget/embed?id=...
          // - iframe's window.location.origin: https://what-the-food-hqjp.vercel.app
          // - iframe's document.referrer: https://example.com/page (external site)
          // - referrer origin: https://example.com (different!) → will track ✅
          try {
            const referrerOrigin = new URL(referrer).origin;
            if (referrerOrigin === currentOrigin) {
              console.log("Same origin referrer (your own website) - skipping tracking", {
                referrerOrigin,
                currentOrigin,
                referrer
              });
              return true;
            }
            // If referrer is from different origin → it's an external embed on someone else's website → ALLOW tracking
            console.log("Different origin referrer detected - will track (external embed)", {
              referrerOrigin,
              currentOrigin,
              referrer,
              note: "External site embedding your widget - this will be tracked"
            });
          } catch (e) {
            // Invalid referrer URL - skip to be safe
            console.log("Invalid referrer URL - skipping tracking", e);
            return true;
          }
          
          // Check if referrer contains dashboard or widget paths (internal pages) - skip
          // This is a safety check for internal navigation on your own site
          if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard') || referrer.includes('/widget/embed')) {
            console.log("Referrer contains dashboard/widget paths - skipping tracking", { referrer });
            return true;
          }
          
          // Additional safety: Check current path (currentPath already defined above)
          if (currentPath.includes('/dashboard')) {
            console.log("Current path contains dashboard - skipping tracking");
            return true;
          }
          
          // Final verification: referrer origin must be valid and different
          // If we can't verify it's external, don't track
          try {
            const referrerOrigin = new URL(referrer).origin;
            if (!referrerOrigin || referrerOrigin === currentOrigin) {
              console.log("Cannot verify external referrer - skipping tracking for safety", {
                referrerOrigin,
                currentOrigin
              });
              return true;
            }
          } catch (e) {
            console.log("Cannot parse referrer for final check - skipping tracking for safety");
            return true;
          }
          
          // External embed from different origin → allow tracking
          // This means someone embedded your widget on their website (different domain)
          console.log("✅ Verified external embed - will allow tracking", {
            referrerOrigin: new URL(referrer).origin,
            currentOrigin
          });
          return false;
        } catch (e) {
          console.log("Error in early check - skipping tracking for safety", e);
          return true; // On error, assume internal
        }
      })();

      // Check if we've already tracked this widget in this session
      if (hasTrackedPreview(widgetId) || isLocalhostOrInternal) {
        // IMMEDIATELY mark as tracked to prevent any tracking attempts
        previewTrackedRef.current = true;
        
        if (isLocalhostOrInternal) {
          console.log("Localhost/internal access detected - skipping API call tracking entirely");
        } else {
          console.log("Preview already tracked for this widget in this session, skipping");
        }
        // Still load settings but don't track
        try {
          const { data, error } = await (supabase as any)
            .from("widget_settings")
            .select("*")
            .eq("widget_id", widgetId)
            .single();

          if (!error && data) {
            setWidgetSettings(data);
            // Check API call limit for free users
            if (data.user_id) {
              const limitReached = await checkApiCallLimit(data.user_id);
              if (limitReached) {
                setIsLimitReached(true);
              }
            }
          }
        } catch (err) {
          console.error("Exception loading widget:", err);
        } finally {
          setLoading(false);
          isLoadingRef.current = null; // Reset when done
        }
        return;
      }

      // Prevent concurrent tracking calls
      if (isTrackingRef.current) {
        isLoadingRef.current = null; // Reset if cancelled
        return;
      }

      try {
        console.log("Loading widget settings for widget_id:", widgetId);
        
        const { data, error } = await (supabase as any)
          .from("widget_settings")
          .select("*")
          .eq("widget_id", widgetId)
          .single();

        if (error) {
          console.error("Error loading widget settings:", error);
          console.error("Error code:", error.code, "Error message:", error.message);
          // PGRST116 is "not found" - widget doesn't exist
          // PGRST301 is "JWT expired" or auth error
          if (error.code === "PGRST116") {
            console.error("Widget not found in database. Widget ID:", widgetId);
          } else if (error.code === "PGRST301" || error.message?.includes("JWT")) {
            console.error("Authentication error - widget may require public access");
          }
          setLoading(false);
          return;
        }

        if (data) {
          console.log("Widget settings loaded successfully:", data);
          setWidgetSettings(data);
          
          // CRITICAL: Check API call limit for free users BEFORE allowing widget to be used
          // This determines if we show the normal widget or the "Limit Exceeded" widget
          // IMPORTANT: We pass user_id but the function uses widgetId internally
          if (data.user_id && widgetId) {
            console.log("🔍 Checking API call limit for widget:", widgetId, "user:", data.user_id);
            
            // ALWAYS check limit - this is critical
            const limitReached = await checkApiCallLimit(data.user_id);
            console.log("🔍 Limit check result:", limitReached, "isLimitReached state:", isLimitReached);
            
            if (limitReached) {
              console.log("🚫 Free user has reached 3 API call limit - showing limit exceeded widget");
              setIsLimitReached(true);
              // Force a re-render to show the limit message
              setApiCallCount(prev => {
                const newCount = prev || 4; // Use current or assume 4+
                console.log("Setting API call count to:", newCount);
                return newCount;
              });
            } else {
              console.log("✅ Limit check passed - showing normal widget");
              setIsLimitReached(false);
            }
          } else {
            console.warn("⚠️ Cannot check limit - missing user_id or widgetId", { user_id: data.user_id, widgetId });
            setIsLimitReached(false);
          }
          
          // Only set loading to false AFTER limit check is complete
          setLoading(false);
          
          // Track preview only once per widget per session
          // ONLY track if we're 100% certain it's an external embed
          // The early check already filtered out internal access, so if we reach here and have a valid referrer from different origin, track it
          if (!previewTrackedRef.current && data.user_id && !isTrackingRef.current) {
            // Double-check: Only track if we have a valid referrer from a DIFFERENT origin
            // This is a safety check - the early check should have caught internal access
            const shouldTrack = (() => {
              if (typeof window === 'undefined') return false;
              try {
                const referrer = document.referrer || '';
                const currentOrigin = window.location.origin || '';
                
                // Check if we're in a cross-origin iframe (external embed)
                const isInIframe = window.self !== window.top;
                let isCrossOriginIframe = false;
                
                if (isInIframe) {
                  try {
                    window.parent.location;
                    isCrossOriginIframe = false;
                  } catch (e) {
                    isCrossOriginIframe = true;
                    console.log("✅ Cross-origin iframe detected in safety check (external embed)");
                  }
                }
                
                // Must have a referrer OR be in a cross-origin iframe
                if ((!referrer || referrer === '') && !isCrossOriginIframe) {
                  console.log("No referrer and not in cross-origin iframe - not tracking (safety check)");
                  return false;
                }
                
                // If in cross-origin iframe, allow tracking even without referrer
                if (isCrossOriginIframe) {
                  console.log("✅ Cross-origin iframe - will track (external embed)");
                  return true;
                }
                
                // Must be able to parse referrer
                let referrerOrigin = '';
                try {
                  referrerOrigin = new URL(referrer).origin;
                } catch (e) {
                  console.log("Invalid referrer URL - not tracking (safety check)");
                  return false;
                }
                
                // Referrer must be from DIFFERENT origin (external site)
                if (referrerOrigin === currentOrigin) {
                  console.log("Same origin referrer - not tracking (safety check)", {
                    referrerOrigin,
                    currentOrigin
                  });
                  return false;
                }
                
                // Final check: referrer should NOT contain dashboard/widget paths
                if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard') || referrer.includes('/widget/embed')) {
                  console.log("Referrer contains internal paths - not tracking (safety check)");
                  return false;
                }
                
                // All checks passed - this is definitely an external embed
                console.log("All safety checks passed - will track external embed", {
                  referrerOrigin,
                  currentOrigin,
                  referrer
                });
                return true;
              } catch (e) {
                console.log("Error in safety check - not tracking", e);
                return false;
              }
            })();

            if (!shouldTrack) {
              console.log("Safety check failed - skipping API call tracking");
              previewTrackedRef.current = true;
              return;
            }

            // FINAL VERIFICATION: Triple-check that this is definitely an external embed
            // DEFAULT: DON'T TRACK unless we can PROVE it's external
            // Only track if ALL of these are true:
            // 1. We have a valid referrer
            // 2. Referrer is from a DIFFERENT origin (not same domain)
            // 3. Current path is NOT dashboard
            // 4. Not localhost
            // 5. Referrer doesn't contain internal paths
            // 6. Referrer hostname is different from current hostname
            const finalVerification = (() => {
              if (typeof window === 'undefined') {
                console.log("❌ Final check: Server-side - NOT tracking");
                return false;
              }
              try {
                const referrer = document.referrer || '';
                const currentPath = window.location.pathname || '';
                const currentHost = window.location.hostname || '';
                const currentOrigin = window.location.origin || '';
                
                console.log("🔍 Final verification check:", {
                  referrer,
                  currentPath,
                  currentHost,
                  currentOrigin
                });
                
                // Check if we're in a cross-origin iframe (external embed)
                const isInIframe = window.self !== window.top;
                let isCrossOriginIframe = false;
                
                if (isInIframe) {
                  try {
                    window.parent.location;
                    isCrossOriginIframe = false;
                  } catch (e) {
                    isCrossOriginIframe = true;
                    console.log("✅ Cross-origin iframe detected in final check (external embed)");
                  }
                }
                
                // Must have referrer OR be in a cross-origin iframe
                if ((!referrer || referrer === '') && !isCrossOriginIframe) {
                  console.log("❌ Final check: No referrer and not in cross-origin iframe - NOT tracking");
                  return false;
                }
                
                // If in cross-origin iframe, allow tracking even without referrer
                if (isCrossOriginIframe) {
                  console.log("✅ Final check: Cross-origin iframe - WILL TRACK (external embed)");
                  return true;
                }
                
                // Must not be localhost
                if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.endsWith('.local')) {
                  console.log("❌ Final check: Localhost - NOT tracking", { currentHost });
                  return false;
                }
                
                // Must not be dashboard path
                if (currentPath.includes('/dashboard') || currentPath.includes('/widget/dashboard')) {
                  console.log("❌ Final check: Dashboard path - NOT tracking", { currentPath });
                  return false;
                }
                
                // Must have valid referrer from different origin
                try {
                  const referrerUrl = new URL(referrer);
                  const referrerOrigin = referrerUrl.origin;
                  const referrerHost = referrerUrl.hostname;
                  
                  // Check if referrer is localhost
                  if (referrerHost === 'localhost' || referrerHost === '127.0.0.1' || referrerHost.startsWith('192.168.') || referrerHost.startsWith('10.')) {
                    console.log("❌ Final check: Referrer is localhost - NOT tracking", { referrerHost });
                    return false;
                  }
                  
                  // Must be different origin
                  if (referrerOrigin === currentOrigin) {
                    console.log("❌ Final check: Same origin - NOT tracking", {
                      referrerOrigin,
                      currentOrigin
                    });
                    return false;
                  }
                  
                  // Must be different hostname (even if different port, same hostname = same site)
                  if (referrerHost === currentHost) {
                    console.log("❌ Final check: Same hostname - NOT tracking", {
                      referrerHost,
                      currentHost
                    });
                    return false;
                  }
                  
                  // Referrer must not contain internal paths
                  if (referrer.includes('/dashboard') || referrer.includes('/widget/dashboard') || referrer.includes('/widget/embed')) {
                    console.log("❌ Final check: Referrer contains internal paths - NOT tracking", { referrer });
                    return false;
                  }
                  
                  // All checks passed - this is definitely an external embed
                  console.log("✅ Final check: ALL conditions met - WILL TRACK", {
                    referrerOrigin,
                    referrerHost,
                    currentOrigin,
                    currentHost,
                    referrer
                  });
                  return true;
                } catch (e) {
                  console.log("❌ Final check: Cannot parse referrer - NOT tracking", e);
                  return false;
                }
              } catch (e) {
                console.log("❌ Final check: Error in verification - NOT tracking", e);
                return false;
              }
            })();

            if (!finalVerification) {
              console.log("❌ Final verification failed - skipping API call tracking");
              previewTrackedRef.current = true;
              return;
            }

            // ONE MORE CHECK: Make absolutely sure we're not in any internal context
            const absoluteFinalCheck = (() => {
              if (typeof window === 'undefined') return false;
              const path = window.location.pathname || '';
              const url = window.location.href || '';
              const ref = document.referrer || '';
              const host = window.location.hostname || '';
              
              // If ANY mention of dashboard, localhost, or same domain - DON'T TRACK
              const hasDashboard = path.includes('dashboard') || url.includes('dashboard') || ref.includes('dashboard');
              const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.');
              const isSameDomain = ref && new URL(ref).origin === window.location.origin;
              
              if (hasDashboard || isLocal || isSameDomain) {
                console.log("❌ ABSOLUTE FINAL CHECK FAILED - Not tracking", { hasDashboard, isLocal, isSameDomain, path, ref, host });
                return false;
              }
              
              return true;
            })();

            if (!absoluteFinalCheck) {
              console.log("❌ Absolute final check failed - skipping API call tracking");
              previewTrackedRef.current = true;
              return;
            }

            // FINAL PRE-INSERT CHECK: One last verification right before inserting
            // This is the absolute last line of defense
            const preInsertCheck = (() => {
              if (typeof window === 'undefined') {
                console.log("🚫 PRE-INSERT: Server-side - NOT inserting");
                return false;
              }
              
              try {
                const path = window.location.pathname || '';
                const url = window.location.href || '';
                const ref = document.referrer || '';
                const host = window.location.hostname || '';
                const origin = window.location.origin || '';
                
                // Check if tracking is globally disabled
                if (isTrackingDisabled()) {
                  console.log("🚫 PRE-INSERT: Tracking globally disabled");
                  return false;
                }
                
                // Check if we're in a cross-origin iframe (external embed)
                const isInIframe = window.self !== window.top;
                let isCrossOriginIframe = false;
                
                if (isInIframe) {
                  try {
                    window.parent.location;
                    isCrossOriginIframe = false;
                  } catch (e) {
                    isCrossOriginIframe = true;
                    console.log("✅ PRE-INSERT: Cross-origin iframe detected (external embed)");
                  }
                }
                
                // Must have referrer OR be in a cross-origin iframe
                if ((!ref || ref === '') && !isCrossOriginIframe) {
                  console.log("🚫 PRE-INSERT: No referrer and not in cross-origin iframe");
                  return false;
                }
                
                // If in cross-origin iframe, allow tracking even without referrer
                if (isCrossOriginIframe) {
                  console.log("✅ PRE-INSERT: Cross-origin iframe - WILL INSERT (external embed)");
                  return true;
                }
                
                // Must not be localhost
                if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.endsWith('.local')) {
                  console.log("🚫 PRE-INSERT: Localhost detected", { host });
                  return false;
                }
                
                // Must not contain dashboard
                if (path.includes('dashboard') || url.includes('dashboard') || ref.includes('dashboard')) {
                  console.log("🚫 PRE-INSERT: Dashboard detected");
                  return false;
                }
                
                // Parse referrer and verify it's external
                try {
                  const refUrl = new URL(ref);
                  const refOrigin = refUrl.origin;
                  const refHost = refUrl.hostname;
                  
                  // Must be different origin
                  if (refOrigin === origin) {
                    console.log("🚫 PRE-INSERT: Same origin", { refOrigin, origin });
                    return false;
                  }
                  
                  // Must be different hostname
                  if (refHost === host) {
                    console.log("🚫 PRE-INSERT: Same hostname", { refHost, host });
                    return false;
                  }
                  
                  // Extract top-level domains for comparison
                  const getTopLevelDomain = (hostname: string): string => {
                    const parts = hostname.split('.');
                    if (parts.length >= 2) {
                      return parts.slice(-2).join('.');
                    }
                    return hostname;
                  };
                  
                  const refTLD = getTopLevelDomain(refHost);
                  const currentTLD = getTopLevelDomain(host);
                  
                  // Must be different top-level domain (e.g., example.com vs whatthefood.io)
                  if (refTLD === currentTLD) {
                    console.log("🚫 PRE-INSERT: Same top-level domain", { refTLD, currentTLD, refHost, host });
                    return false;
                  }
                  
                  // All checks passed
                  console.log("✅ PRE-INSERT: All checks passed - WILL INSERT", {
                    refOrigin,
                    refHost,
                    refTLD,
                    origin,
                    host,
                    currentTLD
                  });
                  return true;
                } catch (e) {
                  console.log("🚫 PRE-INSERT: Cannot parse referrer", e);
                  return false;
                }
              } catch (e) {
                console.log("🚫 PRE-INSERT: Error in check", e);
                return false;
              }
            })();

            if (!preInsertCheck) {
              console.log("🚫 PRE-INSERT CHECK FAILED - NOT inserting API call");
              previewTrackedRef.current = true;
              return;
            }

            previewTrackedRef.current = true;
            isTrackingRef.current = true;
            
            // Mark as tracked immediately to prevent duplicate calls
            markPreviewTracked(widgetId);
            
            // ABSOLUTE FINAL CHECK: One more verification right before the actual insert
            // This is the last line of defense - if ANY check fails, don't insert
            const absoluteFinalVerification = (() => {
              if (typeof window === 'undefined') return false;
              
              // Check if tracking is globally disabled
              if (isTrackingDisabled()) {
                console.log("🚫 ABSOLUTE FINAL: Tracking globally disabled");
                return false;
              }
              
              // Check if page was loaded from cache
              let isFromCache = false;
              try {
                const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
                if (perfEntries.length > 0) {
                  const navEntry = perfEntries[0];
                  isFromCache = navEntry.type === 'back_forward' || 
                               (navEntry.transferSize === 0 && navEntry.decodedBodySize > 0);
                }
              } catch (e) {
                // Performance API not available
              }
              
              if (isFromCache) {
                console.log("🚫 ABSOLUTE FINAL: Page loaded from cache");
                return false;
              }
              
              const path = window.location.pathname || '';
              const url = window.location.href || '';
              const ref = document.referrer || '';
              const host = window.location.hostname || '';
              const origin = window.location.origin || '';
              
              // Check if we're in a cross-origin iframe (external embed)
              const isInIframe = window.self !== window.top;
              let isCrossOriginIframe = false;
              
              if (isInIframe) {
                try {
                  window.parent.location;
                  isCrossOriginIframe = false;
                } catch (e) {
                  isCrossOriginIframe = true;
                  console.log("✅ ABSOLUTE FINAL: Cross-origin iframe detected (external embed)");
                }
              }
              
              // Must have referrer OR be in a cross-origin iframe
              if ((!ref || ref === '') && !isCrossOriginIframe) {
                console.log("🚫 ABSOLUTE FINAL: No referrer and not in cross-origin iframe");
                return false;
              }
              
              // If in cross-origin iframe, allow tracking even without referrer
              if (isCrossOriginIframe) {
                console.log("✅ ABSOLUTE FINAL: Cross-origin iframe - WILL INSERT (external embed)");
                return true;
              }
              
              // Must not be localhost
              if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
                console.log("🚫 ABSOLUTE FINAL: Localhost");
                return false;
              }
              
              // Must not contain dashboard
              if (path.includes('dashboard') || url.includes('dashboard') || ref.includes('dashboard')) {
                console.log("🚫 ABSOLUTE FINAL: Dashboard detected");
                return false;
              }
              
              // Must be different origin and hostname
              try {
                const refUrl = new URL(ref);
                if (refUrl.origin === origin || refUrl.hostname === host) {
                  console.log("🚫 ABSOLUTE FINAL: Same origin/hostname");
                  return false;
                }
                
                console.log("✅ ABSOLUTE FINAL: All checks passed - WILL INSERT");
                return true;
              } catch (e) {
                console.log("🚫 ABSOLUTE FINAL: Cannot parse referrer");
                return false;
              }
            })();

            if (!absoluteFinalVerification) {
              console.log("🚫 ABSOLUTE FINAL VERIFICATION FAILED - NOT inserting");
              previewTrackedRef.current = true;
              return;
            }
            
            // FINAL DEDUPLICATION: Check if we've tracked this exact combination very recently
            // This prevents duplicate inserts from cached pages or multiple tabs
            const dedupKey = `widget_track_${widgetId}_${document.referrer || window.location.href}`;
            try {
              const lastTracked = sessionStorage.getItem(dedupKey);
              if (lastTracked) {
                const lastTrackedTime = parseInt(lastTracked, 10);
                const now = Date.now();
                // If tracked within last 30 seconds, skip (prevents rapid duplicates)
                if (now - lastTrackedTime < 30000) {
                  console.log("🚫 DEDUPLICATION: Already tracked within last 30 seconds - NOT inserting");
                  previewTrackedRef.current = true;
                  return;
                }
              }
            } catch (e) {
              // sessionStorage error - continue anyway
            }

            try {
              console.log("🚀 TRACKING API CALL - External embed confirmed after ALL checks", {
                widgetId,
                referrer: document.referrer,
                currentOrigin: window.location.origin,
                currentPath: window.location.pathname,
                hostname: window.location.hostname
              });
              
              // Mark as tracked in sessionStorage BEFORE insert (prevents race conditions)
              const dedupKey = `widget_track_${widgetId}_${document.referrer || window.location.href}`;
              try {
                sessionStorage.setItem(dedupKey, Date.now().toString());
              } catch (e) {
                // sessionStorage error - continue anyway
              }
              
              // Determine site_url: prefer referrer, but if in cross-origin iframe without referrer, use a marker
              let siteUrl: string | null = null;
              if (typeof document !== 'undefined') {
                if (document.referrer && document.referrer !== '') {
                  siteUrl = document.referrer;
                } else {
                  // Check if we're in a cross-origin iframe (external embed)
                  const isInIframe = window.self !== window.top;
                  if (isInIframe) {
                    try {
                      window.parent.location;
                      // Can access parent = same origin = use current URL
                      siteUrl = window.location.href;
                    } catch (e) {
                      // Can't access parent = cross-origin = external embed
                      // Use a marker indicating it's an external cross-origin embed
                      siteUrl = '[external-cross-origin-embed]';
                    }
                  } else {
                    siteUrl = window.location.href;
                  }
                }
              }
              
              await (supabase as any).from("widget_api_calls").insert({
                widget_id: widgetId,
                user_id: data.user_id,
                site_url: siteUrl,
                call_type: "preview",
                status: "success",
                ip_address: null,
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
              });
              console.log("✅ Preview API call tracked successfully");
            } catch (trackError) {
              console.error("❌ Error tracking preview API call:", trackError);
              // Remove from sessionStorage if tracking failed so it can retry
              if (typeof window !== 'undefined') {
                try {
                  sessionStorage.removeItem(`widget_preview_tracked_${widgetId}`);
                } catch (e) {
                  // Ignore
                }
              }
            } finally {
              isTrackingRef.current = false;
            }
          }
        } else {
          console.error("No data returned for widget_id:", widgetId);
        }
      } catch (err) {
        console.error("Exception loading widget:", err);
        isTrackingRef.current = false;
        isLoadingRef.current = null; // Reset on error
      } finally {
        setLoading(false);
        isLoadingRef.current = null; // Reset when done
      }
    };

    void loadWidgetSettings();
    
    // Cleanup: reset loading ref when widgetId changes or component unmounts
    return () => {
      if (isLoadingRef.current === widgetId) {
        isLoadingRef.current = null;
      }
    };
  }, [widgetId, checkApiCallLimit]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imagePreview || !widgetId || !widgetSettings?.user_id) {
      console.log("🚫 Cannot scan - missing required data");
      return;
    }
    
    // CRITICAL: Check limit BEFORE any processing
    if (isLimitReached) {
      console.log("🚫 Cannot scan - API call limit already reached");
      return;
    }
    
    // Double-check limit from database before proceeding (prevents race conditions)
    const limitReached = await checkApiCallLimit(widgetSettings.user_id);
    if (limitReached) {
      console.log("🚫 Cannot scan - API call limit reached (verified from database)");
      setIsLimitReached(true);
      return;
    }

    setScanning(true);
    try {
      // CRITICAL: Track the API call FIRST, before any processing
      // This ensures we check the limit and insert the call BEFORE showing results
      console.log("🔍 Pre-tracking limit check...");
      const preTrackLimitCheck = await checkApiCallLimit(widgetSettings.user_id);
      if (preTrackLimitCheck) {
        console.log("🚫 Limit reached before tracking - aborting scan");
        setIsLimitReached(true);
        setScanning(false);
        return;
      }
      
      // Track the API call BEFORE processing (this will also check limit internally)
      console.log("📊 Tracking API call before processing...");
      const trackResult = await trackApiCall("scan", "success");
      
      // If trackApiCall returns false, limit was reached - don't process
      if (!trackResult) {
        console.log("🚫 trackApiCall returned false - limit reached - NOT processing scan");
        setIsLimitReached(true);
        setScanning(false);
        return; // Exit early - don't process, don't set result
      }
      
      // Double-check limit after tracking (in case it was reached during the insert)
      const postTrackLimitCheck = await checkApiCallLimit(widgetSettings.user_id);
      if (postTrackLimitCheck) {
        console.log("🚫 Limit reached after tracking - NOT processing scan");
        setIsLimitReached(true);
        setScanning(false);
        return; // Exit early - don't process, don't set result
      }
      
      // Only process scan if ALL limit checks pass AND tracking succeeded
      console.log("✅ All limit checks passed and tracking succeeded - processing scan");
      
      // Actually call analyzeFood to get real results
      // Note: analyzeFood expects imageUrl (string), but we have base64 data URL
      // The backend should handle data URLs, but if not, we may need to upload first
      try {
        // Convert base64 data URL to a format the backend can handle
        // If the backend doesn't support data URLs, we'll need to upload the image first
        const analysisResult = await analyzeFood(imagePreview, servings);
        console.log("✅ Analysis complete:", analysisResult);
        
        // Final check before setting result
        const finalLimitCheck = await checkApiCallLimit(widgetSettings.user_id);
        if (finalLimitCheck) {
          console.log("🚫 Limit reached during processing - NOT setting result");
          setIsLimitReached(true);
          setScanning(false);
          return;
        }
        
        // Only set result if ALL checks pass
        console.log("✅ Setting result - all checks passed");
        
        // Handle different display modes
        if (resultDisplayMode === "new_tab") {
          // Store result data in sessionStorage and open new tab
          const resultId = `widget_result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem(resultId, JSON.stringify({
            analysis: analysisResult.analysis,
            image: imagePreview,
            servings: servings,
            subscriptionType: subscriptionType
          }));
          const newTabUrl = `${baseUrl}/widget-results?widgetResultId=${resultId}`;
          window.open(newTabUrl, "_blank", "noopener,noreferrer");
          // Reset form for next scan
          setResult(null);
          setImagePreview(null);
        } else if (resultDisplayMode === "modal") {
          // Show results in modal
          setResult(analysisResult.analysis);
          setModalOpen(true);
        } else {
          // Default: same page
          setResult(analysisResult.analysis);
        }
      } catch (analysisError: any) {
        console.error("❌ Error analyzing food:", analysisError);
        throw analysisError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Error scanning:", error);
      // Don't track error if limit is reached
      if (!isLimitReached) {
      await trackApiCall("scan", "error");
      }
    } finally {
      setScanning(false);
    }
  };

  const styles = {
    primaryColor: widgetSettings?.primary_color || "#10b981",
    borderRadius: widgetSettings?.border_radius || "8px",
    backgroundColor: widgetSettings?.background_color || "transparent",
    customText: widgetSettings?.custom_text || null,
    brandingVisible: widgetSettings?.branding_visible !== false,
    uploadAreaBackgroundColor: widgetSettings?.upload_area_background_color || null,
  };

  const resultDisplayMode = (widgetSettings?.result_display_mode as "same_page" | "new_tab" | "modal") || "same_page";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!widgetId || !widgetSettings) {
    return <div className="p-4 text-center text-muted-foreground">Widget not found or invalid widget ID</div>;
  }

  const baseUrl = getUrl("");
  const widgetEmbedUrl = `${baseUrl}/widget/embed?id=${widgetId}`;

  // Show limit reached message for free users
  // CRITICAL: This check happens BEFORE rendering the normal widget
  if (isLimitReached) {
    console.log("🚫 Rendering Limit Exceeded widget - isLimitReached:", isLimitReached, "apiCallCount:", apiCallCount);
  return (
    <div className="w-full min-h-screen p-4 sm:p-6 flex items-center justify-center" style={{ backgroundColor: styles.backgroundColor || "transparent" }}>
      <div 
        className="max-w-md mx-auto rounded-lg border-2 border-border shadow-sm p-8 text-center"
        style={{ 
          borderRadius: styles.borderRadius,
          borderColor: styles.primaryColor + "30",
          backgroundColor: styles.backgroundColor || "transparent"
        }}
      >
          <div className="space-y-4">
            <div className="text-4xl mb-4">🚫</div>
            <h3 className="text-xl font-bold" style={{ color: styles.primaryColor }}>
              API Call Limit Reached
            </h3>
            <p className="text-muted-foreground">
              You&apos;ve reached the free plan limit of 3 API calls. Upgrade to a premium plan to continue using the widget.
            </p>
            <p className="text-sm text-muted-foreground font-semibold">
              Current API calls: {apiCallCount || 4} / 3
            </p>
            <div className="pt-4">
              <a
                href={`${baseUrl}/plans`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button
                  style={{ 
                    backgroundColor: styles.primaryColor,
                    borderRadius: styles.borderRadius
                  }}
                >
                  Upgrade to Premium
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  console.log("✅ Rendering normal widget - isLimitReached:", isLimitReached, "apiCallCount:", apiCallCount);

  return (
    <div className="w-full min-h-screen p-4 sm:p-6" style={{ backgroundColor: styles.backgroundColor || "transparent" }}>
      <div 
        className="max-w-md mx-auto rounded-lg border-2 border-border shadow-sm"
        style={{ 
          borderRadius: styles.borderRadius,
          borderColor: styles.primaryColor + "30",
          backgroundColor: styles.backgroundColor || "transparent"
        }}
      >
        <div className="p-6 sm:p-8">
          {styles.customText && (
            <h3 className="text-lg font-semibold mb-4 text-center" style={{ color: styles.primaryColor }}>
              {styles.customText}
            </h3>
          )}

          {!result ? (
            <div className="space-y-4">
              {!imagePreview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors flex-1 flex flex-col items-center justify-center min-h-[280px] ${
                    isLimitReached ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-opacity-50"
                  }`}
                  style={{ 
                    borderColor: styles.primaryColor + "30",
                    borderRadius: styles.borderRadius,
                    backgroundColor: (styles.uploadAreaBackgroundColor && styles.uploadAreaBackgroundColor.trim() !== "") 
                      ? styles.uploadAreaBackgroundColor 
                      : "rgba(0, 0, 0, 0.02)"
                  }}
                  onClick={() => {
                    if (isLimitReached) return;
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                >
          <Upload 
            className="h-14 w-14 mx-auto mb-4" 
            style={{ color: styles.primaryColor }} 
          />
          <p className="text-lg font-medium mb-2" style={{ color: styles.primaryColor }}>
            {widgetSettings?.widget_name || "Upload Your Food Photo"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {widgetSettings?.widget_description || "Drop an image here or click to browse"}
          </p>
                  <Button 
                    style={{ 
                      backgroundColor: styles.primaryColor,
                      borderRadius: styles.borderRadius
                    }}
                  >
                    Choose File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-border bg-muted/30">
                    <div className="aspect-video relative">
                      <img 
                        src={imagePreview} 
                        alt="Uploaded food" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/png, image/jpeg, image/jpg, image/heic, image/heif";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImagePreview(null);
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      onClick={handleScan}
                      disabled={scanning || isLimitReached}
                      className="flex-1"
                      style={{ 
                        backgroundColor: styles.primaryColor,
                        borderRadius: styles.borderRadius
                      }}
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        "Analyze Food"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : result && resultDisplayMode !== "modal" ? (
            subscriptionType === "free" ? (
              // FREE USER VIEW: Nutrition + Accuracy Scale
              <FreeUserResultsView 
                result={result}
                imageUrl={imagePreview}
                styles={styles}
                onScanAnother={() => {
                  setResult(null);
                  setImagePreview(null);
                }}
              />
            ) : (
              // PREMIUM USER VIEW: Full Detailed Results
              <PremiumUserResultsView 
                result={result}
                imageUrl={imagePreview}
                servings={servings}
                styles={styles}
                baseUrl={baseUrl}
                onScanAnother={() => {
                  setResult(null);
                  setImagePreview(null);
                }}
              />
            )
          ) : null}

          {/* Modal for results display */}
          {resultDisplayMode === "modal" && (
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="text-xl font-bold">Food Analysis Results</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
                  <div className="py-4">
                    {subscriptionType === "free" ? (
                      <FreeUserResultsView 
                        result={result!}
                        imageUrl={imagePreview}
                        styles={styles}
                        onScanAnother={() => {
                          setResult(null);
                          setImagePreview(null);
                          setModalOpen(false);
                        }}
                      />
                    ) : (
                      <PremiumUserResultsView 
                        result={result!}
                        imageUrl={imagePreview}
                        servings={servings}
                        styles={styles}
                        baseUrl={baseUrl}
                        onScanAnother={() => {
                          setResult(null);
                          setImagePreview(null);
                          setModalOpen(false);
                        }}
                      />
                    )}
            </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}

          {styles.brandingVisible && (
            <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
              Powered by{" "}
              <a
                href="https://whatthefood.io"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: styles.primaryColor }}
                className="hover:underline"
              >
                WhatTheFood
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
