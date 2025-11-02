import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Calendar, Trash2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Scan {
  id: string;
  dish_name: string | null;
  image_url: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: string;
}

const ScanHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredScans, setFilteredScans] = useState<Scan[]>([]);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          navigate("/auth");
          return;
        }

        const { data: scansData, error: scansError } = await supabase
          .from("scans")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (scansError) {
          throw scansError;
        }

        setScans(scansData || []);
        setFilteredScans(scansData || []);
      } catch (error: any) {
        console.error("Error fetching scans:", error);
        toast({
          title: "Error",
          description: "Failed to load scan history.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [navigate, toast]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredScans(scans);
    } else {
      const filtered = scans.filter(
        (scan) =>
          scan.dish_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          scan.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredScans(filtered);
    }
  }, [searchQuery, scans]);

  const handleDelete = async (scanId: string) => {
    try {
      const { error } = await supabase
        .from("scans")
        .delete()
        .eq("id", scanId);

      if (error) {
        throw error;
      }

      setScans(scans.filter((scan) => scan.id !== scanId));
      setFilteredScans(filteredScans.filter((scan) => scan.id !== scanId));

      toast({
        title: "Success",
        description: "Scan deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting scan:", error);
      toast({
        title: "Error",
        description: "Failed to delete scan.",
        variant: "destructive",
      });
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Scan History</h1>
            <p className="text-muted-foreground">
              View and manage all your food scans
            </p>
          </div>

          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by dish name or scan ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scans List */}
          {filteredScans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No scans found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Start by scanning your first food item!"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate("/dashboard")}>
                    Start Your First Scan
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScans.map((scan) => (
                <Card key={scan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {scan.dish_name || "Unknown Dish"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(scan.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(scan.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {scan.image_url && (
                      <div className="mb-4 rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                        <img
                          src={scan.image_url}
                          alt={scan.dish_name || "Food scan"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Calories</p>
                        <p className="font-semibold">{scan.calories || "-"} kcal</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Protein</p>
                        <p className="font-semibold">{scan.protein || "-"}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Carbs</p>
                        <p className="font-semibold">{scan.carbs || "-"}g</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fat</p>
                        <p className="font-semibold">{scan.fat || "-"}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Stats */}
          {scans.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Total Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{scans.length}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredScans.length === scans.length
                    ? "All scans"
                    : `${filteredScans.length} matching scans`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ScanHistory;

