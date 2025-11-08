import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const WidgetDashboardClient = dynamic(
  () => import("@/components/WidgetDashboard/WidgetDashboardClient").then((mod) => mod.WidgetDashboardClient),
  { ssr: false }
);

const WidgetDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <WidgetDashboardClient />
      <Footer />
    </div>
  );
};

export default WidgetDashboard;
