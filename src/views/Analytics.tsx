import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const AnalyticsClient = dynamic(
  () => import("@/components/Analytics/AnalyticsClient").then((mod) => mod.AnalyticsClient),
  { ssr: false }
);

const Analytics = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <AnalyticsClient />
      <Footer />
    </div>
  );
};

export default Analytics;

