import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const FoodResultsClient = dynamic(
  () => import("@/components/FoodResults/FoodResultsClient").then((mod) => mod.FoodResultsClient),
  { ssr: false }
);

const FoodResults = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <TopBar />
      <Header />
      <FoodResultsClient />
      <Footer />
    </div>
  );
};

export default FoodResults;


