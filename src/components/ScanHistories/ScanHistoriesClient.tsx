'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronDown, Camera, Search } from "lucide-react";
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

export function ScanHistoriesClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FoodScan[]>([]);
  const [openRange, setOpenRange] = useState(false);
  const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [activePreset, setActivePreset] = useState<string>("all");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {

      try {
        // Fast auth check with timeout
        const authPromise = supabase.auth.getSession();
        const authTimeout = new Promise<{ data: { session: null }, error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 2000)
        );

        let session: any;
        const authResult = await Promise.race([authPromise, authTimeout]);
        if (!authResult?.data?.session) {
          console.warn("Auth check timed out or failed");
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        session = authResult.data.session;

        if (!session?.user) {
          if (!cancelled) router.push("/auth");
          return;
        }

        // Load only 6 scans initially for faster load
        const queryPromise = supabase
          .from("food_scans")
          .select("id, image_url, image_path, serving, result_json, created_at", { count: "exact" })
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(6); // Show 6 scans initially

        const timeoutPromise = new Promise<{ data: null; error: null; count: null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null, count: null }), 2000) // Reduced to 2 seconds
        );

        const queryResult = await Promise.race([queryPromise, timeoutPromise]);
        
        if (!queryResult || !queryResult.data) {
          // Query timed out, show empty state but don't block the page
          console.warn("Scan history query timed out");
          if (!cancelled) {
            setItems([]);
            setHasMore(false);
            setLoading(false);
          }
          return;
        }

        const { data, error, count } = queryResult;

        if (cancelled) return;

        if (error) {
          console.error("Query error:", error);
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        const scans = data || [];
        
        // Check if there are more scans
        if (!cancelled && count !== null) {
          setHasMore(count > 6);
        }
        
        // Set items immediately with fallback URLs, then load fresh signed URLs in background
        const initialItems = scans.map((scan: any) => ({
          ...scan,
          displayUrl: scan.image_url || null, // Use stored image_url as fallback
        })) as FoodScan[];

        if (!cancelled) {
          setItems(initialItems);
          setLoading(false);
        }

        // Load fresh signed URLs in background for all scans with image_path
        Promise.all(
          scans.map(async (scan: any) => {
            if (cancelled) return null;
            
            let displayUrl: string | null = null;
            
            // Always try to get fresh signed URL from image_path if available
            if (scan.image_path) {
              try {
                displayUrl = await getImageUrl(scan.image_path, 60 * 60);
              } catch (err) {
                console.warn("Failed to load image URL for scan:", scan.id, err);
                // Keep fallback URL if getImageUrl fails
                displayUrl = scan.image_url || null;
              }
            } else if (scan.image_url) {
              displayUrl = scan.image_url;
            }
            
            return { id: scan.id, displayUrl };
          })
        ).then((urls) => {
          if (cancelled) return;
          
          // Update items with fresh URLs
          setItems((prev) =>
            prev.map((item) => {
              const urlData = urls.find((u) => u?.id === item.id);
              return urlData && urlData.displayUrl ? { ...item, displayUrl: urlData.displayUrl } : item;
            })
          );
        });
      } catch (error: any) {
        if (cancelled) return;
        
        console.error("Error loading scans:", error);
        setItems([]);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Scan Histories</h1>
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
                        <CardTitle className="text-lg">{scan.result_json?.dish || "Food"}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <CalendarIcon className="h-3 w-3" /> {new Date(scan.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      {scan.displayUrl ? (
                        <img 
                          src={scan.displayUrl} 
                          alt="scan" 
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="text-muted-foreground">No image</div>
                      )}
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
                      
                      const { data: moreData, count } = await supabase
                        .from("food_scans")
                        .select("id, image_url, image_path, serving, result_json, created_at", { count: "exact" })
                        .eq("user_id", session.user.id)
                        .order("created_at", { ascending: false })
                        .range(items.length, items.length + 5); // Load next 6 scans
                      
                      if (moreData) {
                        // Load image URLs for new scans
                        const newItems = await Promise.all(
                          moreData.map(async (scan: any) => {
                            let displayUrl: string | null = null;
                            
                            if (scan.image_path) {
                              try {
                                displayUrl = await getImageUrl(scan.image_path, 60 * 60);
                              } catch (err) {
                                console.warn("Failed to load image URL for scan:", scan.id, err);
                              }
                            }
                            
                            if (!displayUrl && scan.image_url) {
                              displayUrl = scan.image_url;
                            }
                            
                            return {
                              ...scan,
                              displayUrl,
                            } as FoodScan;
                          })
                        );
                        
                        setItems(prev => [...prev, ...newItems]);
                        setHasMore(count !== null && (items.length + newItems.length) < count);
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
  );
}
