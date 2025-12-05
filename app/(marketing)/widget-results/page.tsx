import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const WidgetResultsClient = dynamic(
  () => import("@/components/FoodResults/FoodResultsClient").then((mod) => mod.FoodResultsClient),
  { ssr: false }
);

const WidgetResults = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <TopBar />
      <Header />
      <WidgetResultsClient />
      <Footer />
    </div>
  );
};

export default WidgetResults;
