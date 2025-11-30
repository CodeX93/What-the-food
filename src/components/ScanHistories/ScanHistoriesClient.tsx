'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import {
  Calendar as CalendarIcon,
  ChevronDown,
  Camera,
  Search,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Lock,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getImageUrl } from "@/utils/foodScan";

export type FoodScan = {
  id: string;
  image_url: string | null;
  image_path: string | null;
  serving: number | null;
  result_json: any;
  created_at: string;
  displayUrl?: string | null;
};

const DEFAULT_SCAN_IMAGE = "default-food-image.svg";

const isValidRemoteImage = (url?: string | null) => typeof url === "string" && /^https?:\/\//i.test(url);

const isManualEntryScan = (scan: Pick<FoodScan, "result_json"> & { image_path?: string | null }) => {
  const dish = scan.result_json?.dish;
  return Boolean(scan.result_json?.isManualEntry || (typeof dish === "string" && dish.trim().toLowerCase().startsWith("manual")));
};

const shouldAttemptSignedUrl = (scan: Pick<FoodScan, "result_json" | "image_path">) =>
  Boolean(scan.image_path && !scan.image_path.toLowerCase().startsWith("manual-entry") && !isManualEntryScan(scan));

const fallbackImageForScan = (scan: Pick<FoodScan, "result_json"> & { image_url?: string | null }) => {
  if (isManualEntryScan(scan as any)) {
    return DEFAULT_SCAN_IMAGE;
  }
  if (isValidRemoteImage(scan.image_url)) {
    return scan.image_url as string;
  }
  return DEFAULT_SCAN_IMAGE;
};

type ScanHistoriesClientProps = {
  initialSubscription?: any;
};

export function ScanHistoriesClient({ initialSubscription = null }: ScanHistoriesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FoodScan[]>([]);
  const [openRange, setOpenRange] = useState(false);
  const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [activePreset, setActivePreset] = useState<string>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const isPremium = initialSubscription?.subscription_type === "premium";
  const [scanToDelete, setScanToDelete] = useState<FoodScan | null>(null);
  const [deletingScan, setDeletingScan] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (!cancelled) router.push("/auth");
          return;
        }

        const { data, error, count } = await supabase
          .from("food_scans")
          .select("id, image_url, image_path, serving, result_json, created_at, language", { count: "exact" })
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) {
          throw error;
        }

        const scans = data || [];
        const initialItems = scans.map((scan: any) => ({
          ...scan,
          displayUrl: fallbackImageForScan(scan),
        })) as FoodScan[];

        if (!cancelled) {
          setItems(initialItems);
          setHasMore(typeof count === "number" ? count > initialItems.length : false);
          setLoading(false);
        }

        Promise.all(
          scans.map(async (scan: any) => {
            if (cancelled || !shouldAttemptSignedUrl(scan)) {
              return null;
            }

            try {
              const displayUrl = await getImageUrl(scan.image_path, 60 * 60);
              return displayUrl ? { id: scan.id, displayUrl } : null;
            } catch (err) {
              console.warn("Failed to load image URL for scan:", scan.id, err);
              return null;
            }
          })
        ).then((urls) => {
          if (cancelled) return;

          setItems((prev) =>
            prev.map((item) => {
              const urlData = urls.find((u) => u?.id === item.id);
              return urlData?.displayUrl ? { ...item, displayUrl: urlData.displayUrl } : item;
            })
          );
        });
      } catch (error: any) {
        if (cancelled) return;

        console.error("Error loading scans:", error);
        toast({
          title: "Error",
          description: "Failed to load scan history.",
          variant: "destructive",
        });
        setItems([]);
        setHasMore(false);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [router, isPremium, toast]);

  const handleConfirmDelete = async () => {
    if (!scanToDelete) return;
    setDeletingScan(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const { error } = await supabase.from("food_scans").delete().eq("id", scanToDelete.id);
      if (error) {
        throw error;
      }

      if (scanToDelete.image_path && !scanToDelete.image_path.toLowerCase().startsWith("manual-entry")) {
        const { error: storageError } = await supabase.storage.from("FoodScans").remove([scanToDelete.image_path]);
        if (storageError) {
          console.warn("Failed to delete image from storage:", storageError);
        }
      }

      setItems((prev) => prev.filter((scan) => scan.id !== scanToDelete.id));
      toast({
        title: "Scan deleted",
        description: "The scan and its image have been removed.",
      });
    } catch (error) {
      console.error("Failed to delete scan:", error);
      toast({
        title: "Failed to delete scan",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setDeletingScan(false);
      setScanToDelete(null);
    }
  };

  const display = useMemo(() => {
    let filtered = items;
    const query = search.trim().toLowerCase();

    if (range.from && range.to) {
      const fromMs = new Date(range.from.toDateString()).getTime();
      const toMs = new Date(range.to.toDateString()).getTime() + 24 * 60 * 60 * 1000 - 1;
      filtered = filtered.filter((scan) => {
        const timestamp = new Date(scan.created_at).getTime();
        return timestamp >= fromMs && timestamp <= toMs;
      });
    }

    if (query) {
      filtered = filtered.filter(
        (scan) =>
          (scan.result_json?.dish || "").toLowerCase().includes(query) ||
          (scan.id || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, range, search]);

  const applyPreset = (key: string) => {
    setActivePreset(key);
    const now = new Date();

    if (key === "all") {
      setRange({ from: null, to: null });
      return;
    }

    if (key === "today") {
      const today = new Date(now);
      setRange({ from: today, to: today });
      return;
    }

    if (key === "7d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setRange({ from, to: now });
      return;
    }

    if (key === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setRange({ from, to });
    }
  };

  if (!isPremium) {
    return (
      <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/30">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto border-primary/30 bg-background/80 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">Scan History is Premium</CardTitle>
                <CardDescription className="text-base">
                  Upgrade to unlock unlimited access to all of your past scans, saved nutrition breakdowns, and AI
                  insights in one place.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
                    title: "Full timeline",
                    body: "Browse every scan you’ve ever completed without limits.",
                  },
                  {
                    icon: <Sparkles className="h-5 w-5 text-primary" />,
                    title: "Rich insights",
                    body: "Revisit AI-generated nutrition guidance and personal context.",
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {feature.icon}
                      {feature.title}
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.body}</p>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button size="lg" className="px-8" onClick={() => router.push("/plans")}>
                  Upgrade to Premium <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Already upgraded? Refresh the page or revisit once your plan is active.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="px-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold">Scan Histories</h1>
          </div>
          <p className="text-muted-foreground">All scans for your account</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by dish or id"
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Popover open={openRange} onOpenChange={setOpenRange}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {range.from && range.to
                        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
                        : "Date Range"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Presets</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: "all", label: "All" },
                            { key: "today", label: "Today" },
                            { key: "7d", label: "Last 7 days" },
                            { key: "month", label: "This month" },
                          ].map(({ key, label }) => (
                            <Badge
                              key={key}
                              onClick={() => applyPreset(key)}
                              className={cn("cursor-pointer", activePreset === key && "bg-primary text-primary-foreground")}
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRange({ from: null, to: null });
                              setActivePreset("all");
                            }}
                          >
                            Clear
                          </Button>
                          <Button size="sm" onClick={() => setOpenRange(false)}>
                            Apply
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Custom Range</div>
                        <Calendar
                          mode="range"
                          selected={{ from: range.from || undefined, to: range.to || undefined }}
                          onSelect={(selectedRange: any) =>
                            setRange({ from: selectedRange?.from || null, to: selectedRange?.to || null })
                          }
                          numberOfMonths={2}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {display.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No scans found</h3>
              <Button onClick={() => router.push("/dashboard")} className="mt-2">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {display.map((scan) => (
                <Card
                  key={scan.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/food-results?id=${scan.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {(() => {
                            const dish = scan.result_json?.dish || "Food";
                            const isManual = scan.result_json?.isManualEntry || (typeof dish === "string" && dish.trim().toLowerCase().startsWith("manual"));
                            if (isManual) {
                              // If it starts with "Manual:" or "Manual Input:", format it properly
                              const cleanDish = dish.replace(/^Manual( Input)?:\s*/i, "");
                              return `Manual Input: ${cleanDish}`;
                            }
                            return dish;
                          })()}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <CalendarIcon className="h-3 w-3" /> {new Date(scan.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive color-red-100"
                        aria-label="Delete scan"
                        onClick={(event) => {
                          event.stopPropagation();
                          setScanToDelete(scan);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      <img
                        src={scan.displayUrl || DEFAULT_SCAN_IMAGE}
                        alt="scan"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.src.includes(DEFAULT_SCAN_IMAGE)) {
                            img.src = DEFAULT_SCAN_IMAGE;
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {hasMore && !search && (!range.from || !range.to) && (
              <div className="mt-6 text-center">
                <Button 
                  className="bg-primary hover:bg-primary-hover text-primary-foreground" 
                  disabled={loadingMore}
                  onClick={async () => {
                    setLoadingMore(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.user) return;
                      
                      const start = items.length;
                      const { data: moreData, count } = await supabase
                        .from("food_scans")
                        .select("id, image_url, image_path, serving, result_json, created_at, language", { count: "exact" })
                        .eq("user_id", session.user.id)
                        .order("created_at", { ascending: false })
                        .range(start, start + 5); // Load next 6 scans
                      
                      if (moreData) {
                        const fallbackItems = moreData.map((scan: any) => ({
                          ...scan,
                          displayUrl: fallbackImageForScan(scan),
                        })) as FoodScan[];

                        const resolvedUrls = await Promise.all(
                          moreData.map(async (scan: any) => {
                            if (!shouldAttemptSignedUrl(scan)) return null;
                            try {
                              const displayUrl = await getImageUrl(scan.image_path, 60 * 60);
                              return displayUrl ? { id: scan.id, displayUrl } : null;
                            } catch (err) {
                              console.warn("Failed to load image URL for scan:", scan.id, err);
                              return null;
                            }
                          })
                        );

                        const mergedItems = fallbackItems.map((item) => {
                          const resolved = resolvedUrls.find((entry) => entry?.id === item.id);
                          return resolved?.displayUrl ? { ...item, displayUrl: resolved.displayUrl } : item;
                        });
                        
                        setItems((prev) => {
                          const updated = [...prev, ...mergedItems];
                          setHasMore(typeof count === "number" ? updated.length < count : false);
                          return updated;
                        });
                      }
                    } finally {
                      setLoadingMore(false);
                    }
                  }}
                >
                  {loadingMore ? "Loading..." : "Load Next 6 Scans"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      </main>

      <AlertDialog
        open={!!scanToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingScan) {
            setScanToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this scan will permanently remove its analysis and any stored images. Are you sure you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingScan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletingScan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingScan ? "Deleting..." : "Yes, delete it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
