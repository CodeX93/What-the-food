import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Plans from "./pages/Plans";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Profile from "./pages/Profile";
import ScanHistory from "./pages/ScanHistory";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Widget from "./pages/Widget";
import WidgetEmbed from "./pages/WidgetEmbed";
import WidgetDashboard from "./pages/WidgetDashboard";
import WidgetPlans from "./pages/WidgetPlans";
import WidgetAdmin from "./pages/WidgetAdmin";
import WallOfLove from "./pages/WallOfLove";
import Blog from "./pages/Blog";
import NotFound from "./pages/NotFound";
import FoodResults from "./pages/FoodResults";
import ScanHistories from "./pages/ScanHistories";
import MyFoodAnalytics from "./pages/MyFoodAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/food-results" element={<FoodResults />} />
          <Route path="/foot-results" element={<FoodResults />} />
          <Route path="/scan-histories" element={<ScanHistories />} />
          <Route path="/my-foot-analytics" element={<MyFoodAnalytics />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<ScanHistory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/widget" element={<Widget />} />
          <Route path="/widget/embed" element={<WidgetEmbed />} />
          <Route path="/widget/dashboard" element={<WidgetDashboard />} />
          <Route path="/widget/plans" element={<WidgetPlans />} />
          <Route path="/widget/admin" element={<WidgetAdmin />} />
          <Route path="/wall-of-love" element={<WallOfLove />} />
          <Route path="/blog" element={<Blog />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
