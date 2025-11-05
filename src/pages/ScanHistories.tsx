import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Search } from "lucide-react";

type FoodScan = {
  id: string;
  image_url: string | null;
  image_path: string | null;
  serving: number | null;
  result_json: any;
  created_at: string;
};

const ScanHistories = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FoodScan[]>([]);
  const [display, setDisplay] = useState<any[]>([]);
  const [openRange, setOpenRange] = useState(false);
  const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [activePreset, setActivePreset] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { navigate("/auth"); return; }

        const { data, error } = await supabase
          .from("food_scans")
          .select("id, image_url, image_path, serving, result_json, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const scans = data || [];
        // Generate fresh signed URLs for all scans (never expires - generated on-demand)
        const withUrls = await Promise.all(scans.map(async (s: any) => {
          let displayUrl: string | null = null;
          
          // Try to generate fresh signed URL from image_path
          if (s.image_path) {
            displayUrl = await getImageUrl(s.image_path, 60 * 60);
          }
          
          // Fallback to stored image_url if fresh generation fails or no path
          if (!displayUrl && s.image_url) {
            displayUrl = s.image_url as string;
          }
          
          return { ...s, displayUrl };
        }));

        setItems(withUrls);
        setDisplay(withUrls);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    let filtered = items;
    // date filter
    if (range.from && range.to) {
      const fromMs = new Date(range.from.toDateString()).getTime();
      const toMs = new Date(range.to.toDateString()).getTime() + 24 * 60 * 60 * 1000 - 1;
      filtered = filtered.filter((s: any) => {
        const t = new Date(s.created_at).getTime();
        return t >= fromMs && t <= toMs;
      });
    }
    // text filter
    if (q) {
      filtered = filtered.filter((s: any) =>
        (s.result_json?.dish || "").toLowerCase().includes(q) ||
        (s.id || "").toLowerCase().includes(q)
      );
    }
    setDisplay(filtered);
  }, [search, items, range]);

  const applyPreset = (key: string) => {
    setActivePreset(key);
    const now = new Date();
    if (key === "all") { setRange({ from: null, to: null }); return; }
    if (key === "today") {
      setRange({ from: new Date(now), to: new Date(now) }); return;
    }
    if (key === "7d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setRange({ from, to: now }); return;
    }
    if (key === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setRange({ from, to }); return;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
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
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by dish or id" className="pl-10" />
                </div>
                <div className="flex items-center gap-2">
                  <Popover open={openRange} onOpenChange={setOpenRange}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-between">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {range.from && range.to ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}` : "Date Range"}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="end">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium mb-2">Presets</div>
                          <div className="flex flex-wrap gap-2">
                            <Badge onClick={() => applyPreset("all")} className={cn("cursor-pointer", activePreset === "all" && "bg-primary text-primary-foreground")}>All</Badge>
                            <Badge onClick={() => applyPreset("today")} className={cn("cursor-pointer", activePreset === "today" && "bg-primary text-primary-foreground")}>Today</Badge>
                            <Badge onClick={() => applyPreset("7d")} className={cn("cursor-pointer", activePreset === "7d" && "bg-primary text-primary-foreground")}>Last 7 days</Badge>
                            <Badge onClick={() => applyPreset("month")} className={cn("cursor-pointer", activePreset === "month" && "bg-primary text-primary-foreground")}>This month</Badge>
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setRange({ from: null, to: null }); setActivePreset("all"); }}>Clear</Button>
                            <Button size="sm" onClick={() => setOpenRange(false)}>Apply</Button>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-2">Custom Range</div>
                          <Calendar
                            mode="range"
                            selected={{ from: range.from || undefined, to: range.to || undefined }}
                            onSelect={(r: any) => setRange({ from: r?.from || null, to: r?.to || null })}
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
                <Button onClick={() => navigate("/dashboard")} className="mt-2">Go to Dashboard</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {display.map((s: any) => (
                <Card key={s.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/food-results?id=${s.id}`)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{s.result_json?.dish || "Food"}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <CalendarIcon className="h-3 w-3" /> {new Date(s.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      {s.displayUrl ? (
                        <img src={s.displayUrl} alt="scan" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-muted-foreground">No image</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ScanHistories;


