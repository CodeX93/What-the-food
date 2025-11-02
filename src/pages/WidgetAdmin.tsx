import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  BarChart3,
  Zap,
  Search,
  Eye,
  Calendar,
  TrendingUp,
  Activity,
} from "lucide-react";

// TODO: Implement admin role check
// For now, this is a placeholder that requires manual admin authentication
const ADMIN_USER_IDS = [
  // Add admin user IDs here or fetch from environment
  // For now, we'll use a simple check
];

const WidgetAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month" | "all">("month");

  // Stats
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [apiCalls, setApiCalls] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }

        setUser(session.user);

        // TODO: Check if user is admin
        // For now, we'll allow access if the user exists
        // In production, implement proper admin role check
        const userEmail = session.user.email || "";
        const isAdminUser =
          ADMIN_USER_IDS.includes(session.user.id) ||
          userEmail.includes("@whatthefood.io") ||
          userEmail.includes("admin@");

        if (!isAdminUser) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }

        setIsAdmin(true);
        await loadData();
      } catch (error: any) {
        console.error("Error checking auth:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  const loadData = async () => {
    try {
      // Load overview stats
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id");

      const { data: allSubscriptions } = await supabase
        .from("widget_subscriptions")
        .select("*");

      const { data: allApiCalls } = await supabase
        .from("widget_api_calls")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: allSites } = await supabase
        .from("widget_sites")
        .select("*");

      // Calculate stats
      const today = new Date().toDateString();
      const todayCalls = allApiCalls?.filter(
        (call) => new Date(call.created_at).toDateString() === today
      ) || [];

      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);
      const weekCalls = allApiCalls?.filter(
        (call) => new Date(call.created_at) >= thisWeek
      ) || [];

      const thisMonth = new Date();
      thisMonth.setMonth(thisMonth.getMonth() - 1);
      const monthCalls = allApiCalls?.filter(
        (call) => new Date(call.created_at) >= thisMonth
      ) || [];

      setOverviewStats({
        totalUsers: allUsers?.length || 0,
        activeSubscriptions: allSubscriptions?.filter((s) => s.is_active).length || 0,
        totalApiCalls: allApiCalls?.length || 0,
        todayCalls: todayCalls.length,
        weekCalls: weekCalls.length,
        monthCalls: monthCalls.length,
        totalSites: allSites?.length || 0,
        successfulCalls: allApiCalls?.filter((c) => c.status === "success").length || 0,
        errorCalls: allApiCalls?.filter((c) => c.status === "error").length || 0,
      });

      // Load users with subscription details
      const usersWithSubs = await Promise.all(
        (allUsers || []).map(async (profile) => {
          const { data: subscription } = await supabase
            .from("widget_subscriptions")
            .select("*")
            .eq("user_id", profile.id)
            .maybeSingle();

          const { data: userApiCalls } = await supabase
            .from("widget_api_calls")
            .select("*")
            .eq("user_id", profile.id);

          const { data: sites } = await supabase
            .from("widget_sites")
            .select("*")
            .eq("user_id", profile.id);

          return {
            ...profile,
            subscription,
            apiCallsCount: userApiCalls?.length || 0,
            sitesCount: sites?.length || 0,
            recentCalls: userApiCalls?.slice(0, 10) || [],
          };
        })
      );

      setUserList(usersWithSubs);
      setTopUsers(
        usersWithSubs
          .sort((a, b) => b.apiCallsCount - a.apiCallsCount)
          .slice(0, 10)
      );

      // Load recent API calls
      setApiCalls(allApiCalls?.slice(0, 100) || []);
    } catch (error: any) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = userList.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.id?.toLowerCase().includes(searchLower) ||
      u.subscription?.subscription_type?.toLowerCase().includes(searchLower)
    );
  });

  const filteredApiCalls = apiCalls.filter((call) => {
    if (selectedPeriod === "today") {
      return new Date(call.created_at).toDateString() === new Date().toDateString();
    }
    if (selectedPeriod === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(call.created_at) >= weekAgo;
    }
    if (selectedPeriod === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(call.created_at) >= monthAgo;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Widget Admin Panel</h1>
            <p className="text-muted-foreground">
              Track user performance and API consumption
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overviewStats?.activeSubscriptions || 0} active subscriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Total API Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats?.totalApiCalls || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overviewStats?.successfulCalls || 0} successful,{" "}
                  {overviewStats?.errorCalls || 0} errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Today's Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats?.todayCalls || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overviewStats?.weekCalls || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Total Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats?.totalSites || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Widget sites registered
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="api-calls">
                <Zap className="h-4 w-4 mr-2" />
                API Calls
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage all widget users and their subscriptions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={loadData} variant="outline">
                      Refresh
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No users found
                      </p>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{user.email || "No email"}</p>
                            <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                              <span>
                                Plan:{" "}
                                <span className="font-medium">
                                  {user.subscription?.subscription_type || "N/A"}
                                </span>
                              </span>
                              <span>API Calls: {user.apiCallsCount}</span>
                              <span>Sites: {user.sitesCount}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.subscription?.is_active ? (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-xs">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api-calls" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>API Call Logs</CardTitle>
                  <CardDescription>
                    Monitor all API calls from widgets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={selectedPeriod === "today" ? "default" : "outline"}
                      onClick={() => setSelectedPeriod("today")}
                      size="sm"
                    >
                      Today
                    </Button>
                    <Button
                      variant={selectedPeriod === "week" ? "default" : "outline"}
                      onClick={() => setSelectedPeriod("week")}
                      size="sm"
                    >
                      This Week
                    </Button>
                    <Button
                      variant={selectedPeriod === "month" ? "default" : "outline"}
                      onClick={() => setSelectedPeriod("month")}
                      size="sm"
                    >
                      This Month
                    </Button>
                    <Button
                      variant={selectedPeriod === "all" ? "default" : "outline"}
                      onClick={() => setSelectedPeriod("all")}
                      size="sm"
                    >
                      All Time
                    </Button>
                    <Button onClick={loadData} variant="outline" size="sm" className="ml-auto">
                      Refresh
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredApiCalls.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No API calls found for the selected period
                      </p>
                    ) : (
                      filteredApiCalls.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-center justify-between p-3 border rounded-lg text-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{call.call_type}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  call.status === "success"
                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                }`}
                              >
                                {call.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {call.site_url || "Unknown site"} •{" "}
                              {new Date(call.created_at).toLocaleString()}
                            </p>
                          </div>
                          {call.response_time_ms && (
                            <span className="text-xs text-muted-foreground">
                              {call.response_time_ms}ms
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Users by API Calls</CardTitle>
                    <CardDescription>
                      Users with the most API consumption
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No data available</p>
                      ) : (
                        topUsers.map((user, index) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">#{index + 1}</span>
                              <span className="text-sm">{user.email}</span>
                            </div>
                            <span className="text-sm font-medium">{user.apiCallsCount}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Breakdown</CardTitle>
                    <CardDescription>
                      Distribution of subscription plans
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userList.reduce((acc: any, user) => {
                        const plan = user.subscription?.subscription_type || "none";
                        acc[plan] = (acc[plan] || 0) + 1;
                        return acc;
                      }, {}) &&
                        Object.entries(
                          userList.reduce((acc: any, user) => {
                            const plan = user.subscription?.subscription_type || "none";
                            acc[plan] = (acc[plan] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([plan, count]: [string, any]) => (
                          <div
                            key={plan}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span className="text-sm capitalize">{plan}</span>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WidgetAdmin;

